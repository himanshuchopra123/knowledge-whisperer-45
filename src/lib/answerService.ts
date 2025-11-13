import { supabase } from '@/integrations/supabase/client';
import type { SearchFilters } from './searchService';

export interface AnswerSource {
  sourceNumber: number;
  documentTitle: string;
  fileName: string;
  chunkText: string;
  similarity: number;
  documentId: string;
}

export interface AnswerResponse {
  answer: string;
  sources: AnswerSource[];
  question: string;
}

export const generateAnswer = async (
  question: string,
  filters: SearchFilters = {},
  maxResults: number = 5
): Promise<AnswerResponse> => {
  const { data, error } = await supabase.functions.invoke('generate-answer', {
    body: {
      question,
      filters,
      maxResults,
    },
  });

  if (error) {
    console.error('Answer generation error:', error);
    throw new Error(error.message || 'Failed to generate answer');
  }

  if (!data) {
    throw new Error('No response from answer generation service');
  }

  return data as AnswerResponse;
};
