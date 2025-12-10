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
    console.log("Starting Google Drive auto-sync...");
    
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all users with auto-sync enabled
    const { data: connections, error: connError } = await adminClient
      .from("google_drive_connections")
      .select("*")
      .eq("auto_sync_enabled", true);

    if (connError) {
      console.error("Error fetching connections:", connError);
      throw connError;
    }

    console.log(`Found ${connections?.length || 0} connections with auto-sync enabled`);

    const results = [];

    for (const connection of connections || []) {
      try {
        console.log(`Syncing for user: ${connection.user_id}`);
        
        // Check if token needs refresh
        let accessToken = connection.access_token;
        if (connection.token_expiry && new Date(connection.token_expiry) < new Date()) {
          console.log("Token expired, refreshing...");
          accessToken = await refreshAccessToken(connection.refresh_token, connection.user_id, adminClient);
          if (!accessToken) {
            console.log(`Failed to refresh token for user ${connection.user_id}`);
            continue;
          }
        }

        // Get existing imported file IDs for this user
        const { data: existingDocs } = await adminClient
          .from("documents")
          .select("source_id")
          .eq("user_id", connection.user_id)
          .eq("source_type", "google_drive")
          .not("source_id", "is", null);

        const existingFileIds = new Set((existingDocs || []).map(d => d.source_id));
        console.log(`User has ${existingFileIds.size} existing Google Drive files`);

        // List files from Google Drive
        const driveFiles = await listGoogleDriveFiles(accessToken);
        console.log(`Found ${driveFiles.length} files in Google Drive`);

        // Find new files to import
        const newFiles = driveFiles.filter(f => !existingFileIds.has(f.id));
        console.log(`Found ${newFiles.length} new files to import`);

        if (newFiles.length > 0) {
          // Import new files (limit to 10 per sync to avoid timeouts)
          const filesToImport = newFiles.slice(0, 10);
          const importResults = await importGoogleDriveFiles(
            filesToImport.map(f => f.id),
            accessToken,
            connection.user_id,
            adminClient
          );
          
          results.push({
            userId: connection.user_id,
            imported: importResults.filter(r => r.success).length,
            failed: importResults.filter(r => !r.success).length,
          });
        }

        // Update last synced timestamp
        await adminClient
          .from("google_drive_connections")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("user_id", connection.user_id);

      } catch (userError: any) {
        console.error(`Error syncing for user ${connection.user_id}:`, userError);
        results.push({ userId: connection.user_id, error: userError.message });
      }
    }

    console.log("Sync completed:", results);
    
    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function refreshAccessToken(refreshToken: string | null, userId: string, adminClient: any): Promise<string | null> {
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
      fields: "nextPageToken,files(id,name,mimeType,modifiedTime)",
      pageSize: "100",
      orderBy: "modifiedTime desc",
    });

    if (pageToken) {
      params.append("pageToken", pageToken);
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error("Failed to list Google Drive files");
    }

    const data = await response.json();
    files.push(...(data.files || []));
    pageToken = data.nextPageToken || "";
  } while (pageToken && files.length < 500);

  return files;
}

async function importGoogleDriveFiles(fileIds: string[], accessToken: string, userId: string, adminClient: any): Promise<any[]> {
  const results = [];
  const HF_TOKEN = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");

  for (const fileId of fileIds) {
    try {
      console.log(`Importing file: ${fileId}`);
      
      const metaResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!metaResponse.ok) {
        throw new Error("Failed to get file metadata");
      }

      const metadata = await metaResponse.json();
      console.log(`File: ${metadata.name}, Type: ${metadata.mimeType}`);

      let content = "";
      
      if (metadata.mimeType === "application/vnd.google-apps.document") {
        const exportResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        
        if (exportResponse.ok) {
          content = await exportResponse.text();
        }
      } else {
        const downloadResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (downloadResponse.ok) {
          if (metadata.mimeType === "text/plain") {
            content = await downloadResponse.text();
          } else {
            content = `[Binary content from ${metadata.name}]`;
          }
        }
      }

      if (!content || content.trim().length === 0) {
        results.push({ fileId, success: false, error: "No content extracted" });
        continue;
      }

      // Create document with source tracking
      const { data: doc, error: docError } = await adminClient
        .from("documents")
        .insert({
          user_id: userId,
          title: metadata.name,
          file_name: metadata.name,
          file_type: metadata.mimeType,
          file_size: content.length,
          storage_path: `google-drive/${fileId}`,
          source_id: fileId,
          source_type: "google_drive",
        })
        .select()
        .single();

      if (docError) {
        throw new Error(`Failed to create document: ${docError.message}`);
      }

      const chunks = chunkText(content, 1500);
      console.log(`Created ${chunks.length} chunks for ${metadata.name}`);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        const embeddingResponse = await fetch(
          "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${HF_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: [chunk] }),
          }
        );

        if (!embeddingResponse.ok) {
          console.error("Embedding error:", await embeddingResponse.text());
          continue;
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = Array.isArray(embeddingData) && embeddingData.length > 0 ? embeddingData[0] : embeddingData;

        await adminClient
          .from("document_chunks")
          .insert({
            document_id: doc.id,
            chunk_index: i,
            chunk_text: chunk,
            embedding: embedding,
          });
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
