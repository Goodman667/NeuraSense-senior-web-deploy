-- ============================================================
-- NeuraSense: 结构化练习记录 — 建表
-- ============================================================

-- 练习记录表
CREATE TABLE IF NOT EXISTS exercise_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT NOT NULL,
    exercise_type   TEXT NOT NULL,                   -- 'THOUGHT_RECORD' | 'BEHAVIOR_ACTIVATION'
    status          TEXT NOT NULL DEFAULT 'completed',
    trigger_source  TEXT NOT NULL DEFAULT 'chat',    -- 'chat' | 'manual' | 'jitai'
    session_id      TEXT,                            -- chat session that triggered it
    exercise_data   JSONB NOT NULL DEFAULT '{}'::jsonb,
    post_mood       INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_exercise_records_user ON exercise_records(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_records_type ON exercise_records(exercise_type);
CREATE INDEX IF NOT EXISTS idx_exercise_records_created ON exercise_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_records_user_date ON exercise_records(user_id, created_at DESC);

-- RLS (开发阶段关闭)
ALTER TABLE exercise_records DISABLE ROW LEVEL SECURITY;
