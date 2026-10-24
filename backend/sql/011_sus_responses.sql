-- ============================================================
-- NeuraSense: SUS 系统可用性量表（研究用）结果表
-- 在 Supabase SQL Editor 中运行一次即可。
-- 未建表时，后端会把结果写入服务器本地 data/sus_responses.json，导出时会合并两处。
-- ============================================================

CREATE TABLE IF NOT EXISTS sus_responses (
    id              UUID PRIMARY KEY,
    user_id         TEXT NOT NULL,
    username        TEXT NOT NULL DEFAULT '',
    mode            TEXT NOT NULL CHECK (mode IN ('standard', 'companion')),
    age_group       TEXT NOT NULL,
    answers         JSONB NOT NULL,
    raw_score       INT NOT NULL,
    sus_score       NUMERIC(5, 1) NOT NULL,
    usability       NUMERIC(6, 3) NOT NULL,
    learnability    NUMERIC(6, 3) NOT NULL,
    consent         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sus_responses_user ON sus_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_sus_responses_created ON sus_responses(created_at);

ALTER TABLE sus_responses DISABLE ROW LEVEL SECURITY;
