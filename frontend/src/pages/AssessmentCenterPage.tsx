/**
 * AssessmentCenterPage — 测评中心
 *
 * 三个视图层级:
 * 1. 目录页 (CatalogView) — 搜索 + 分类筛选 + 排序 + 量表卡片
 * 2. 测评页 (TakingView) — 渲染具体量表组件
 * 3. 记录页 (HistoryView) — 历史结果 + 详情 + PDF 导出
 */

import { useState, useEffect, useMemo, type ComponentType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../config/api';
import { markDailyTaskCompleted } from '../lib/dailyProgress';
import { MarkdownText } from '../components/Assessment/MarkdownText';

// 量表组件
import { PHQ9Scale } from '../components/Assessment/PHQ9Scale';
import { GAD7Scale } from '../components/Assessment/GAD7Scale';
import { SDSScale } from '../components/Assessment/SDSScale';
import { SASScale } from '../components/Assessment/SASScale';
import { PSSScale } from '../components/Assessment/PSSScale';
import { PDFDownloadButton } from '../components/Assessment/PDFDownloadButton';

/* ============================================================
   Types
   ============================================================ */
interface CatalogItem {
    key: string;
    title: string;
    subtitle: string;
    description: string;
    category: string;
    estimated_minutes: number;
    icon: string;
    gradient: string;
    tags: string[];
    question_count: number;
    score_range: string;
    enabled: boolean;
    sort_order: number;
}

interface AssessmentResult {
    id: string;
    user_id?: string;
    assessment_key: string;
    total_score: number;
    raw_score?: number;
    severity: string;
    answers: number[];
    ai_interpretation?: string;
    created_at: string;
}

interface AssessmentCenterPageProps {
    onClose: () => void;
}

/* ============================================================
   Key → Component mapping
   ============================================================ */
const SCALE_MAP: Record<string, ComponentType<{ onComplete?: (result: any) => void; onClose?: () => void }>> = {
    phq9: PHQ9Scale,
    gad7: GAD7Scale,
    sds: SDSScale,
    sas: SASScale,
    pss10: PSSScale,
};

/* ============================================================
   Constants
   ============================================================ */
const CATEGORIES = [
    { key: null, label: '全部' },
    { key: 'emotion', label: '情绪' },
    { key: 'anxiety', label: '焦虑' },
    { key: 'stress', label: '压力' },
    { key: 'sleep', label: '睡眠' },
    { key: 'focus', label: '专注' },
    { key: 'interpersonal', label: '人际' },
];

const SEVERITY_COLORS: Record<string, string> = {
    '正常': 'bg-green-100 text-green-700',
    '无抑郁': 'bg-green-100 text-green-700',
    '低压力': 'bg-green-100 text-green-700',
    '轻度': 'bg-yellow-100 text-yellow-700',
    '轻度焦虑': 'bg-yellow-100 text-yellow-700',
    '轻度抑郁': 'bg-yellow-100 text-yellow-700',
    '中等压力': 'bg-yellow-100 text-yellow-700',
    '中度': 'bg-orange-100 text-orange-700',
    '中度焦虑': 'bg-orange-100 text-orange-700',
    '中度抑郁': 'bg-orange-100 text-orange-700',
    '中重度': 'bg-red-100 text-red-700',
    '中重度抑郁': 'bg-red-100 text-red-700',
    '重度': 'bg-red-100 text-red-700',
    '重度焦虑': 'bg-red-100 text-red-700',
    '重度抑郁': 'bg-red-100 text-red-700',
    '高压力': 'bg-red-100 text-red-700',
};

function getSeverityColor(severity: string): string {
    return SEVERITY_COLORS[severity] || 'bg-warm-100 text-warm-600';
}

/* ============================================================
   CatalogView — 测评目录
   ============================================================ */
function CatalogView({
    catalog,
    onSelect,
    onShowHistory,
    onClose,
}: {
    catalog: CatalogItem[];
    onSelect: (item: CatalogItem) => void;
    onShowHistory: () => void;
    onClose: () => void;
}) {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const filtered = useMemo(() => {
        let list = catalog;
        if (activeCategory) {
            list = list.filter((c) => c.category === activeCategory);
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(
                (c) =>
                    c.title.toLowerCase().includes(q) ||
                    c.subtitle.toLowerCase().includes(q) ||
                    c.tags.some((t) => t.toLowerCase().includes(q)),
            );
        }
        return list;
    }, [catalog, activeCategory, search]);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/80 border border-warm-200/50 flex items-center justify-center text-warm-500 hover:text-warm-700 transition-all active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-warm-800">测评中心</h2>
                        <p className="text-warm-500 text-xs mt-0.5">专业心理健康评估工具</p>
                    </div>
                </div>
                <button
                    onClick={onShowHistory}
                    className="w-10 h-10 rounded-xl bg-white/80 border border-warm-200/50 flex items-center justify-center text-warm-500 hover:text-warm-700 transition-all active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜索量表..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/80 border border-warm-100/60 text-sm text-warm-700 placeholder:text-warm-300 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
                />
            </div>

            {/* Category Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.key || 'all'}
                        onClick={() => setActiveCategory(cat.key)}
                        className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                            activeCategory === cat.key
                                ? 'bg-primary-500 text-white shadow-sm'
                                : 'bg-white/80 text-warm-600 border border-warm-100/60 hover:bg-warm-50'
                        }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Assessment Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filtered.map((item) => {
                    const hasComponent = !!SCALE_MAP[item.key];
                    return (
                        <motion.button
                            key={item.key}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => hasComponent && onSelect(item)}
                            className={`text-left bg-white/80 backdrop-blur rounded-2xl border border-warm-100/60 shadow-sm hover:shadow-md transition-all overflow-hidden ${
                                !hasComponent ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                        >
                            {/* Gradient Cover */}
                            <div className={`h-24 bg-gradient-to-r ${item.gradient} flex items-center justify-center relative`}>
                                <span className="text-4xl">{item.icon}</span>
                                {!hasComponent && (
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                        <span className="text-white text-sm font-medium bg-black/40 px-3 py-1 rounded-full">即将上线</span>
                                    </div>
                                )}
                            </div>

                            {/* Card Body */}
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-bold text-warm-800">{item.title}</h4>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">免费</span>
                                </div>
                                <p className="text-xs text-warm-500 mb-3 line-clamp-1">{item.subtitle}</p>
                                <div className="flex items-center gap-3 text-xs text-warm-400">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        {item.estimated_minutes} 分钟
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-warm-300" />
                                    <span>{item.question_count} 题</span>
                                    <span className="w-1 h-1 rounded-full bg-warm-300" />
                                    <span>{item.score_range} 分</span>
                                </div>
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-12 text-warm-400">
                    <p>暂无匹配的测评</p>
                </div>
            )}
        </div>
    );
}

