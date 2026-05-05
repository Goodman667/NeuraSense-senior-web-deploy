/**
 * ProgramsPage — 课程/项目系统
 *
 * 三个视图层级:
 * 1. 列表页 (ProgramList) — 展示所有项目
 * 2. 详情页 (ProgramDetail) — 项目介绍 + 天数列表 + 开始按钮
 * 3. 日课页 (ProgramDayView) — 学习卡片 + 工具练习入口 + 复盘问题
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../config/api';
import type { ToolItem } from './ToolboxPage';

/* ============================================================
   Types
   ============================================================ */
export interface ProgramMeta {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    icon: string;
    gradient: string;
    duration_days: number;
    daily_minutes: number;
    category: string;
    tags: string[];
    is_active: boolean;
}

export interface ProgramDayData {
    id?: string;
    program_id: string;
    day_number: number;
    title: string;
    learn_text: string;
    tool_id: string | null;
    review_question: string;
    tip?: string;
    video_url?: string;
    video_title?: string;
}

export interface ProgramProgress {
    id?: string;
    user_id?: string;
    program_id: string;
    current_day: number;
    completed_days: number[];
    review_answers: Record<string, string>;
    started_at?: string;
}

interface ProgramsPageProps {
    onOpenTool: (tool: ToolItem, onComplete?: () => void) => void;
}

interface ProgramTheme {
    gradient: string;
    softGradient: string;
    panelGradient: string;
    border: string;
    pillBackground: string;
    pillText: string;
    glow: string;
}

interface ProgressMetrics {
    isStarted: boolean;
    isCompleted: boolean;
    completedCount: number;
    totalDays: number;
    percent: number;
    currentDay: number;
}

const programThemes: Record<string, ProgramTheme> = {
    'from-emerald-400 to-teal-500': {
        gradient: 'linear-gradient(135deg, #34d399 0%, #14b8a6 100%)',
        softGradient: 'linear-gradient(135deg, rgba(52,211,153,0.18) 0%, rgba(20,184,166,0.08) 100%)',
        panelGradient: 'linear-gradient(135deg, rgba(236,253,245,0.96) 0%, rgba(240,253,250,0.92) 100%)',
        border: 'rgba(13,148,136,0.24)',
        pillBackground: 'rgba(13,148,136,0.1)',
        pillText: '#0f766e',
        glow: 'rgba(20,184,166,0.2)',
    },
    'from-indigo-400 to-violet-500': {
        gradient: 'linear-gradient(135deg, #818cf8 0%, #8b5cf6 100%)',
        softGradient: 'linear-gradient(135deg, rgba(129,140,248,0.2) 0%, rgba(139,92,246,0.08) 100%)',
        panelGradient: 'linear-gradient(135deg, rgba(238,242,255,0.96) 0%, rgba(245,243,255,0.92) 100%)',
        border: 'rgba(99,102,241,0.24)',
        pillBackground: 'rgba(99,102,241,0.1)',
        pillText: '#4338ca',
        glow: 'rgba(99,102,241,0.2)',
    },
    'from-amber-400 to-orange-500': {
        gradient: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)',
        softGradient: 'linear-gradient(135deg, rgba(251,191,36,0.22) 0%, rgba(249,115,22,0.08) 100%)',
        panelGradient: 'linear-gradient(135deg, rgba(255,251,235,0.96) 0%, rgba(255,247,237,0.92) 100%)',
        border: 'rgba(245,158,11,0.28)',
        pillBackground: 'rgba(245,158,11,0.12)',
        pillText: '#b45309',
        glow: 'rgba(245,158,11,0.22)',
    },
    'from-rose-400 to-pink-500': {
        gradient: 'linear-gradient(135deg, #fb7185 0%, #ec4899 100%)',
        softGradient: 'linear-gradient(135deg, rgba(251,113,133,0.18) 0%, rgba(236,72,153,0.08) 100%)',
        panelGradient: 'linear-gradient(135deg, rgba(255,241,242,0.96) 0%, rgba(253,242,248,0.92) 100%)',
        border: 'rgba(244,63,94,0.22)',
        pillBackground: 'rgba(244,63,94,0.1)',
        pillText: '#be123c',
        glow: 'rgba(244,63,94,0.2)',
    },
};

const defaultTheme: ProgramTheme = {
    gradient: 'linear-gradient(135deg, #22c55e 0%, #06b6d4 100%)',
    softGradient: 'linear-gradient(135deg, rgba(34,197,94,0.18) 0%, rgba(6,182,212,0.08) 100%)',
    panelGradient: 'linear-gradient(135deg, rgba(240,253,250,0.96) 0%, rgba(236,254,255,0.92) 100%)',
    border: 'rgba(8,145,178,0.24)',
    pillBackground: 'rgba(8,145,178,0.1)',
    pillText: '#0f766e',
    glow: 'rgba(8,145,178,0.2)',
};

function cn(...values: Array<string | false | null | undefined>) {
    return values.filter(Boolean).join(' ');
}

function getProgramTheme(gradient: string): ProgramTheme {
    return programThemes[gradient] || defaultTheme;
}

function getProgressMetrics(program: ProgramMeta, progress: ProgramProgress | null | undefined): ProgressMetrics {
    const completedCount = progress?.completed_days?.length || 0;
    const totalDays = Math.max(program.duration_days || 0, 1);
    const isStarted = !!progress;
    const isCompleted = completedCount >= totalDays;
    const safeCurrentDay = progress?.current_day ? Math.min(progress.current_day, totalDays) : 1;
    const percent = Math.max(0, Math.min(100, Math.round((completedCount / totalDays) * 100)));

    return {
        isStarted,
        isCompleted,
        completedCount,
        totalDays,
        percent,
        currentDay: safeCurrentDay,
    };
}

