import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { useCheckinStore, getRecordDayKey, parseCheckinTime, type CheckinData } from '../store/useCheckinStore';
import { API_BASE } from '../config/api';
import { emitStudyEvent } from '../lib/studyEvents';
import { useStudyTourStore } from '../features/studyTour/useStudyTourStore';
import { STANDARD_STEPS } from '../features/studyTour/tourSteps';
import type { ToolItem } from './ToolboxPage';

const IconMood = ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
);

const IconStress = ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.412 15.655L9.75 21.75l3.745-4.012M9.257 13.5H3.75l6.409-8.155A.75.75 0 0110.75 6v4.5h5.49a.75.75 0 01.575 1.238l-6.16 7.858" />
    </svg>
);

const IconEnergy = ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5h1.5m0 0V9.75A2.25 2.25 0 017.5 7.5h9A2.25 2.25 0 0118.75 9.75v4.5a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25V13.5zm15-2.25h.75a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-.75m-12-3.75h6" />
    </svg>
);

const IconSleep = ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
);

const IconJournal = ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
);

const IconMeditation = ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
);

const IconChat = ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-11.883 5.01L3.72 20.1a.75.75 0 001.06.04l3.168-2.652A9.75 9.75 0 0012 18.75c5.385 0 9.75-3.806 9.75-8.25S17.385 2.25 12 2.25 2.25 6.056 2.25 10.5c0 2.098.846 4.023 2.267 5.51z" />
    </svg>
);

const IconAssessment = ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
);

const IconChart = ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
);

const IconCelebration = ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
);

const IconArrow = ({ className = 'w-4 h-4' }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
);

const DAILY_QUOTES = [
    '每一天都是新的开始，你已经迈出了最重要的一步。',
    '觉察是改变的起点。记录今天的状态，就是在照顾自己。',
    '不需要完美，只需要真实。',
    '你比你想象的更有力量。',
    '深呼吸。你正在这里，这就够了。',
    '小小的进步也是进步。',
    '照顾好自己，才能更好地面对世界。',
    '今天的你，值得被温柔以待。',
    '每一次练习，都在为内心积攒力量。',
    '关注当下的感受，你已经在成长了。',
    '即使是阴天，太阳依然在云层之上。',
    '给自己一点时间，一切都会好起来。',
    '你的感受很重要，谢谢你愿意分享。',
];

