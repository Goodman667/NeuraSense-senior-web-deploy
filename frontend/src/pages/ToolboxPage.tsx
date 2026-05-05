/**
 * ToolboxPage — 数据驱动的工具箱首页
 * 分类筛选 + 搜索 + 卡片列表
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../config/api';

export interface ToolItem {
    id: string;
    title: string;
    subtitle: string;
    category: string;
    icon: string;
    duration_min: number;
    difficulty: string;
    tags: string[];
    steps: { title: string; body: string; duration_sec: number }[];
    guidance: string[];
    sort_order: number;
}

interface ToolboxPageProps {
    onNavigate: (view: string) => void;
    onStartImmersive: () => void;
    onOpenTool: (tool: ToolItem) => void;
}

type IconRenderer = (className?: string) => ReactNode;

const revealCard = {
    hidden: { opacity: 0, y: 20 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.55,
            ease: 'easeOut' as const,
        },
    },
};

const staggerGrid = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.08,
        },
    },
};

/* ------------------------------------------------------------------ */
/*  SVG Icon helpers                                                   */
/* ------------------------------------------------------------------ */

function ClipboardIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
    );
}

function EyeIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}

function TreeIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-6m0 0l-4-5h2.5L8 6l4-3 4 3-2.5 4H16l-4 5z" />
        </svg>
    );
}

function BreathingBubbleIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function BrainIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
        </svg>
    );
}

function ClockIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function KeyboardIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5a1.5 1.5 0 011.5 1.5v7.5a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5v-7.5a1.5 1.5 0 011.5-1.5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 10.5h.008v.008H6V10.5zm3 0h.008v.008H9V10.5zm3 0h.008v.008H12V10.5zm3 0h.008v.008H15V10.5zm3 0h.008v.008H18V10.5zM6 13.5h.008v.008H6V13.5zm3 0h.008v.008H9V13.5zm3 0h.008v.008H12V13.5zm3 0h.008v.008H15V13.5zm3 0h.008v.008H18V13.5zM8.25 16.5h7.5" />
        </svg>
    );
}

function TrendUpIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
    );
}

function WindIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h11a4 4 0 100-4M3 12h16a4 4 0 110 4M3 16h7a4 4 0 110 4" />
        </svg>
    );
}

function PencilSquareIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
    );
}

function StopCircleIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.563A.562.562 0 019 14.437V9.564z" />
        </svg>
    );
}

function MeditationIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
    );
}

function MoonIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
    );
}

function PomodoroIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 2.25h3" />
        </svg>
    );
}

function SearchIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor">
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m20 20-3.5-3.5" />
        </svg>
    );
}

function LayerGridIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor">
            <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
            <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
            <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
            <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
        </svg>
    );
}

function SparklineIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16.5 9 11l3.5 3.5L20 7.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 7.5h3v3" />
        </svg>
    );
}

function CompassIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor">
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.8 9.2-2 5.6-5.6 2 2-5.6 5.6-2Z" />
        </svg>
    );
}

function ArrowUpRightIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h8v8" />
        </svg>
    );
}

function toolIconFromEmoji(emoji: string, className = 'w-5 h-5'): ReactNode {
    switch (emoji) {
        case '🌬️': return <WindIcon className={className} />;
        case '📝': return <PencilSquareIcon className={className} />;
        case '🛑': return <StopCircleIcon className={className} />;
        case '🧘': return <MeditationIcon className={className} />;
        case '🌙': return <MoonIcon className={className} />;
        case '🍅': return <PomodoroIcon className={className} />;
        case '📋': return <ClipboardIcon className={className} />;
        case '👁️': return <EyeIcon className={className} />;
        case '🌲': return <TreeIcon className={className} />;
        case '🫧': return <BreathingBubbleIcon className={className} />;
        case '🧠': return <BrainIcon className={className} />;
        case '🕐': return <ClockIcon className={className} />;
        case '⌨️': return <KeyboardIcon className={className} />;
        case '📈': return <TrendUpIcon className={className} />;
        default:
            return <MeditationIcon className={className} />;
    }
}