function getProgramStatusLabel(metrics: ProgressMetrics) {
    if (!metrics.isStarted) return '尚未开始';
    if (metrics.isCompleted) return '课程已完成';
    return `进行中 · 第 ${metrics.currentDay} 天`;
}

function getProgramPreviewText(text: string, maxLength = 110) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength)}…`;
}

function formatStartedAt(startedAt?: string) {
    if (!startedAt) return '尚未记录开始时间';
    const date = new Date(startedAt);
    if (Number.isNaN(date.getTime())) return '尚未记录开始时间';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} 开始`;
}

function isDayLocked(day: ProgramDayData, progress: ProgramProgress | null) {
    if (!progress) return true;
    const completedDays = progress.completed_days || [];
    return day.day_number > progress.current_day && !completedDays.includes(day.day_number);
}

function totalAverageMinutes(programs: ProgramMeta[], totalMinutes: number) {
    if (programs.length === 0) return 0;
    return Math.round(totalMinutes / programs.length);
}

function DetailHeader({
    title,
    subtitle,
    onBack,
}: {
    title: string;
    subtitle: string;
    onBack: () => void;
}) {
    return (
        <div className="flex items-start gap-4">
            <button
                onClick={onBack}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white/85 text-slate-600 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.28)] transition duration-200 hover:-translate-y-0.5 hover:text-slate-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/70 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:text-white"
                aria-label="返回"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="m15 18-6-6 6-6" />
                </svg>
            </button>
            <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-300">课程计划</p>
                <h2 className="mt-2 font-display text-[2rem] leading-none tracking-[-0.03em] text-slate-950 dark:text-slate-100">
                    {title}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p>
            </div>
        </div>
    );
}

/* ============================================================
   ProgramList — 桌面化项目列表
   ============================================================ */
