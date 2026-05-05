import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

const revealContainer = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.12,
            delayChildren: 0.08,
        },
    },
};

const revealItem = {
    hidden: { opacity: 0, y: 28 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.7,
            ease: 'easeOut' as const,
        },
    },
};

interface LandingPageProps {
    onGetStarted: () => void;
    onLogin: () => void;
}

interface HeroSignal {
    label: string;
    title: string;
    detail: string;
}

interface Principle {
    title: string;
    detail: string;
}

interface FeatureCard {
    eyebrow: string;
    title: string;
    description: string;
    tags: string[];
    accent: string;
    surface: string;
    tint: string;
    icon: ReactNode;
    featured?: boolean;
}

interface JourneyStep {
    title: string;
    detail: string;
    signal: string;
}

const heroSignals: HeroSignal[] = [
    {
        label: '评估',
        title: '结构化评估入口',
        detail: 'PHQ-9、GAD-7 与多维心理测量解释集中呈现。',
    },
    {
        label: '陪伴',
        title: '连续式 AI 聊愈',
        detail: '从陪伴式对话到危机识别，始终保持温和但清晰。',
    },
    {
        label: '进展',
        title: '训练与趋势回看',
        detail: '把呼吸、睡眠、认知训练和报告归入一个持续节律。',
    },
];

const principles: Principle[] = [
    {
        title: '连续支持',
        detail: '从签到、评估到 AI 对话和训练计划，核心能力可以连续使用。',
    },
    {
        title: '清晰易用',
        detail: '重要信息与主要入口优先展示，首次访问也能快速开始。',
    },
    {
        title: '长期陪伴',
        detail: '支持记录、趋势回看和课程跟进，方便长期关注自己的变化。',
    },
];

const featureCards: FeatureCard[] = [
    {
        eyebrow: '评估',
        title: '专业心理评估',
        description: '将量表、风险信号和 AI 解读整合为一个清晰的起点，让首次进入也不迷失。',
        tags: ['PHQ-9', 'GAD-7', '画钟测验'],
        accent: 'from-teal-500 via-cyan-400 to-sky-400',
        surface: 'from-teal-50 via-white to-cyan-50',
        tint: 'text-teal-700',
        featured: true,
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M9 12h6" />
                <path d="M12 9v6" />
                <circle cx="12" cy="12" r="9" />
            </svg>
        ),
    },
    {
        eyebrow: '对话',
        title: 'AI 聊愈师',
        description: '对话不是一个弹窗功能，而是一条可延续、可理解、可追踪的支持流。',
        tags: ['情绪识别', '危机干预', '持续陪伴'],
        accent: 'from-slate-700 via-slate-500 to-teal-500',
        surface: 'from-slate-50 via-white to-teal-50',
        tint: 'text-slate-700',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8v.5Z" />
            </svg>
        ),
    },
    {
        eyebrow: '工具',
        title: '自助工具箱',
        description: '呼吸、正念、认知训练与沉浸式调节统一进一个操作面板，降低行动门槛。',
        tags: ['呼吸训练', '正念冥想', '认知训练'],
        accent: 'from-emerald-500 via-teal-500 to-cyan-400',
        surface: 'from-emerald-50 via-white to-teal-50',
        tint: 'text-emerald-700',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <rect x="3" y="3" width="7" height="7" rx="1.6" />
                <rect x="14" y="3" width="7" height="7" rx="1.6" />
                <rect x="3" y="14" width="7" height="7" rx="1.6" />
                <rect x="14" y="14" width="7" height="7" rx="1.6" />
            </svg>
        ),
    },
    {
        eyebrow: '课程',
        title: '结构化课程',
        description: '围绕焦虑缓解、睡眠改善、情绪管理等主题提供连续课程安排。',
        tags: ['7~21 天计划', '主题路线', '习惯建立'],
        accent: 'from-amber-500 via-orange-400 to-rose-400',
        surface: 'from-amber-50 via-white to-orange-50',
        tint: 'text-amber-700',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
            </svg>
        ),
    },
    {
        eyebrow: '信号',
        title: '生物信号分析',
        description: '眼动、语音与行为数据被解释为辅助洞察，而不是堆砌冷冰冰的技术名词。',
        tags: ['眼动追踪', '语音情感', '键盘动力学'],
        accent: 'from-sky-500 via-cyan-400 to-teal-400',
        surface: 'from-sky-50 via-white to-cyan-50',
        tint: 'text-sky-700',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M22 12h-4l-3 8-6-16-3 8H2" />
            </svg>
        ),
    },
    {
        eyebrow: '报告',
        title: 'AI 报告与趋势',
        description: '评估结论、阶段性变化与个性化建议，用更接近专业摘要的方式交付。',
        tags: ['PDF 报告', '趋势预测', '个性建议'],
        accent: 'from-slate-800 via-slate-600 to-sky-500',
        surface: 'from-slate-100 via-white to-sky-50',
        tint: 'text-slate-700',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
                <path d="M8 13h8" />
                <path d="M8 17h6" />
            </svg>
        ),
    },
];

