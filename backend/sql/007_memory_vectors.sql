-- =====================================================
-- 007: Memory Vectors (pgvector)
-- 向量记忆存储表 + 语义相似度检索函数
-- =====================================================

-- Step 1: 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: 创建记忆向量表
CREATE TABLE IF NOT EXISTS memory_vectors (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT NOT NULL,
    content     TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'user',
    embedding   vector(1024),
    metadata    JSONB DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 3: 用户 + 时间索引
CREATE INDEX IF NOT EXISTS idx_memory_user_time
    ON memory_vectors (user_id, created_at DESC);

-- Step 4: HNSW 向量索引 (cosine similarity)
CREATE INDEX IF NOT EXISTS idx_memory_embedding
    ON memory_vectors
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Step 5: RPC 函数 — 向量相似度检索
CREATE OR REPLACE FUNCTION match_memories(
    query_embedding    vector(1024),
    match_user_id      TEXT,
    match_days         INT DEFAULT 3,
    match_count        INT DEFAULT 5
)
RETURNS TABLE (
    id          UUID,
    user_id     TEXT,
    content     TEXT,
    role        TEXT,
    metadata    JSONB,
    created_at  TIMESTAMPTZ,
    similarity  FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        mv.id,
        mv.user_id,
        mv.content,
        mv.role,
        mv.metadata,
        mv.created_at,
        (1 - (mv.embedding <=> query_embedding))::FLOAT AS similarity
    FROM memory_vectors mv
    WHERE mv.user_id = match_user_id
      AND mv.created_at > now() - make_interval(days => match_days)
    ORDER BY mv.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
