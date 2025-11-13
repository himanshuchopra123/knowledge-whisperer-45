import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchParams {
  query: string;
  maxResults?: number;
  similarityThreshold?: number;
  sources?: string[];
  timeFilter?: {
    startDate?: string;
    endDate?: string;
  };
  docTypes?: string[];
}

interface RankingConfig {
  similarityWeight: number;
  recencyWeight: number;
  positionWeight: number;
  metadataWeight: number;
}

const DEFAULT_CONFIG: RankingConfig = {
  similarityWeight: 0.5,
  recencyWeight: 0.2,
  positionWeight: 0.15,
  metadataWeight: 0.15,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const huggingFaceToken = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      query,
      maxResults = 20,
      similarityThreshold = 0.7,
      sources = [],
      timeFilter,
      docTypes = [],
    }: SearchParams = await req.json();

    if (!query || query.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Performing semantic search for:', query);

    // Generate embedding for the search query
    const embeddingResponse = await fetch(
      'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${huggingFaceToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: query }),
      }
    );

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('HuggingFace API error:', embeddingResponse.status, errorText);
      throw new Error(`Failed to generate query embedding: ${embeddingResponse.status} - ${errorText}`);
    }

    const queryEmbedding = await embeddingResponse.json();
    
    // Check if the response is valid
    if (!queryEmbedding || !Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      console.error('Invalid embedding response:', queryEmbedding);
      throw new Error('Invalid embedding response from HuggingFace');
    }
    
    console.log('Query embedding generated successfully');

    // Get user ID from authorization header
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    let userId: string | null = null;
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query with filters
    let chunksQuery = supabase
      .rpc('match_document_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: similarityThreshold,
        match_count: maxResults * 2, // Retrieve more for re-ranking
      });

    // Fetch matching chunks with document metadata
    const { data: chunks, error: chunksError } = await chunksQuery;

    if (chunksError) {
      console.error('Error fetching chunks:', chunksError);
      throw chunksError;
    }

    if (!chunks || chunks.length === 0) {
      console.log('No matching chunks found');
      return new Response(
        JSON.stringify({ results: [], totalResults: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${chunks.length} matching chunks`);

    // Fetch document metadata for all chunks
    const documentIds = [...new Set(chunks.map((c: any) => c.document_id))];
    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .in('id', documentIds)
      .eq('user_id', userId);

    const documentsMap = new Map(documents?.map(doc => [doc.id, doc]) || []);

    // Apply filters
    let filteredChunks = chunks.filter((chunk: any) => {
      const doc = documentsMap.get(chunk.document_id);
      if (!doc) return false;

      // Source filter (document IDs)
      if (sources.length > 0 && !sources.includes(chunk.document_id)) {
        return false;
      }

      // Time filter
      if (timeFilter) {
        const docDate = new Date(doc.created_at);
        if (timeFilter.startDate && docDate < new Date(timeFilter.startDate)) {
          return false;
        }
        if (timeFilter.endDate && docDate > new Date(timeFilter.endDate)) {
          return false;
        }
      }

      // Document type filter
      if (docTypes.length > 0 && !docTypes.includes(doc.file_type)) {
        return false;
      }

      return true;
    });

    console.log(`${filteredChunks.length} chunks after filtering`);

    // Apply ranking algorithm
    const rankedResults = filteredChunks.map((chunk: any) => {
      const doc = documentsMap.get(chunk.document_id)!;
      
      // Calculate individual scores
      const similarityScore = chunk.similarity || 0;
      
      // Recency score (newer is better, normalized to 0-1)
      const daysSinceCreation = (Date.now() - new Date(doc.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - (daysSinceCreation / 365)); // Decay over a year
      
      // Position score (earlier chunks rank higher)
      const positionScore = Math.max(0, 1 - (chunk.chunk_index / 100));
      
      // Metadata score (exact matches in title/filename)
      const queryLower = query.toLowerCase();
      const titleMatch = doc.title.toLowerCase().includes(queryLower) ? 1 : 0;
      const filenameMatch = doc.file_name.toLowerCase().includes(queryLower) ? 1 : 0;
      const metadataScore = Math.max(titleMatch, filenameMatch);

      // Weighted final score
      const finalScore = 
        (similarityScore * DEFAULT_CONFIG.similarityWeight) +
        (recencyScore * DEFAULT_CONFIG.recencyWeight) +
        (positionScore * DEFAULT_CONFIG.positionWeight) +
        (metadataScore * DEFAULT_CONFIG.metadataWeight);

      return {
        id: chunk.id,
        documentId: chunk.document_id,
        documentTitle: doc.title,
        fileName: doc.file_name,
        fileType: doc.file_type,
        chunkText: chunk.chunk_text,
        chunkIndex: chunk.chunk_index,
        similarity: similarityScore,
        recencyScore,
        positionScore,
        metadataScore,
        finalScore,
        createdAt: doc.created_at,
      };
    });

    // Sort by final score and apply diversity penalty
    rankedResults.sort((a: any, b: any) => b.finalScore - a.finalScore);

    // Apply diversity - limit chunks per document
    const diversityMap = new Map<string, number>();
    const maxChunksPerDoc = 3;
    const diverseResults = rankedResults.filter((result: any) => {
      const count = diversityMap.get(result.documentId) || 0;
      if (count < maxChunksPerDoc) {
        diversityMap.set(result.documentId, count + 1);
        return true;
      }
      return false;
    });

    // Limit to maxResults
    const finalResults = diverseResults.slice(0, maxResults);

    console.log(`Returning ${finalResults.length} ranked results`);

    // Store search history
    await supabase.from('search_history').insert({
      user_id: userId,
      query,
      sources: sources.length > 0 ? sources : null,
    });

    return new Response(
      JSON.stringify({
        results: finalResults,
        totalResults: finalResults.length,
        config: DEFAULT_CONFIG,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in semantic-search:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
