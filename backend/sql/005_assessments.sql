-- ============================================================
-- NeuraSense: 测评中心 — 建表 + 种子数据
-- ============================================================

-- 1) 测评目录表
CREATE TABLE IF NOT EXISTS assessments_catalog (
    key             TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    subtitle        TEXT NOT NULL DEFAULT '',
    description     TEXT NOT NULL DEFAULT '',
    category        TEXT NOT NULL DEFAULT 'emotion',
    estimated_minutes INT NOT NULL DEFAULT 3,
    icon            TEXT NOT NULL DEFAULT '',
    gradient        TEXT NOT NULL DEFAULT 'from-blue-400 to-indigo-500',
    tags            JSONB NOT NULL DEFAULT '[]'::jsonb,
    question_count  INT NOT NULL DEFAULT 0,
    score_range     TEXT NOT NULL DEFAULT '',
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) 测评结果表
CREATE TABLE IF NOT EXISTS assessment_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT NOT NULL,
    assessment_key  TEXT NOT NULL REFERENCES assessments_catalog(key),
    total_score     INT NOT NULL,
    raw_score       INT,
    severity        TEXT NOT NULL DEFAULT '',
    answers         JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_interpretation TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_assessment_results_user ON assessment_results(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_key ON assessment_results(assessment_key);
CREATE INDEX IF NOT EXISTS idx_assessment_results_created ON assessment_results(created_at DESC);

-- RLS (开发阶段关闭)
ALTER TABLE assessments_catalog DISABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 种子数据: 测评目录
-- ============================================================

INSERT INTO assessments_catalog (key, title, subtitle, description, category, estimated_minutes, icon, gradient, tags, question_count, score_range, enabled, sort_order) VALUES

('phq9', 'PHQ-9', '患者健康问卷-9',
 '国际通用的抑郁筛查量表，9 道题快速评估过去两周的抑郁症状严重程度。被广泛应用于初级保健和心理健康筛查。',
 'emotion', 2, '😔', 'from-rose-500 to-pink-600',
 '["抑郁","情绪","筛查"]', 9, '0-27', TRUE, 1),

('gad7', 'GAD-7', '广泛性焦虑量表-7',
 '7 道题评估过去两周的广泛性焦虑水平，是全球使用最广泛的焦虑筛查工具之一。',
 'anxiety', 2, '😰', 'from-blue-500 to-cyan-600',
 '["焦虑","紧张","筛查"]', 7, '0-21', TRUE, 2),

('sds', 'SDS', '抑郁自评量表',
 '由 Zung 编制的 20 题抑郁自评量表，深度评估抑郁程度，包含正向和反向计分项目。',
 'emotion', 5, '💜', 'from-purple-500 to-violet-600',
 '["抑郁","自评","深度"]', 20, '25-100', TRUE, 3),

('sas', 'SAS', '焦虑自评量表',
 '由 Zung 编制的 20 题焦虑自评量表，全面评估焦虑相关的身心症状，含标准分换算。',
 'anxiety', 5, '🧡', 'from-orange-500 to-amber-600',
 '["焦虑","自评","深度"]', 20, '25-100', TRUE, 4),

('pss10', 'PSS-10', '压力感知量表',
 '由 Cohen 等人开发的 10 道题经典量表，评估过去一个月的压力感知水平。',
 'stress', 3, '💪', 'from-indigo-500 to-purple-600',
 '["压力","感知","月度"]', 10, '0-40', TRUE, 5),

-- 预留：未启用
('isi', 'ISI', '失眠严重程度指数',
 '7 道题评估失眠严重程度，适用于睡眠问题筛查和疗效追踪。',
 'sleep', 3, '🌙', 'from-indigo-400 to-blue-500',
 '["失眠","睡眠"]', 7, '0-28', FALSE, 10),

('asrs', 'ASRS-v1.1', '成人 ADHD 自评量表',
 '6 道题筛查成人注意力缺陷多动障碍（ADHD），世界卫生组织推荐工具。',
 'focus', 2, '🎯', 'from-amber-400 to-orange-500',
 '["注意力","ADHD","专注"]', 6, '0-24', FALSE, 11)

ON CONFLICT (key) DO NOTHING;
