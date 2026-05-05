-- =====================================================
-- 009: 站内通知表
-- 系统提醒、JITAI推荐、课程完成奖励、社区互动通知
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT NOT NULL,
    type            TEXT NOT NULL DEFAULT 'system',   -- system / jitai / achievement / community / reminder
    title           TEXT NOT NULL,
    content         TEXT,
    read            BOOLEAN NOT NULL DEFAULT false,
    meta            JSONB DEFAULT '{}'::jsonb,         -- 额外数据 (tool_id, program_id, badge_id 等)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引：按用户 + 未读 + 时间查询
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications (user_id, read, created_at DESC);

-- 索引：按类型统计
CREATE INDEX IF NOT EXISTS idx_notifications_type
    ON notifications (user_id, type);
