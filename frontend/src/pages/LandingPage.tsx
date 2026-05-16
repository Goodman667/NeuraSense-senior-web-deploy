import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import DecryptedText from '../components/ReactBits/DecryptedText';
import GradientText from '../components/ReactBits/GradientText';
import NeuralAurora from '../components/ReactBits/NeuralAurora';
import SignalOrbit from '../components/ReactBits/SignalOrbit';
import SpotlightCard from '../components/ReactBits/SpotlightCard';

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
        label: '记录',
        title: '先看看今天过得怎么样',
        detail: '用几个简单问题了解心情、压力和睡眠，不需要懂专业术语。',
    },
    {
        label: '聊聊',
        title: '把说不出口的先说出来',
        detail: 'AI 会陪你整理想法，给出温和回应和下一步建议。',
    },
    {
        label: '练习',
        title: '做一个现在就能开始的小练习',
        detail: '呼吸、放松、睡眠和专注练习，按你的状态慢慢来。',
    },
];

const principles: Principle[] = [
    {
        title: '每天都能用',
        detail: '记录、聊天和练习都在同一处，不用来回寻找入口。',
    },
    {
        title: '不需要懂术语',
        detail: '页面会把要做的事说清楚，第一次打开也知道从哪开始。',
    },
    {
        title: '看见自己的变化',
        detail: '记录会留下来，方便回头看看哪段时间轻松一点、哪些方法有帮助。',
    },
];

const featureCards: FeatureCard[] = [
    {
        eyebrow: '记录',
        title: '心情与睡眠记录',
        description: '用几个简单问题整理今天的感受、压力和睡眠，帮你先看清自己正处在什么状态。',
        tags: ['心情', '压力', '睡眠'],
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
        title: 'AI 陪你聊聊',
        description: '当你不知道该和谁说时，可以先在这里把事情讲出来，得到温和回应和可执行的小建议。',
        tags: ['倾听', '整理想法', '下一步建议'],
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
        title: '放松练习',
        description: '呼吸、正念、专注和沉浸放松放在一起，状态不太好时也能直接开始。',
        tags: ['呼吸', '放松', '专注'],
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
        eyebrow: '计划',
        title: '连续小计划',
        description: '围绕焦虑、睡眠和情绪管理等主题，每天完成一点点，更容易坚持。',
        tags: ['7天开始', '睡眠', '情绪'],
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
        eyebrow: '观察',
        title: '从身体信号看状态',
        description: '结合眼动、声音和使用行为等线索，帮助你从另一个角度理解疲惫、紧张或注意力变化。',
        tags: ['眼动', '声音', '行为线索'],
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
        eyebrow: '回顾',
        title: '变化回顾',
        description: '把一段时间里的心情、练习和睡眠变化整理成清楚的回顾，方便继续照顾自己。',
        tags: ['每周回顾', '变化', '建议'],
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
        title: '先记录今天',
        detail: '回答几个简单问题，留下心情、压力、睡眠和身体感受。',
        signal: '从一两分钟开始',
    },
    {
        title: '和 AI 聊一聊',
        detail: '把想说的话写下来或说出来，先获得一个温和的回应。',
        signal: '把事情理顺',
    },
    {
        title: '选择一个小练习',
        detail: '根据当下状态，做呼吸、放松、专注或睡前练习。',
        signal: '马上能做',
    },
    {
        title: '过几天再回看',
        detail: '看看哪些时刻轻松一点，哪些方法对你有帮助。',
        signal: '看见变化',
    },
];

const assuranceNotes = [
    '不用一次做完，先记录、先聊聊或先做一个练习都可以。',
    '你的记录会保存在账号里，方便下次接着看。',
    '如果你状态很差，页面会提醒你及时寻求现实中的帮助。',
];

const trendBars = ['34%', '46%', '42%', '55%', '61%', '58%', '72%'];

