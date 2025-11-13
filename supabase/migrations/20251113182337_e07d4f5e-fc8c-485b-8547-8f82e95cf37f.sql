-- Drop and recreate the match_document_chunks function to bypass RLS
DROP FUNCTION IF EXISTS match_document_chunks(vector, double precision, integer);

CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 50
)
RETURNS TABLE(
  id uuid,
  document_id uuid,
  chunk_index integer,
  chunk_text text,
  similarity double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.chunk_index,
    document_chunks.chunk_text,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  FROM document_chunks
  WHERE 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;