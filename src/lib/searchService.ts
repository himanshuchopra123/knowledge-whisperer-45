import { supabase } from '@/integrations/supabase/client';

export interface SearchFilters {
  sources?: string[];
  timeFilter?: {
    startDate?: string;
    endDate?: string;
  };
  docTypes?: string[];
}

export interface SearchResult {
  id: string;
  documentId: string;
  documentTitle: string;
  fileName: string;
  fileType: string;
  chunkText: string;
  chunkIndex: number;
  similarity: number;
  recencyScore: number;
  positionScore: number;
  metadataScore: number;
  finalScore: number;
  createdAt: string;
}

export interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
  config: {
    similarityWeight: number;
    recencyWeight: number;
    positionWeight: number;
    metadataWeight: number;
  };
}

export const performSemanticSearch = async (
  query: string,
  filters: SearchFilters = {},
  maxResults: number = 20,
  similarityThreshold: number = 0.7
): Promise<SearchResponse> => {
  const { data, error } = await supabase.functions.invoke('semantic-search', {
    body: {
      query,
      maxResults,
      similarityThreshold,
      ...filters,
    },
  });

  if (error) {
    console.error('Search error:', error);
    throw new Error(error.message || 'Failed to perform search');
  }

  return data as SearchResponse;
};
