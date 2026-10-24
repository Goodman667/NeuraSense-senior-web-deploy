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
import { createPortal } from 'react-dom';
import { API_BASE } from '../config/api';
import { markDailyTaskCompleted } from '../lib/dailyProgress';
import { MarkdownText } from '../components/Assessment/MarkdownText';

// 量表组件
import { PHQ9Scale } from '../components/Assessment/PHQ9Scale';
import { GAD7Scale } from '../components/Assessment/GAD7Scale';
import { SDSScale } from '../components/Assessment/SDSScale';
import { SASScale } from '../components/Assessment/SASScale';
import { PSSScale } from '../components/Assessment/PSSScale';
import { SUSScale } from '../components/Assessment/SUSScale';
import { PDFDownloadButton } from '../components/Assessment/PDFDownloadButton';
import { standardAssets } from '../lib/standardAssets';

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
    sus: SUSScale,
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
   SUS 研究者工具 — 仅研究者账号可见：导出全部数据、管理（删除）数据
   ============================================================ */
interface SUSRow {
    id: string;
    username: string;
    mode: string;
    age_group: string;
    sus_score: number;
    created_at: string;
}

const SUS_MODE_LABEL: Record<string, string> = { standard: '标准版', companion: '陪伴版' };

function formatLocalTime(iso: string) {
    const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function SUSManageDialog({ token, onClose, onChanged }: { token: string; onClose: () => void; onChanged: (remaining: number) => void }) {
    const [rows, setRows] = useState<SUSRow[] | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/sus/list?token=${encodeURIComponent(token)}`);
            if (!res.ok) throw new Error();
            const json = await res.json();
            setRows(json.responses || []);
        } catch {
            setError('加载失败，请稍后重试');
            setRows([]);
        }
    };

    useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const toggle = (id: string) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelected(next);
        setConfirming(false);
    };
    const allSelected = !!rows && rows.length > 0 && selected.size === rows.length;
    const toggleAll = () => {
        setSelected(allSelected || !rows ? new Set() : new Set(rows.map((r) => r.id)));
        setConfirming(false);
    };

    const remove = async () => {
        setBusy(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/sus/delete?token=${encodeURIComponent(token)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [...selected] }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || !json.success) throw new Error();
            setSelected(new Set());
            setConfirming(false);
            onChanged(json.remaining ?? 0);
            await load();
        } catch {
            setError('删除失败，请稍后重试');
        } finally {
            setBusy(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="管理 SUS 数据">
            <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-t-[24px] bg-white shadow-xl sm:rounded-[24px]">
                <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4 sm:px-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">管理 SUS 数据</h3>
                        <p className="mt-1 text-xs text-gray-500">勾选要删除的问卷，例如自己测试时填的数据。删除后无法恢复，建议先导出备份。</p>
                    </div>
                    <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/15 text-gray-600 hover:border-black/40" aria-label="关闭">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-3 sm:px-6">
                    {rows === null ? (
                        <p className="py-10 text-center text-sm text-gray-400">加载中…</p>
                    ) : rows.length === 0 ? (
                        <p className="py-10 text-center text-sm text-gray-400">还没有 SUS 数据</p>
                    ) : (
                        <>
                            <label className="flex cursor-pointer items-center gap-3 border-b border-black/5 py-3 text-sm text-gray-600">
                                <input type="checkbox" className="h-4 w-4 accent-black" checked={allSelected} onChange={toggleAll} />
                                全选（共 {rows.length} 份）
                            </label>
                            {rows.map((r) => (
                                <label key={r.id} className="flex cursor-pointer items-center gap-3 border-b border-black/5 py-3 text-sm">
                                    <input type="checkbox" className="h-4 w-4 shrink-0 accent-black" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium text-gray-900">{r.username || '（无用户名）'}</span>
                                        <span className="block text-xs text-gray-500">{formatLocalTime(r.created_at)} · {SUS_MODE_LABEL[r.mode] || r.mode} · {r.age_group} 岁</span>
                                    </span>
                                    <span className="shrink-0 text-base font-semibold text-gray-900">{r.sus_score}</span>
                                </label>
                            ))}
                        </>
                    )}
                </div>

                <div className="border-t border-black/10 px-5 py-4 sm:px-6">
                    {error && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                    {confirming ? (
                        <div className="flex flex-wrap items-center gap-3">
                            <p className="flex-1 text-sm text-red-700">确定删除选中的 {selected.size} 份问卷吗？删除后无法恢复。</p>
                            <button onClick={() => setConfirming(false)} disabled={busy} className="rounded-full border border-black/15 px-5 py-2.5 text-sm text-gray-700">取消</button>
                            <button onClick={remove} disabled={busy} className="rounded-full bg-red-600 px-5 py-2.5 text-sm text-white hover:bg-red-700 disabled:opacity-50">{busy ? '删除中…' : '确认删除'}</button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-gray-500">已选 {selected.size} 份</span>
                            <button onClick={() => setConfirming(true)} disabled={selected.size === 0} className="rounded-full bg-black px-5 py-2.5 text-sm text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40">删除所选</button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}

function SUSResearcherTools() {
    const token = localStorage.getItem('token');
    const [count, setCount] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [managing, setManaging] = useState(false);

    useEffect(() => {
        if (!token) return;
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/sus/researcher?token=${encodeURIComponent(token)}`);
                if (!res.ok) return;
                const json = await res.json();
                if (json.is_researcher) setCount(json.count ?? 0);
            } catch { /* offline */ }
        })();
    }, [token]);

    if (!token || count === null) return null;

    const download = async () => {
        setBusy(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/sus/export?token=${encodeURIComponent(token)}`);
            if (!res.ok) throw new Error();
            const blob = await res.blob();
            const name = res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] || `sus_responses_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            setError('导出失败，请稍后重试');
        } finally {
            setBusy(false);
        }
    };

    const pill = 'flex items-center gap-2 whitespace-nowrap rounded-full border border-black/15 px-4 py-2 text-sm text-gray-800 transition hover:border-black/40 disabled:opacity-50';

    return (
        <>
            <button onClick={download} disabled={busy} title={error || '下载全部参与者的 SUS 问卷结果（CSV，可用 Excel 打开）'} className={pill}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
                </svg>
                {busy ? '导出中…' : error ? error : `导出 SUS 数据（${count} 份）`}
            </button>
            <button onClick={() => setManaging(true)} className={pill}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6m4-6v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
                </svg>
                管理 SUS 数据
            </button>
            {managing && <SUSManageDialog token={token} onClose={() => setManaging(false)} onChanged={setCount} />}
        </>
    );
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
            <section className="rounded-[20px] bg-white px-5 py-5 shadow-sm sm:rounded-[28px] sm:px-8 sm:py-7">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-black/15 text-gray-700 transition hover:border-black/40" aria-label="返回">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M15 18l-6-6 6-6" /></svg>
                        </button>
                        <div>
                            <h2 className="font-display-cn text-[28px] leading-none text-black md:text-[34px]">测评中心</h2>
                            <p className="mt-2 text-sm text-black/55">标准量表自评，结果仅供自我了解，不作诊断。</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                    <SUSResearcherTools />
                    <button
                        onClick={onShowHistory}
                        className="flex items-center gap-2 whitespace-nowrap rounded-full bg-black px-4 py-2 text-sm text-white transition hover:bg-gray-800"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        测评记录
                    </button>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[14rem] flex-1">
                        <svg className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="搜索量表，例如 PHQ-9、睡眠"
                            className="w-full rounded-full bg-gray-100 py-2.5 pl-11 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="量表分类">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.key || 'all'}
                                onClick={() => setActiveCategory(cat.key)}
                                aria-pressed={activeCategory === cat.key}
                                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${
                                    activeCategory === cat.key ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Assessment Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((item, index) => {
                    const hasComponent = !!SCALE_MAP[item.key];
                    const cover = standardAssets.paintings[index % standardAssets.paintings.length];
                    return (
                        <motion.button
                            key={item.key}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => hasComponent && onSelect(item)}
                            disabled={!hasComponent}
                            className={`group overflow-hidden rounded-[20px] bg-white text-left shadow-sm transition hover:shadow-md sm:rounded-[24px] ${
                                !hasComponent ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                            }`}
                        >
                            <div className="relative h-36 overflow-hidden">
                                <span className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url(${cover})` }} />
                                <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                                <span className="absolute bottom-4 left-5 font-display-cn text-[26px] leading-none text-white">{item.title}</span>
                                <span className="absolute right-4 top-4 rounded-full bg-white/85 px-2.5 py-1 text-xs text-gray-800">{hasComponent ? '免费' : '即将上线'}</span>
                            </div>
                            <div className="p-5">
                                <p className="line-clamp-1 text-[15px] text-gray-900">{item.subtitle}</p>
                                <div className="mt-4 grid grid-cols-3 border-t border-black/10 pt-4 text-xs text-gray-500">
                                    <span><span className="block text-gray-400">用时</span><span className="mt-1 block text-sm text-gray-900">{item.estimated_minutes} 分钟</span></span>
                                    <span><span className="block text-gray-400">题目</span><span className="mt-1 block text-sm text-gray-900">{item.question_count} 题</span></span>
                                    <span><span className="block text-gray-400">分值</span><span className="mt-1 block text-sm text-gray-900">{item.score_range}</span></span>
                                </div>
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            {filtered.length === 0 && (
                <div className="rounded-[20px] bg-white py-12 text-center text-gray-400 shadow-sm">
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
                {catalog.filter((c) => c.enabled && c.category !== 'research').map((c) => (
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
