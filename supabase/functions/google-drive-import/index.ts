import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: `Bearer ${token}` }
        }
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      console.log("User auth failed:", userError?.message);
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("User authenticated:", user.id);

    // Get Google Drive connection
    const { data: connection, error: connError } = await supabaseClient
      .from("google_drive_connections")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "Google Drive not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token needs refresh
    let accessToken = connection.access_token;
    if (connection.token_expiry && new Date(connection.token_expiry) < new Date()) {
      console.log("Token expired, refreshing...");
      accessToken = await refreshAccessToken(connection.refresh_token, user.id, supabaseClient);
      if (!accessToken) {
        return new Response(
          JSON.stringify({ error: "Failed to refresh token, please reconnect Google Drive" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { action, fileIds } = await req.json();

    if (action === "list") {
      const files = await listGoogleDriveFiles(accessToken);
      return new Response(
        JSON.stringify({ files }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "import") {
      if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        return new Response(
          JSON.stringify({ error: "No files selected" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = await importGoogleDriveFiles(fileIds, accessToken, user.id, supabaseClient);
      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function refreshAccessToken(refreshToken: string | null, userId: string, supabaseClient: any): Promise<string | null> {
  if (!refreshToken) return null;

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error("Failed to refresh token");
      return null;
    }

    const data = await response.json();
    const tokenExpiry = data.expires_in 
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null;

    // Update stored token using service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await adminClient
      .from("google_drive_connections")
      .update({
        access_token: data.access_token,
        token_expiry: tokenExpiry,
      })
      .eq("user_id", userId);

    return data.access_token;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

async function listGoogleDriveFiles(accessToken: string): Promise<any[]> {
  const files: any[] = [];
  let pageToken = "";

  // Query for documents (Google Docs, PDFs, Word docs, text files)
  const mimeTypes = [
    "application/vnd.google-apps.document",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];
  
  const query = mimeTypes.map(m => `mimeType='${m}'`).join(" or ");

  do {
    const params = new URLSearchParams({
      q: `(${query}) and trashed=false`,
      fields: "nextPageToken,files(id,name,mimeType,modifiedTime,iconLink,webViewLink)",
      pageSize: "100",
      orderBy: "modifiedTime desc",
    });

    if (pageToken) {
      params.append("pageToken", pageToken);
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Error listing files:", error);
      throw new Error("Failed to list Google Drive files");
    }

    const data = await response.json();
    
    for (const file of data.files || []) {
      files.push({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
        iconLink: file.iconLink,
        webViewLink: file.webViewLink,
      });
    }

    pageToken = data.nextPageToken || "";
  } while (pageToken && files.length < 500); // Limit to 500 files

  return files;
}

async function importGoogleDriveFiles(fileIds: string[], accessToken: string, userId: string, supabaseClient: any): Promise<any[]> {
  const results = [];
  const HF_TOKEN = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");

  for (const fileId of fileIds) {
    try {
      console.log(`Importing file: ${fileId}`);
      
      // Get file metadata
      const metaResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!metaResponse.ok) {
        throw new Error("Failed to get file metadata");
      }

      const metadata = await metaResponse.json();
      console.log(`File: ${metadata.name}, Type: ${metadata.mimeType}`);

      // Get file content
      let content = "";
      
      if (metadata.mimeType === "application/vnd.google-apps.document") {
        // Export Google Doc as plain text
        const exportResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        
        if (exportResponse.ok) {
          content = await exportResponse.text();
        }
      } else {
        // Download regular file
        const downloadResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (downloadResponse.ok) {
          if (metadata.mimeType === "text/plain") {
            content = await downloadResponse.text();
          } else {
            // For PDFs and DOCX, we'd need specialized parsing
            // For now, skip these as they need more complex handling
            content = `[Binary content from ${metadata.name} - PDF/DOCX parsing requires document processing]`;
          }
        }
      }

      if (!content || content.trim().length === 0) {
        results.push({ fileId, success: false, error: "No content extracted" });
        continue;
      }

      // Create document record
      const { data: doc, error: docError } = await supabaseClient
        .from("documents")
        .insert({
          user_id: userId,
          title: metadata.name,
          file_name: metadata.name,
          file_type: metadata.mimeType,
          file_size: content.length,
          storage_path: `google-drive/${fileId}`,
        })
        .select()
        .single();

      if (docError) {
        throw new Error(`Failed to create document: ${docError.message}`);
      }

      // Chunk the content
      const chunks = chunkText(content, 1500);
      console.log(`Created ${chunks.length} chunks for ${metadata.name}`);

      // Generate embeddings and store chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        // Generate embedding using HuggingFace
        const embeddingResponse = await fetch(
          "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${HF_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: chunk }),
          }
        );

        if (!embeddingResponse.ok) {
          console.error("Embedding error:", await embeddingResponse.text());
          continue;
        }

        const embedding = await embeddingResponse.json();

        // Store chunk with embedding
        const { error: chunkError } = await supabaseClient
          .from("document_chunks")
          .insert({
            document_id: doc.id,
            chunk_index: i,
            chunk_text: chunk,
            embedding: embedding,
          });

        if (chunkError) {
          console.error("Chunk insert error:", chunkError);
        }
      }

      results.push({ fileId, success: true, documentId: doc.id, title: metadata.name });
    } catch (error: any) {
      console.error(`Error importing ${fileId}:`, error);
      results.push({ fileId, success: false, error: error.message });
    }
  }

  return results;
}

function chunkText(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + " " + sentence).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk = currentChunk ? currentChunk + " " + sentence : sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}
