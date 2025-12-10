import { supabase } from '@/integrations/supabase/client';

export interface DocumentMetadata {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  sourceType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MetadataQueryResult {
  documents: DocumentMetadata[];
  totalCount: number;
}

export const queryDocumentsByMetadata = async (
  sortBy: 'newest' | 'oldest' = 'newest',
  limit: number = 10,
  timeFilter?: { startDate?: string; endDate?: string } | null,
  docTypes?: string[] | null
): Promise<MetadataQueryResult> => {
  let query = supabase
    .from('documents')
    .select('id, title, file_name, file_type, file_size, source_type, created_at, updated_at');

  // Apply time filter
  if (timeFilter) {
    if (timeFilter.startDate) {
      // Ensure start date includes beginning of day
      const startDateStr = timeFilter.startDate.includes('T') 
        ? timeFilter.startDate 
        : `${timeFilter.startDate}T00:00:00.000Z`;
      console.log('Applying startDate filter:', startDateStr);
      query = query.gte('created_at', startDateStr);
    }
    if (timeFilter.endDate) {
      // Ensure end date includes end of day
      const endDateStr = timeFilter.endDate.includes('T') 
        ? timeFilter.endDate 
        : `${timeFilter.endDate}T23:59:59.999Z`;
      console.log('Applying endDate filter:', endDateStr);
      query = query.lte('created_at', endDateStr);
    }
  }

  // Apply doc type filter
  if (docTypes && docTypes.length > 0) {
    const mimeTypes: string[] = [];
    docTypes.forEach(type => {
      if (type.toLowerCase() === 'pdf') {
        mimeTypes.push('application/pdf');
      } else if (type.toLowerCase() === 'docx' || type.toLowerCase() === 'word') {
        mimeTypes.push('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      }
    });
    if (mimeTypes.length > 0) {
      query = query.in('file_type', mimeTypes);
    }
  }

  // Apply sort order
  query = query.order('created_at', { ascending: sortBy === 'oldest' });

  // Apply limit
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('Metadata query error:', error);
    throw new Error(error.message || 'Failed to query documents');
  }

  const documents: DocumentMetadata[] = (data || []).map(doc => ({
    id: doc.id,
    title: doc.title,
    fileName: doc.file_name,
    fileType: doc.file_type,
    fileSize: doc.file_size,
    sourceType: doc.source_type,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  }));

  return {
    documents,
    totalCount: documents.length,
  };
};
