-- ============================================================
-- NeuraSense: 每日签到 — 建表
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_checkins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT NOT NULL,
    mood            INT NOT NULL CHECK (mood BETWEEN 0 AND 10),
    stress          INT NOT NULL CHECK (stress BETWEEN 0 AND 10),
    energy          INT NOT NULL CHECK (energy BETWEEN 0 AND 10),
    sleep_quality   INT NOT NULL CHECK (sleep_quality BETWEEN 0 AND 10),
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user ON daily_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_created ON daily_checkins(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date ON daily_checkins(user_id, created_at DESC);

-- RLS (开发阶段关闭)
ALTER TABLE daily_checkins DISABLE ROW LEVEL SECURITY;