/* ============================================================
   HistoryView — 测评记录
   ============================================================ */
function HistoryView({
    catalog,
    onBack,
}: {
    catalog: CatalogItem[];
    onBack: () => void;
}) {
    const [results, setResults] = useState<AssessmentResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterKey, setFilterKey] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) { setLoading(false); return; }
        (async () => {
            try {
                const url = filterKey
                    ? `${API_BASE}/assessments/results?token=${token}&assessment_key=${filterKey}`
                    : `${API_BASE}/assessments/results?token=${token}`;
                const res = await fetch(url);
                if (res.ok) {
                    const json = await res.json();
                    setResults(json.results || []);
                }
            } catch { /* offline */ }
            setLoading(false);
        })();
    }, [token, filterKey]);

    const catalogMap = useMemo(() => {
        const m: Record<string, CatalogItem> = {};
        catalog.forEach((c) => (m[c.key] = c));
        return m;
    }, [catalog]);

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    if (!token) {
        return (
            <div className="animate-fadeIn">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/80 border border-warm-200/50 flex items-center justify-center text-warm-500 hover:text-warm-700 transition-all active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    <h2 className="text-lg font-semibold text-warm-800">测评记录</h2>
                </div>
                <div className="text-center py-16 text-warm-400">
                    <svg className="w-16 h-16 mx-auto mb-4 text-warm-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    <p>请先登录查看测评记录</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/80 border border-warm-200/50 flex items-center justify-center text-warm-500 hover:text-warm-700 transition-all active:scale-95">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <h2 className="text-lg font-semibold text-warm-800">测评记录</h2>
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                <button
                    onClick={() => setFilterKey(null)}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        !filterKey ? 'bg-primary-500 text-white' : 'bg-white/80 text-warm-600 border border-warm-100/60'
                    }`}
                >
                    全部
                </button>
                {catalog.filter((c) => c.enabled).map((c) => (
                    <button
                        key={c.key}
                        onClick={() => setFilterKey(c.key)}
                        className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            filterKey === c.key ? 'bg-primary-500 text-white' : 'bg-white/80 text-warm-600 border border-warm-100/60'
                        }`}
                    >
                        {c.title}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin w-8 h-8 border-3 border-primary-400 border-t-transparent rounded-full" />
                </div>
            ) : results.length === 0 ? (
                <div className="text-center py-16 text-warm-400">
                    <svg className="w-16 h-16 mx-auto mb-4 text-warm-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <p>暂无测评记录</p>
                    <p className="text-sm mt-1">完成一次测评后，结果会显示在这里</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {results.map((r) => {
                        const meta = catalogMap[r.assessment_key];
                        const isExpanded = expandedId === r.id;

                        return (
                            <div key={r.id} className="bg-white/80 backdrop-blur rounded-2xl border border-warm-100/60 overflow-hidden">
                                {/* Summary Row */}
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                                    className="w-full text-left p-4 flex items-center gap-3"
                                >
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta?.gradient || 'from-warm-300 to-warm-400'} flex items-center justify-center flex-shrink-0`}>
                                        <span className="text-lg">{meta?.icon || '📋'}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-warm-800 text-sm">{meta?.title || r.assessment_key}</h4>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getSeverityColor(r.severity)}`}>
                                                {r.severity}
                                            </span>
                                        </div>
                                        <p className="text-xs text-warm-400 mt-0.5">{formatDate(r.created_at)}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <span className="text-lg font-bold text-warm-700">{r.total_score}</span>
                                        <p className="text-xs text-warm-400">{meta?.score_range || ''}</p>
                                    </div>
                                    <svg className={`w-4 h-4 text-warm-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Expanded Detail */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-4 border-t border-warm-100/60 pt-3 space-y-3">
                                                {r.ai_interpretation && (
                                                    <div className="bg-blue-50/60 rounded-xl p-3">
                                                        <p className="text-xs font-medium text-blue-700 mb-1">AI 解读</p>
                                                        <div className="text-xs text-blue-600 leading-relaxed line-clamp-4">
                                                            <MarkdownText text={r.ai_interpretation!} light className="[&_div]:text-xs [&_div]:text-blue-600 [&_strong]:text-blue-700" />
                                                        </div>
                                                    </div>
                                                )}

                                                {r.answers && r.answers.length > 0 && (
                                                    <div className="bg-warm-50/60 rounded-xl p-3">
                                                        <p className="text-xs font-medium text-warm-600 mb-2">答题详情</p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {r.answers.map((a, i) => (
                                                                <span key={i} className="w-7 h-7 rounded-lg bg-white border border-warm-200/60 flex items-center justify-center text-xs text-warm-600 font-medium">
                                                                    {a}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <PDFDownloadButton
                                                    scaleType={r.assessment_key}
                                                    totalScore={r.total_score}
                                                    answers={r.answers || []}
                                                    aiInterpretation={r.ai_interpretation}
                                                    className="w-full py-2.5 rounded-xl bg-primary-50 text-primary-600 text-sm font-medium hover:bg-primary-100 transition-all"
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ============================================================
   Main AssessmentCenterPage
   ============================================================ */
type View = 'catalog' | 'taking' | 'history';

export default function AssessmentCenterPage({ onClose }: AssessmentCenterPageProps) {
    const [view, setView] = useState<View>('catalog');
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    const [activeKey, setActiveKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // 加载目录
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/assessments/catalog`);
                if (res.ok) {
                    const json = await res.json();
                    setCatalog(json.catalog || []);
                }
            } catch { /* offline */ }
            setLoading(false);
        })();
    }, []);

    // 开始测评
    const startAssessment = (item: CatalogItem) => {
        setActiveKey(item.key);
        setView('taking');
    };

    // 测评完成回调 — 保存结果到新端点
    const handleComplete = async (result: any) => {
        const token = localStorage.getItem('token');
        const assessmentKey = activeKey;

        try {
            if (token && assessmentKey) {
                await fetch(`${API_BASE}/assessments/results?token=${token}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        assessment_key: assessmentKey,
                        total_score: result.totalScore ?? result.indexScore ?? 0,
                        raw_score: result.rawScore ?? null,
                        severity: result.severity || '',
                        answers: result.answers || [],
                        ai_interpretation: result.aiInterpretation || null,
                    }),
                });
            }
        } catch {
            /* 离线也允许继续 */
        } finally {
            markDailyTaskCompleted('assessment');
        }
    };

    // 返回目录
    const handleScaleClose = () => {
        setView('catalog');
        setActiveKey(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-3 border-primary-400 border-t-transparent rounded-full" />
            </div>
        );
    }

    // ===== 正在做测评 =====
    if (view === 'taking' && activeKey) {
        const ScaleComponent = SCALE_MAP[activeKey];
        if (!ScaleComponent) {
            setView('catalog');
            return null;
        }
        return (
            <div className="animate-fadeIn">
                <ScaleComponent
                    onComplete={handleComplete}
                    onClose={handleScaleClose}
                />
            </div>
        );
    }

    // ===== 测评记录 =====
    if (view === 'history') {
        return (
            <HistoryView
                catalog={catalog}
                onBack={() => setView('catalog')}
            />
        );
    }

    // ===== 目录页 =====
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key="catalog"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <CatalogView
                    catalog={catalog}
                    onSelect={startAssessment}
                    onShowHistory={() => setView('history')}
                    onClose={onClose}
                />
            </motion.div>
        </AnimatePresence>
    );
}