const CATEGORY_META: Record<string, {
    label: string;
    description: string;
    color: string;
    gradient: string;
    panel: string;
    accent: string;
    icon: IconRenderer;
}> = {
    breathing: {
        label: '呼吸放松',
        description: '快速调节呼吸节律与身体唤醒水平。',
        color: 'bg-emerald-500',
        gradient: 'from-emerald-100 via-white to-teal-100',
        panel: 'from-emerald-500/12 via-cyan-500/5 to-white',
        accent: 'text-emerald-700',
        icon: (className) => <WindIcon className={className} />,
    },
    cbt: {
        label: 'CBT 微练习',
        description: '识别自动思维并进行结构化重建。',
        color: 'bg-amber-500',
        gradient: 'from-amber-100 via-white to-orange-100',
        panel: 'from-amber-500/12 via-orange-500/6 to-white',
        accent: 'text-amber-700',
        icon: (className) => <PencilSquareIcon className={className} />,
    },
    dbt: {
        label: 'DBT 急救',
        description: '用于高压时刻的短时稳定与应急技巧。',
        color: 'bg-rose-500',
        gradient: 'from-rose-100 via-white to-red-100',
        panel: 'from-rose-500/12 via-red-500/6 to-white',
        accent: 'text-rose-700',
        icon: (className) => <StopCircleIcon className={className} />,
    },
    mindfulness: {
        label: '正念冥想',
        description: '降低心理噪音，恢复专注与觉察。',
        color: 'bg-violet-500',
        gradient: 'from-violet-100 via-white to-fuchsia-100',
        panel: 'from-violet-500/12 via-fuchsia-500/6 to-white',
        accent: 'text-violet-700',
        icon: (className) => <MeditationIcon className={className} />,
    },
    sleep: {
        label: '睡前放松',
        description: '为夜间过渡准备更平缓的节奏。',
        color: 'bg-indigo-500',
        gradient: 'from-indigo-100 via-white to-sky-100',
        panel: 'from-indigo-500/12 via-sky-500/6 to-white',
        accent: 'text-indigo-700',
        icon: (className) => <MoonIcon className={className} />,
    },
    focus: {
        label: '专注训练',
        description: '适合白天恢复注意力与认知执行。',
        color: 'bg-cyan-500',
        gradient: 'from-cyan-100 via-white to-teal-100',
        panel: 'from-cyan-500/12 via-teal-500/6 to-white',
        accent: 'text-cyan-700',
        icon: (className) => <PomodoroIcon className={className} />,
    },
};

const FALLBACK_CATEGORY_META = {
    label: '综合练习',
    description: '通用工具练习。',
    color: 'bg-slate-500',
    gradient: 'from-slate-100 via-white to-slate-200',
    panel: 'from-slate-500/10 via-slate-400/5 to-white',
    accent: 'text-slate-700',
    icon: (className?: string) => <LayerGridIcon className={className} />,
};

const CATEGORY_KEYS = Object.keys(CATEGORY_META);

const DIFFICULTY_META: Record<string, { label: string; tone: string }> = {
    easy: {
        label: '简单',
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/30 dark:text-emerald-200',
    },
    medium: {
        label: '中等',
        tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-200',
    },
    hard: {
        label: '进阶',
        tone: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/30 dark:text-rose-200',
    },
};

const SHORTCUT_META = [
    {
        id: 'scale',
        label: '量表评估',
        description: '量表筛查与 AI 解读',
        icon: <ClipboardIcon className="h-6 w-6" />,
        tone: 'from-cyan-500/16 via-white to-emerald-500/10 text-cyan-800',
    },
    {
        id: 'biosignal',
        label: '生物信号',
        description: '眼动与多模态状态洞察',
        icon: <EyeIcon className="h-6 w-6" />,
        tone: 'from-sky-500/16 via-white to-cyan-500/10 text-sky-800',
    },
    {
        id: 'immersive',
        label: '沉浸疗愈',
        description: '进入沉浸式自然调节空间',
        icon: <TreeIcon className="h-6 w-6" />,
        tone: 'from-emerald-500/16 via-white to-teal-500/10 text-emerald-800',
    },
    {
        id: 'breathing',
        label: '3D呼吸球',
        description: '视觉呼吸引导与放松训练',
        icon: <BreathingBubbleIcon className="h-6 w-6" />,
        tone: 'from-teal-500/16 via-white to-cyan-500/10 text-teal-800',
    },
    {
        id: 'stroop',
        label: 'Stroop测试',
        description: '认知控制与专注测试',
        icon: <BrainIcon className="h-6 w-6" />,
        tone: 'from-violet-500/16 via-white to-fuchsia-500/10 text-violet-800',
    },
    {
        id: 'clock',
        label: '画钟测验',
        description: '认知与空间组织能力检查',
        icon: <ClockIcon className="h-6 w-6" />,
        tone: 'from-indigo-500/16 via-white to-sky-500/10 text-indigo-800',
    },
    {
        id: 'keystroke',
        label: '键盘动力学',
        description: '行为节律与压力线索',
        icon: <KeyboardIcon className="h-6 w-6" />,
        tone: 'from-slate-500/14 via-white to-cyan-500/10 text-slate-800',
    },
    {
        id: 'trend',
        label: 'AI趋势预测',
        description: '回看变化并读取趋势提示',
        icon: <TrendUpIcon className="h-6 w-6" />,
        tone: 'from-amber-500/16 via-white to-rose-500/10 text-amber-800',
    },
] as const;

