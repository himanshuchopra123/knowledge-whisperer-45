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

    console.log('=== GENERATE ANSWER START ===');
    console.log('Question:', question);
    console.log('Filters:', JSON.stringify(filters));
    console.log('Max results:', maxResults);

    // Get auth credentials for calling semantic-search
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Use case-insensitive header access (HTTP headers are case-insensitive)
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    
    console.log('Auth header present:', !!authHeader);
    console.log('Auth header value (first 20 chars):', authHeader?.substring(0, 20) + '...');

    // Call semantic search with direct fetch to ensure auth is passed correctly
    console.log('Calling semantic-search with URL:', `${supabaseUrl}/functions/v1/semantic-search`);
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

    console.log('Search response status:', searchResponse.status);

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Search response error:', searchResponse.status, errorText);
      throw new Error(`Failed to retrieve context: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    console.log('Search data received:', JSON.stringify({
      hasResults: !!searchData?.results,
      resultsCount: searchData?.results?.length || 0,
      error: searchData?.error
    }));
    
    if (searchData.error) {
      console.error('Search error:', searchData.error);
      throw new Error(`Failed to retrieve context: ${searchData.error}`);
    }

    if (!searchData || !searchData.results || searchData.results.length === 0) {
      console.log('No search results found - returning no-info response');
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
    console.log('First chunk preview:', searchData.results[0]?.chunkText?.substring(0, 100) + '...');

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

    // Format sources first (so we can return them even if AI fails)
    const sources = searchData.results.map((result: any, index: number) => ({
      sourceNumber: index + 1,
      documentTitle: result.documentTitle,
      fileName: result.fileName,
      chunkText: result.chunkText,
      similarity: result.similarity,
      documentId: result.documentId,
    }));

    // Call Lovable AI
    console.log('=== CALLING LOVABLE AI ===');
    console.log('Context length:', contextChunks.length, 'characters');
    console.log('User prompt length:', userPrompt.length, 'characters');
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      // Return sources with error message instead of throwing
      return new Response(
        JSON.stringify({
          answer: "I found relevant documents but couldn't generate an answer (API key not configured). Please check the sources below.",
          sources,
          question,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('LOVABLE_API_KEY present:', !!lovableApiKey);
    console.log('API key length:', lovableApiKey.length);

    const aiRequestBody = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
    };
    console.log('AI request body (without content):', JSON.stringify({
      model: aiRequestBody.model,
      messageCount: aiRequestBody.messages.length,
    }));

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(aiRequestBody),
    });

    console.log('AI response status:', aiResponse.status);
    console.log('AI response ok:', aiResponse.ok);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      let errorMessage = 'Failed to generate answer from AI';
      if (aiResponse.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (aiResponse.status === 402) {
        errorMessage = 'AI credits exhausted. Please add credits to your workspace.';
      }
      
      // Return sources with error message instead of throwing
      return new Response(
        JSON.stringify({
          answer: `I found relevant documents but couldn't generate an answer: ${errorMessage}. Please review the sources below.`,
          sources,
          question,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const aiData = await aiResponse.json();
    console.log('AI response data:', JSON.stringify({
      hasChoices: !!aiData.choices,
      choicesLength: aiData.choices?.length,
      hasMessage: !!aiData.choices?.[0]?.message,
      hasContent: !!aiData.choices?.[0]?.message?.content,
      contentLength: aiData.choices?.[0]?.message?.content?.length,
    }));

    const answer = aiData.choices?.[0]?.message?.content;

    if (!answer) {
      console.error('No answer in AI response:', JSON.stringify(aiData));
      // Return sources with error message instead of throwing
      return new Response(
        JSON.stringify({
          answer: "I found relevant documents but the AI returned an empty response. Please review the sources below.",
          sources,
          question,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('=== ANSWER GENERATED SUCCESSFULLY ===');
    console.log('Answer length:', answer.length, 'characters');
    console.log('Answer preview:', answer.substring(0, 100) + '...');

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