function getDailyQuote() {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

function formatDateCN() {
    const d = new Date();
    const weekNames = ['日', '一', '二', '三', '四', '五', '六'];
    return `${d.getMonth() + 1}月${d.getDate()}日 周${weekNames[d.getDay()]}`;
}

function getWellnessScore(checkin: CheckinData | null) {
    if (!checkin) return null;
    const score = ((checkin.mood + (10 - checkin.stress) + checkin.energy + checkin.sleep_quality) / 4) * 10;
    return Math.round(score);
}

interface TodayPageProps {
    onNavigate: (view: string) => void;
    onStartChat: () => void;
    onOpenTool: (tool: ToolItem) => void;
}

const SLIDER_KEYS = ['mood', 'stress', 'energy', 'sleep_quality'] as const;
type SliderKey = typeof SLIDER_KEYS[number];

const SLIDER_LABELS: Record<SliderKey, { label: string; low: string; high: string; gradient: string; icon: ReactNode }> = {
    mood: {
        label: '心情',
        low: '低落',
        high: '开心',
        gradient: 'from-rose-400 via-orange-400 to-amber-300',
        icon: <IconMood className="h-4 w-4" />,
    },
    stress: {
        label: '压力',
        low: '轻松',
        high: '紧张',
        gradient: 'from-rose-500 via-red-400 to-orange-300',
        icon: <IconStress className="h-4 w-4" />,
    },
    energy: {
        label: '精力',
        low: '疲惫',
        high: '充沛',
        gradient: 'from-amber-400 via-yellow-400 to-emerald-300',
        icon: <IconEnergy className="h-4 w-4" />,
    },
    sleep_quality: {
        label: '睡眠',
        low: '较差',
        high: '很好',
        gradient: 'from-indigo-400 via-violet-400 to-cyan-300',
        icon: <IconSleep className="h-4 w-4" />,
    },
};

function PanelTitle({
    icon,
    eyebrow,
    title,
    description,
}: {
    icon: ReactNode;
    eyebrow: string;
    title: string;
    description?: string;
}) {
    return (
        <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-white">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs text-gray-500">{eyebrow}</p>
                <h3 className="font-display-cn mt-1 text-[1.75rem] leading-tight text-black">{title}</h3>
                {description ? <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p> : null}
            </div>
        </div>
    );
}

function ToolGlyph({ emoji, className = 'h-5 w-5' }: { emoji?: string; className?: string }) {
    switch (emoji) {
        case '🧘':
            return <IconMeditation className={className} />;
        case '📝':
            return <IconJournal className={className} />;
        case '📋':
            return <IconAssessment className={className} />;
        case '💬':
            return <IconChat className={className} />;
        case '📈':
            return <IconChart className={className} />;
        default:
            return <IconMeditation className={className} />;
    }
}

function CheckinCard({ onDone }: { onDone: () => void }) {
    const { submitCheckin } = useCheckinStore();
    const [values, setValues] = useState<Record<SliderKey, number>>({
        mood: 5,
        stress: 5,
        energy: 5,
        sleep_quality: 5,
    });
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
    const isLoggedIn = typeof window !== 'undefined' && !!window.localStorage.getItem('token');

    const handleChange = (key: SliderKey, val: number) => {
        setValues((prev) => ({ ...prev, [key]: val }));
    };

    const handleSubmit = async () => {
        setFeedback(null);
        setSubmitting(true);
        const result = await submitCheckin({ ...values, note: note || undefined } as CheckinData);
        setSubmitting(false);
        setFeedback({ kind: result.ok ? 'success' : 'error', message: result.message });
        if (result.ok) {
            onDone();
            emitStudyEvent('checkin-done');
        }
    };

    return (
        <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="desktop-section h-full overflow-hidden"
        >
            <div className="grid h-full gap-6 xl:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.15fr)]">
                <div className="flex flex-col rounded-[1.6rem] border border-cyan-100 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_55%),linear-gradient(180deg,#ffffff_0%,#f8fcff_58%,#f0fdfa_100%)] p-6">
                    <PanelTitle
                        icon={<IconJournal className="h-5 w-5" />}
                        eyebrow="今日签到"
                        title="1 分钟状态签到"
                        description="拖动右侧四个滑块记录今天的状态，系统会据此刷新今日推荐与趋势视图。"
                    />
                    <label className="mt-6 block text-sm font-semibold text-slate-700" htmlFor="today-note">
                        一句话记录今天的感受
                    </label>
                    <p className="mt-1 text-xs leading-5 text-slate-500">可选。简短写下你此刻的状态，便于之后回看变化。</p>
                    <textarea
                        id="today-note"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="例如：今天有点紧张，但整体还能稳住。"
                        rows={3}
                        className="mt-3 min-h-[96px] w-full flex-1 resize-none rounded-[1.3rem] border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                    />
                    {feedback ? (
                        <div
                            className={`mt-4 rounded-[1.2rem] border px-4 py-3 text-sm ${
                                feedback.kind === 'success'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-rose-200 bg-rose-50 text-rose-700'
                            }`}
                        >
                            {feedback.message}
                        </div>
                    ) : null}
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs leading-5 text-slate-500">
                            {isLoggedIn
                                ? '提交后会自动刷新今日推荐与近 7 天趋势。'
                                : '未登录时也可以先记录，数据会保存在当前浏览器。'}
                        </p>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {submitting ? '保存中...' : '完成签到'}
                        </button>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:auto-rows-fr">
                        {SLIDER_KEYS.map((key) => {
                            const meta = SLIDER_LABELS[key];
                            const value = values[key];
                            const percent = value * 10;
                            return (
                                <div key={key} className="flex flex-col justify-between rounded-[1.5rem] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.28)]">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">{meta.icon}</span>
                                            {meta.label}
                                        </div>
                                        <span className="text-3xl font-semibold leading-none text-slate-950 tabular-nums">{value}<span className="ml-0.5 text-sm font-medium text-slate-400">/10</span></span>
                                    </div>
                                    <div className="mt-4 h-3 rounded-full bg-slate-100">
                                        <div
                                            className={`h-3 rounded-full bg-gradient-to-r ${meta.gradient}`}
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                        <span>{meta.low}</span>
                                        <span>{meta.high}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={10}
                                        value={value}
                                        onChange={(event) => handleChange(key, Number(event.target.value))}
                                        className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-100"
                                        aria-label={meta.label}
                                    />
                                </div>
                            );
                        })}
                </div>
            </div>
        </motion.section>
    );
}

function CheckinSummary({ checkin }: { checkin: CheckinData }) {
    const score = getWellnessScore(checkin);
    const cards = [
        { key: 'mood', label: '心情', value: checkin.mood, accent: 'text-orange-500', icon: <IconMood className="h-5 w-5" /> },
        { key: 'stress', label: '压力', value: checkin.stress, accent: 'text-rose-500', icon: <IconStress className="h-5 w-5" /> },
        { key: 'energy', label: '精力', value: checkin.energy, accent: 'text-amber-500', icon: <IconEnergy className="h-5 w-5" /> },
        { key: 'sleep', label: '睡眠', value: checkin.sleep_quality, accent: 'text-violet-500', icon: <IconSleep className="h-5 w-5" /> },
    ];

    return (
        <motion.section
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="desktop-section h-full"
        >
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_340px] xl:items-start">
                <div>
                    <PanelTitle
                        icon={<IconCelebration className="h-5 w-5" />}
                        eyebrow="签到完成"
                        title="今日状态已记录"
                        description="你的签到信息已保存，右侧可以快速查看综合分和四项状态指标。"
                    />
                    {checkin.note ? (
                        <div className="mt-6 rounded-[1.5rem] border border-cyan-100 bg-cyan-50/70 px-5 py-4 text-sm leading-7 text-slate-600">
                            “{checkin.note}”
                        </div>
                    ) : null}
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {cards.map((card) => (
                            <div key={card.key} className="rounded-[1.4rem] border border-slate-200 bg-white/90 p-4 shadow-[0_18px_60px_-42px_rgba(15,23,42,0.25)]">
                                <div className={`flex items-center gap-2 text-sm font-semibold ${card.accent}`}>
                                    {card.icon}
                                    {card.label}
                                </div>
                                <div className="mt-4 text-3xl font-semibold text-slate-950">{card.value}</div>
                                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">今日</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_30px_90px_-52px_rgba(15,23,42,0.88)]">
                    <p className="text-[11px] uppercase tracking-[0.26em] text-cyan-300">Wellness Score</p>
                    <div className="mt-4 flex items-end gap-2">
                        <span className="font-display text-6xl leading-none">{score ?? '--'}</span>
                        <span className="pb-1 text-sm text-slate-400">/ 100</span>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-300">
                        {score === null
                            ? '等待更多记录后生成评分。'
                            : score >= 80
                                ? '整体状态较稳，可以继续保持当前节律。'
                                : score >= 60
                                    ? '状态基本平衡，建议配合一个短练习进一步稳定。'
                                    : '今天更适合降低负荷，优先使用呼吸或支持性对话。'}
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-slate-300">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                            <div className="uppercase tracking-[0.18em] text-slate-500">Recorded</div>
                            <div className="mt-2 text-sm font-semibold text-white">今天</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                            <div className="uppercase tracking-[0.18em] text-slate-500">Status</div>
                            <div className="mt-2 text-sm font-semibold text-white">今日建议已更新</div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.section>
    );
}

function RecommendationCards({ onOpenTool, onBrowseAll }: { onOpenTool: (tool: ToolItem) => void; onBrowseAll: () => void }) {
    const { recommendations, hasCheckedIn } = useCheckinStore();
    const [toolsMap, setToolsMap] = useState<Record<string, ToolItem>>({});

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/tools`);
                if (!res.ok) return;
                const json = await res.json();
                const map: Record<string, ToolItem> = {};
                for (const tool of json.tools || []) map[tool.id] = tool;
                setToolsMap(map);
            } catch {
                // offline ok
            }
        })();
    }, []);

    return (
        <section className="desktop-section flex h-full flex-col">
            <PanelTitle
                icon={<IconMeditation className="h-5 w-5" />}
                eyebrow="推荐内容"
                title="今日推荐练习"
                description={hasCheckedIn ? '基于你刚刚的签到状态，为你优先排列更适合今天的工具。' : '完成签到后，这里会自动刷新更贴合你状态的推荐。'}
            />

            <div className="mt-6 flex-1 space-y-3">
                {recommendations.length === 0 ? (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm leading-6 text-slate-500">
                        {hasCheckedIn ? '今天暂未生成推荐，可先进入工具箱自由选择练习。' : '先完成上方签到，再生成更个性化的今日推荐。'}
                    </div>
                ) : recommendations.map((rec, index) => {
                    const item = rec as { id: string; reason?: string; name?: string; category?: string; icon?: string };
                    const tool = toolsMap[item.id];
                    const effectiveTool: ToolItem = tool || {
                        id: item.id,
                        title: item.name || item.id,
                        subtitle: item.reason || '',
                        category: item.category || 'mindfulness',
                        icon: item.icon || '🧘',
                        duration_min: 5,
                        difficulty: 'easy',
                        tags: [],
                        sort_order: 0,
                        steps: [],
                        guidance: [],
                    };

                    return (
                        <button
                            key={item.id}
                            onClick={() => onOpenTool(effectiveTool)}
                            className={`group w-full rounded-[1.5rem] border p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_70px_-42px_rgba(15,23,42,0.28)] focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100 ${
                                index === 0
                                    ? 'border-cyan-100 bg-[linear-gradient(145deg,rgba(236,254,255,0.92),rgba(255,255,255,0.98))]'
                                    : 'border-slate-200 bg-white/92'
                            }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                                    <ToolGlyph emoji={effectiveTool.icon} className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="text-sm font-semibold text-slate-900">{effectiveTool.title}</h4>
                                        {index === 0 ? (
                                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">优先推荐</span>
                                        ) : null}
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">{item.reason || effectiveTool.subtitle || '适合今日状态的轻量练习。'}</p>
                                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                        <span>{effectiveTool.duration_min} 分钟</span>
                                        <span>·</span>
                                        <span>{effectiveTool.difficulty}</span>
                                    </div>
                                </div>
                                <div className="mt-1 text-slate-300 transition group-hover:text-slate-600">
                                    <IconArrow className="h-5 w-5" />
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            <button
                onClick={onBrowseAll}
                className="group mt-6 flex w-full items-center justify-between gap-3 rounded-[1.5rem] bg-[#DBECFC] px-5 py-4 text-left transition hover:bg-[#cfe4fa]"
            >
                <span>
                    <span className="block text-sm font-semibold text-gray-900">浏览全部练习</span>
                    <span className="mt-0.5 block text-xs text-gray-600">工具箱里有 6 个主题的呼吸、正念与认知练习</span>
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-gray-800 transition group-hover:translate-x-0.5">
                    <IconArrow className="h-4 w-4" />
                </span>
            </button>
        </section>
    );
}

function readDisplayName() {
    try {
        const raw = window.localStorage.getItem('user');
        const parsed = raw ? JSON.parse(raw) as { nickname?: string; username?: string } : null;
        return parsed?.nickname || parsed?.username || '';
    } catch {
        return '';
    }
}

function IconProgram({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
    );
}

function IconUser({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
    );
}

const STEP_ICONS = [IconJournal, IconAssessment, IconChat, IconMeditation, IconProgram, IconUser];

function IconCheck({ className = 'h-4 w-4' }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
        </svg>
    );
}