function ProgramList({
    programs,
    progressMap,
    onSelect,
}: {
    programs: ProgramMeta[];
    progressMap: Record<string, ProgramProgress>;
    onSelect: (p: ProgramMeta) => void;
}) {
    const summary = useMemo(() => {
        const startedPrograms = programs.filter((program) => !!progressMap[program.id]);
        const activePrograms = startedPrograms.filter((program) => {
            const metrics = getProgressMetrics(program, progressMap[program.id]);
            return !metrics.isCompleted;
        });
        const completedPrograms = startedPrograms.length - activePrograms.length;
        const totalMinutes = programs.reduce((acc, program) => acc + (program.daily_minutes || 0), 0);
        const continueProgram = activePrograms[0] || null;
        const categoryMap = new Map<string, number>();

        for (const program of programs) {
            categoryMap.set(program.category, (categoryMap.get(program.category) || 0) + 1);
        }

        return {
            activePrograms,
            completedPrograms,
            totalMinutes,
            continueProgram,
            categories: Array.from(categoryMap.entries()),
        };
    }, [programs, progressMap]);

    const activeProgress = summary.continueProgram ? progressMap[summary.continueProgram.id] : null;
    const activeMetrics = summary.continueProgram ? getProgressMetrics(summary.continueProgram, activeProgress) : null;

    return (
        <div className="space-y-6 lg:space-y-8">
            <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/72 p-6 shadow-[0_32px_100px_-44px_rgba(15,23,42,0.26)] backdrop-blur-2xl sm:p-7 lg:p-8 dark:border-slate-800 dark:bg-slate-900/78 dark:shadow-[0_38px_120px_-56px_rgba(2,6,23,0.8)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_85%_12%,rgba(16,185,129,0.12),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(248,250,252,0.76)_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_85%_12%,rgba(16,185,129,0.1),transparent_22%),linear-gradient(180deg,rgba(15,23,42,0.72)_0%,rgba(2,6,23,0.82)_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:120px_120px] opacity-40" />

                <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_360px] xl:items-end">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-700 dark:text-cyan-300">课程计划</p>
                        <h1 className="mt-4 max-w-4xl font-display text-[2.6rem] leading-[0.95] tracking-[-0.045em] text-slate-950 sm:text-[3.15rem] lg:text-[3.7rem] dark:text-white">
                            围绕目标制定连续练习计划。
                        </h1>
                        <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px] dark:text-slate-300">
                            先查看整体进度，再进入具体课程与当日任务。
                        </p>

                        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                                { label: '课程总数', value: String(programs.length), detail: '当前可学习计划' },
                                { label: '进行中', value: String(summary.activePrograms.length), detail: '仍在推进的课程' },
                                { label: '已完成', value: String(summary.completedPrograms), detail: '已达成课程数' },
                                { label: '日均投入', value: `${totalAverageMinutes(programs, summary.totalMinutes)} 分钟`, detail: '课程平均单日时长' },
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    className="rounded-[1.5rem] border border-white/80 bg-white/78 p-4 shadow-[0_20px_55px_-36px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/60"
                                >
                                    <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400 dark:text-slate-500">{item.label}</p>
                                    <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">{item.value}</p>
                                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{item.detail}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <aside className="rounded-[1.8rem] border border-white/80 bg-slate-950 p-5 text-white shadow-[0_32px_90px_-42px_rgba(15,23,42,0.72)] sm:p-6 dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">推荐课程</p>
                                <h2 className="mt-3 text-xl font-semibold text-white">继续推进你的课程节奏</h2>
                            </div>
                            <div className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-300">
                                继续学习
                            </div>
                        </div>

                        {summary.continueProgram && activeMetrics ? (
                            <button
                                onClick={() => onSelect(summary.continueProgram!)}
                                className="mt-6 block w-full rounded-[1.6rem] border border-white/10 bg-white/[0.06] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/40"
                            >
                                <div className="flex items-start gap-4">
                                    <div
                                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.3rem] text-2xl shadow-lg"
                                        style={{
                                            background: getProgramTheme(summary.continueProgram.gradient).gradient,
                                            boxShadow: `0 20px 48px -24px ${getProgramTheme(summary.continueProgram.gradient).glow}`,
                                        }}
                                    >
                                        <span>{summary.continueProgram.icon}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">正在推荐</p>
                                        <h3 className="mt-2 text-lg font-semibold text-white">{summary.continueProgram.title}</h3>
                                        <p className="mt-2 text-sm leading-6 text-slate-300">{summary.continueProgram.subtitle}</p>
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-300">
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">当前进度</p>
                                        <p className="mt-2 font-medium text-white">第 {activeMetrics.currentDay} / {activeMetrics.totalDays} 天</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">累计完成</p>
                                        <p className="mt-2 font-medium text-white">{activeMetrics.completedCount} 天</p>
                                    </div>
                                </div>

                                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${activeMetrics.percent}%`,
                                            background: getProgramTheme(summary.continueProgram.gradient).gradient,
                                        }}
                                    />
                                </div>
                                <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
                                    <span>{getProgramStatusLabel(activeMetrics)}</span>
                                    <span>{activeMetrics.percent}%</span>
                                </div>
                            </button>
                        ) : (
                            <div className="mt-6 rounded-[1.6rem] border border-dashed border-white/15 bg-white/[0.04] p-5">
                                <p className="text-sm leading-7 text-slate-300">
                                    还没有开始课程。建议先从一个 7 天计划开始，用固定时长形成稳定节奏，再逐步进入更连续的心理自助训练。
                                </p>
                            </div>
                        )}
                    </aside>
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_340px]">
                <div className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">课程目录</p>
                            <h2 className="mt-2 font-display text-[2rem] leading-none tracking-[-0.03em] text-slate-950 dark:text-slate-100">全部课程</h2>
                        </div>
                        <p className="max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                            查看全部课程、当前进度与每日安排。
                        </p>
                    </div>

                    {programs.length === 0 ? (
                        <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-[0_22px_70px_-44px_rgba(15,23,42,0.24)] dark:border-slate-700 dark:bg-slate-900/70">
                            <p className="text-lg font-medium text-slate-700 dark:text-slate-200">暂无可展示课程</p>
                            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">请稍后重试，或检查课程接口是否返回数据。</p>
                        </div>
                    ) : (
                        programs.map((program, index) => {
                            const theme = getProgramTheme(program.gradient);
                            const progress = progressMap[program.id];
                            const metrics = getProgressMetrics(program, progress);

                            return (
                                <motion.button
                                    key={program.id}
                                    initial={{ opacity: 0, y: 18 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.42, ease: 'easeOut', delay: Math.min(index * 0.05, 0.2) }}
                                    whileHover={{ y: -4 }}
                                    onClick={() => onSelect(program)}
                                    className="group relative block w-full overflow-hidden rounded-[1.8rem] border border-white/80 bg-white/86 p-5 text-left shadow-[0_28px_80px_-44px_rgba(15,23,42,0.24)] backdrop-blur-xl transition duration-300 hover:shadow-[0_34px_90px_-42px_rgba(15,23,42,0.3)] focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/70 sm:p-6 dark:border-slate-800 dark:bg-slate-900/72 dark:shadow-[0_30px_90px_-52px_rgba(2,6,23,0.8)]"
                                >
                                    <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: theme.gradient }} />
                                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
                                        <div className="min-w-0">
                                            <div className="flex items-start gap-4">
                                                <div
                                                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.35rem] text-[1.85rem]"
                                                    style={{
                                                        background: theme.softGradient,
                                                        boxShadow: `0 24px 54px -34px ${theme.glow}`,
                                                    }}
                                                >
                                                    <span>{program.icon}</span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span
                                                            className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
                                                            style={{
                                                                backgroundColor: theme.pillBackground,
                                                                borderColor: theme.border,
                                                                color: theme.pillText,
                                                            }}
                                                        >
                                                            {program.category}
                                                        </span>
                                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
                                                            {program.is_active ? '开放中' : '未启用'}
                                                        </span>
                                                    </div>
                                                    <h3 className="mt-4 text-[1.55rem] font-semibold leading-tight tracking-[-0.03em] text-slate-950 dark:text-slate-50">
                                                        {program.title}
                                                    </h3>
                                                    <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">{program.subtitle}</p>
                                                    <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{program.description}</p>
                                                </div>
                                            </div>

                                            <div className="mt-5 flex flex-wrap gap-2">
                                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                                                    {program.duration_days} 天计划
                                                </span>
                                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                                                    每天 {program.daily_minutes} 分钟
                                                </span>
                                                {program.tags.slice(0, 3).map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="rounded-full border px-3 py-1 text-xs font-medium"
                                                        style={{
                                                            backgroundColor: theme.pillBackground,
                                                            borderColor: theme.border,
                                                            color: theme.pillText,
                                                        }}
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-[1.55rem] border border-slate-200/80 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-950/70">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400 dark:text-slate-500">Status</p>
                                                <span
                                                    className="rounded-full border px-3 py-1 text-[11px] font-semibold"
                                                    style={{
                                                        backgroundColor: theme.pillBackground,
                                                        borderColor: theme.border,
                                                        color: theme.pillText,
                                                    }}
                                                >
                                                    {getProgramStatusLabel(metrics)}
                                                </span>
                                            </div>

                                            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                                                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900">
                                                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">进度</p>
                                                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">{metrics.percent}%</p>
                                                </div>
                                                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900">
                                                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">完成天数</p>
                                                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">{metrics.completedCount}/{metrics.totalDays}</p>
                                                </div>
                                            </div>

                                            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                                <div
                                                    className="h-full rounded-full transition-all duration-300"
                                                    style={{ width: `${metrics.percent}%`, background: theme.gradient }}
                                                />
                                            </div>
                                            <div className="mt-3 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                                                <span>{metrics.isStarted ? `第 ${metrics.currentDay} 天` : '未开始'}</span>
                                                <span className="font-medium text-slate-700 dark:text-slate-200">查看课程</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.button>
                            );
                        })
                    )}
                </div>

                <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
                    <div className="rounded-[1.8rem] border border-white/80 bg-white/84 p-5 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/72">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">学习建议</p>
                        <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-slate-100">如何更好完成课程</h3>
                        <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/70">
                                建议先了解课程目标与安排，再逐步完成每日内容。
                            </div>
                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/70">
                                课程详情包含目标说明、进度概览与每日安排。
                            </div>
                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/70">
                                每日任务包含学习内容、练习任务与复盘问题。
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[1.8rem] border border-white/80 bg-white/84 p-5 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/72">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">课程分类</p>
                        <div className="mt-4 space-y-3">
                            {summary.categories.map(([category, count]) => (
                                <div key={category} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{category}</span>
                                    <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-slate-100 dark:text-slate-900">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

/* ============================================================
   ProgramDetail — 项目详情 + 天数列表
   ============================================================ */
function ProgramDetail({
    program,
    days,
    progress,
    loadingDays,
    onBack,
    onStart,
    onSelectDay,
}: {
    program: ProgramMeta;
    days: ProgramDayData[];
    progress: ProgramProgress | null;
    loadingDays: boolean;
    onBack: () => void;
    onStart: () => void;
    onSelectDay: (day: ProgramDayData) => void;
}) {
    const theme = getProgramTheme(program.gradient);
    const metrics = getProgressMetrics(program, progress);
    const completedDays = progress?.completed_days || [];
    const currentDay =
        days.find((day) => day.day_number === metrics.currentDay) ||
        days.find((day) => !completedDays.includes(day.day_number)) ||
        days[0] ||
        null;

    return (
        <div className="space-y-6 lg:space-y-8">
            <DetailHeader
                title={program.title}
                subtitle="先了解课程目标、所需投入和完整安排，再开始当天练习。"
                onBack={onBack}
            />

            <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-[0_30px_95px_-48px_rgba(15,23,42,0.26)] backdrop-blur-2xl sm:p-7 lg:p-8 dark:border-slate-800 dark:bg-slate-900/78 dark:shadow-[0_38px_120px_-56px_rgba(2,6,23,0.8)]">
                <div className="absolute inset-0 opacity-90" style={{ background: theme.panelGradient }} />
                <div className="absolute right-[-5rem] top-[-4rem] h-44 w-44 rounded-full blur-3xl" style={{ backgroundColor: theme.pillBackground }} />
                <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_360px] xl:items-start">
                    <div>
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                            <div
                                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.6rem] text-[2.2rem] shadow-[0_28px_80px_-34px_rgba(15,23,42,0.22)]"
                                style={{ background: theme.gradient }}
                            >
                                <span>{program.icon}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
                                        style={{
                                            backgroundColor: theme.pillBackground,
                                            borderColor: theme.border,
                                            color: theme.pillText,
                                        }}
                                    >
                                        {program.category}
                                    </span>
                                    <span className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
                                        {program.duration_days} 天 · 每天 {program.daily_minutes} 分钟
                                    </span>
                                </div>
                                <h3 className="mt-4 font-display text-[2.35rem] leading-[1.02] tracking-[-0.04em] text-slate-950 dark:text-slate-50">
                                    {program.title}
                                </h3>
                                <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300">{program.subtitle}</p>
                                <p className="mt-5 max-w-4xl whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-300">
                                    {program.description}
                                </p>
                            </div>
                        </div>

                        {program.tags.length > 0 && (
                            <div className="mt-6 flex flex-wrap gap-2">
                                {program.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-full border px-3 py-1 text-xs font-medium"
                                        style={{
                                            backgroundColor: theme.pillBackground,
                                            borderColor: theme.border,
                                            color: theme.pillText,
                                        }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <aside className="rounded-[1.7rem] border border-slate-200/80 bg-white/82 p-5 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/72">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Overview</p>
                        <h4 className="mt-3 text-xl font-semibold text-slate-950 dark:text-slate-100">课程概览</h4>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/70">
                                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">进度</p>
                                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">{metrics.percent}%</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/70">
                                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">已完成</p>
                                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">{metrics.completedCount}/{metrics.totalDays}</p>
                            </div>
                        </div>

                        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                            <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{ width: `${metrics.percent}%`, background: theme.gradient }}
                            />
                        </div>
                        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{getProgramStatusLabel(metrics)}</p>

                        <div className="mt-6 space-y-3">
                            {!metrics.isStarted ? (
                                <button
                                    onClick={onStart}
                                    className="inline-flex w-full items-center justify-center rounded-[1.2rem] bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white shadow-[0_22px_50px_-32px_rgba(15,23,42,0.68)] transition duration-200 hover:-translate-y-0.5 hover:bg-slate-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/70 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                                >
                                    开始课程
                                </button>
                            ) : currentDay ? (
                                <button
                                    onClick={() => onSelectDay(currentDay)}
                                    className="inline-flex w-full items-center justify-center rounded-[1.2rem] px-4 py-3.5 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/70"
                                    style={{
                                        background: theme.gradient,
                                        boxShadow: `0 24px 50px -30px ${theme.glow}`,
                                    }}
                                >
                                    {metrics.isCompleted ? '回看课程内容' : `继续第 ${currentDay.day_number} 天`}
                                </button>
                            ) : null}

                            <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 p-4 text-sm leading-7 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                                <p className="font-medium text-slate-800 dark:text-slate-100">建议学习方式</p>
                                <p className="mt-2">每天预留 {program.daily_minutes} 分钟，先阅读当天内容，再进入练习，最后完成复盘。</p>
                            </div>
                        </div>
                    </aside>
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_340px]">
                <div className="space-y-4">
                    <section className="rounded-[1.8rem] border border-white/80 bg-white/84 p-6 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/72">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">Schedule</p>
                                <h4 className="mt-2 text-xl font-semibold text-slate-950 dark:text-slate-100">课程日程</h4>
                            </div>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                {loadingDays ? '加载中' : `${days.length} 天内容`}
                            </span>
                        </div>

                        {loadingDays ? (
                            <div className="mt-6 space-y-3">
                                {Array.from({ length: 4 }).map((_, index) => (
                                    <div key={index} className="skeleton h-24 w-full rounded-[1.4rem]" />
                                ))}
                            </div>
                        ) : days.length === 0 ? (
                            <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center dark:border-slate-700 dark:bg-slate-950/60">
                                <p className="text-base font-medium text-slate-700 dark:text-slate-200">暂无日课内容</p>
                                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">如果接口暂时不可用，页面仍会保留当前课程结构与进度数据。</p>
                            </div>
                        ) : (
                            <div className="mt-6 space-y-3">
                                {days.map((day) => {
                                    const done = completedDays.includes(day.day_number);
                                    const current = metrics.isStarted && !done && metrics.currentDay === day.day_number;
                                    const locked = isDayLocked(day, progress);

                                    return (
                                        <button
                                            key={day.day_number}
                                            onClick={() => {
                                                if (!locked && metrics.isStarted) onSelectDay(day);
                                            }}
                                            disabled={locked || !metrics.isStarted}
                                            className={cn(
                                                'group w-full rounded-[1.5rem] border p-4 text-left transition duration-200',
                                                locked || !metrics.isStarted
                                                    ? 'cursor-not-allowed border-slate-200 bg-slate-50/75 opacity-70 dark:border-slate-800 dark:bg-slate-950/70'
                                                    : 'cursor-pointer border-white/80 bg-white shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)] hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-950/82',
                                            )}
                                            style={current ? { background: theme.softGradient, borderColor: theme.border } : undefined}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div
                                                    className={cn(
                                                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold',
                                                        done ? 'text-white' : 'text-slate-700 dark:text-slate-100',
                                                    )}
                                                    style={done || current ? { background: theme.gradient } : { background: 'rgba(148,163,184,0.12)' }}
                                                >
                                                    {done ? (
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                                            <path d="m5 13 4 4L19 7" />
                                                        </svg>
                                                    ) : (
                                                        <span>{String(day.day_number).padStart(2, '0')}</span>
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h5 className="text-base font-semibold text-slate-900 dark:text-slate-100">{day.title}</h5>
                                                        {current && (
                                                            <span
                                                                className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                                                                style={{
                                                                    backgroundColor: theme.pillBackground,
                                                                    borderColor: theme.border,
                                                                    color: theme.pillText,
                                                                }}
                                                            >
                                                                今天
                                                            </span>
                                                        )}
                                                        {locked && (
                                                            <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                                                未解锁
                                                            </span>
                                                        )}
                                                        {done && (
                                                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                                已完成
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                                                        {getProgramPreviewText(day.learn_text, 96)}
                                                    </p>

                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        {day.tool_id && (
                                                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                                                配套练习
                                                            </span>
                                                        )}
                                                        {day.video_url && (
                                                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                                                视频内容
                                                            </span>
                                                        )}
                                                        {day.review_question && (
                                                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                                                复盘问题
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>

                <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
                    <div className="rounded-[1.8rem] border border-white/80 bg-white/84 p-5 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/72">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Pace</p>
                        <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/70">
                                <p className="font-medium text-slate-800 dark:text-slate-100">学习强度</p>
                                <p className="mt-2">建议把课程放在固定时间段，形成稳定节律，而不是临时补做。</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/70">
                                <p className="font-medium text-slate-800 dark:text-slate-100">开始时间</p>
                                <p className="mt-2">{formatStartedAt(progress?.started_at)}</p>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

/* ============================================================
   Bilibili 视频嵌入辅助
   ============================================================ */
function getBilibiliEmbedUrl(url: string): string | null {
    if (!url) return null;
    const bvMatch = url.match(/\/video\/(BV[\w]+)/);
    if (bvMatch) {
        return `https://player.bilibili.com/player.html?bvid=${bvMatch[1]}&autoplay=0&high_quality=1`;
    }
    const avMatch = url.match(/\/video\/av(\d+)/);
    if (avMatch) {
        return `https://player.bilibili.com/player.html?aid=${avMatch[1]}&autoplay=0&high_quality=1`;
    }
    return null;
}