const journeySteps: JourneyStep[] = [
    {
        title: '了解当前状态',
        detail: '通过签到与量表快速掌握情绪、压力、睡眠等信息。',
        signal: '从记录开始',
    },
    {
        title: '获得 AI 支持',
        detail: '在对话中继续表达困扰，获取温和陪伴与风险提醒。',
        signal: '从理解到回应',
    },
    {
        title: '开始合适的练习',
        detail: '根据状态选择呼吸、正念、认知训练或沉浸式调节。',
        signal: '把建议变成行动',
    },
    {
        title: '持续回顾变化',
        detail: '通过报告、趋势和课程进度观察自己的变化。',
        signal: '看见每一步进展',
    },
];

const assuranceNotes = [
    '支持量表评估、AI 对话、自助练习、课程计划与趋势回看。',
    '记录会持续保存，方便后续查看变化与继续练习。',
    '从首次使用到日常陪伴，都能快速找到下一步。',
];

const trendBars = ['34%', '46%', '42%', '55%', '61%', '58%', '72%'];

export default function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
    return (
        <div className="min-h-screen bg-[#f4f6f1] text-slate-900">
            <div className="relative isolate overflow-hidden">
                <div className="absolute inset-0 -z-30 bg-[#f4f6f1]" />
                <div className="absolute left-[-10rem] top-[-8rem] -z-20 h-[24rem] w-[24rem] rounded-full bg-cyan-200/45 blur-3xl" />
                <div className="absolute right-[-6rem] top-20 -z-20 h-[28rem] w-[28rem] rounded-full bg-slate-300/45 blur-3xl" />
                <div className="absolute left-1/2 top-[18rem] -z-20 h-[20rem] w-[44rem] -translate-x-1/2 rounded-full bg-white/80 blur-3xl" />
                <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(148,163,184,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.09)_1px,transparent_1px)] bg-[size:120px_120px] opacity-40" />
                <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-slate-300/80 to-transparent" />

                <div className="mx-auto max-w-7xl px-6 pb-16 sm:pb-20 lg:px-10 lg:pb-24">
                    <motion.nav
                        initial={{ opacity: 0, y: -18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        className="flex items-center justify-between py-6 lg:py-8"
                    >
                        <div className="flex items-center gap-4">
                            <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-[1.4rem] border border-white/80 bg-white/75 shadow-[0_20px_60px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/18 via-white/40 to-slate-300/20" />
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="relative h-5 w-5 text-slate-800">
                                    <path d="M12 21s-6.2-4.2-8.4-8.1A5.4 5.4 0 0 1 12 5.5a5.4 5.4 0 0 1 8.4 7.4C18.2 16.8 12 21 12 21Z" />
                                    <path d="M9.4 12.3h5.2" />
                                    <path d="M12 9.7v5.2" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-serif text-2xl tracking-tight text-slate-950">NeuraSense</p>
                                <p className="mt-1 text-[10px] uppercase tracking-[0.34em] text-slate-500">心理健康支持平台</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="hidden rounded-full border border-white/80 bg-white/60 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-slate-500 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)] backdrop-blur lg:block">
                                评估 · 陪伴 · 训练
                            </div>
                            <button
                                onClick={onLogin}
                                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/85 px-5 py-2.5 text-sm font-medium text-slate-700 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
                            >
                                登录
                            </button>
                        </div>
                    </motion.nav>

                    <section className="pt-4 lg:pt-6">
                        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-10 xl:gap-16">
                            <motion.div
                                variants={revealContainer}
                                initial="hidden"
                                animate="show"
                                className="max-w-3xl pt-6 lg:pt-12"
                            >
                                <motion.div variants={revealItem} className="inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/72 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-teal-700 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl">
                                    <span className="h-2 w-2 rounded-full bg-teal-500" />
                                    AI 心理健康支持平台
                                </motion.div>

                                <motion.h1
                                    variants={revealItem}
                                    className="mt-7 max-w-4xl font-serif text-[3.3rem] leading-[0.95] tracking-[-0.05em] text-slate-950 sm:text-[4.4rem] lg:text-[5.6rem] xl:text-[6.35rem]"
                                >
                                    让心理支持，
                                    <span className="block text-slate-600">更容易开始，也更值得长期使用。</span>
                                </motion.h1>

                                <motion.p
                                    variants={revealItem}
                                    className="mt-7 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg"
                                >
                                    NeuraSense 将心理评估、AI 聊愈、自助训练与趋势报告整合在同一平台，帮助用户从了解状态到持续练习，再到回顾变化。
                                </motion.p>

                                <motion.div variants={revealItem} className="mt-10 flex flex-col gap-4 sm:flex-row">
                                    <button
                                        onClick={onGetStarted}
                                        className="inline-flex items-center justify-center rounded-full bg-slate-950 px-7 py-4 text-base font-medium text-white shadow-[0_28px_60px_-28px_rgba(15,23,42,0.7)] transition duration-300 hover:-translate-y-1 hover:bg-slate-900"
                                    >
                                        开始使用
                                    </button>
                                    <button
                                        onClick={onLogin}
                                        className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/85 px-7 py-4 text-base font-medium text-slate-700 shadow-[0_22px_50px_-32px_rgba(15,23,42,0.35)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-slate-400 hover:bg-white"
                                    >
                                        已有账号？登录
                                    </button>
                                </motion.div>

                                <motion.div
                                    variants={revealItem}
                                    className="mt-12 grid gap-4 sm:grid-cols-3"
                                >
                                    {heroSignals.map((signal) => (
                                        <div
                                            key={signal.label}
                                            className="rounded-[1.6rem] border border-white/80 bg-white/70 p-5 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.35)] backdrop-blur-xl"
                                        >
                                            <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">{signal.label}</p>
                                            <h2 className="mt-3 text-base font-semibold text-slate-900">{signal.title}</h2>
                                            <p className="mt-2 text-sm leading-7 text-slate-600">{signal.detail}</p>
                                        </div>
                                    ))}
                                </motion.div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 36 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.9, ease: 'easeOut', delay: 0.18 }}
                                className="relative lg:pt-8"
                            >
                                <div className="absolute -left-10 top-20 hidden h-24 w-24 rounded-full border border-white/70 bg-white/30 blur-[2px] lg:block" />
                                <div className="absolute -right-8 bottom-10 hidden h-28 w-28 rounded-full bg-teal-100/70 blur-2xl lg:block" />

                                <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/76 p-6 shadow-[0_40px_120px_-42px_rgba(15,23,42,0.42)] backdrop-blur-2xl sm:p-7">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/85 via-white/55 to-slate-100/55" />
                                    <div className="relative">
                                        <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <p className="text-[11px] uppercase tracking-[0.34em] text-teal-700">今日支持概览</p>
                                                <h2 className="mt-3 max-w-md font-serif text-3xl leading-tight tracking-[-0.03em] text-slate-950 sm:text-[2.2rem]">
                                                    从状态了解、支持对话到训练计划，一处完成。
                                                </h2>
                                            </div>
                                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                                服务已就绪
                                            </div>
                                        </div>

                                        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(220px,0.92fr)]">
                                            <div className="rounded-[1.7rem] bg-slate-950 p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-6">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div>
                                                        <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">近7天趋势</p>
                                                        <p className="mt-3 text-2xl font-semibold text-white">最近状态概览</p>
                                                    </div>
                                                    <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                                                        持续记录
                                                    </div>
                                                </div>

                                                <div className="mt-8 flex h-36 items-end gap-3">
                                                    {trendBars.map((height, index) => (
                                                        <motion.div
                                                            key={`${height}-${index}`}
                                                            initial={{ opacity: 0, scaleY: 0.25 }}
                                                            animate={{ opacity: 1, scaleY: 1 }}
                                                            transition={{ duration: 0.6, delay: 0.35 + index * 0.08, ease: 'easeOut' }}
                                                            className="flex-1 origin-bottom"
                                                        >
                                                            <div
                                                                style={{ height }}
                                                                className={`w-full rounded-t-[999px] ${index === trendBars.length - 1 ? 'bg-gradient-to-t from-cyan-400 via-teal-300 to-white' : 'bg-gradient-to-t from-slate-600 to-slate-300'}`}
                                                            />
                                                        </motion.div>
                                                    ))}
                                                </div>

                                                <div className="mt-6 grid grid-cols-3 gap-3 text-sm text-slate-300">
                                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">当前状态</p>
                                                        <p className="mt-2 font-medium text-white">稳定回升</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">支持方式</p>
                                                        <p className="mt-2 font-medium text-white">持续陪伴</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">今日重点</p>
                                                        <p className="mt-2 font-medium text-white">睡眠优先</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="rounded-[1.4rem] border border-slate-200/80 bg-stone-50/95 p-5">
                                                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">评估项目</p>
                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        {['PHQ-9', 'GAD-7', 'CBT 策略', '风险标记'].map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <p className="mt-4 text-sm leading-7 text-slate-600">
                                                        量表结果、风险提示与建议会集中展示，方便快速了解当前状态。
                                                    </p>
                                                </div>

                                                <div className="rounded-[1.4rem] border border-slate-200/80 bg-white p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">使用流程</p>
                                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">已开启</span>
                                                    </div>
                                                    <div className="mt-4 space-y-3">
                                                        {['完成签到或评估', '进入 AI 陪伴', '开始今日练习'].map((step, index) => (
                                                            <div key={step} className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-3">
                                                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                                                                    0{index + 1}
                                                                </span>
                                                                <span className="text-sm font-medium text-slate-700">{step}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                                            {[
                                                { label: '核心入口', value: '评估与签到' },
                                                { label: '记录方式', value: '趋势与报告' },
                                                { label: '下一步', value: '课程与练习' },
                                            ].map((item) => (
                                                <div key={item.label} className="rounded-[1.2rem] border border-slate-200/80 bg-white/80 px-4 py-4 text-sm shadow-[0_18px_40px_-34px_rgba(15,23,42,0.28)]">
                                                    <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">{item.label}</p>
                                                    <p className="mt-2 font-semibold text-slate-800">{item.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </section>

                    <section className="mt-20 lg:mt-24">
                        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)] lg:gap-10">
                            <motion.aside
                                initial="hidden"
                                whileInView="show"
                                viewport={{ once: true, amount: 0.25 }}
                                variants={revealContainer}
                                className="rounded-[2rem] border border-white/80 bg-white/72 p-7 shadow-[0_34px_90px_-42px_rgba(15,23,42,0.35)] backdrop-blur-xl lg:sticky lg:top-8 lg:h-fit"
                            >
                                <motion.p variants={revealItem} className="text-[11px] uppercase tracking-[0.34em] text-teal-700">
                                    平台亮点
                                </motion.p>
                                <motion.h2 variants={revealItem} className="mt-4 font-serif text-4xl leading-tight tracking-[-0.04em] text-slate-950">
                                    把核心能力放在
                                    <span className="block text-slate-600">真正需要的位置。</span>
                                </motion.h2>
                                <motion.p variants={revealItem} className="mt-6 text-base leading-8 text-slate-600">
                                    首页优先呈现评估、对话、练习和课程四个核心入口，让首次访问与日常使用都能快速找到下一步。
                                </motion.p>

                                <div className="mt-8 space-y-5 border-t border-slate-200/80 pt-6">
                                    {principles.map((principle) => (
                                        <motion.div key={principle.title} variants={revealItem} className="flex gap-4">
                                            <div className="mt-1 h-10 w-px bg-gradient-to-b from-teal-500 via-slate-300 to-transparent" />
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-900">{principle.title}</h3>
                                                <p className="mt-2 text-sm leading-7 text-slate-600">{principle.detail}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.aside>

                            <motion.div
                                initial="hidden"
                                whileInView="show"
                                viewport={{ once: true, amount: 0.2 }}
                                variants={revealContainer}
                                className="grid gap-5 md:grid-cols-2"
                            >
                                {featureCards.map((feature) => (
                                    <motion.article
                                        key={feature.title}
                                        variants={revealItem}
                                        whileHover={{ y: -6 }}
                                        className={`group relative overflow-hidden rounded-[1.8rem] border border-white/80 bg-white/78 p-6 shadow-[0_28px_80px_-38px_rgba(15,23,42,0.32)] backdrop-blur-xl transition duration-300 ${feature.featured ? 'md:col-span-2 md:grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-end md:gap-6' : ''}`}
                                    >
                                        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${feature.accent}`} />
                                        <div>
                                            <div className="flex items-start justify-between gap-4">
                                                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.surface} ${feature.tint} shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]`}>
                                                    {feature.icon}
                                                </div>
                                                <span className="rounded-full border border-slate-200/80 bg-white/85 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                                                    {feature.eyebrow}
                                                </span>
                                            </div>

                                            <h3 className="mt-7 font-serif text-[1.9rem] leading-tight tracking-[-0.03em] text-slate-950">
                                                {feature.title}
                                            </h3>
                                            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-[15px]">
                                                {feature.description}
                                            </p>
                                        </div>

                                        <div className="mt-6 flex flex-wrap gap-2 md:mt-0 md:justify-end">
                                            {feature.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </motion.article>
                                ))}
                            </motion.div>
                        </div>
                    </section>

                    <section className="mt-20 lg:mt-24">
                        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:gap-10">
                            <motion.div
                                initial="hidden"
                                whileInView="show"
                                viewport={{ once: true, amount: 0.2 }}
                                variants={revealContainer}
                                className="rounded-[2rem] border border-slate-200/80 bg-slate-950 p-7 text-white shadow-[0_38px_100px_-42px_rgba(15,23,42,0.75)] sm:p-8"
                            >
                                <motion.p variants={revealItem} className="text-[11px] uppercase tracking-[0.34em] text-cyan-300">
                                    使用路径
                                </motion.p>
                                <motion.h2 variants={revealItem} className="mt-4 max-w-2xl font-serif text-4xl leading-tight tracking-[-0.04em] text-white">
                                    从初次接触到持续改善，平台会把路径说清楚。
                                </motion.h2>
                                <motion.p variants={revealItem} className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
                                    用户可以从签到或量表开始，在 AI 陪伴、自助练习和课程计划之间顺畅切换，并通过趋势记录持续回顾。
                                </motion.p>

                                <div className="mt-8 grid gap-4 md:grid-cols-2">
                                    {journeySteps.map((step, index) => (
                                        <motion.div key={step.title} variants={revealItem} className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-5">
                                            <div className="flex items-start gap-4">
                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-950">
                                                    0{index + 1}
                                                </span>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                                                    <p className="mt-3 text-sm leading-7 text-slate-300">{step.detail}</p>
                                                </div>
                                            </div>
                                            <p className="mt-5 border-t border-white/10 pt-4 text-xs uppercase tracking-[0.24em] text-cyan-200/90">
                                                {step.signal}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>

                            <div className="grid gap-8">
                                <motion.div
                                    initial={{ opacity: 0, y: 24 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.3 }}
                                    transition={{ duration: 0.7, ease: 'easeOut' }}
                                    className="rounded-[2rem] border border-white/80 bg-white/76 p-7 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.34)] backdrop-blur-xl"
                                >
                                    <p className="text-[11px] uppercase tracking-[0.34em] text-slate-500">平台能力</p>
                                    <h2 className="mt-4 font-serif text-3xl leading-tight tracking-[-0.04em] text-slate-950">
                                        把专业支持做得更清楚，也更容易开始。
                                    </h2>
                                    <div className="mt-6 space-y-4">
                                        {assuranceNotes.map((note) => (
                                            <div key={note} className="flex gap-3 rounded-[1.3rem] border border-slate-200/80 bg-slate-50/80 px-4 py-4">
                                                <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-teal-500" />
                                                <p className="text-sm leading-7 text-slate-600">{note}</p>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 24 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.3 }}
                                    transition={{ duration: 0.7, ease: 'easeOut', delay: 0.08 }}
                                    className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-white via-slate-50 to-cyan-50 p-7 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.34)]"
                                >
                                    <div className="absolute right-[-3rem] top-[-3rem] h-32 w-32 rounded-full bg-cyan-200/60 blur-3xl" />
                                    <div className="relative">
                                        <p className="text-[11px] uppercase tracking-[0.34em] text-teal-700">立即开始</p>
                                        <h2 className="mt-4 max-w-sm font-serif text-3xl leading-tight tracking-[-0.04em] text-slate-950">
                                            现在开始了解你的状态
                                        </h2>
                                        <p className="mt-5 max-w-md text-sm leading-7 text-slate-600">
                                            创建账号后可同步记录、课程进度与个性化设置，后续继续使用更方便。
                                        </p>

                                        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                            <button
                                                onClick={onGetStarted}
                                                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3.5 text-sm font-medium text-white shadow-[0_24px_50px_-30px_rgba(15,23,42,0.7)] transition duration-300 hover:-translate-y-0.5 hover:bg-slate-900"
                                            >
                                                立即开始
                                            </button>
                                            <button
                                                onClick={onLogin}
                                                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/85 px-6 py-3.5 text-sm font-medium text-slate-700 transition duration-300 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white"
                                            >
                                                登录已有账号
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </section>

                    <footer className="mt-12 flex flex-col gap-4 border-t border-slate-200/80 py-8 text-sm text-slate-500 lg:mt-16 lg:flex-row lg:items-center lg:justify-between">
                        <p className="max-w-2xl leading-7">
                            NeuraSense 提供心理评估、AI 陪伴、自助训练、课程计划与趋势回顾的一体化支持服务。
                        </p>
                        <div className="flex items-center gap-4 text-xs uppercase tracking-[0.24em] text-slate-400">
                            <span>心理评估</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span>AI陪伴</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span>自助训练</span>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
}
