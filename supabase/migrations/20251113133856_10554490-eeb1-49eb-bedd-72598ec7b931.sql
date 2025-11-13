-- Update document_chunks table to use 1024-dimensional vectors for bge-m3 embeddings
ALTER TABLE document_chunks 
ALTER COLUMN embedding TYPE vector(1024);