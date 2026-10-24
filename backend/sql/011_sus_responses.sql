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
    language        TEXT NOT NULL DEFAULT 'zh',
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

-- 开启行级安全：只有后端（service_role 密钥）能读写，问卷数据不会被公开的 anon 密钥读到。
-- 若后端用的不是 service_role 密钥，写入会失败并自动改存服务器本地文件，导出时照样合并。
ALTER TABLE sus_responses ENABLE ROW LEVEL SECURITY;
