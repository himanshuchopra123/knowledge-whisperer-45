import { supabase } from '@/integrations/supabase/client';

export interface ParsedIntent {
  searchQuery: string | null;
  sortBy: 'relevance' | 'newest' | 'oldest';
  timeFilter: {
    startDate?: string;
    endDate?: string;
  } | null;
  docTypes: string[] | null;
  limit: number | null;
  isMetadataQuery: boolean;
  owner: string | null;
}

export const parseQueryIntent = async (query: string): Promise<ParsedIntent> => {
  const { data, error } = await supabase.functions.invoke('parse-query-intent', {
    body: { query },
  });

  if (error) {
    console.error('Intent parsing error:', error);
    // Fallback to treating as regular search
    return {
      searchQuery: query,
      sortBy: 'relevance',
      timeFilter: null,
      docTypes: null,
      limit: null,
      isMetadataQuery: false,
      owner: null,
    };
  }

  return data as ParsedIntent;
};
