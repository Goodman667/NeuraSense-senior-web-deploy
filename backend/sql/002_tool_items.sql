-- ============================================================
-- NeuraSense: 工具箱内容引擎 — 建表 + 种子数据
-- ============================================================

-- 1) 工具卡片表
CREATE TABLE IF NOT EXISTS tool_items (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    subtitle        TEXT NOT NULL DEFAULT '',
    category        TEXT NOT NULL,            -- breathing | cbt | dbt | mindfulness | sleep | focus
    icon            TEXT NOT NULL DEFAULT '',
    duration_min    INT NOT NULL DEFAULT 5,
    difficulty      TEXT NOT NULL DEFAULT 'easy',  -- easy | medium | hard
    tags            JSONB NOT NULL DEFAULT '[]'::jsonb,
    steps           JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{title,body,duration_sec}]
    guidance        JSONB NOT NULL DEFAULT '[]'::jsonb,   -- 引导语文本数组
    audio_url       TEXT,
    image_url       TEXT,
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) 完成记录表
CREATE TABLE IF NOT EXISTS tool_completions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT NOT NULL,
    tool_id         TEXT NOT NULL REFERENCES tool_items(id),
    duration_sec    INT NOT NULL DEFAULT 0,
    rating          INT CHECK (rating BETWEEN 1 AND 5),   -- 完成感受 1-5
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) 收藏表
CREATE TABLE IF NOT EXISTS tool_favorites (
    user_id         TEXT NOT NULL,
    tool_id         TEXT NOT NULL REFERENCES tool_items(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, tool_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tool_completions_user ON tool_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_completions_tool ON tool_completions(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_items_category ON tool_items(category);

-- RLS
ALTER TABLE tool_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE tool_completions DISABLE ROW LEVEL SECURITY;
ALTER TABLE tool_favorites DISABLE ROW LEVEL SECURITY;


-- ============================================================
-- 种子数据: 12 个工具卡片
-- ============================================================

INSERT INTO tool_items (id, title, subtitle, category, icon, duration_min, difficulty, tags, sort_order, steps, guidance) VALUES

-- ===== 呼吸放松 =====
('breathing-478', '4-7-8 呼吸法', '经典助眠呼吸技术，激活副交感神经', 'breathing', '🌬️', 5, 'easy',
 '["助眠","减压","经典"]', 1,
 '[{"title":"准备","body":"找一个舒适的坐姿或躺姿，轻闭双眼，舌尖抵住上颚。","duration_sec":15},{"title":"吸气 4 秒","body":"用鼻子缓慢吸气，心中默数 1-2-3-4。","duration_sec":4},{"title":"屏息 7 秒","body":"温和地屏住呼吸，默数 1-2-3-4-5-6-7。","duration_sec":7},{"title":"呼气 8 秒","body":"用嘴巴缓慢呼气，发出轻微 \"呼\" 的声音，默数到 8。","duration_sec":8},{"title":"重复","body":"重复以上吸气-屏息-呼气循环，共做 4 轮。","duration_sec":60}]',
 '["现在，让我们一起放慢呼吸的节奏。","用鼻子慢慢吸气……1，2，3，4。","屏住呼吸……保持住……","现在缓缓呼气……感受身体的放松。"]'),

('breathing-box', '箱式呼吸', '美国海豹突击队使用的压力管理技术', 'breathing', '📦', 4, 'easy',
 '["减压","专注","军事"]', 2,
 '[{"title":"准备","body":"端坐，双脚平放地面，双手放在膝盖上。","duration_sec":10},{"title":"吸气 4 秒","body":"缓慢吸气，想象沿着正方形的第一条边移动。","duration_sec":4},{"title":"屏息 4 秒","body":"屏住呼吸，沿正方形第二条边。","duration_sec":4},{"title":"呼气 4 秒","body":"缓慢呼气，沿第三条边。","duration_sec":4},{"title":"屏息 4 秒","body":"再次屏息，沿第四条边，回到起点。","duration_sec":4},{"title":"循环","body":"重复 4-6 轮，找到你自己的呼吸节奏。","duration_sec":80}]',
 '["想象一个正方形漂浮在你面前。","沿着第一条边，吸气……","保持……","沿着下一条边，呼气……"]'),

('pmr', '渐进式肌肉放松', '逐步紧张-放松各肌群，释放身体压力', 'breathing', '💪', 12, 'medium',
 '["身体放松","睡前","肌肉"]', 3,
 '[{"title":"双手","body":"握紧双拳保持 5 秒，然后完全松开，感受手掌的温暖和放松。","duration_sec":30},{"title":"手臂","body":"弯曲手臂绷紧肱二头肌 5 秒，然后放松，感受手臂沉重下坠。","duration_sec":30},{"title":"肩膀","body":"将双肩用力提到耳朵附近 5 秒，然后让肩膀自然下落。","duration_sec":30},{"title":"面部","body":"紧闭双眼，咬紧牙关 5 秒，然后放松面部所有肌肉。","duration_sec":30},{"title":"腹部","body":"收紧腹部肌肉 5 秒，然后放松。感受腹部随呼吸起伏。","duration_sec":30},{"title":"双腿","body":"伸直双腿绷紧大腿 5 秒，然后放松。","duration_sec":30},{"title":"双脚","body":"脚趾用力向下卷曲 5 秒，然后完全放松。","duration_sec":30},{"title":"全身扫描","body":"从头到脚慢慢感受全身的放松状态，保持几分钟。","duration_sec":60}]',
 '["我们将从双手开始，逐渐放松全身。","握紧拳头……保持……","现在放松……感受紧张消退。"]'),

-- ===== CBT 微练习 =====
('cbt-thought-record', '自动化思维记录', '识别并挑战消极自动化思维', 'cbt', '📝', 8, 'medium',
 '["认知重构","CBT","情绪"]', 10,
 '[{"title":"描述情境","body":"简要写下让你不舒服的事件或情境。不需要太详细，一两句话即可。","duration_sec":60},{"title":"识别情绪","body":"你当时感受到了什么情绪？（如焦虑、悲伤、愤怒、挫败）给它打个强度分 0-100。","duration_sec":30},{"title":"捕捉自动思维","body":"当时你脑中闪过什么想法？原封不动地写下来。如：\"我什么都做不好\"。","duration_sec":60},{"title":"寻找证据","body":"支持这个想法的证据是什么？反对它的证据呢？","duration_sec":90},{"title":"替代思维","body":"有没有更平衡、更客观的看法？写下来。","duration_sec":60},{"title":"重新评估","body":"现在再次评估你的情绪强度 0-100。有变化吗？","duration_sec":30}]',
 '["让我们一起练习发现那些自动跳出来的想法。","写下让你困扰的事。","现在，让我们像侦探一样来审视这个想法。"]'),

('cbt-three-good', '三件好事', '积极心理学经典练习，训练大脑发现美好', 'cbt', '✨', 5, 'easy',
 '["积极心理","感恩","习惯"]', 11,
 '[{"title":"回顾今天","body":"闭上眼睛，回想今天从早到现在发生的事情。","duration_sec":30},{"title":"第一件好事","body":"写下今天发生的第一件好事，不论大小。它为什么让你感到开心？","duration_sec":60},{"title":"第二件好事","body":"再想一件。也许是一顿好吃的饭，一句温暖的话，或完成了一个小任务。","duration_sec":60},{"title":"第三件好事","body":"最后一件。试着感受写下这些事情时内心的温暖。","duration_sec":60},{"title":"感受","body":"看看你写下的三件事。深呼吸一次，让这份美好停留片刻。","duration_sec":30}]',
 '["每天都有值得感恩的事，让我们来发现它们。","回想今天……","写下第一件让你微笑的事。"]'),

('cbt-worry-time', '担忧时间', '将担忧限制在固定时段，减少反刍思维', 'cbt', '⏰', 10, 'medium',
 '["焦虑","反刍","时间管理"]', 12,
 '[{"title":"列出担忧","body":"把现在脑中所有担心的事写下来，一条一条列出。","duration_sec":120},{"title":"分类","body":"每一条标记：A=我能控制的，B=我不能控制的。","duration_sec":60},{"title":"行动计划","body":"对 A 类担忧：写下你能做的最小一步行动。","duration_sec":90},{"title":"放下 B 类","body":"对 B 类担忧：深呼吸，对自己说「这不是我能控制的，我选择放下」。","duration_sec":60},{"title":"结束","body":"担忧时间到此结束。如果之后担忧又冒出来，提醒自己「明天的担忧时间再处理」。","duration_sec":30}]',
 '["给担忧一个固定的\"约会时间\"。","把脑子里的担忧全部倒出来。","哪些是你能行动的？哪些需要放手？"]'),

-- ===== DBT 急救 =====
('dbt-stop', 'STOP 技能', 'DBT 紧急情绪调节：停—退—观—行', 'dbt', '🛑', 3, 'easy',
 '["情绪急救","DBT","冲动控制"]', 20,
 '[{"title":"S - Stop 停","body":"无论你正在做什么，立刻停下来。不要冲动行事。","duration_sec":10},{"title":"T - Take a step back 退","body":"从当前情境中后退一步。可以离开房间，或者在心里给自己按下暂停键。","duration_sec":15},{"title":"O - Observe 观","body":"观察正在发生什么。你的身体有什么感觉？脑中在想什么？情绪的名字是什么？","duration_sec":30},{"title":"P - Proceed mindfully 行","body":"带着觉知选择下一步行动。问自己：什么做法最符合我的长期利益？","duration_sec":30}]',
 '["当情绪即将失控时，用 STOP 四步急刹车。","停下来。","后退一步。","观察自己。","有意识地选择行动。"]'),

('dbt-tipp', 'TIPP 冷水急救', 'DBT 快速降低情绪温度的生理干预', 'dbt', '🧊', 5, 'easy',
 '["情绪急救","DBT","生理调节"]', 21,
 '[{"title":"T - Temperature 温度","body":"用冰水洗脸或将冰袋敷在眼周 30 秒。冷刺激激活潜水反射，快速降低心率。","duration_sec":30},{"title":"I - Intense exercise 运动","body":"快速做 20 个开合跳或原地跑步 1 分钟。剧烈运动消耗肾上腺素。","duration_sec":60},{"title":"P - Paced breathing 呼吸","body":"放慢呼吸：吸 4 秒，呼 6 秒。呼气比吸气长，激活放松反应。","duration_sec":60},{"title":"P - Progressive relaxation 放松","body":"从双手开始，逐一紧张再放松各肌群。","duration_sec":60}]',
 '["TIPP 是情绪的\"灭火器\"。","先用冷水刺激面部。","然后快速运动。","最后慢慢呼吸，放松身体。"]'),

-- ===== 正念冥想 =====
('mindfulness-1min', '1 分钟正念', '最短的正念练习，随时可做', 'mindfulness', '🧘', 1, 'easy',
 '["正念","入门","碎片时间"]', 30,
 '[{"title":"落座","body":"无论你在哪里，调整一下姿势，感受身体与座椅/地面的接触。","duration_sec":5},{"title":"三次深呼吸","body":"做三次深长的呼吸。吸气时注意腹部膨胀，呼气时感受身体放松。","duration_sec":15},{"title":"觉察当下","body":"把注意力放在此刻的感受上：听到什么声音？皮肤有什么触感？","duration_sec":30},{"title":"回归","body":"轻轻睁开眼睛，带着这份觉察回到日常活动。","duration_sec":10}]',
 '["只需要一分钟。","三次呼吸，回到当下。","你听到了什么？感受到什么？"]'),

('mindfulness-body-scan', '身体扫描', '从头到脚逐步觉察身体感受', 'mindfulness', '🫧', 10, 'medium',
 '["正念","身体觉察","放松"]', 31,
 '[{"title":"准备","body":"平躺或舒适坐下，闭上眼睛，做 3 次深呼吸。","duration_sec":20},{"title":"头顶","body":"将注意力放到头顶。感受头皮的温度、紧张或放松。","duration_sec":40},{"title":"面部","body":"觉察额头、眼睛、鼻子、嘴巴。注意到任何表情或紧绷，不需要改变。","duration_sec":40},{"title":"颈肩","body":"感受脖子和肩膀。很多压力会藏在这里。","duration_sec":40},{"title":"胸腹","body":"注意胸腔的呼吸起伏和腹部的感觉。","duration_sec":40},{"title":"双手","body":"觉察双手的温度、触感。指尖有什么感觉？","duration_sec":30},{"title":"腿和脚","body":"沿着大腿、膝盖、小腿到脚趾，逐一觉察。","duration_sec":40},{"title":"整合","body":"现在感受整个身体作为一个整体。呼吸流过全身。","duration_sec":60}]',
 '["让我们来一次从头到脚的身体旅行。","注意力像一束温柔的光……","从头顶开始，慢慢向下移动。"]'),

-- ===== 睡前放松 =====
('sleep-countdown', '54321 助眠法', '用感官着陆技术切断失眠思绪', 'sleep', '🌙', 6, 'easy',
 '["助眠","感官","着陆"]', 40,
 '[{"title":"5 — 看见","body":"闭上眼（或半闭），在脑海中描述 5 样你今天看到的东西。越具体越好。","duration_sec":60},{"title":"4 — 听到","body":"回忆 4 种今天听到的声音。风声？键盘声？鸟叫？","duration_sec":50},{"title":"3 — 触摸","body":"感受 3 种触觉：被子的柔软、枕头的凉意、身体的重量。","duration_sec":40},{"title":"2 — 闻到","body":"回忆 2 种气味：咖啡？洗衣液？","duration_sec":30},{"title":"1 — 尝到","body":"回忆 1 种味道：晚餐的味道？牙膏的薄荷味？","duration_sec":20},{"title":"沉入","body":"继续保持放松，让意识慢慢模糊……不需要做任何事。","duration_sec":60}]',
 '["用感官锚定身体，让大脑安静下来。","5 样看到的……","4 种听到的……","越来越少，越来越安静……"]'),

-- ===== 专注 =====
('focus-pomodoro', '迷你番茄钟', '25 分钟专注 + 5 分钟休息', 'focus', '🍅', 30, 'medium',
 '["专注","效率","番茄钟"]', 50,
 '[{"title":"设定任务","body":"写下这 25 分钟你要专注做的一件事。只写一件。","duration_sec":30},{"title":"开始专注","body":"计时 25 分钟，全神贯注于你的任务。如果分心了，轻轻拉回注意力。","duration_sec":1500},{"title":"休息","body":"做到了！站起来活动一下，喝口水，看看远处。","duration_sec":300}]',
 '["只做一件事，做好它。","25 分钟开始。","专注……","时间到！休息一下。"]')

ON CONFLICT (id) DO NOTHING;
