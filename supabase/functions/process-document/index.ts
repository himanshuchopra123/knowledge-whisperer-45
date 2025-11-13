import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { getDocument } from "https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs";

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

    // Process chunks in batches
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);

      // Generate embeddings for batch using Xenova/all-MiniLM-L6-v2
      const embeddings = await Promise.all(
        batch.map(async (chunk) => {
          const response = await fetch(
            `https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("HUGGING_FACE_ACCESS_TOKEN")}`,
              },
              body: JSON.stringify({
                inputs: [chunk],
              }),
            }
          );

          if (!response.ok) {
            const error = await response.text();
            console.error("HF API error:", error);
            throw new Error(`Hugging Face API error: ${error}`);
          }

          const result = await response.json();
          return result[0];
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
    const text = await file.text();
    return sanitizeText(text);
  }

  if (fileType === "application/pdf") {
    return await extractPdfText(file);
  }

  // For other formats, try basic text extraction
  const text = await file.text();
  return sanitizeText(text);
}

// Extract text from PDF files
async function extractPdfText(file: Blob): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log("Loading PDF document, size:", uint8Array.length);
    
    // Load the PDF document with proper configuration
    const pdf = await getDocument({
      data: uint8Array,
      useSystemFonts: true,
      disableFontFace: true,
      standardFontDataUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/standard_fonts/",
    }).promise;
    
    console.log("PDF loaded successfully, pages:", pdf.numPages);
    
    let fullText = "";
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items from the page
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      
      fullText += pageText + "\n\n";
    }
    
    return sanitizeText(fullText);
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
}

// Remove null bytes and other problematic characters that PostgreSQL can't handle
function sanitizeText(text: string): string {
  return text
    .replace(/\u0000/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control characters
    .trim();
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
