-- ============================================================
-- SQL Script cho Supabase: Tạo bảng Vector DB cho AI Help Center
-- Chạy script này trên Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Bật extension pgvector (hỗ trợ kiểu dữ liệu VECTOR)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tạo bảng lưu trữ tài liệu + vector embedding
CREATE TABLE IF NOT EXISTS help_documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding VECTOR(768),  -- Gemini embedding-001 output 768 chiều
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tạo index cho tìm kiếm vector nhanh (IVFFlat)
CREATE INDEX IF NOT EXISTS help_documents_embedding_idx 
ON help_documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 4. Tạo hàm tìm kiếm theo độ tương đồng (Cosine Similarity)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    help_documents.id,
    help_documents.content,
    help_documents.metadata,
    1 - (help_documents.embedding <=> query_embedding) AS similarity
  FROM help_documents
  WHERE 1 - (help_documents.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
