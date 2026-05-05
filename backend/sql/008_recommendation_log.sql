-- =====================================================
-- 008: JITAI v2 推荐日志表
-- 记录每次推荐及用户近端结果（opened/completed/dismissed）
-- =====================================================

CREATE TABLE IF NOT EXISTS recommendation_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT NOT NULL,
    rule_id         TEXT NOT NULL,           -- 触发规则 ID
    tool_id         TEXT,                    -- 推荐的工具 ID（可为空，如 gentle_nudge）
    action_type     TEXT NOT NULL DEFAULT 'recommend_tool',
    reason_zh       TEXT,                    -- 推荐理由（中文）
    tier            TEXT NOT NULL DEFAULT 'MAINTENANCE',
    priority        INT NOT NULL DEFAULT 0,

    -- 触发时的上下文快照
    context_snapshot JSONB DEFAULT '{}'::jsonb,

    -- 近端结果追踪
    status          TEXT NOT NULL DEFAULT 'delivered',   -- delivered/opened/completed/dismissed/abandoned
    opened_at       TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    dismissed_at    TIMESTAMPTZ,
    duration_sec    INT,                     -- 使用时长（秒）

    -- 随访反馈
    post_mood       INT,                     -- 干预后心情 (1-10)
    helpfulness     INT,                     -- 主观有用性 (1-5)

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引：按用户 + 时间查询
CREATE INDEX IF NOT EXISTS idx_rec_log_user_time
    ON recommendation_log (user_id, created_at DESC);

-- 索引：按规则统计效能
CREATE INDEX IF NOT EXISTS idx_rec_log_rule
    ON recommendation_log (rule_id, status);
