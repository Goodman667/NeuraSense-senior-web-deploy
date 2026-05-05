-- ============================================================
-- NeuraSense: user_profile 表
-- 存储 onboarding 数据、用户目标、偏好、提醒设置
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profile (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT NOT NULL UNIQUE,          -- 关联 users 表的 id
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,

    -- Step 1: 目标选择 (JSON 数组, 如 ["stress","sleep","anxiety"])
    goals           JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Step 2: 使用偏好
    reminder_freq   TEXT NOT NULL DEFAULT 'daily',  -- 'none' | 'daily' | 'twice' | 'hourly'
    practices       JSONB NOT NULL DEFAULT '[]'::jsonb,  -- 如 ["breathing","meditation","cbt","writing"]
    reminder_time   TEXT NOT NULL DEFAULT '09:00',  -- HH:MM 格式

    -- Step 3: 基线评估 (0-10)
    baseline_sleep    INT,
    baseline_stress   INT,
    baseline_mood     INT,
    baseline_energy   INT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profile_updated
    BEFORE UPDATE ON user_profile
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_profile_user_id ON user_profile(user_id);