/* ============================================================
   ProgramDayView — 单日课程内容
   ============================================================ */
function ProgramDayView({
    program,
    day,
    days,
    progress,
    onBack,
    onSelectDay,
    onOpenTool,
    onCompleteDay,
}: {
    program: ProgramMeta;
    day: ProgramDayData;
    days: ProgramDayData[];
    progress: ProgramProgress;
    onBack: () => void;
    onSelectDay: (day: ProgramDayData) => void;
    onOpenTool: (toolId: string, onComplete: () => void) => void;
    onCompleteDay: (answer: string) => void;
}) {
    const theme = getProgramTheme(program.gradient);
    const isDone = progress.completed_days.includes(day.day_number);
    const existingAnswer = progress.review_answers?.[String(day.day_number)] || '';
    const [toolCompleted, setToolCompleted] = useState(isDone);
    const [answer, setAnswer] = useState(existingAnswer);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setToolCompleted(isDone);
        setAnswer(existingAnswer);
        setSubmitting(false);
    }, [day.day_number, isDone, existingAnswer]);

    const handleSubmit = async () => {
        setSubmitting(true);
        await onCompleteDay(answer);
        setSubmitting(false);
    };

    const canSubmit = !isDone && (!day.tool_id || toolCompleted);

    return (
        <div className="space-y-6 lg:space-y-8">
            <DetailHeader
                title={day.title}
                subtitle={`第 ${day.day_number} / ${program.duration_days} 天 · 完成今天的学习、练习与复盘。`}
                onBack={onBack}
            />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_360px]">
                <div className="space-y-4">
                    <section className="relative overflow-hidden rounded-[1.9rem] border border-white/80 bg-white/84 p-6 shadow-[0_26px_90px_-48px_rgba(15,23,42,0.24)] backdrop-blur-xl sm:p-7 dark:border-slate-800 dark:bg-slate-900/74">
                        <div className="absolute inset-0 opacity-90" style={{ background: theme.softGradient }} />
                        <div className="relative">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-700 dark:text-cyan-300">当日任务</p>
                                    <h3 className="mt-3 font-display text-[2.15rem] leading-[1.02] tracking-[-0.04em] text-slate-950 dark:text-slate-50">
                                        {day.title}
                                    </h3>
                                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                                        先阅读知识内容，再完成练习，最后填写复盘。课程流转与进度写回逻辑保持不变。
                                    </p>
                                </div>

                                <div className="min-w-[240px] rounded-[1.5rem] border border-white/70 bg-white/78 p-4 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/72">
                                    <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                                        <span>课程进度</span>
                                        <span>{Math.round((day.day_number / Math.max(program.duration_days, 1)) * 100)}%</span>
                                    </div>
                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                        <div
                                            className="h-full rounded-full"
                                            style={{ width: `${(day.day_number / Math.max(program.duration_days, 1)) * 100}%`, background: theme.gradient }}
                                        />
                                    </div>
                                    <div className="mt-4 flex items-center justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">第 {day.day_number} 天</span>
                                        <span
                                            className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                                            style={{
                                                backgroundColor: theme.pillBackground,
                                                borderColor: theme.border,
                                                color: theme.pillText,
                                            }}
                                        >
                                            {isDone ? '已完成' : '进行中'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {isDone && (
                                <div className="mt-5 rounded-[1.3rem] border border-emerald-200 bg-emerald-50/90 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                            <path d="m5 13 4 4L19 7" />
                                        </svg>
                                        今日课程已完成
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="rounded-[1.8rem] border border-white/80 bg-white/84 p-6 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/72">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                    <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400 dark:text-slate-500">Learning</p>
                                <h4 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-100">今日知识</h4>
                            </div>
                        </div>

                        <div className="mt-5 whitespace-pre-line text-sm leading-8 text-slate-600 dark:text-slate-300">
                            {day.learn_text}
                        </div>

                        {day.tip && (
                            <div className="mt-5 rounded-[1.3rem] border p-4" style={{ backgroundColor: theme.pillBackground, borderColor: theme.border }}>
                                <p className="text-sm leading-7" style={{ color: theme.pillText }}>
                                    {day.tip}
                                </p>
                            </div>
                        )}
                    </section>

                    {day.video_url &&
                        (() => {
                            const embedUrl = getBilibiliEmbedUrl(day.video_url);
                            return embedUrl ? (
                                <section className="rounded-[1.8rem] border border-white/80 bg-white/84 p-6 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/72">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                                <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 0 1 0 1.971l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653Z" />
                                                <path d="M3.75 21h16.5" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400 dark:text-slate-500">Video</p>
                                            <h4 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-100">配套视频</h4>
                                        </div>
                                    </div>

                                    {day.video_title && <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">{day.video_title}</p>}

                                    <div className="relative mt-5 w-full overflow-hidden rounded-[1.4rem] bg-slate-100 dark:bg-slate-950" style={{ paddingBottom: '56.25%' }}>
                                        <iframe
                                            src={embedUrl}
                                            className="absolute inset-0 h-full w-full"
                                            allowFullScreen
                                            sandbox="allow-scripts allow-same-origin allow-popups"
                                            loading="lazy"
                                            title={day.video_title || `${program.title} 配套视频`}
                                        />
                                    </div>

                                    <a
                                        href={day.video_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cyan-700 transition hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                            <path d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
                                            <path d="M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        在 Bilibili 中打开
                                    </a>
                                </section>
                            ) : null;
                        })()}

                    {day.tool_id && (
                        <section className="rounded-[1.8rem] border border-white/80 bg-white/84 p-6 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/72">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                        <path d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.048 8.287 8.287 0 0 0 9 9.6a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                                        <path d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400 dark:text-slate-500">Practice</p>
                                    <h4 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-100">今日练习</h4>
                                </div>
                            </div>

                            {toolCompleted || isDone ? (
                                <div className="mt-5 rounded-[1.3rem] border border-emerald-200 bg-emerald-50/90 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                            <path d="m5 13 4 4L19 7" />
                                        </svg>
                                        练习已完成
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                                        点击进入练习工具。课程页仍通过既有工具接口加载工具数据，并在完成后回写本页状态。
                                    </p>
                                    <button
                                        onClick={() => onOpenTool(day.tool_id!, () => setToolCompleted(true))}
                                        className="inline-flex items-center justify-center rounded-[1.2rem] px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/70"
                                        style={{
                                            background: theme.gradient,
                                            boxShadow: `0 24px 50px -30px ${theme.glow}`,
                                        }}
                                    >
                                        开始练习
                                    </button>
                                </div>
                            )}
                        </section>
                    )}

                    {day.review_question && (
                        <section className="rounded-[1.8rem] border border-white/80 bg-white/84 p-6 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/72">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                        <path d="M7.5 8.25h9m-9 3H12M2.25 12.759c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400 dark:text-slate-500">Reflection</p>
                                    <h4 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-100">今日复盘</h4>
                                </div>
                            </div>

                            <p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-300">{day.review_question}</p>

                            {isDone && existingAnswer ? (
                                <div className="mt-5 rounded-[1.3rem] border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/70">
                                    <p className="text-sm italic leading-7 text-slate-600 dark:text-slate-300">“{existingAnswer}”</p>
                                </div>
                            ) : (
                                <textarea
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    placeholder="写下你的想法..."
                                    rows={5}
                                    className="mt-5 w-full rounded-[1.25rem] border border-slate-200 bg-slate-50/90 px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-200/50 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 dark:placeholder:text-slate-500"
                                />
                            )}
                        </section>
                    )}
                </div>

                <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
                    <section className="rounded-[1.8rem] border border-white/80 bg-white/84 p-5 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/72">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">完成步骤</p>
                        <h4 className="mt-3 text-xl font-semibold text-slate-950 dark:text-slate-100">完成当前日课</h4>

                        <div className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                            <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
                                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-950 dark:bg-white" />
                                <span>阅读当天内容</span>
                            </div>
                            {day.tool_id && (
                                <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
                                    <span className={cn('mt-1 h-2.5 w-2.5 rounded-full', toolCompleted || isDone ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600')} />
                                    <span>完成配套练习</span>
                                </div>
                            )}
                            {day.review_question && (
                                <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
                                    <span className={cn('mt-1 h-2.5 w-2.5 rounded-full', answer.trim() || existingAnswer ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600')} />
                                    <span>填写今日复盘</span>
                                </div>
                            )}
                        </div>

                        {!isDone && (
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !canSubmit}
                                className={cn(
                                    'mt-6 inline-flex w-full items-center justify-center rounded-[1.2rem] px-4 py-3.5 text-sm font-semibold transition duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/70',
                                    submitting || !canSubmit
                                        ? 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                                        : 'text-white hover:-translate-y-0.5',
                                )}
                                style={!submitting && canSubmit ? { background: theme.gradient, boxShadow: `0 24px 50px -30px ${theme.glow}` } : undefined}
                            >
                                {submitting ? '提交中...' : !canSubmit && day.tool_id ? '请先完成今日练习' : '完成今日课程'}
                            </button>
                        )}
                    </section>

                    <section className="rounded-[1.8rem] border border-white/80 bg-white/84 p-5 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/72">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">每日安排</p>
                        <h4 className="mt-3 text-xl font-semibold text-slate-950 dark:text-slate-100">课程目录</h4>

                        <div className="mt-5 space-y-2">
                            {days.map((item) => {
                                const done = progress.completed_days.includes(item.day_number);
                                const current = item.day_number === day.day_number;
                                const locked = isDayLocked(item, progress);

                                return (
                                    <button
                                        key={item.day_number}
                                        onClick={() => {
                                            if (!locked) onSelectDay(item);
                                        }}
                                        disabled={locked}
                                        className={cn(
                                            'flex w-full items-start gap-3 rounded-[1.2rem] border px-3.5 py-3 text-left transition duration-200',
                                            locked
                                                ? 'cursor-not-allowed border-slate-200 bg-slate-50/75 opacity-70 dark:border-slate-800 dark:bg-slate-950/70'
                                                : 'border-slate-200 bg-white hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-950/70',
                                        )}
                                        style={current ? { background: theme.softGradient, borderColor: theme.border } : undefined}
                                    >
                                        <span
                                            className={cn(
                                                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                                                done || current ? 'text-white' : 'text-slate-700 dark:text-slate-100',
                                            )}
                                            style={done || current ? { background: theme.gradient } : { background: 'rgba(148,163,184,0.14)' }}
                                        >
                                            {done ? '✓' : item.day_number}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{item.title}</span>
                                            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                                                {locked ? '未解锁' : done ? '已完成' : current ? '当前日课' : '可查看'}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
}

/* ============================================================
   本地进度存储 (未登录时使用)
   ============================================================ */
const LOCAL_PROGRESS_KEY = 'neurasense_program_progress';

function _loadLocalProgress(): Record<string, ProgramProgress> {
    try {
        const raw = localStorage.getItem(LOCAL_PROGRESS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function _saveLocalProgress(map: Record<string, ProgramProgress>) {
    try {
        localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(map));
    } catch {
        /* quota exceeded */
    }
}

/* ============================================================
   Main ProgramsPage
   ============================================================ */
type View = 'list' | 'detail' | 'day';

export default function ProgramsPage({ onOpenTool }: ProgramsPageProps) {
    const [view, setView] = useState<View>('list');
    const [programs, setPrograms] = useState<ProgramMeta[]>([]);
    const [selectedProgram, setSelectedProgram] = useState<ProgramMeta | null>(null);
    const [days, setDays] = useState<ProgramDayData[]>([]);
    const [selectedDay, setSelectedDay] = useState<ProgramDayData | null>(null);
    const [progressMap, setProgressMap] = useState<Record<string, ProgramProgress>>(_loadLocalProgress);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);

    const token = localStorage.getItem('token');

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/programs`);
                if (!res.ok) return;
                const json = await res.json();
                setPrograms(Array.isArray(json.programs) ? json.programs : []);
            } catch {
                /* offline */
            }
            setLoading(false);
        })();
    }, []);

    useEffect(() => {
        if (!token || programs.length === 0) return;
        (async () => {
            const map: Record<string, ProgramProgress> = {};
            for (const program of programs) {
                try {
                    const res = await fetch(`${API_BASE}/programs/${program.id}?token=${token}`);
                    if (!res.ok) continue;
                    const json = await res.json();
                    if (json.progress) map[program.id] = json.progress;
                } catch {
                    /* skip */
                }
            }

            if (Object.keys(map).length > 0) {
                setProgressMap((prev) => {
                    const merged = { ...prev, ...map };
                    _saveLocalProgress(merged);
                    return merged;
                });
            }
        })();
    }, [token, programs]);

    const openDetail = useCallback(async (program: ProgramMeta) => {
        setSelectedProgram(program);
        setSelectedDay(null);
        setDays([]);
        setView('detail');
        setDetailLoading(true);

        try {
            const url = token ? `${API_BASE}/programs/${program.id}?token=${token}` : `${API_BASE}/programs/${program.id}`;
            const res = await fetch(url);
            if (!res.ok) return;
            const json = await res.json();

            const sortedDays = Array.isArray(json.days)
                ? [...json.days].sort((a: ProgramDayData, b: ProgramDayData) => a.day_number - b.day_number)
                : [];
            setDays(sortedDays);

            if (json.progress) {
                setProgressMap((prev) => {
                    const next = { ...prev, [program.id]: json.progress };
                    _saveLocalProgress(next);
                    return next;
                });
            }
        } catch {
            /* offline */
        } finally {
            setDetailLoading(false);
        }
    }, [token]);

    const startProgram = useCallback(async () => {
        if (!selectedProgram) return;

        if (token) {
            try {
                const res = await fetch(`${API_BASE}/programs/${selectedProgram.id}/start?token=${token}`, {
                    method: 'POST',
                });
                if (!res.ok) return;
                const json = await res.json();
                if (json.progress) {
                    setProgressMap((prev) => {
                        const next = { ...prev, [selectedProgram.id]: json.progress };
                        _saveLocalProgress(next);
                        return next;
                    });
                }
                return;
            } catch {
                /* fall through to local */
            }
        }

        const localProgress: ProgramProgress = {
            program_id: selectedProgram.id,
            current_day: 1,
            completed_days: [],
            review_answers: {},
            started_at: new Date().toISOString(),
        };

        setProgressMap((prev) => {
            const next = { ...prev, [selectedProgram.id]: localProgress };
            _saveLocalProgress(next);
            return next;
        });
    }, [token, selectedProgram]);

    const completeDay = useCallback(async (answer: string) => {
        if (!selectedProgram || !selectedDay) return;

        const programId = selectedProgram.id;
        const dayNum = selectedDay.day_number;
        const maxDays = selectedProgram.duration_days;

        if (token) {
            try {
                const res = await fetch(`${API_BASE}/programs/${programId}/days/${dayNum}/complete?token=${token}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ review_answer: answer || null, tool_completed: true }),
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json.progress) {
                        setProgressMap((prev) => {
                            const next = { ...prev, [programId]: json.progress };
                            _saveLocalProgress(next);
                            return next;
                        });
                    }
                    setView('detail');
                    setSelectedDay(null);
                    return;
                }
            } catch {
                /* fall through to local */
            }
        }

        setProgressMap((prev) => {
            const existing = prev[programId];
            if (!existing) return prev;

            const completedDays = [...existing.completed_days];
            if (!completedDays.includes(dayNum)) completedDays.push(dayNum);

            const reviewAnswers = { ...existing.review_answers };
            if (answer) reviewAnswers[String(dayNum)] = answer;

            const updated: ProgramProgress = {
                ...existing,
                completed_days: completedDays,
                review_answers: reviewAnswers,
                current_day: Math.max(existing.current_day, Math.min(dayNum + 1, maxDays)),
            };
            const next = { ...prev, [programId]: updated };
            _saveLocalProgress(next);
            return next;
        });

        setView('detail');
        setSelectedDay(null);
    }, [token, selectedProgram, selectedDay]);

    const handleOpenTool = useCallback((toolId: string, onComplete: () => void) => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/tools/${toolId}`);
                if (!res.ok) return;
                const json = await res.json();
                if (json.tool) {
                    onOpenTool(json.tool as ToolItem, onComplete);
                }
            } catch {
                /* offline */
            }
        })();
    }, [onOpenTool]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-cyan-400 border-t-transparent" />
            </div>
        );
    }

    return (
        <AnimatePresence mode="wait">
            {view === 'list' && (
                <motion.div key="list" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
                    <ProgramList programs={programs} progressMap={progressMap} onSelect={openDetail} />
                </motion.div>
            )}

            {view === 'detail' && selectedProgram && (
                <motion.div
                    key={`detail-${selectedProgram.id}`}
                    initial={{ opacity: 0, x: 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.32, ease: 'easeOut' }}
                >
                    <ProgramDetail
                        program={selectedProgram}
                        days={days}
                        progress={progressMap[selectedProgram.id] || null}
                        loadingDays={detailLoading}
                        onBack={() => {
                            setView('list');
                            setSelectedProgram(null);
                            setSelectedDay(null);
                        }}
                        onStart={startProgram}
                        onSelectDay={(day) => {
                            setSelectedDay(day);
                            setView('day');
                        }}
                    />
                </motion.div>
            )}

            {view === 'day' && selectedProgram && selectedDay && progressMap[selectedProgram.id] && (
                <motion.div
                    key={`day-${selectedProgram.id}-${selectedDay.day_number}`}
                    initial={{ opacity: 0, x: 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.32, ease: 'easeOut' }}
                >
                    <ProgramDayView
                        program={selectedProgram}
                        day={selectedDay}
                        days={days}
                        progress={progressMap[selectedProgram.id]}
                        onBack={() => {
                            setView('detail');
                            setSelectedDay(null);
                        }}
                        onSelectDay={(day) => setSelectedDay(day)}
                        onOpenTool={handleOpenTool}
                        onCompleteDay={completeDay}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