function TodayHeader() {
    const name = readDisplayName();
    const hour = new Date().getHours();
    const hello = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
    return (
        <div className="nexar-fade-up flex flex-wrap items-end justify-between gap-3 border-b border-black/10 pb-4 sm:pb-5">
            <div className="min-w-0">
                <h1 className="font-display-cn text-[28px] leading-tight text-black sm:text-[34px]">{hello}{name ? `，${name}` : ''}</h1>
                <p className="mt-1 text-sm text-black/60">{getDailyQuote()}</p>
            </div>
            <span className="text-sm text-black/60">{formatDateCN()}</span>
        </div>
    );
}

/**
 * The six steps of the guided study tour, shown as the top of the Today page. Ticks come from
 * the tour; when no tour is running each step opens its module directly.
 */
function StudyStepBar({ onOpenStep }: { onOpenStep: (index: number) => void }) {
    const tour = useStudyTourStore();
    const finished = tour.finishedModes.includes('standard');
    const inStandard = tour.mode === 'standard';
    const isDone = (i: number) => finished || (inStandard && tour.completed.includes(i));
    const doneCount = STANDARD_STEPS.filter((_, i) => isDone(i)).length;
    const running = tour.active && inStandard;
    const interrupted = !tour.active && inStandard && !finished && (tour.phase === 'steps' || tour.phase === 'sus');
    const current = running || interrupted ? tour.stepIndex : -1;

    let cta: { label: string; run: () => void } | null = null;
    if (!running) {
        if (interrupted) cta = { label: `继续体验流程（第 ${tour.stepIndex + 1} 步）`, run: tour.resume };
        else if (finished) cta = { label: '重新体验', run: () => tour.start('standard') };
        else cta = { label: '开始体验流程', run: () => tour.start('standard') };
    }

    return (
        <section className="nexar-fade-up rounded-[20px] bg-white p-5 shadow-sm sm:rounded-[28px] sm:p-6" style={{ animationDelay: '0.1s' }} data-tour="today-steps">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-xs text-gray-500">体验流程 · {doneCount}/{STANDARD_STEPS.length}</p>
                    <h2 className="font-display-cn mt-1 text-[1.6rem] leading-tight text-black sm:text-[1.9rem]">6 步用一遍主要功能</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                        {finished
                            ? '你已经走完了全部 6 步，也填写了使用感受问卷。可以随时点下面任意一步直接进入。'
                            : '跟着引导一步一步做：签到、心理自评、AI 陪伴、放松练习、课程和个人中心。做完后有一份 10 道题的使用感受问卷。'}
                    </p>
                </div>
                {cta ? (
                    <button
                        onClick={cta.run}
                        className={`inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${finished ? 'border border-black/15 text-gray-900 hover:border-black/40' : 'bg-black text-white hover:bg-gray-800'}`}
                        data-tour="today-tour-start"
                    >
                        {cta.label}
                        <IconArrow className="h-4 w-4" />
                    </button>
                ) : (
                    <span className="rounded-full bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700">引导进行中</span>
                )}
            </div>

            <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {STANDARD_STEPS.map((step, i) => {
                    const Icon = STEP_ICONS[i] || IconMeditation;
                    const done = isDone(i);
                    const isCurrent = i === current && !done;
                    return (
                        <li key={step.key}>
                            <button
                                onClick={() => onOpenStep(i)}
                                className={`group flex h-full w-full flex-col gap-3 rounded-[18px] border p-4 text-left transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-100 ${
                                    done ? 'border-emerald-200 bg-emerald-50/70' : isCurrent ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                                }`}
                            >
                                <span className="flex items-center justify-between gap-2">
                                    <span
                                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                                            done ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-sky-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'
                                        }`}
                                    >
                                        {done ? <IconCheck /> : i + 1}
                                    </span>
                                    <Icon className={`h-5 w-5 ${done ? 'text-emerald-600' : isCurrent ? 'text-sky-700' : 'text-slate-400 group-hover:text-slate-700'}`} />
                                </span>
                                <span>
                                    <span className="block text-[15px] font-semibold text-slate-900">{step.label}</span>
                                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">{done ? '已完成' : step.desc}</span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

function TrendChart() {
    const { history, isLoading } = useCheckinStore();

    const chartData = useMemo(() => {
        // One point per day (the latest check-in of that day), for the last 7 days.
        const byDay = new Map<string, (typeof history)[number]>();
        for (const record of [...history].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))) {
            const key = getRecordDayKey(record);
            if (key) byDay.set(key, record);
        }
        const sorted = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-7).map(([, r]) => r);

        return sorted.map((record) => ({
            date: record.created_at
                ? parseCheckinTime(record.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
                : '',
            心情: record.mood,
            压力: record.stress,
            精力: record.energy,
            睡眠: record.sleep_quality,
        }));
    }, [history]);

    const trendSummary = useMemo(() => {
        if (!chartData.length) return [] as { label: string; value: string }[];
        const average = (key: '心情' | '压力' | '精力' | '睡眠') => {
            const total = chartData.reduce((sum, item) => sum + item[key], 0);
            return (total / chartData.length).toFixed(1);
        };
        return [
            { label: '平均心情', value: average('心情') },
            { label: '平均压力', value: average('压力') },
            { label: '平均精力', value: average('精力') },
            { label: '平均睡眠', value: average('睡眠') },
        ];
    }, [chartData]);

    const lastSevenDays = useMemo(() => {
        const recorded = new Set(
            history
                .map((record) => (record.created_at ? parseCheckinTime(record.created_at).toDateString() : ''))
                .filter(Boolean),
        );
        return Array.from({ length: 7 }, (_, index) => {
            const day = new Date();
            day.setDate(day.getDate() - (6 - index));
            return {
                key: day.toDateString(),
                label: index === 6 ? '今天' : `${day.getMonth() + 1}/${day.getDate()}`,
                recorded: recorded.has(day.toDateString()),
                isToday: index === 6,
            };
        });
    }, [history]);
    const recordedDays = lastSevenDays.filter((day) => day.recorded).length;

    return (
        <section className="desktop-section">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <PanelTitle
                    icon={<IconChart className="h-5 w-5" />}
                    eyebrow="趋势变化"
                    title="近 7 天趋势"
                    description="把签到数据放回时间轴里看，能更快识别今天是波动还是延续。"
                />
                {trendSummary.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px]">
                        {trendSummary.map((item) => (
                            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50/85 p-4">
                                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{item.label}</div>
                                <div className="mt-2 text-2xl font-semibold text-slate-950">{item.value}</div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>

            <div className="mt-6 rounded-[1.6rem] border border-slate-200 bg-white/90 p-4">
                {isLoading ? (
                    <div className="flex h-[300px] items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="flex flex-col gap-6 px-2 py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                        <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                                <IconChart className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-base font-semibold text-slate-900">完成第一次签到后，这里会画出趋势图</p>
                                <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">近 7 天已记录 {recordedDays} 天。继续完成每日签到，这里就会画出心情、压力、精力和睡眠的变化曲线。</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-7 gap-2 sm:gap-3 lg:w-[520px] lg:shrink-0">
                            {lastSevenDays.map((day) => (
                                <div key={day.key} className="flex flex-col items-center gap-2">
                                    <span
                                        className={`flex h-11 w-full max-w-[56px] items-center justify-center rounded-2xl text-sm ${
                                            day.recorded
                                                ? 'bg-slate-950 text-white'
                                                : day.isToday
                                                    ? 'border-2 border-dashed border-cyan-300 bg-cyan-50 text-cyan-600'
                                                    : 'border border-dashed border-slate-200 bg-slate-50 text-slate-300'
                                        }`}
                                        aria-label={`${day.label}${day.recorded ? '已签到' : '未签到'}`}
                                    >
                                        {day.recorded ? '✓' : day.isToday ? '+' : ''}
                                    </span>
                                    <span className={`text-xs ${day.isToday ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{day.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={chartData} margin={{ top: 10, right: 12, left: -12, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" />
                            <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: 18,
                                    border: '1px solid rgba(226,232,240,0.9)',
                                    boxShadow: '0 24px 80px -42px rgba(15,23,42,0.45)',
                                    background: 'rgba(255,255,255,0.96)',
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                            <Line type="monotone" dataKey="心情" stroke="#f97316" strokeWidth={2.6} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="压力" stroke="#f43f5e" strokeWidth={2.6} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="精力" stroke="#f59e0b" strokeWidth={2.6} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" dataKey="睡眠" stroke="#8b5cf6" strokeWidth={2.6} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </section>
    );
}

export default function TodayPage({ onNavigate, onStartChat, onOpenTool }: TodayPageProps) {
    const { hasCheckedIn, todayCheckin, loadHistory, loadRecommendations } = useCheckinStore();
    const [justCheckedIn, setJustCheckedIn] = useState(false);
    const checkinRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        loadHistory('7d');
        loadRecommendations();
    }, [loadHistory, loadRecommendations]);

    useEffect(() => {
        if (!justCheckedIn) return;
        const timer = window.setTimeout(() => setJustCheckedIn(false), 2200);
        return () => window.clearTimeout(timer);
    }, [justCheckedIn]);

    const handleCheckinDone = useCallback(() => {
        setJustCheckedIn(true);
    }, []);

    const scrollToCheckin = useCallback(() => {
        checkinRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    const openStep = useCallback((index: number) => {
        switch (STANDARD_STEPS[index]?.key) {
            case 'checkin': scrollToCheckin(); break;
            case 'assessment': onNavigate('scale'); break;
            case 'chat': onStartChat(); break;
            case 'tools': onNavigate('toolbox'); break;
            case 'program': onNavigate('programs'); break;
            case 'me': onNavigate('me'); break;
            default: break;
        }
    }, [onNavigate, onStartChat, scrollToCheckin]);

    const checkinComplete = hasCheckedIn || justCheckedIn;

    return (
        <div className="mx-auto w-full max-w-[1800px] space-y-6 pb-10">
            <TodayHeader />

            <StudyStepBar onOpenStep={openStep} />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_420px]">
                <div ref={checkinRef} className="scroll-mt-28" data-tour="today-checkin">
                    <AnimatePresence mode="wait">
                        {!checkinComplete ? (
                            <CheckinCard key="checkin" onDone={handleCheckinDone} />
                        ) : todayCheckin ? (
                            <CheckinSummary key="summary" checkin={todayCheckin} />
                        ) : null}
                    </AnimatePresence>
                </div>

                <RecommendationCards onOpenTool={onOpenTool} onBrowseAll={() => onNavigate('toolbox')} />
            </div>

            <AnimatePresence>
                {justCheckedIn ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="rounded-[28px] bg-white px-5 py-4 text-sm font-medium text-gray-900 shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white">
                                <IconCelebration className="h-5 w-5" />
                            </span>
                            <div>
                                <div>签到成功，今日推荐与趋势已刷新。</div>
                                <div className="mt-1 text-xs text-gray-500">现在可以去完成一个练习，或者和 AI 聊一聊。</div>
                            </div>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            <TrendChart />
        </div>
    );
}
