-- ============================================================
-- NeuraSense: 课程/项目系统 — 建表 + 种子数据
-- ============================================================

-- 1) 项目元数据表
CREATE TABLE IF NOT EXISTS programs (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    subtitle        TEXT NOT NULL DEFAULT '',
    description     TEXT NOT NULL DEFAULT '',
    icon            TEXT NOT NULL DEFAULT '',
    gradient        TEXT NOT NULL DEFAULT 'from-green-400 to-teal-500',
    duration_days   INT NOT NULL DEFAULT 7,
    daily_minutes   INT NOT NULL DEFAULT 10,
    category        TEXT NOT NULL DEFAULT 'general',
    tags            JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) 每天内容表
CREATE TABLE IF NOT EXISTS program_days (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id      TEXT NOT NULL REFERENCES programs(id),
    day_number      INT NOT NULL,
    title           TEXT NOT NULL,
    learn_text      TEXT NOT NULL DEFAULT '',
    tool_id         TEXT REFERENCES tool_items(id),
    review_question TEXT NOT NULL DEFAULT '',
    tip             TEXT,
    UNIQUE (program_id, day_number)
);

-- 3) 用户进度表
CREATE TABLE IF NOT EXISTS program_progress (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT NOT NULL,
    program_id      TEXT NOT NULL REFERENCES programs(id),
    current_day     INT NOT NULL DEFAULT 1,
    completed_days  JSONB NOT NULL DEFAULT '[]'::jsonb,
    review_answers  JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, program_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_program_days_program ON program_days(program_id);
CREATE INDEX IF NOT EXISTS idx_program_progress_user ON program_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_program_progress_program ON program_progress(program_id);

-- RLS (开发阶段关闭)
ALTER TABLE programs DISABLE ROW LEVEL SECURITY;
ALTER TABLE program_days DISABLE ROW LEVEL SECURITY;
ALTER TABLE program_progress DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 种子数据: 项目元数据
-- ============================================================

INSERT INTO programs (id, title, subtitle, description, icon, gradient, duration_days, daily_minutes, category, tags, sort_order) VALUES

('stress-7', '7 天减压训练营', '每天 10 分钟，科学管理压力', '基于循证心理学的 7 天压力管理课程。融合呼吸训练、正念冥想、认知行为疗法，帮助你建立一套可持续的压力应对系统。每天只需 10 分钟，从身体放松到认知重构，循序渐进地掌握减压技能。',
 '🌿', 'from-emerald-400 to-teal-500', 7, 10, 'stress', '["减压","呼吸","正念","CBT"]', 1),

('sleep-7', '7 天睡眠改善计划', 'CBT-I 精简版，重建健康睡眠', '基于失眠认知行为疗法（CBT-I）的 7 天睡眠改善课程。通过睡眠卫生教育、放松训练、认知重构，帮助你告别失眠，建立规律的睡眠节律。',
 '🌙', 'from-indigo-400 to-violet-500', 7, 10, 'sleep', '["睡眠","助眠","放松"]', 2),

('focus-7', '7 天专注力提升', '训练注意力，提高效率', '结合正念注意力训练和番茄工作法的 7 天专注力课程。通过渐进式注意力练习，帮助你减少分心，提升深度工作能力。',
 '🎯', 'from-amber-400 to-orange-500', 7, 15, 'focus', '["专注","效率","正念"]', 3),

('emotion-7', '7 天情绪管理', 'DBT + 积极心理学实践', '融合辩证行为疗法（DBT）和积极心理学的情绪管理课程。学习识别情绪、调节情绪、表达情绪的技能。',
 '💛', 'from-rose-400 to-pink-500', 7, 10, 'emotion', '["情绪","DBT","积极心理"]', 4)

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 种子数据: 7 天减压训练营 — 每日内容
-- ============================================================

INSERT INTO program_days (program_id, day_number, title, learn_text, tool_id, review_question, tip) VALUES

('stress-7', 1,
 '认识压力 — 身体信号觉察',
 '压力并不总是坏事。适度的压力（良性压力 eustress）能激发潜能，但长期的慢性压力会损害身心健康。\n\n今天的目标是觉察压力在你身体上的表现：肩膀紧绷？胃部不适？呼吸变浅？\n\n了解自己的压力信号是管理压力的第一步。',
 'mindfulness-body-scan',
 '完成身体扫描后，你注意到身体哪个部位最紧张？',
 '不需要改变什么，只是观察和感受。'),

('stress-7', 2,
 '呼吸即药 — 激活副交感神经',
 '当我们感到压力时，交感神经系统会被激活（战斗或逃跑反应），心率加快，呼吸变浅。\n\n好消息是，我们可以通过刻意控制呼吸来「反向操作」——延长呼气时间能激活副交感神经（休息与消化系统），快速降低生理唤醒水平。\n\n4-7-8 呼吸法正是基于这个原理。',
 'breathing-478',
 '练习 4-7-8 呼吸后，你的身体感受有什么变化？',
 '每天练习 2-3 次，效果会随时间累积。'),

('stress-7', 3,
 '箱式呼吸 — 任何场景都能用的减压工具',
 '箱式呼吸（Box Breathing）最初由美国海豹突击队使用，用于在高压环境下快速恢复冷静。\n\n它的原理简单：吸气、屏息、呼气、屏息各 4 秒，形成一个「正方形」节奏。这种规律的呼吸模式能快速稳定心率变异性（HRV），是一种随时随地可用的减压工具。\n\n开会前紧张？考试前焦虑？通勤路上烦躁？试试箱式呼吸。',
 'breathing-box',
 '你打算在什么日常场景中使用箱式呼吸？',
 '想象一个正方形，沿着四条边呼吸。'),

('stress-7', 4,
 '认知重构 — 改变想法就能改变感受',
 'CBT（认知行为疗法）的核心观点：不是事件本身让我们痛苦，而是我们对事件的「解读」导致了痛苦。\n\n举个例子：同样是下雨，「糟糕，又下雨了」vs「正好适合在家看书」——两种想法带来完全不同的情绪。\n\n今天我们学习用「自动化思维记录」来捕捉那些自动冒出来的消极想法，然后像侦探一样审视它们：有证据支持吗？有没有更平衡的看法？',
 'cbt-thought-record',
 '你捕捉到了什么自动化消极想法？重新审视后有什么新的看法？',
 '消极想法不是事实，只是想法。'),

('stress-7', 5,
 '肌肉放松 — 身体放松了，心也会跟着放松',
 '渐进式肌肉放松（PMR）由 Edmund Jacobson 在 1930 年代发明。原理是：当你故意紧张一组肌肉再释放，大脑会更清晰地感受到「放松」的状态。\n\n研究表明，PMR 能有效降低皮质醇水平、改善睡眠质量、减轻焦虑症状。\n\n今天从头到脚逐步放松每个肌群。很多人做完后会觉得身体变暖、变重——这就是深层放松的感觉。',
 'pmr',
 '做完渐进式肌肉放松后，1-10 分你给自己的放松程度打几分？',
 '睡前做效果特别好。'),

('stress-7', 6,
 '担忧管理 — 给担忧一个固定的「约会时间」',
 '你是否发现自己总是在各种时候被担忧打扰——工作时、吃饭时、准备睡觉时？\n\n「担忧时间」是一种悖论式的干预技术：与其试图压制担忧（反而会适得其反），不如给它一个固定的时间段。\n\n规则很简单：白天任何时候冒出担忧，告诉自己「我一会儿在担忧时间处理」。然后在固定时段里，集中处理所有担忧——能行动的写行动计划，不能控制的练习放下。',
 'cbt-worry-time',
 '你的担忧中，有多少是你能控制的？有多少需要放手？',
 '大部分担忧的事情永远不会发生。'),

('stress-7', 7,
 '回顾与展望 — 你已经拥有了一套减压工具箱',
 '恭喜你完成了 7 天减压训练营！让我们回顾一下这周学到的工具：\n\n- Day 1: 身体扫描 — 觉察压力信号\n- Day 2: 4-7-8 呼吸 — 激活副交感神经\n- Day 3: 箱式呼吸 — 随时随地可用\n- Day 4: 思维记录 — 认知重构\n- Day 5: 肌肉放松 — 身体层面释放\n- Day 6: 担忧时间 — 管理反刍思维\n\n今天的练习是「三件好事」——因为减压不仅是消除负面，更是增加正面体验。\n\n这些工具都在你的工具箱里，随时可以使用。坚持每天花 5-10 分钟练习其中任何一个，效果会随时间显著提升。',
 'cbt-three-good',
 '这 7 天里，哪个工具对你帮助最大？你打算如何在日常中继续使用它？',
 '结束不是终点，而是新习惯的开始。')

ON CONFLICT (program_id, day_number) DO NOTHING;
