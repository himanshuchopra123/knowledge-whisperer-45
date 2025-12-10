import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedIntent {
  searchQuery: string | null;
  sortBy: 'relevance' | 'newest' | 'oldest';
  timeFilter: {
    startDate?: string;
    endDate?: string;
  } | null;
  docTypes: string[] | null;
  limit: number | null;
  isMetadataQuery: boolean; // True for queries like "latest doc" that don't need semantic search
  owner: string | null; // Extracted owner/author name from query
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query) {
      throw new Error('Query is required');
    }

    console.log('Parsing intent for query:', query);

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Get current date for time calculations
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const systemPrompt = `You are a query intent parser for a document search system. Parse the user's query and extract structured parameters.

Current date: ${todayStr}

You must respond with ONLY valid JSON matching this structure:
{
  "searchQuery": "the semantic search query to use, or null if purely metadata-based",
  "sortBy": "relevance" | "newest" | "oldest",
  "timeFilter": { "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" } | null,
  "docTypes": ["pdf", "docx"] | null,
  "limit": number | null,
  "isMetadataQuery": true if query is about document metadata (latest, oldest, count) rather than content,
  "owner": "person's name if mentioned as document owner/author" | null
}

Examples:
- "latest document" → {"searchQuery": null, "sortBy": "newest", "timeFilter": null, "docTypes": null, "limit": 1, "isMetadataQuery": true, "owner": null}
- "show me the 5 newest PDFs" → {"searchQuery": null, "sortBy": "newest", "timeFilter": null, "docTypes": ["pdf"], "limit": 5, "isMetadataQuery": true, "owner": null}
- "documents from last week about marketing" → {"searchQuery": "marketing", "sortBy": "relevance", "timeFilter": {"startDate": "calculated_date", "endDate": "${todayStr}"}, "docTypes": null, "limit": null, "isMetadataQuery": false, "owner": null}
- "oldest files" → {"searchQuery": null, "sortBy": "oldest", "timeFilter": null, "docTypes": null, "limit": 10, "isMetadataQuery": true, "owner": null}
- "what is our refund policy" → {"searchQuery": "refund policy", "sortBy": "relevance", "timeFilter": null, "docTypes": null, "limit": null, "isMetadataQuery": false, "owner": null}
- "files uploaded yesterday" → {"searchQuery": null, "sortBy": "newest", "timeFilter": {"startDate": "yesterday_date", "endDate": "yesterday_date"}, "docTypes": null, "limit": null, "isMetadataQuery": true, "owner": null}
- "show me the latest uploaded in last 1 week" → {"searchQuery": null, "sortBy": "newest", "timeFilter": {"startDate": "one_week_ago_date", "endDate": "${todayStr}"}, "docTypes": null, "limit": null, "isMetadataQuery": true, "owner": null}
- "documents uploaded this week" → {"searchQuery": null, "sortBy": "newest", "timeFilter": {"startDate": "start_of_week_date", "endDate": "${todayStr}"}, "docTypes": null, "limit": null, "isMetadataQuery": true, "owner": null}
- "files from last month" → {"searchQuery": null, "sortBy": "newest", "timeFilter": {"startDate": "one_month_ago_date", "endDate": "${todayStr}"}, "docTypes": null, "limit": null, "isMetadataQuery": true, "owner": null}
- "John's documents" → {"searchQuery": "author:John OR owner:John OR by John OR created by John", "sortBy": "relevance", "timeFilter": null, "docTypes": null, "limit": null, "isMetadataQuery": false, "owner": "John"}
- "docs by Sarah" → {"searchQuery": "author:Sarah OR owner:Sarah OR by Sarah OR created by Sarah", "sortBy": "relevance", "timeFilter": null, "docTypes": null, "limit": null, "isMetadataQuery": false, "owner": "Sarah"}
- "latest report from Mike" → {"searchQuery": "author:Mike OR owner:Mike OR by Mike OR created by Mike", "sortBy": "newest", "timeFilter": null, "docTypes": null, "limit": 1, "isMetadataQuery": false, "owner": "Mike"}
- "documents owned by David about sales" → {"searchQuery": "sales author:David owner:David by David", "sortBy": "relevance", "timeFilter": null, "docTypes": null, "limit": null, "isMetadataQuery": false, "owner": "David"}

IMPORTANT: For time-based queries WITHOUT a content topic (like "latest uploaded in last week", "files from yesterday", "documents this month"), set isMetadataQuery: true.
Only set isMetadataQuery: false when the user is asking about document CONTENT (like "documents about marketing", "what is our refund policy").

When an owner/author is mentioned:
- Extract the person's name into the "owner" field
- Include variations like "author:Name", "owner:Name", "by Name", "created by Name" in the searchQuery to find documents where the person is mentioned
- This allows semantic search to find documents that mention the person as author/owner in their content

Calculate actual dates (YYYY-MM-DD format) for relative terms like "last week", "yesterday", "this month" based on current date ${todayStr}.
Respond with ONLY the JSON, no markdown or explanation.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to your workspace.');
      }
      throw new Error('Failed to parse query intent');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('AI response:', content);

    // Parse the JSON response
    let parsedIntent: ParsedIntent;
    try {
      // Remove any markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedIntent = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', content);
      // Fallback to treating as a regular search
      parsedIntent = {
        searchQuery: query,
        sortBy: 'relevance',
        timeFilter: null,
        docTypes: null,
        limit: null,
        isMetadataQuery: false,
        owner: null,
      };
    }

    console.log('Parsed intent:', parsedIntent);

    return new Response(
      JSON.stringify(parsedIntent),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in parse-query-intent:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
