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
import { DAILY_PROGRESS_EVENT, isDailyTaskCompleted, readToolCompletionCount } from '../lib/dailyProgress';
import type { ToolItem } from './ToolboxPage';
import { standardAssets } from '../lib/standardAssets';

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
        if (result.ok) onDone();
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

function useDailyTaskFlags() {
    const [doneTool, setDoneTool] = useState(false);
    const [doneChat, setDoneChat] = useState(false);
    const [doneAssessment, setDoneAssessment] = useState(false);
    const [toolCount, setToolCount] = useState(0);

    useEffect(() => {
        const syncCompletions = () => {
            const count = readToolCompletionCount();
            setToolCount(count);
            setDoneTool(count > 0);
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

    return { doneTool, doneChat, doneAssessment, toolCount };
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

type TagTone = 'green' | 'yellow' | 'red';
const tagClass: Record<TagTone, string> = {
    green: 'bg-green-500 text-white',
    yellow: 'bg-yellow-400 text-gray-900',
    red: 'bg-red-500 text-white',
};
const buttonClass = {
    dark: 'bg-[#ECECEC] text-gray-900 hover:bg-[#e2e2e2]',
    black: 'bg-black text-white hover:bg-gray-800',
    light: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
} as const;

// Nexar TaskCard: three rows separated by hairlines.
function TaskCard({
    icon,
    title,
    tagText,
    tagTone,
    details,
    bottom,
    buttonText,
    buttonVariant,
    onAction,
    tilt = false,
    delay = 0,
}: {
    icon: ReactNode;
    title: string;
    tagText: string;
    tagTone: TagTone;
    details: Array<{ label: string; value: string }>;
    bottom: ReactNode;
    buttonText: string;
    buttonVariant: keyof typeof buttonClass;
    onAction?: () => void;
    tilt?: boolean;
    delay?: number;
}) {
    return (
        <div
            className={`nexar-fade-up flex h-full flex-col rounded-[20px] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-6 sm:py-5 ${tilt ? 'lg:rotate-[2deg] 2xl:rotate-[1.5deg]' : ''}`}
            style={{ animationDelay: `${delay}s` }}
        >
            <div className="flex items-center justify-between gap-3 border-b border-black/10 pb-3">
                <div className="flex items-center gap-2.5 text-[17px] font-medium text-gray-900">
                    <span className="text-gray-700">{icon}</span>
                    {title}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${tagClass[tagTone]}`}>{tagText}</span>
            </div>
            <div className="flex gap-4 border-b border-black/10 py-3">
                {details.map((detail, index) => (
                    <div key={detail.label} className={index === 2 ? 'max-w-[120px] flex-[0.5]' : 'min-w-0 flex-1'}>
                        <div className="text-xs text-gray-500">{detail.label}</div>
                        <div className="mt-1 text-sm font-medium leading-5 text-gray-900">{detail.value}</div>
                    </div>
                ))}
            </div>
            <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                <div className="min-w-0 text-sm text-gray-500">{bottom}</div>
                <button
                    onClick={onAction}
                    disabled={!onAction}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-default ${buttonClass[buttonVariant]}`}
                >
                    {buttonText}
                </button>
            </div>
        </div>
    );
}

const WAVE = [8, 16, 12, 28, 20, 36, 42, 24, 40, 16, 44, 32, 48, 28, 20, 36, 14, 32, 22, 40, 18, 30, 12, 26, 16, 34, 20, 38, 24, 28, 16, 22, 12, 20, 8];

function AvatarStack({ count }: { count: number }) {
    return (
        <span className="flex items-center gap-2">
            <span className="flex -space-x-2">
                {standardAssets.avatars.slice(0, count).map((src) => (
                    <img key={src} src={src} alt="" className="h-7 w-7 rounded-full border-2 border-white object-cover" loading="lazy" />
                ))}
            </span>
        </span>
    );
}

function NexarDashboard({
    checkinComplete,
    wellnessScore,
    historyCount,
    onStartChat,
    onNavigate,
    onCheckin,
}: {
    checkinComplete: boolean;
    wellnessScore: number | null;
    historyCount: number;
    onStartChat: () => void;
    onNavigate: (view: string) => void;
    onCheckin: () => void;
}) {
    const { doneTool, doneChat, doneAssessment, toolCount } = useDailyTaskFlags();
    const name = readDisplayName();
    const doneCount = [checkinComplete, doneTool, doneChat, doneAssessment].filter(Boolean).length;
    const hour = new Date().getHours();
    const hello = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';

    return (
        <div>
            {/* Section header row */}
            <div className="mb-4 grid items-end gap-4 border-b border-black/10 pb-4 sm:mb-6 sm:pb-6 lg:grid-cols-12">
                <div className="nexar-fade-up flex items-center gap-3 lg:col-span-3" style={{ animationDelay: '0.1s' }}>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-orange-500 text-white">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" /></svg>
                    </span>
                    <h1 className="font-display-cn text-[28px] leading-tight text-black sm:text-[34px] 2xl:text-[42px]">{hello}{name ? `，${name}` : ''}</h1>
                </div>
                <div className="nexar-fade-up lg:col-span-6" style={{ animationDelay: '0.15s' }}>
                    <div className="lg:mx-auto lg:w-[85%] 2xl:w-[70%]">
                        <p className="text-[20px] tracking-[-0.04em] text-black sm:text-[24px] lg:text-[26px]">今日安排</p>
                        <p className="mt-1 text-sm text-black/60">{getDailyQuote()}</p>
                    </div>
                </div>
                <div className="nexar-fade-up flex items-center gap-2 text-sm text-black/70 lg:col-span-3 lg:justify-end" style={{ animationDelay: '0.2s' }}>
                    <span>{formatDateCN()}</span>
                    <span className="rounded-full bg-black px-2.5 py-1 text-xs text-white">{doneCount}/4 已完成</span>
                </div>
            </div>

            <div className="flex flex-col gap-4 sm:gap-6 lg:grid lg:grid-cols-12 lg:gap-7">
                {/* Left column */}
                <div className="flex flex-col gap-5 lg:col-span-3">
                    <button onClick={onCheckin} className="nexar-fade-up flex items-center gap-3 rounded-full bg-[#DBECFC] py-2 pl-2 pr-5 text-left" style={{ animationDelay: '0.25s' }}>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="#EAB308" strokeWidth="3.5" strokeLinecap="round" /></svg>
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-medium text-gray-900">{checkinComplete ? '今日签到已完成' : '今日还没签到'}</span>
                            <span className="block text-xs text-gray-600">心情 · 压力 · 精力 · 睡眠</span>
                        </span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-gray-700" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                    </button>

                    <div className="nexar-fade-up" style={{ animationDelay: '0.3s' }}>
                        <div className={`leading-none tracking-[-0.04em] tabular-nums ${wellnessScore === null ? 'text-[72px] text-black/25 sm:text-[84px] xl:text-[96px]' : 'text-[96px] text-black sm:text-[110px] xl:text-[132px]'}`}>
                            {wellnessScore === null ? '--' : wellnessScore}
                        </div>
                        <p className="mt-2 text-[15px] text-black/70">今日综合状态分{wellnessScore === null ? '（签到后生成）' : ''}</p>
                        {wellnessScore === null ? (
                            <button onClick={onCheckin} className="mt-3 inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800">
                                去签到，生成今日分数
                                <IconArrow className="h-4 w-4" />
                            </button>
                        ) : null}
                    </div>

                    <div
                        className="nexar-fade-up relative rounded-[20px] bg-cover bg-top p-5 pb-8 sm:rounded-[28px]"
                        style={{ backgroundImage: `url(${standardAssets.metricsCard})`, animationDelay: '0.35s' }}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[17px] font-medium text-gray-900">本周记录</span>
                            <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-gray-800">近 7 天</span>
                        </div>
                        <div className="mt-5 grid grid-cols-3 gap-2">
                            {[
                                { value: historyCount, unit: '次', label: '状态签到' },
                                { value: toolCount, unit: '次', label: '今日练习' },
                                { value: doneCount, unit: '/4', label: '今日任务' },
                            ].map((item) => (
                                <div key={item.label}>
                                    <div className="text-[30px] leading-none tracking-[-0.03em] text-gray-900 tabular-nums">{item.value}<span className="ml-0.5 text-base">{item.unit}</span></div>
                                    <div className="mt-1 text-xs text-gray-700">{item.label}</div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => onNavigate('trend')} className="absolute -bottom-4 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-md" aria-label="查看历史记录">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                        </button>
                    </div>
                </div>

                {/* Center column */}
                <div className="lg:col-span-6">
                    <div className="grid gap-4 lg:mx-auto lg:w-[85%] 2xl:w-full 2xl:grid-cols-2 2xl:gap-5">
                        <TaskCard
                            icon={<IconJournal className="h-5 w-5" />}
                            title="1 分钟状态签到"
                            tagText={checkinComplete ? '已完成' : '待完成'}
                            tagTone={checkinComplete ? 'green' : 'yellow'}
                            details={[
                                { label: '记录', value: '心情、压力、精力、睡眠' },
                                { label: '作用', value: '刷新今日推荐' },
                                { label: '用时', value: '1 分钟' },
                            ]}
                            bottom={checkinComplete ? '今日基线已建立' : '先签到，推荐会更准'}
                            buttonText={checkinComplete ? '查看结果' : '开始签到'}
                            buttonVariant="dark"
                            onAction={onCheckin}
                            delay={0.3}
                        />
                        <TaskCard
                            icon={<IconChat className="h-5 w-5" />}
                            title="和 AI 聊一次"
                            tagText={doneChat ? '已完成' : 'AI 陪伴'}
                            tagTone={doneChat ? 'green' : 'yellow'}
                            details={[
                                { label: '方式', value: '文字或语音' },
                                { label: '内容', value: '说说今天最在意的一件事' },
                                { label: '用时', value: '5 分钟' },
                            ]}
                            bottom={<span className="flex items-center gap-2"><AvatarStack count={2} /><span>支持性回应，不做诊断</span></span>}
                            buttonText="开始对话"
                            buttonVariant="black"
                            onAction={onStartChat}
                            tilt
                            delay={0.4}
                        />
                        <TaskCard
                            icon={<IconMeditation className="h-5 w-5" />}
                            title="完成 1 个练习"
                            tagText={doneTool ? '已完成' : '推荐'}
                            tagTone={doneTool ? 'green' : 'yellow'}
                            details={[
                                { label: '来源', value: '工具箱' },
                                { label: '建议', value: '呼吸、正念或认知练习' },
                                { label: '用时', value: '3–10 分钟' },
                            ]}
                            bottom={<span className="flex items-center gap-2"><AvatarStack count={3} /><span>按签到结果推荐</span></span>}
                            buttonText="打开工具箱"
                            buttonVariant="light"
                            onAction={() => onNavigate('toolbox')}
                            delay={0.5}
                        />
                        <TaskCard
                            icon={<IconAssessment className="h-5 w-5" />}
                            title="做 1 次心理自评"
                            tagText={doneAssessment ? '已完成' : '可选'}
                            tagTone={doneAssessment ? 'green' : 'red'}
                            details={[
                                { label: '量表', value: 'PHQ-9 · GAD-7 等' },
                                { label: '结果', value: '自动保存到历史' },
                                { label: '用时', value: '3 分钟' },
                            ]}
                            bottom="结果仅供自我了解"
                            buttonText="进入测评"
                            buttonVariant="dark"
                            onAction={() => onNavigate('scale')}
                            delay={0.6}
                        />
                    </div>
                </div>

                {/* Right column */}
                <div className="flex flex-col gap-5 lg:col-span-3">
                    <div className="nexar-fade-up" style={{ animationDelay: '0.45s' }}>
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg" aria-hidden="true">✦</span>
                                <h2 className="whitespace-nowrap text-[20px] tracking-[-0.04em] text-black sm:text-[24px] xl:text-[28px]">快捷入口</h2>
                            </div>
                            <button onClick={() => onNavigate('toolbox')} className="whitespace-nowrap rounded-full bg-white/70 px-3 py-1.5 text-sm text-gray-900 hover:bg-white">全部工具</button>
                        </div>
                        <div className="mt-4">
                            {[
                                { text: '跟着 3D 呼吸球慢慢呼吸，平复紧张', action: () => onNavigate('breathing') },
                                { text: '用 PHQ-9 / GAD-7 看看最近两周的状态', action: () => onNavigate('scale') },
                                { text: '回看最近 7 天的情绪与睡眠变化', action: () => onNavigate('trend') },
                            ].map((item) => (
                                <button key={item.text} onClick={item.action} className="flex w-full items-center justify-between gap-4 border-t border-black/10 py-4 text-left text-[15px] leading-6 text-gray-900 hover:text-black">
                                    <span>{item.text}</span>
                                    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-gray-700" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5Z" /></svg>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="nexar-fade-up relative rounded-[20px] bg-[#DBECFC] p-5 pb-10 sm:rounded-[28px]" style={{ animationDelay: '0.55s' }}>
                        <span className="inline-block rounded-full bg-blue-500 px-3 py-1 text-xs text-white">语音输入</span>
                        <h3 className="font-display-cn mt-3 text-[26px] leading-tight text-black">说出来，AI 陪你理一理</h3>
                        <div className="mt-5 flex h-12 items-center justify-center gap-[3px]" aria-hidden="true">
                            {WAVE.map((h, i) => (
                                <span key={i} className="w-0.5 rounded-full bg-blue-400" style={{ height: `${h * 0.8}px` }} />
                            ))}
                        </div>
                        <button onClick={onStartChat} className="absolute -bottom-5 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-md" aria-label="开始语音对话">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
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
    const { hasCheckedIn, todayCheckin, history, loadHistory, loadRecommendations } = useCheckinStore();
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


    return (
        <div className="mx-auto w-full max-w-[1800px] pb-10">
            <NexarDashboard
                checkinComplete={checkinComplete}
                wellnessScore={wellnessScore}
                historyCount={history.length}
                onStartChat={onStartChat}
                onNavigate={onNavigate}
                onCheckin={scrollToCheckin}
            />

            <div className="mt-10 space-y-6">
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_420px]">
                    <div ref={checkinRef} className="scroll-mt-28">
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
        </div>
    );
}
