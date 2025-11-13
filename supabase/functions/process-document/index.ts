import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { HfInference } from "https://esm.sh/@huggingface/inference@2.3.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();

    console.log("Processing document:", documentId);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get document details
    const { data: document, error: docError } = await supabaseClient
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError) throw docError;

    console.log("Document found:", document.file_name);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from("documents")
      .download(document.storage_path);

    if (downloadError) throw downloadError;

    // Extract text from file
    const text = await extractText(fileData, document.file_type);
    console.log("Extracted text length:", text.length);

    // Chunk the text
    const chunks = chunkText(text, 512); // ~512 tokens per chunk
    console.log("Created chunks:", chunks.length);

    // Generate embeddings using Hugging Face
    const hf = new HfInference(Deno.env.get("HUGGING_FACE_ACCESS_TOKEN"));

    // Process chunks in batches
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);

      // Generate embeddings for batch
      const embeddings = await Promise.all(
        batch.map(async (chunk) => {
          const result = await hf.featureExtraction({
            model: "BAAI/bge-m3",
            inputs: chunk,
          });
          // Convert to array if needed
          return Array.isArray(result) ? result : Array.from(result as any);
        })
      );

      // Insert chunks with embeddings
      const chunksToInsert = batch.map((chunk, idx) => ({
        document_id: documentId,
        chunk_index: i + idx,
        chunk_text: chunk,
        embedding: embeddings[idx],
      }));

      const { error: insertError } = await supabaseClient
        .from("document_chunks")
        .insert(chunksToInsert);

      if (insertError) {
        console.error("Error inserting chunks:", insertError);
        throw insertError;
      }
    }

    console.log("Document processing complete");

    return new Response(
      JSON.stringify({ success: true, chunks: chunks.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error processing document:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

// Extract text from different file types
async function extractText(file: Blob, fileType: string): Promise<string> {
  if (fileType === "text/plain" || fileType === "text/markdown") {
    return await file.text();
  }

  // For PDF and other formats, use basic text extraction
  // In production, you'd use libraries like pdf-parse or similar
  const text = await file.text();
  return text;
}

// Simple text chunking by character count
function chunkText(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+\s+/);
  
  let currentChunk = "";
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ". " : "") + sentence;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}
