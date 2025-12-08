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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, pageIds } = await req.json();

    // Get user's Notion connection
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: connection, error: connError } = await serviceClient
      .from("notion_connections")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "Notion not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // List available pages
    if (action === "list") {
      const pages = await listNotionPages(connection.access_token);
      return new Response(
        JSON.stringify({ pages }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Import selected pages
    if (action === "import" && pageIds?.length > 0) {
      const results = await importNotionPages(
        pageIds,
        connection.access_token,
        user.id,
        serviceClient
      );
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
    console.error("Error in notion-import:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function listNotionPages(accessToken: string): Promise<any[]> {
  const response = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filter: { property: "object", value: "page" },
      page_size: 100,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Notion search error:", error);
    throw new Error("Failed to list Notion pages");
  }

  const data = await response.json();
  
  return data.results.map((page: any) => ({
    id: page.id,
    title: getPageTitle(page),
    url: page.url,
    lastEdited: page.last_edited_time,
    icon: page.icon?.emoji || page.icon?.external?.url || null,
  }));
}

function getPageTitle(page: any): string {
  if (page.properties?.title?.title?.[0]?.plain_text) {
    return page.properties.title.title[0].plain_text;
  }
  if (page.properties?.Name?.title?.[0]?.plain_text) {
    return page.properties.Name.title[0].plain_text;
  }
  // Check other common title property names
  for (const key of Object.keys(page.properties || {})) {
    const prop = page.properties[key];
    if (prop.type === "title" && prop.title?.[0]?.plain_text) {
      return prop.title[0].plain_text;
    }
  }
  return "Untitled";
}

async function importNotionPages(
  pageIds: string[],
  accessToken: string,
  userId: string,
  supabase: any
): Promise<{ pageId: string; success: boolean; documentId?: string; error?: string }[]> {
  const results = [];

  for (const pageId of pageIds) {
    try {
      console.log("Importing page:", pageId);

      // Get page content
      const pageContent = await getPageContent(pageId, accessToken);
      const pageTitle = pageContent.title || "Untitled";
      
      console.log("Page title:", pageTitle, "Content length:", pageContent.text.length);

      // Create document record
      const { data: document, error: docError } = await supabase
        .from("documents")
        .insert({
          user_id: userId,
          title: pageTitle,
          file_name: `${pageTitle}.notion`,
          file_type: "notion",
          file_size: pageContent.text.length,
          storage_path: null, // Notion pages don't use storage
        })
        .select()
        .single();

      if (docError) throw docError;

      // Chunk and embed the content
      const chunks = chunkText(pageContent.text, 512);
      console.log("Created chunks:", chunks.length);

      // Process chunks in batches
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);

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
                body: JSON.stringify({ inputs: [chunk] }),
              }
            );

            if (!response.ok) {
              const error = await response.text();
              throw new Error(`Embedding error: ${error}`);
            }

            const result = await response.json();
            return result[0];
          })
        );

        const chunksToInsert = batch.map((chunk, idx) => ({
          document_id: document.id,
          chunk_index: i + idx,
          chunk_text: chunk,
          embedding: embeddings[idx],
        }));

        const { error: insertError } = await supabase
          .from("document_chunks")
          .insert(chunksToInsert);

        if (insertError) throw insertError;
      }

      results.push({ pageId, success: true, documentId: document.id });
      console.log("Successfully imported page:", pageId);
    } catch (error: any) {
      console.error("Error importing page:", pageId, error);
      results.push({ pageId, success: false, error: error.message });
    }
  }

  return results;
}

async function getPageContent(pageId: string, accessToken: string): Promise<{ title: string; text: string }> {
  // Get page details
  const pageResponse = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Notion-Version": "2022-06-28",
    },
  });

  if (!pageResponse.ok) {
    throw new Error("Failed to fetch page");
  }

  const page = await pageResponse.json();
  const title = getPageTitle(page);

  // Get page blocks (content)
  const blocksResponse = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Notion-Version": "2022-06-28",
    },
  });

  if (!blocksResponse.ok) {
    throw new Error("Failed to fetch page content");
  }

  const blocksData = await blocksResponse.json();
  const text = extractTextFromBlocks(blocksData.results);

  return { title, text: `${title}\n\n${text}` };
}

function extractTextFromBlocks(blocks: any[]): string {
  let text = "";

  for (const block of blocks) {
    const blockText = extractBlockText(block);
    if (blockText) {
      text += blockText + "\n";
    }
  }

  return text.trim();
}

function extractBlockText(block: any): string {
  const type = block.type;
  const content = block[type];

  if (!content) return "";

  // Handle rich text blocks
  if (content.rich_text) {
    return content.rich_text.map((t: any) => t.plain_text).join("");
  }

  // Handle specific block types
  switch (type) {
    case "paragraph":
    case "heading_1":
    case "heading_2":
    case "heading_3":
    case "bulleted_list_item":
    case "numbered_list_item":
    case "quote":
    case "callout":
    case "toggle":
      return content.rich_text?.map((t: any) => t.plain_text).join("") || "";
    case "code":
      return content.rich_text?.map((t: any) => t.plain_text).join("") || "";
    case "to_do":
      const checked = content.checked ? "[x]" : "[ ]";
      return `${checked} ${content.rich_text?.map((t: any) => t.plain_text).join("") || ""}`;
    default:
      return "";
  }
}

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
  
  return chunks.filter(c => c.length > 0);
}
