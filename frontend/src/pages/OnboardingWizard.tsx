import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOnboardingStore, type Goal, type Practice, type ReminderFreq } from '../store/useOnboardingStore';
import { useUIModeStore } from '../store/useUIModeStore';

const GOALS: { id: Goal; label: string; desc: string; icon: string; tone: string }[] = [
    { id: 'stress', label: '减轻压力', desc: '先稳住当下', icon: 'Calm', tone: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
    { id: 'sleep', label: '改善睡眠', desc: '把夜晚变轻', icon: 'Sleep', tone: 'border-cyan-200 bg-cyan-50 text-cyan-950' },
    { id: 'anxiety', label: '缓解焦虑', desc: '少一点反复担心', icon: 'Ease', tone: 'border-amber-200 bg-amber-50 text-amber-950' },
    { id: 'depression', label: '应对低落', desc: '从小动作开始', icon: 'Lift', tone: 'border-sky-200 bg-sky-50 text-sky-950' },
    { id: 'focus', label: '提升专注', desc: '找回一点掌控', icon: 'Focus', tone: 'border-lime-200 bg-lime-50 text-lime-950' },
    { id: 'emotion', label: '情绪管理', desc: '更清楚地理解自己', icon: 'Feel', tone: 'border-rose-200 bg-rose-50 text-rose-950' },
];

const PRACTICES: { id: Practice; label: string; desc: string }[] = [
    { id: 'breathing', label: '呼吸练习', desc: '适合压力突然升高时' },
    { id: 'meditation', label: '正念冥想', desc: '适合睡前或低能量时' },
    { id: 'cbt', label: 'CBT 认知训练', desc: '适合反复担心、想太多' },
    { id: 'writing', label: '日记 / 写作', desc: '适合把心里的事放下来' },
];

const FREQ_OPTIONS: { id: ReminderFreq; label: string; desc: string }[] = [
    { id: 'none', label: '不提醒', desc: '我自己安排' },
    { id: 'daily', label: '每天 1 次', desc: '温和提醒' },
    { id: 'twice', label: '每天 2 次', desc: '早晚各一次' },
    { id: 'hourly', label: '每小时', desc: '更密集地跟进' },
];

const BASELINE_QUESTIONS = [
    { key: 'sleep' as const, label: '最近一周的睡眠质量', low: '很差', high: '很好', tone: 'accent-cyan-800' },
    { key: 'stress' as const, label: '当前压力感受', low: '没压力', high: '压力很大', tone: 'accent-amber-700' },
    { key: 'mood' as const, label: '此刻的心情', low: '很低落', high: '很开心', tone: 'accent-rose-700' },
    { key: 'energy' as const, label: '今天的精力水平', low: '疲惫', high: '精力充沛', tone: 'accent-emerald-700' },
];

const TOTAL_STEPS = 5;

function generateTodayPlan(goals: Goal[], practices: Practice[], baseline: Record<string, number | null>) {
    let tool = '呼吸放松';
    if (practices.includes('meditation')) tool = '5 分钟正念冥想';
    else if (practices.includes('cbt')) tool = '担忧拆分练习';
    else if (practices.includes('writing')) tool = '情绪记录';

    let task = '今晚提前 20 分钟放下屏幕';
    const stress = baseline.stress ?? 5;
    const mood = baseline.mood ?? 5;
    if (stress >= 7) task = '找一个安静地方，做 3 分钟慢呼吸';
    else if (mood <= 3) task = '给自己写下今天已经撑住的一件事';
    else if (goals.includes('focus')) task = '只安排一个 25 分钟专注块';

    return { tool, task };
}

const slideVariants = {
    enter: (direction: number) => ({ y: direction > 0 ? 28 : -28, opacity: 0, scale: 0.985 }),
    center: { y: 0, opacity: 1, scale: 1 },
    exit: (direction: number) => ({ y: direction < 0 ? 28 : -28, opacity: 0, scale: 0.985 }),
};

interface OnboardingWizardProps {
    onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
    const {
        step, nextStep, prevStep,
        profile, setAge, setGoals, setReminderFreq, setPractices, setReminderTime, setBaseline,
        completeOnboarding, syncToServer,
    } = useOnboardingStore();
    const { setMode } = useUIModeStore();
    const [direction, setDirection] = useState(1);

    const scrollToWizardTop = useCallback(() => {
        window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }));
    }, []);

    const goNext = useCallback(() => {
        setDirection(1);
        nextStep();
        scrollToWizardTop();
    }, [nextStep, scrollToWizardTop]);
    const goPrev = useCallback(() => {
        setDirection(-1);
        prevStep();
        scrollToWizardTop();
    }, [prevStep, scrollToWizardTop]);

    const handleFinish = useCallback(async () => {
        const initialMode = profile.age !== null && profile.age >= 60 ? 'senior' : 'standard';
        setMode(initialMode);
        completeOnboarding();
        const token = localStorage.getItem('token');
        if (token) await syncToServer(token, {
            ui_mode: initialMode,
            senior_mode_enabled: initialMode === 'senior',
            preferred_input: initialMode === 'senior' ? 'voice' : 'mixed',
            tts_enabled: initialMode === 'senior',
        });
        onComplete();
    }, [completeOnboarding, onComplete, profile.age, setMode, syncToServer]);

    const canProceed = () => {
        if (step === 0) return profile.age !== null && profile.age >= 12 && profile.age <= 100;
        if (step === 1) return profile.goals.length > 0;
        if (step === 2) return profile.practices.length > 0;
        if (step === 3) return profile.baseline_sleep !== null && profile.baseline_mood !== null;
        return true;
    };

    const routePreview = profile.age !== null && profile.age >= 60 ? '进入陪伴版' : '进入完整功能';

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#f4f6f1] text-slate-950">
            <div className="pointer-events-none absolute -left-32 top-12 h-96 w-96 rounded-full bg-cyan-100/70 blur-3xl" />
            <div className="pointer-events-none absolute right-0 top-0 h-[32rem] w-[32rem] rounded-full bg-emerald-100/75 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-stone-200/55 blur-3xl" />

            <main className="relative mx-auto grid min-h-screen max-w-7xl gap-8 px-5 py-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8">
                <aside className="rounded-[2.6rem] border border-white/80 bg-white/58 p-7 shadow-[0_34px_110px_-78px_rgba(15,23,42,0.45)] backdrop-blur-xl lg:p-9">
                    <p className="text-sm font-black uppercase tracking-[0.32em] text-cyan-900">NeuraSense Onboarding</p>
                    <h1 className="mt-5 max-w-xl text-5xl font-black leading-[0.98] tracking-tight text-slate-950 lg:text-7xl">
                        先了解你，再给合适的界面。
                    </h1>
                    <p className="mt-6 max-w-xl text-xl leading-9 text-slate-600">
                        新用户只需要完成几步选择。我们会根据年龄先进入完整功能或陪伴版，之后仍然可以随时切换。
                    </p>

                    <div className="mt-8 grid gap-3 sm:grid-cols-3">
                        {[
                            ['年龄分流', '60 岁及以上默认陪伴版'],
                            ['轻量偏好', '只记录目标和练习方式'],
                            ['今天开始', '先给一个能执行的小步骤'],
                        ].map(([title, desc]) => (
                            <div key={title} className="rounded-[1.6rem] border border-white/90 bg-white/75 p-4">
                                <p className="text-lg font-black text-slate-950">{title}</p>
                                <p className="mt-2 text-sm font-bold leading-6 text-slate-500">{desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 rounded-[2rem] border border-cyan-100 bg-cyan-950 p-5 text-white">
                        <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-100">Current Route</p>
                        <p className="mt-2 text-3xl font-black">{routePreview}</p>
                        <p className="mt-2 text-base leading-7 text-cyan-50">
                            这不是给用户贴标签，只是让第一次打开时少找路。
                        </p>
                    </div>
                </aside>

                <section className="rounded-[2.8rem] border border-white/90 bg-white/78 p-4 shadow-[0_40px_140px_-82px_rgba(15,23,42,0.5)] backdrop-blur-xl md:p-6">
                    <div className="flex flex-col gap-4 border-b border-slate-200/70 pb-5 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Step {step + 1} / {TOTAL_STEPS}</p>
                            <h2 className="mt-2 text-3xl font-black text-slate-950">设置你的起点</h2>
                        </div>
                        <div className="flex min-w-[260px] items-center gap-2">
                            {[0, 1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                                    <motion.div
                                        className="h-full rounded-full bg-cyan-900"
                                        initial={false}
                                        animate={{ width: i <= step ? '100%' : '0%' }}
                                        transition={{ duration: 0.28 }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="min-h-[560px] overflow-hidden py-7">
                        <AnimatePresence mode="wait" custom={direction}>
                            <motion.div
                                key={step}
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                            >
                                {step === 0 && <Step0Age age={profile.age} setAge={setAge} />}
                                {step === 1 && <Step1Goals goals={profile.goals} setGoals={setGoals} />}
                                {step === 2 && (
                                    <Step2Preferences
                                        practices={profile.practices}
                                        setPractices={setPractices}
                                        freq={profile.reminder_freq}
                                        setFreq={setReminderFreq}
                                        time={profile.reminder_time}
                                        setTime={setReminderTime}
                                    />
                                )}
                                {step === 3 && <Step3Baseline profile={profile} setBaseline={setBaseline} />}
                                {step === 4 && <Step4Complete profile={profile} />}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="sticky bottom-0 z-20 -mx-4 flex flex-col gap-3 border-t border-slate-200/70 bg-white/92 px-4 pb-2 pt-5 backdrop-blur-xl sm:flex-row md:-mx-6 md:px-6">
                        {step > 0 ? (
                            <button
                                onClick={goPrev}
                                className="min-h-[62px] rounded-2xl border border-slate-200 bg-white px-7 text-lg font-black text-slate-700 transition hover:bg-slate-50"
                            >
                                上一步
                            </button>
                        ) : null}
                        {step < 4 ? (
                            <button
                                onClick={goNext}
                                disabled={!canProceed()}
                                className={`min-h-[62px] flex-1 rounded-2xl px-7 text-lg font-black text-white transition ${
                                    canProceed() ? 'bg-cyan-950 shadow-xl shadow-cyan-950/12 hover:bg-cyan-900' : 'cursor-not-allowed bg-slate-300'
                                }`}
                            >
                                下一步
                            </button>
                        ) : (
                            <button
                                onClick={handleFinish}
                                className="min-h-[62px] flex-1 rounded-2xl bg-cyan-950 px-7 text-lg font-black text-white shadow-xl shadow-cyan-950/12 transition hover:bg-cyan-900"
                            >
                                进入 NeuraSense
                            </button>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

function StepHeading({ label, title, desc }: { label: string; title: string; desc: string }) {
    return (
        <div>
            <p className="inline-flex rounded-full border border-cyan-100 bg-cyan-50 px-4 py-2 text-sm font-black text-cyan-900">{label}</p>
            <h3 className="mt-5 text-4xl font-black leading-tight text-slate-950 md:text-5xl">{title}</h3>
            <p className="mt-4 max-w-2xl text-xl leading-9 text-slate-600">{desc}</p>
        </div>
    );
}

function Step0Age({ age, setAge }: { age: number | null; setAge: (age: number | null) => void }) {
    const quickAges = [18, 25, 35, 50, 65, 75];
    const recommendedMode = age !== null && age >= 60 ? '陪伴版' : '完整功能';
    return (
        <div>
            <StepHeading
                label="只用于选择初始界面"
                title="先告诉我你的年龄"
                desc="60 岁及以上会默认进入陪伴版：字更大、步骤更少、带语音引导。之后也可以随时切换。"
            />

            <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_280px]">
                <label className="block rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <span className="text-base font-black text-slate-500">年龄</span>
                    <div className="mt-4 flex items-center gap-4">
                        <input
                            type="number"
                            min={12}
                            max={100}
                            value={age ?? ''}
                            onChange={(event) => {
                                const value = event.target.value;
                                setAge(value ? Number(value) : null);
                            }}
                            placeholder="例如：22"
                            className="min-h-[76px] w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 text-4xl font-black text-slate-950 outline-none transition focus:border-cyan-800 focus:ring-4 focus:ring-cyan-100"
                        />
                        <span className="text-2xl font-black text-slate-500">岁</span>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-2">
                        {quickAges.map((value) => (
                            <button
                                key={value}
                                onClick={() => setAge(value)}
                                className={`min-h-[52px] rounded-2xl text-base font-black transition ${
                                    age === value ? 'bg-cyan-950 text-white shadow-lg shadow-cyan-950/10' : 'bg-slate-50 text-slate-700 hover:bg-cyan-50'
                                }`}
                            >
                                {value} 岁
                            </button>
                        ))}
                    </div>
                </label>

                <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-6 text-emerald-950">
                    <p className="text-base font-black text-emerald-700">进入后默认显示</p>
                    <p className="mt-3 text-4xl font-black">{recommendedMode}</p>
                    <p className="mt-4 text-lg leading-8">
                        这个选择不是固定标签，只是让第一次进入更顺手。
                    </p>
                </div>
            </div>
        </div>
    );
}

function Step1Goals({ goals, setGoals }: { goals: Goal[]; setGoals: (g: Goal[]) => void }) {
    const toggle = (id: Goal) => {
        setGoals(goals.includes(id) ? goals.filter((g) => g !== id) : [...goals, id]);
    };
    return (
        <div>
            <StepHeading
                label="可多选"
                title="你最想先被哪一部分支持？"
                desc="不用选得很准确。这里会帮助后续回答更贴近你的真实场景。"
            />
            <div className="mt-8 grid gap-3 md:grid-cols-2">
                {GOALS.map((goal) => {
                    const selected = goals.includes(goal.id);
                    return (
                        <motion.button
                            key={goal.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => toggle(goal.id)}
                            className={`min-h-[120px] rounded-[1.75rem] border p-5 text-left transition ${
                                selected ? goal.tone + ' shadow-[0_20px_60px_-48px_rgba(15,23,42,0.5)]' : 'border-slate-200 bg-white text-slate-800 hover:border-cyan-200 hover:bg-cyan-50/70'
                            }`}
                        >
                            <span className="text-sm font-black uppercase tracking-[0.18em] opacity-60">{goal.icon}</span>
                            <span className="mt-3 block text-2xl font-black">{goal.label}</span>
                            <span className="mt-2 block text-base font-bold opacity-70">{goal.desc}</span>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}

function Step2Preferences({
    practices, setPractices,
    freq, setFreq,
    time, setTime,
}: {
    practices: Practice[]; setPractices: (p: Practice[]) => void;
    freq: ReminderFreq; setFreq: (f: ReminderFreq) => void;
    time: string; setTime: (t: string) => void;
}) {
    const togglePractice = (id: Practice) => {
        setPractices(practices.includes(id) ? practices.filter((p) => p !== id) : [...practices, id]);
    };

    return (
        <div>
            <StepHeading
                label="练习偏好"
                title="选择你愿意尝试的方式"
                desc="后续建议会尽量从你愿意做的练习里选，不会一下子塞很多任务。"
            />

            <div className="mt-8 grid gap-5 lg:grid-cols-2">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
                    <h4 className="text-2xl font-black text-slate-950">喜欢哪类练习？</h4>
                    <div className="mt-4 grid gap-3">
                        {PRACTICES.map((practice) => {
                            const selected = practices.includes(practice.id);
                            return (
                                <motion.button
                                    key={practice.id}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => togglePractice(practice.id)}
                                    className={`rounded-2xl border p-4 text-left transition ${
                                        selected ? 'border-cyan-200 bg-cyan-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-cyan-50'
                                    }`}
                                >
                                    <span className="block text-xl font-black">{practice.label}</span>
                                    <span className={`mt-1 block text-base font-bold ${selected ? 'text-cyan-50' : 'text-slate-500'}`}>{practice.desc}</span>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
                    <h4 className="text-2xl font-black text-slate-950">提醒频率</h4>
                    <div className="mt-4 grid gap-3">
                        {FREQ_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => setFreq(option.id)}
                                className={`flex min-h-[74px] items-center justify-between rounded-2xl border p-4 text-left transition ${
                                    freq === option.id ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-white'
                                }`}
                            >
                                <span>
                                    <span className="block text-lg font-black">{option.label}</span>
                                    <span className="mt-1 block text-sm font-bold opacity-65">{option.desc}</span>
                                </span>
                                <span className={`h-5 w-5 rounded-full border-2 ${freq === option.id ? 'border-emerald-700 bg-emerald-700' : 'border-slate-300'}`} />
                            </button>
                        ))}
                    </div>

                    {freq !== 'none' ? (
                        <label className="mt-5 block">
                            <span className="text-base font-black text-slate-600">首次提醒时间</span>
                            <input
                                type="time"
                                value={time}
                                onChange={(event) => setTime(event.target.value)}
                                className="mt-3 min-h-[58px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xl font-bold text-slate-900 outline-none focus:border-cyan-800 focus:ring-4 focus:ring-cyan-100"
                            />
                        </label>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function Step3Baseline({
    profile,
    setBaseline,
}: {
    profile: { baseline_sleep: number | null; baseline_stress: number | null; baseline_mood: number | null; baseline_energy: number | null };
    setBaseline: (key: 'sleep' | 'stress' | 'mood' | 'energy', value: number) => void;
}) {
    useEffect(() => {
        BASELINE_QUESTIONS.forEach((question) => {
            if (profile[`baseline_${question.key}`] === null) {
                setBaseline(question.key, 5);
            }
        });
    }, [profile, setBaseline]);

    return (
        <div>
            <StepHeading
                label="快速状态"
                title="不用精确，按感觉选"
                desc="这一步不是评价你，只是让第一次建议不要太空泛。"
            />
            <div className="mt-8 grid gap-4">
                {BASELINE_QUESTIONS.map((question) => {
                    const value = profile[`baseline_${question.key}`] ?? 5;
                    return (
                        <div key={question.key} className="rounded-[1.8rem] border border-slate-200 bg-white p-5">
                            <div className="mb-4 flex items-center justify-between gap-4">
                                <span className="text-xl font-black text-slate-900">{question.label}</span>
                                <span className="rounded-2xl bg-slate-950 px-4 py-2 text-2xl font-black text-white">{value}</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={10}
                                value={value}
                                onChange={(event) => setBaseline(question.key, parseInt(event.target.value))}
                                className={`h-3 w-full cursor-pointer appearance-none rounded-full bg-slate-200 ${question.tone}`}
                            />
                            <div className="mt-3 flex justify-between text-sm font-black text-slate-500">
                                <span>{question.low}</span>
                                <span>{question.high}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function Step4Complete({ profile }: { profile: { age: number | null; goals: Goal[]; practices: Practice[]; baseline_sleep: number | null; baseline_stress: number | null; baseline_mood: number | null; baseline_energy: number | null } }) {
    const plan = generateTodayPlan(profile.goals, profile.practices, {
        sleep: profile.baseline_sleep,
        stress: profile.baseline_stress,
        mood: profile.baseline_mood,
        energy: profile.baseline_energy,
    });
    const mode = profile.age !== null && profile.age >= 60 ? '陪伴版' : '完整功能';

    return (
        <div>
            <StepHeading
                label="准备好了"
                title="现在可以开始使用"
                desc="下面是第一次进入后会优先看到的方向。你仍然可以在设置里改偏好。"
            />
            <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-[2rem] border border-cyan-100 bg-cyan-950 p-6 text-white">
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-100">Initial Mode</p>
                    <p className="mt-3 text-5xl font-black">{mode}</p>
                    <p className="mt-4 text-lg leading-8 text-cyan-50">
                        {mode === '陪伴版' ? '进入后会优先显示大字、语音和一步一步的小卡片。' : '进入后会看到完整的聊天、评估、工具和趋势功能。'}
                    </p>
                </div>

                <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-6 text-emerald-950">
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">Today First</p>
                    <h4 className="mt-3 text-3xl font-black">先做一件小事</h4>
                    <div className="mt-5 grid gap-3">
                        <div className="rounded-2xl bg-white/85 p-4">
                            <p className="text-base font-black text-emerald-700">推荐练习</p>
                            <p className="mt-1 text-2xl font-black">{plan.tool}</p>
                        </div>
                        <div className="rounded-2xl bg-white/85 p-4">
                            <p className="text-base font-black text-emerald-700">今天先做</p>
                            <p className="mt-1 text-2xl font-black">{plan.task}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