export default function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
    return (
        <div className="min-h-screen bg-[#eef7f5] text-slate-900">
            <div className="relative isolate overflow-hidden">
                <div className="absolute inset-0 -z-30 bg-[radial-gradient(circle_at_50%_-10%,rgba(224,255,250,0.95),transparent_36%),linear-gradient(180deg,#eef7f5_0%,#f8fbf7_46%,#eef5f8_100%)]" />
                <NeuralAurora />
                <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(15,23,42,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.055)_1px,transparent_1px)] bg-[size:96px_96px] opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_24%,rgba(255,255,255,0.74),transparent_34%)]" />
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
                                <p className="mt-1 text-[10px] uppercase tracking-[0.34em] text-slate-500">情绪与睡眠陪伴</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="hidden rounded-full border border-white/80 bg-white/60 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-slate-500 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)] backdrop-blur lg:block">
                                记录 · 聊聊 · 练习
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
                                    <DecryptedText text="AI 情绪与睡眠陪伴" />
                                </motion.div>

                                <motion.h1
                                    variants={revealItem}
                                    className="mt-7 max-w-4xl font-serif text-[3.3rem] leading-[0.95] tracking-[-0.05em] text-slate-950 sm:text-[4.4rem] lg:text-[5.6rem] xl:text-[6.35rem]"
                                >
                                    当你有些累的时候，
                                    <span className="block text-slate-600">
                                        <GradientText colors={['#475569', '#0891b2', '#14b8a6', '#475569']} animationSpeed={9}>
                                            这里可以先陪你停一停。
                                        </GradientText>
                                    </span>
                                </motion.h1>

                                <motion.p
                                    variants={revealItem}
                                    className="mt-7 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg"
                                >
                                    NeuraSense 陪你把今天的感受写下来，整理压力和睡眠变化，也会推荐适合当下的小练习。它不替代医生或咨询师，但可以成为日常自我照顾的起点。
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
                                        <SpotlightCard
                                            key={signal.label}
                                            className="rounded-[1.6rem] border border-white/80 bg-white/70 p-5 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.35)] backdrop-blur-xl"
                                        >
                                            <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">{signal.label}</p>
                                            <h2 className="mt-3 text-base font-semibold text-slate-900">{signal.title}</h2>
                                            <p className="mt-2 text-sm leading-7 text-slate-600">{signal.detail}</p>
                                        </SpotlightCard>
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

                                <SpotlightCard className="landing-card-sheen landing-hologram-panel relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/76 p-6 shadow-[0_40px_120px_-42px_rgba(15,23,42,0.42)] backdrop-blur-2xl sm:p-7" spotlightColor="rgba(8, 145, 178, 0.16)" radius={560}>
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/85 via-white/55 to-slate-100/55" />
                                    <div className="landing-scan-layer absolute inset-0" aria-hidden="true" />
                                    <div className="relative">
                                        <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <p className="text-[11px] uppercase tracking-[0.34em] text-teal-700">今日照顾清单</p>
                                                <h2 className="mt-3 max-w-md font-serif text-3xl leading-tight tracking-[-0.03em] text-slate-950 sm:text-[2.2rem]">
                                                    先看看今天的状态，再决定做什么。
                                                </h2>
                                            </div>
                                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                                可以开始
                                            </div>
                                        </div>

                                        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(220px,0.92fr)]">
                                            <div className="relative overflow-hidden rounded-[1.7rem] bg-slate-950 p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-6">
                                                <div className="landing-data-rain absolute inset-0 opacity-45" aria-hidden="true" />
                                                <SignalOrbit className="absolute right-[-3.8rem] top-[-3.5rem] h-44 w-44" />
                                                <div className="relative">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div>
                                                        <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">最近7天</p>
                                                        <p className="mt-3 text-2xl font-semibold text-white">最近的我</p>
                                                    </div>
                                                    <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                                                        慢慢记录
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
                                                                className={`landing-bar-glow w-full rounded-t-[999px] ${index === trendBars.length - 1 ? 'bg-gradient-to-t from-cyan-400 via-teal-300 to-white' : 'bg-gradient-to-t from-slate-600 to-slate-300'}`}
                                                            />
                                                        </motion.div>
                                                    ))}
                                                </div>

                                                <div className="mt-6 grid grid-cols-3 gap-3 text-sm text-slate-300">
                                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">现在感觉</p>
                                                        <p className="mt-2 font-medium text-white">有些起伏</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">适合现在</p>
                                                        <p className="mt-2 font-medium text-white">聊聊再决定</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                                                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">今晚重点</p>
                                                        <p className="mt-2 font-medium text-white">早点休息</p>
                                                    </div>
                                                </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="rounded-[1.4rem] border border-slate-200/80 bg-stone-50/95 p-5">
                                                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">今天可以先做什么</p>
                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        {['心情', '压力', '睡眠', '放松'].map((tag) => (
                                                            <span
                                                                key={tag}
                                                                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <p className="mt-4 text-sm leading-7 text-slate-600">
                                                        几个简单问题会帮你整理今天的感受，然后给出更适合的下一步。
                                                    </p>
                                                </div>

                                                <div className="rounded-[1.4rem] border border-slate-200/80 bg-white p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">开始方式</p>
                                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">已开启</span>
                                                    </div>
                                                    <div className="mt-4 space-y-3">
                                                        {['记录今天感受', '和 AI 聊一聊', '做一个小练习'].map((step, index) => (
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
                                                { label: '先从这里', value: '记录今天' },
                                                { label: '看看变化', value: '近期回顾' },
                                                { label: '继续照顾自己', value: '练习计划' },
                                            ].map((item) => (
                                                <div key={item.label} className="rounded-[1.2rem] border border-slate-200/80 bg-white/80 px-4 py-4 text-sm shadow-[0_18px_40px_-34px_rgba(15,23,42,0.28)]">
                                                    <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">{item.label}</p>
                                                    <p className="mt-2 font-semibold text-slate-800">{item.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </SpotlightCard>
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
                                    你可以这样开始
                                </motion.p>
                                <motion.h2 variants={revealItem} className="mt-4 font-serif text-4xl leading-tight tracking-[-0.04em] text-slate-950">
                                    给自己一个
                                    <span className="block text-slate-600">容易开始的入口。</span>
                                </motion.h2>
                                <motion.p variants={revealItem} className="mt-6 text-base leading-8 text-slate-600">
                                    首页把记录、聊天、放松练习和回顾放在前面。心里乱的时候，不需要先想清楚要用哪个功能。
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
                                    <SpotlightCard
                                        key={feature.title}
                                        className={`group relative overflow-hidden rounded-[1.8rem] border border-white/80 bg-white/78 p-6 shadow-[0_28px_80px_-38px_rgba(15,23,42,0.32)] backdrop-blur-xl transition duration-300 ${feature.featured ? 'md:col-span-2 md:grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-end md:gap-6' : ''}`}
                                    >
                                        <motion.article variants={revealItem} whileHover={{ y: -6 }} className="relative">
                                            <div className={`absolute inset-x-0 top-[-1.5rem] h-1 bg-gradient-to-r ${feature.accent}`} />
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
                                    </SpotlightCard>
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
                                    怎么开始
                                </motion.p>
                                <motion.h2 variants={revealItem} className="mt-4 max-w-2xl font-serif text-4xl leading-tight tracking-[-0.04em] text-white">
                                    不用准备好，也可以先从今天开始。
                                </motion.h2>
                                <motion.p variants={revealItem} className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
                                    先回答几个问题，或者直接找 AI 聊聊。之后可以根据状态做一个小练习，过几天再回来看看变化。
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
                                    <p className="text-[11px] uppercase tracking-[0.34em] text-slate-500">我们会帮你</p>
                                    <h2 className="mt-4 font-serif text-3xl leading-tight tracking-[-0.04em] text-slate-950">
                                        把复杂的感受，整理成看得懂的下一步。
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
                                        <p className="text-[11px] uppercase tracking-[0.34em] text-teal-700">现在开始</p>
                                        <h2 className="mt-4 max-w-sm font-serif text-3xl leading-tight tracking-[-0.04em] text-slate-950">
                                            现在就给自己几分钟
                                        </h2>
                                        <p className="mt-5 max-w-md text-sm leading-7 text-slate-600">
                                            先记录一下今天的感受，或者直接和 AI 聊聊。后面想继续看变化，也可以登录账号保存记录。
                                        </p>

                                        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                            <button
                                                onClick={onGetStarted}
                                                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3.5 text-sm font-medium text-white shadow-[0_24px_50px_-30px_rgba(15,23,42,0.7)] transition duration-300 hover:-translate-y-0.5 hover:bg-slate-900"
                                            >
                                                现在开始
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
                            NeuraSense 陪你记录情绪、整理压力、练习放松，并回看一段时间里的变化。
                        </p>
                        <div className="flex items-center gap-4 text-xs uppercase tracking-[0.24em] text-slate-400">
                            <span>记录今天</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span>聊一聊</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span>放松练习</span>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
}
