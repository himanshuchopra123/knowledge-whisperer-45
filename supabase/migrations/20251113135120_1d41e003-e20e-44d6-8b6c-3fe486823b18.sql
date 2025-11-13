-- Update document_chunks table to use 384-dimensional vectors for all-MiniLM-L6-v2 embeddings
ALTER TABLE document_chunks 
ALTER COLUMN embedding TYPE vector(384);