function formatDuration(value: number) {
    if (!Number.isFinite(value) || value <= 0) return '—';
    return `${Math.round(value)} min`;
}

export default function ToolboxPage({ onNavigate, onStartImmersive, onOpenTool }: ToolboxPageProps) {
    const [tools, setTools] = useState<ToolItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        let ignore = false;
        const controller = new AbortController();

        const fetchTools = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (activeCategory) params.set('category', activeCategory);
                if (searchQuery.trim()) params.set('q', searchQuery.trim());

                const query = params.toString();
                const endpoint = query ? `${API_BASE}/tools?${query}` : `${API_BASE}/tools`;
                const res = await fetch(endpoint, { signal: controller.signal });
                const data = await res.json();

                if (!ignore && data.success) {
                    setTools(Array.isArray(data.tools) ? data.tools : []);
                }
            } catch (error) {
                if (!ignore && (error as Error)?.name !== 'AbortError') {
                    setTools([]);
                }
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        fetchTools();

        return () => {
            ignore = true;
            controller.abort();
        };
    }, [activeCategory, searchQuery]);

    const grouped = useMemo(() => {
        return CATEGORY_KEYS
            .map((categoryKey) => ({
                key: categoryKey,
                ...CATEGORY_META[categoryKey],
                items: tools.filter((tool) => tool.category === categoryKey),
            }))
            .filter((group) => group.items.length > 0);
    }, [tools]);

    const averageDuration = useMemo(() => {
        if (tools.length === 0) return 0;
        const total = tools.reduce((sum, tool) => sum + (Number.isFinite(tool.duration_min) ? tool.duration_min : 0), 0);
        return Math.round(total / tools.length);
    }, [tools]);

    const highlightedTool = tools[0] ?? null;
    const activeCategoryMeta = activeCategory ? CATEGORY_META[activeCategory] : null;
    const trimmedQuery = searchQuery.trim();

    const shortcuts = useMemo(() => ([
        { ...SHORTCUT_META[0], action: () => onNavigate('scale') },
        { ...SHORTCUT_META[1], action: () => onNavigate('biosignal') },
        { ...SHORTCUT_META[2], action: () => onStartImmersive() },
        { ...SHORTCUT_META[3], action: () => onNavigate('breathing') },
        { ...SHORTCUT_META[4], action: () => onNavigate('stroop') },
        { ...SHORTCUT_META[5], action: () => onNavigate('clock') },
        { ...SHORTCUT_META[6], action: () => onNavigate('keystroke') },
        { ...SHORTCUT_META[7], action: () => onNavigate('trend') },
    ]), [onNavigate, onStartImmersive]);

    const insightCards = [
        {
            label: '当前结果',
            value: tools.length ? String(tools.length).padStart(2, '0') : '00',
            detail: '可直接进入的练习工具',
            icon: <LayerGridIcon className="h-5 w-5" />,
        },
        {
            label: '覆盖分类',
            value: String(grouped.length).padStart(2, '0'),
            detail: '当前视图中的主题分区',
            icon: <CompassIcon className="h-5 w-5" />,
        },
        {
            label: '平均时长',
            value: formatDuration(averageDuration),
            detail: '帮助用户预估完成负担',
            icon: <SparklineIcon className="h-5 w-5" />,
        },
    ];

    return (
        <div className="space-y-8 lg:space-y-10">
            <section className="desktop-section relative overflow-hidden px-6 py-6 lg:px-8 lg:py-8 xl:px-10 xl:py-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_88%_16%,rgba(5,150,105,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,250,252,0.96))]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:112px_112px] opacity-60" />
                <div className="absolute left-10 top-10 h-32 w-32 rounded-full bg-cyan-200/30 blur-3xl" />
                <div className="absolute right-8 top-12 h-40 w-40 rounded-full bg-emerald-200/25 blur-3xl" />

                <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.12fr)_420px] xl:gap-10">
                    <motion.div initial="hidden" animate="show" variants={staggerGrid} className="max-w-4xl space-y-6">
                        <motion.div variants={revealCard} className="inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-700 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.28)] backdrop-blur-xl">
                            <span className="h-2 w-2 rounded-full bg-cyan-500" />
                            NeuraSense 工具箱
                        </motion.div>

                        <motion.div variants={revealCard} className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-3 py-1.5 shadow-sm backdrop-blur">
                                    <LayerGridIcon className="h-4 w-4 text-cyan-700" />
                                    练习与评估入口
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-3 py-1.5 shadow-sm backdrop-blur">
                                    <CompassIcon className="h-4 w-4 text-emerald-700" />
                                    {activeCategoryMeta ? activeCategoryMeta.label : '全部分类'}
                                </span>
                            </div>

                            <div>
                                <h2 className="font-display text-4xl leading-tight text-slate-950 sm:text-5xl xl:text-[3.6rem]">
                                    为当前状态选择合适的
                                    <span className="block text-cyan-800">练习、评估与放松方式。</span>
                                </h2>
                                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 xl:text-[1.05rem]">
                                    这里汇集呼吸放松、认知训练、睡前调节与常用评估入口，可按主题、时长和需求快速查找。
                                </p>
                            </div>
                        </motion.div>

                        <motion.div variants={revealCard} className="grid gap-4 md:grid-cols-3">
                            {insightCards.map((card) => (
                                <div
                                    key={card.label}
                                    className="rounded-[1.5rem] border border-white/80 bg-white/78 p-5 shadow-[0_22px_70px_-42px_rgba(15,23,42,0.3)] backdrop-blur-xl"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{card.label}</p>
                                            <p className="mt-3 font-display text-3xl text-slate-950">{card.value}</p>
                                        </div>
                                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-100 bg-cyan-50 text-cyan-700">
                                            {card.icon}
                                        </span>
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-slate-500">{card.detail}</p>
                                </div>
                            ))}
                        </motion.div>

                        <motion.div variants={revealCard} className="flex flex-col gap-3 lg:flex-row lg:items-center">
                            <label className="relative block flex-1">
                                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <SearchIcon className="h-5 w-5" />
                                </span>
                                <input
                                    type="search"
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="搜索练习主题、标签或工具名称…"
                                    aria-label="搜索工具"
                                    className="h-14 w-full rounded-[1.4rem] border border-white/80 bg-white/88 pl-12 pr-4 text-[15px] text-slate-700 shadow-[0_20px_60px_-44px_rgba(15,23,42,0.28)] outline-none transition duration-200 placeholder:text-slate-400 focus:border-cyan-200 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100"
                                />
                            </label>

                            {(trimmedQuery || activeCategory) ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setActiveCategory(null);
                                    }}
                                    className="inline-flex h-14 items-center justify-center rounded-[1.4rem] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.3)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100"
                                >
                                    重置视图
                                </button>
                            ) : null}
                        </motion.div>
                    </motion.div>

                    <motion.aside
                        initial={{ opacity: 0, x: 18 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.08 }}
                        className="overflow-hidden rounded-[1.9rem] border border-white/80 bg-white/82 p-6 shadow-[0_30px_90px_-46px_rgba(15,23,42,0.34)] backdrop-blur-xl"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">常用入口</p>
                                <h3 className="mt-3 font-display text-2xl text-slate-950">常用功能</h3>
                            </div>
                            <span className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                                8 项
                            </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-500">
                            常用功能集中在这里，可快速进入评估、沉浸练习、生物信号分析和趋势查看。
                        </p>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                            {shortcuts.map((shortcut) => (
                                <button
                                    key={shortcut.id}
                                    type="button"
                                    onClick={shortcut.action}
                                    aria-label={`打开${shortcut.label}`}
                                    className="group rounded-[1.5rem] border border-slate-200/80 bg-white/86 p-4 text-left shadow-[0_18px_60px_-40px_rgba(15,23,42,0.28)] transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_28px_80px_-42px_rgba(15,23,42,0.34)] focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100"
                                >
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-gradient-to-br ${shortcut.tone} shadow-inner`}>
                                        {shortcut.icon}
                                    </div>
                                    <div className="mt-4">
                                        <h4 className="text-sm font-semibold text-slate-900 transition-colors duration-200 group-hover:text-cyan-900">{shortcut.label}</h4>
                                        <p className="mt-2 text-xs leading-5 text-slate-500">{shortcut.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.aside>
                </div>
            </section>

            <div className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <motion.aside
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: 'easeOut', delay: 0.06 }}
                    className="space-y-6 xl:sticky xl:top-28"
                >
                    <section className="desktop-section space-y-4 p-5 lg:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Filter Library</p>
                                <h3 className="mt-2 font-display text-2xl text-slate-950">分类筛选</h3>
                            </div>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                                {activeCategoryMeta ? '已筛选' : '全部'}
                            </span>
                        </div>

                        <div className="space-y-2.5">
                            <button
                                type="button"
                                onClick={() => setActiveCategory(null)}
                                className={`group flex w-full items-center gap-3 rounded-[1.35rem] border px-4 py-3 text-left transition duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100 ${
                                    !activeCategory
                                        ? 'border-cyan-200 bg-cyan-50 text-cyan-900 shadow-[0_18px_56px_-40px_rgba(8,145,178,0.35)]'
                                        : 'border-slate-200/80 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300'
                                }`}
                            >
                                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${!activeCategory ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-900 group-hover:text-white'}`}>
                                    <LayerGridIcon className="h-5 w-5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold">全部工具</span>
                                    <span className="mt-1 block text-xs leading-5 text-slate-500">显示当前可访问的全部练习与训练入口。</span>
                                </span>
                            </button>

                            {CATEGORY_KEYS.map((categoryKey) => {
                                const meta = CATEGORY_META[categoryKey];
                                const active = activeCategory === categoryKey;

                                return (
                                    <button
                                        key={categoryKey}
                                        type="button"
                                        onClick={() => setActiveCategory(active ? null : categoryKey)}
                                        aria-label={`筛选${meta.label}`}
                                        className={`group flex w-full items-center gap-3 rounded-[1.35rem] border px-4 py-3 text-left transition duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100 ${
                                            active
                                                ? 'border-cyan-200 bg-cyan-50 text-cyan-900 shadow-[0_18px_56px_-40px_rgba(8,145,178,0.35)]'
                                                : 'border-slate-200/80 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300'
                                        }`}
                                    >
                                        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${active ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-900 group-hover:text-white'}`}>
                                            {meta.icon('h-5 w-5')}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-semibold">{meta.label}</span>
                                            <span className="mt-1 block text-xs leading-5 text-slate-500">{meta.description}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className="desktop-section p-5 lg:p-6">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">当前筛选</p>
                        <h3 className="mt-2 font-display text-2xl text-slate-950">当前视图摘要</h3>
                        <div className="mt-5 space-y-4 text-sm">
                            <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/80 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">筛选范围</p>
                                <p className="mt-2 text-base font-semibold text-slate-900">{activeCategoryMeta ? activeCategoryMeta.label : '全部分类'}</p>
                                <p className="mt-2 leading-6 text-slate-500">{activeCategoryMeta ? activeCategoryMeta.description : '当前显示所有可访问的工具练习，并按照主题进行分组。'}</p>
                            </div>
                            <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/80 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">检索词</p>
                                <p className="mt-2 text-base font-semibold text-slate-900">{trimmedQuery || '未输入关键词'}</p>
                                <p className="mt-2 leading-6 text-slate-500">可匹配工具标题、副标题和标签，搜索结果会随输入实时更新。</p>
                            </div>
                        </div>
                    </section>

                    {highlightedTool ? (
                        <button
                            type="button"
                            onClick={() => onOpenTool(highlightedTool)}
                            className="desktop-section group block w-full overflow-hidden p-0 text-left transition duration-200 hover:-translate-y-1 hover:shadow-[0_30px_90px_-44px_rgba(15,23,42,0.34)] focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100"
                        >
                            <div className="relative overflow-hidden rounded-[1.75rem] p-6">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.9))]" />
                                <div className="relative">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
                                        今日优先推荐
                                    </div>
                                    <h3 className="mt-4 font-display text-[1.8rem] leading-tight text-white">{highlightedTool.title}</h3>
                                    <p className="mt-3 text-sm leading-6 text-slate-300">{highlightedTool.subtitle}</p>
                                    <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-200">
                                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">{formatDuration(highlightedTool.duration_min)}</span>
                                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">{DIFFICULTY_META[highlightedTool.difficulty]?.label || highlightedTool.difficulty}</span>
                                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">{(highlightedTool.steps || []).length} 个步骤</span>
                                    </div>
                                    <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-100 transition-transform duration-200 group-hover:translate-x-0.5">
                                        直接进入练习
                                        <ArrowUpRightIcon className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>
                        </button>
                    ) : null}
                </motion.aside>

                <section className="space-y-6">
                    <div className="desktop-section p-5 lg:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">工具目录</p>
                                <h3 className="mt-2 font-display text-[2rem] text-slate-950">工具分组列表</h3>
                                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                                    按主题浏览可用练习与评估工具，支持搜索、分类筛选和直接进入。
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">{tools.length} 个结果</span>
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">{grouped.length} 个分组</span>
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">搜索与筛选实时生效</span>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid gap-6 xl:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="desktop-section p-6">
                                    <div className="skeleton h-6 w-40" />
                                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                        {Array.from({ length: 2 }).map((__, cardIndex) => (
                                            <div key={cardIndex} className="rounded-[1.6rem] border border-slate-200/80 bg-white p-5">
                                                <div className="skeleton h-12 w-12 rounded-2xl" />
                                                <div className="mt-4 skeleton h-5 w-3/4" />
                                                <div className="mt-3 skeleton h-4 w-full" />
                                                <div className="mt-2 skeleton h-4 w-2/3" />
                                                <div className="mt-6 flex gap-2">
                                                    <div className="skeleton h-8 w-20 rounded-full" />
                                                    <div className="skeleton h-8 w-16 rounded-full" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : grouped.length === 0 ? (
                        <div className="desktop-section overflow-hidden p-0">
                            <div className="relative p-8 lg:p-10">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.98))]" />
                                <div className="relative max-w-2xl">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] border border-cyan-100 bg-cyan-50 text-cyan-700">
                                        <SearchIcon className="h-6 w-6" />
                                    </div>
                                    <h3 className="mt-6 font-display text-3xl text-slate-950">没有找到匹配的工具</h3>
                                    <p className="mt-4 text-sm leading-7 text-slate-500">
                                        当前筛选条件下暂无结果，可尝试清空关键词或切换分类。
                                    </p>
                                    <div className="mt-6 flex flex-wrap gap-3">
                                        {(trimmedQuery || activeCategory) ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchQuery('');
                                                    setActiveCategory(null);
                                                }}
                                                className="inline-flex items-center justify-center rounded-full border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-semibold text-cyan-800 transition duration-200 hover:-translate-y-0.5 hover:bg-cyan-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100"
                                            >
                                                清空筛选
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`${activeCategory || 'all'}-${trimmedQuery || 'idle'}`}
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -14 }}
                                transition={{ duration: 0.22, ease: 'easeOut' }}
                                className="space-y-6"
                            >
                                {grouped.map((group) => (
                                    <section key={group.key} className="desktop-section overflow-hidden p-0">
                                        <div className="relative p-6 lg:p-7">
                                            <div className={`absolute inset-0 bg-gradient-to-br ${group.panel}`} />
                                            <div className="relative">
                                                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                                    <div className="flex items-start gap-4">
                                                        <div className={`flex h-14 w-14 items-center justify-center rounded-[1.45rem] border border-white/80 bg-gradient-to-br ${group.gradient} text-slate-900 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.24)]`}>
                                                            {group.icon('h-6 w-6')}
                                                        </div>
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-3">
                                                                <h4 className="font-display text-[1.85rem] leading-none text-slate-950">{group.label}</h4>
                                                                <span className="rounded-full border border-white/80 bg-white/78 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur">
                                                                    {group.items.length} 个
                                                                </span>
                                                            </div>
                                                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{group.description}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                                        <span className="rounded-full border border-white/80 bg-white/76 px-3 py-1.5 shadow-sm backdrop-blur">分组展示</span>
                                                        <span className="rounded-full border border-white/80 bg-white/76 px-3 py-1.5 shadow-sm backdrop-blur">点击开始练习</span>
                                                    </div>
                                                </div>

                                                <motion.div variants={staggerGrid} initial="hidden" animate="show" className="mt-7 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                                                    {group.items.map((tool) => {
                                                        const meta = CATEGORY_META[tool.category] ?? FALLBACK_CATEGORY_META;
                                                        const difficultyMeta = DIFFICULTY_META[tool.difficulty] ?? {
                                                            label: tool.difficulty,
                                                            tone: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200',
                                                        };
                                                        const previewTags = (tool.tags || []).slice(0, 3);
                                                        const previewStep = tool.steps?.[0]?.title || '进入练习流程';
                                                        const guidanceCount = (tool.guidance || []).length;
                                                        const stepCount = (tool.steps || []).length;

                                                        return (
                                                            <motion.button
                                                                key={tool.id}
                                                                type="button"
                                                                variants={revealCard}
                                                                whileHover={{ y: -5 }}
                                                                whileTap={{ scale: 0.985 }}
                                                                onClick={() => onOpenTool(tool)}
                                                                className="group relative overflow-hidden rounded-[1.7rem] border border-slate-200/80 bg-white/94 p-5 text-left shadow-[0_24px_75px_-48px_rgba(15,23,42,0.34)] transition duration-300 hover:border-slate-300 hover:shadow-[0_32px_90px_-46px_rgba(15,23,42,0.38)] focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100 dark:border-slate-700/70 dark:bg-slate-900/85"
                                                            >
                                                                <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} opacity-55 transition duration-300 group-hover:opacity-80`} />
                                                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />

                                                                <div className="relative">
                                                                    <div className="flex items-start justify-between gap-4">
                                                                        <div className="flex min-w-0 items-start gap-3">
                                                                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/82 text-slate-800 shadow-sm backdrop-blur">
                                                                                {toolIconFromEmoji(tool.icon, 'h-5 w-5')}
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                    <span className={`h-2.5 w-2.5 rounded-full ${meta.color}`} />
                                                                                    <span className={`text-xs font-semibold ${meta.accent}`}>{meta.label}</span>
                                                                                </div>
                                                                                <h5 className="mt-2 text-lg font-semibold leading-snug text-slate-950">{tool.title}</h5>
                                                                            </div>
                                                                        </div>
                                                                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/85 text-slate-500 transition duration-200 group-hover:text-slate-900">
                                                                            <ArrowUpRightIcon className="h-4 w-4" />
                                                                        </span>
                                                                    </div>

                                                                    <p className="mt-4 min-h-[3.25rem] text-sm leading-6 text-slate-600">{tool.subtitle}</p>

                                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${difficultyMeta.tone}`}>
                                                                            {difficultyMeta.label}
                                                                        </span>
                                                                        <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600">
                                                                            {formatDuration(tool.duration_min)}
                                                                        </span>
                                                                        <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600">
                                                                            {stepCount} 个步骤
                                                                        </span>
                                                                    </div>

                                                                    <div className="mt-5 rounded-[1.2rem] border border-white/80 bg-white/76 p-4 backdrop-blur-sm">
                                                                        <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                                                            <span>首个步骤</span>
                                                                            <span>{guidanceCount} 段引导</span>
                                                                        </div>
                                                                        <p className="mt-2 text-sm font-medium text-slate-800">{previewStep}</p>
                                                                    </div>

                                                                    <div className="mt-5 flex flex-wrap gap-2">
                                                                        {previewTags.length > 0 ? previewTags.map((tag) => (
                                                                            <span key={tag} className="rounded-full border border-slate-200/80 bg-white/76 px-3 py-1 text-xs text-slate-600 backdrop-blur-sm">
                                                                                {tag}
                                                                            </span>
                                                                        )) : (
                                                                            <span className="rounded-full border border-slate-200/80 bg-white/76 px-3 py-1 text-xs text-slate-600 backdrop-blur-sm">
                                                                                结构化练习
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </motion.button>
                                                        );
                                                    })}
                                                </motion.div>
                                            </div>
                                        </div>
                                    </section>
                                ))}
                            </motion.div>
                        </AnimatePresence>
                    )}
                </section>
            </div>
        </div>
    );
}
