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
import { useCheckinStore, type CheckinData } from '../store/useCheckinStore';
import { API_BASE } from '../config/api';
import { DAILY_PROGRESS_EVENT, isDailyTaskCompleted, readToolCompletionCount } from '../lib/dailyProgress';
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
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.7)]">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-700">{eyebrow}</p>
                <h3 className="mt-2 font-display text-[1.55rem] leading-none text-slate-950">{title}</h3>
                {description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
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
        if (result.ok) onDone();
    };

    return (
        <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="desktop-section overflow-hidden"
        >
            <div className="grid gap-8 xl:grid-cols-[minmax(280px,0.92fr)_minmax(0,1.08fr)]">
                <div className="rounded-[1.6rem] border border-cyan-100 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_55%),linear-gradient(180deg,#ffffff_0%,#f8fcff_58%,#f0fdfa_100%)] p-6">
                    <PanelTitle
                        icon={<IconJournal className="h-5 w-5" />}
                        eyebrow="今日签到"
                        title="1 分钟状态签到"
                        description="先记录今天的身体与情绪状态，系统会据此刷新今日推荐与趋势视图。"
                    />
                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                        {SLIDER_KEYS.map((key) => {
                            const meta = SLIDER_LABELS[key];
                            return (
                                <div key={key} className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.28)]">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">{meta.icon}</span>
                                        {meta.label}
                                    </div>
                                    <div className="mt-4 text-3xl font-semibold text-slate-950">{values[key]}</div>
                                    <p className="mt-1 text-xs text-slate-500">{meta.low} → {meta.high}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                        {SLIDER_KEYS.map((key) => {
                            const meta = SLIDER_LABELS[key];
                            const value = values[key];
                            const percent = value * 10;
                            return (
                                <div key={key} className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.28)]">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                            <span className="text-slate-500">{meta.icon}</span>
                                            {meta.label}
                                        </div>
                                        <span className="text-sm font-semibold text-slate-950">{value}/10</span>
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

                    <div className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.28)]">
                        <label className="block text-sm font-semibold text-slate-700" htmlFor="today-note">
                            一句话记录今天的感受
                        </label>
                        <p className="mt-1 text-xs leading-5 text-slate-500">可选。简短写下你此刻的状态，便于之后回看变化。</p>
                        <textarea
                            id="today-note"
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            placeholder="例如：今天有点紧张，但整体还能稳住。"
                            rows={4}
                            className="mt-4 w-full resize-none rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
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
                                className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {submitting ? '保存中...' : '完成签到'}
                            </button>
                        </div>
                    </div>
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
            className="desktop-section"
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

function RecommendationCards({ onOpenTool }: { onOpenTool: (tool: ToolItem) => void }) {
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
        <section className="desktop-section">
            <PanelTitle
                icon={<IconMeditation className="h-5 w-5" />}
                eyebrow="推荐内容"
                title="今日推荐练习"
                description={hasCheckedIn ? '基于你刚刚的签到状态，为你优先排列更适合今天的工具。' : '完成签到后，这里会自动刷新更贴合你状态的推荐。'}
            />

            <div className="mt-6 space-y-3">
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
        </section>
    );
}

function DailyTasks({
    hasCheckedIn,
    onStartChat,
    onNavigate,
}: {
    hasCheckedIn: boolean;
    onStartChat: () => void;
    onNavigate: (view: string) => void;
}) {
    const [doneTool, setDoneTool] = useState(false);
    const [doneChat, setDoneChat] = useState(false);
    const [doneAssessment, setDoneAssessment] = useState(false);

    useEffect(() => {
        const syncCompletions = () => {
            setDoneTool(readToolCompletionCount() > 0);
            setDoneChat(isDailyTaskCompleted('chat'));
            setDoneAssessment(isDailyTaskCompleted('assessment'));
        };

        const handleVisible = () => {
            if (!document.hidden) syncCompletions();
        };

        syncCompletions();
        window.addEventListener('focus', syncCompletions);
        window.addEventListener('storage', syncCompletions);
        window.addEventListener(DAILY_PROGRESS_EVENT, syncCompletions as EventListener);
        document.addEventListener('visibilitychange', handleVisible);
        return () => {
            window.removeEventListener('focus', syncCompletions);
            window.removeEventListener('storage', syncCompletions);
            window.removeEventListener(DAILY_PROGRESS_EVENT, syncCompletions as EventListener);
            document.removeEventListener('visibilitychange', handleVisible);
        };
    }, []);

    const tasks: { label: string; done: boolean; icon: ReactNode; action?: () => void; hint: string }[] = [
        {
            label: '完成状态签到',
            done: hasCheckedIn,
            icon: <IconJournal className="h-5 w-5" />,
            hint: '建立今天的状态基线。',
        },
        {
            label: '完成 1 个练习工具',
            done: doneTool,
            icon: <IconMeditation className="h-5 w-5" />,
            hint: '把建议落到一个可执行动作。',
        },
        {
            label: '和 AI 聊一次',
            done: doneChat,
            icon: <IconChat className="h-5 w-5" />,
            action: onStartChat,
            hint: '获得支持性反馈与陪伴。',
        },
        {
            label: '做 1 次测评',
            done: doneAssessment,
            icon: <IconAssessment className="h-5 w-5" />,
            action: () => onNavigate('scale'),
            hint: '补充更结构化的心理量表信息。',
        },
    ];

    const doneCount = tasks.filter((task) => task.done).length;

    return (
        <section className="desktop-section">
            <PanelTitle
                icon={<IconChart className="h-5 w-5" />}
                eyebrow="今日安排"
                title="先完成这几步"
                description={hasCheckedIn ? '先从一个工具练习开始，AI 对话和测评作为后续补充。' : '先签到，再从推荐里完成一个练习，页面节奏会更清晰。'}
            />

            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50/90 p-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-slate-700">完成度</span>
                    <span className="text-slate-500">{doneCount}/{tasks.length}</span>
                </div>
                <div className="mt-3 h-3 rounded-full bg-white shadow-inner">
                    <div
                        className="h-3 rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-teal-400 transition-all duration-500"
                        style={{ width: `${(doneCount / tasks.length) * 100}%` }}
                    />
                </div>
            </div>

            <div className="mt-5 space-y-3">
                {tasks.map((task) => (
                    <button
                        key={task.label}
                        onClick={task.action}
                        disabled={!task.action}
                        className={`flex w-full items-center gap-4 rounded-[1.4rem] border px-4 py-4 text-left transition duration-200 ${
                            task.done
                                ? 'border-emerald-200 bg-emerald-50/80'
                                : task.action
                                    ? 'border-slate-200 bg-white/92 hover:-translate-y-0.5 hover:shadow-[0_18px_60px_-42px_rgba(15,23,42,0.28)]'
                                    : 'border-slate-200 bg-white/92'
                        }`}
                    >
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${task.done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            {task.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className={`text-sm font-semibold ${task.done ? 'text-emerald-700' : 'text-slate-900'}`}>{task.label}</div>
                            <div className="mt-1 text-xs leading-5 text-slate-500">{task.hint}</div>
                        </div>
                        {task.done ? (
                            <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        ) : task.action ? (
                            <IconArrow className="h-5 w-5 text-slate-300" />
                        ) : (
                            <span className="h-5 w-5 rounded-full border-2 border-slate-200" />
                        )}
                    </button>
                ))}
            </div>
        </section>
    );
}

function TrendChart() {
    const { history, isLoading } = useCheckinStore();

    const chartData = useMemo(() => {
        const sorted = [...history]
            .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
            .slice(-7);

        return sorted.map((record) => ({
            date: record.created_at
                ? new Date(record.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
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
                ) : chartData.length < 2 ? (
                    <div className="flex h-[300px] flex-col items-center justify-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
                            <IconChart className="h-7 w-7" />
                        </div>
                        <p className="mt-5 text-base font-semibold text-slate-900">趋势图会在至少 2 天记录后出现</p>
                        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">继续完成每日签到，系统就能开始为你展示更稳定的变化曲线。</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={320}>
                        {/* @ts-expect-error recharts + React 19 type compat */}
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

    const checkinComplete = hasCheckedIn || justCheckedIn;
    const wellnessScore = getWellnessScore(todayCheckin);

    const glanceMetrics = [
        {
            label: '当前步骤',
            value: checkinComplete ? '签到完成' : '等待签到',
            note: checkinComplete ? '可以直接去完成一个练习' : '先用 1 分钟建立今日状态基线',
        },
        {
            label: '综合分',
            value: wellnessScore === null ? '--' : String(wellnessScore),
            note: wellnessScore === null ? '暂无评分' : '基于四项状态计算',
        },
        {
            label: '下一步',
            value: checkinComplete ? '开始练习' : '完成签到',
            note: checkinComplete ? '推荐区和任务区都已可用' : '未登录也会先保存在当前浏览器',
        },
    ];

    return (
        <div className="mx-auto w-full max-w-[1520px] px-1 pb-8 pt-1 sm:px-0 lg:pb-10">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
                <div className="space-y-6">
                    <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(140deg,rgba(15,23,42,0.96),rgba(15,23,42,0.88)),radial-gradient(circle_at_top_left,rgba(34,211,238,0.22),transparent_38%)] p-7 text-white shadow-[0_36px_120px_-56px_rgba(15,23,42,0.9)] lg:p-8">
                        <div className="absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />
                        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
                        <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-300">今日概览</p>
                                <h1 className="mt-4 font-display text-[2.4rem] leading-[0.95] tracking-[-0.04em] text-white sm:text-[3rem] lg:text-[3.4rem]">
                                    {checkinComplete ? '今天的状态已更新，' : '先完成今日签到，'}
                                    <span className="block text-slate-300">{checkinComplete ? '下一步开始一个练习。' : '再决定接下来做什么。'}</span>
                                </h1>
                                <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
                                    {checkinComplete
                                        ? '推荐区和任务区已经按你今天的状态更新好了，现在优先做一个短练习就可以。'
                                        : '先用 1 分钟记录今天的心情、压力、精力和睡眠，系统会立刻刷新更适合今天的推荐。'}
                                </p>
                                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">{getDailyQuote()}</p>
                                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                    <button
                                        onClick={() => (checkinComplete ? onNavigate('toolbox') : scrollToCheckin())}
                                        className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition duration-200 hover:-translate-y-0.5"
                                    >
                                        {checkinComplete ? '开始今日练习' : '先完成今日签到'}
                                    </button>
                                    <button
                                        onClick={() => (checkinComplete ? onStartChat() : onNavigate('scale'))}
                                        className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white/10"
                                    >
                                        {checkinComplete ? '与 AI 聊一聊' : '查看测评中心'}
                                    </button>
                                </div>
                                <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-300">
                                    {['1. 今日签到', '2. 完成一个工具练习', '3. 再决定是否做 AI 对话或测评'].map((step) => (
                                        <span key={step} className="rounded-full border border-white/10 bg-white/5 px-3 py-2">
                                            {step}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">日期</p>
                                        <h2 className="mt-2 text-xl font-semibold text-white">{formatDateCN()}</h2>
                                    </div>
                                    <div className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${checkinComplete ? 'border border-emerald-300/20 bg-emerald-300/10 text-emerald-200' : 'border border-white/10 bg-white/5 text-slate-300'}`}>
                                        {checkinComplete ? '今日已更新' : '等待记录'}
                                    </div>
                                </div>
                                <div className="mt-5 grid gap-3">
                                    {glanceMetrics.map((metric) => (
                                        <div key={metric.label} className="rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3">
                                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{metric.label}</div>
                                            <div className="mt-2 text-lg font-semibold text-white">{metric.value}</div>
                                            <div className="mt-1 text-xs text-slate-400">{metric.note}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <div ref={checkinRef}>
                    <AnimatePresence mode="wait">
                        {!checkinComplete ? (
                            <CheckinCard key="checkin" onDone={handleCheckinDone} />
                        ) : todayCheckin ? (
                            <CheckinSummary key="summary" checkin={todayCheckin} />
                        ) : null}
                    </AnimatePresence>
                    </div>

                    <AnimatePresence>
                        {justCheckedIn ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="rounded-[1.4rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 shadow-[0_20px_60px_-46px_rgba(16,185,129,0.55)]"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                                        <IconCelebration className="h-5 w-5" />
                                    </span>
                                    <div>
                                        <div>签到成功，今日推荐与趋势已刷新。</div>
                                        <div className="mt-1 text-xs text-emerald-600">现在可以继续去完成一个工具练习或和 AI 对话。</div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>

                    <TrendChart />
                </div>

                <div className="space-y-6">
                    <RecommendationCards onOpenTool={onOpenTool} />
                    <DailyTasks hasCheckedIn={checkinComplete} onStartChat={onStartChat} onNavigate={onNavigate} />
                </div>
            </div>
        </div>
    );
}
