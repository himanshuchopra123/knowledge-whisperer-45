import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, filters = {}, maxResults = 5 } = await req.json();

    if (!question) {
      throw new Error('Question is required');
    }

    console.log('Generating answer for question:', question);

    // Get auth credentials for calling semantic-search
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');
    
    console.log('Auth header present:', !!authHeader);

    // Call semantic search with direct fetch to ensure auth is passed correctly
    console.log('Calling semantic-search...');
    const searchResponse = await fetch(`${supabaseUrl}/functions/v1/semantic-search`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader || '',
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
      },
      body: JSON.stringify({
        query: question,
        maxResults,
        similarityThreshold: 0.15,
        ...filters,
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Search response error:', searchResponse.status, errorText);
      throw new Error(`Failed to retrieve context: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    if (searchData.error) {
      console.error('Search error:', searchData.error);
      throw new Error(`Failed to retrieve context: ${searchData.error}`);
    }

    if (!searchData || !searchData.results || searchData.results.length === 0) {
      return new Response(
        JSON.stringify({
          answer: "I couldn't find any relevant information in the knowledge base to answer your question. Please try rephrasing or ask something else.",
          sources: [],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Found', searchData.results.length, 'relevant chunks');

    // Prepare context from search results
    const contextChunks = searchData.results.map((result: any, index: number) => {
      return `[Source ${index + 1}] ${result.documentTitle} (${result.fileName}):\n${result.chunkText}`;
    }).join('\n\n');

    // Prepare prompt for Lovable AI
    const systemPrompt = `You are a helpful AI assistant that answers questions based on a knowledge base. 
Your task is to provide accurate, well-structured answers based ONLY on the provided context.

Guidelines:
- Answer the question directly and concisely
- Use information from the context provided
- If the context doesn't contain enough information, say so
- Reference source numbers when using specific information (e.g., "According to Source 1...")
- Be factual and avoid speculation
- Format your answer in clear paragraphs or bullet points when appropriate`;

    const userPrompt = `Context from knowledge base:
${contextChunks}

Question: ${question}

Please provide a comprehensive answer based on the context above.`;

    // Call Lovable AI
    console.log('Calling Lovable AI...');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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
          { role: 'user', content: userPrompt }
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
      throw new Error('Failed to generate answer from AI');
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content;

    if (!answer) {
      throw new Error('No answer generated from AI');
    }

    console.log('Answer generated successfully');

    // Format sources
    const sources = searchData.results.map((result: any, index: number) => ({
      sourceNumber: index + 1,
      documentTitle: result.documentTitle,
      fileName: result.fileName,
      chunkText: result.chunkText,
      similarity: result.similarity,
      documentId: result.documentId,
    }));

    return new Response(
      JSON.stringify({
        answer,
        sources,
        question,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-answer:', error);
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
