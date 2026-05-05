import { useEffect, type ReactNode } from 'react';
import type { UserInfo } from '../components';
import { useProfileStore } from '../store/useProfileStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useUIModeStore, type UIMode } from '../store/useUIModeStore';
import { useI18n } from '../i18n';

interface MePageProps {
    currentUser: UserInfo | null;
    isDarkMode: boolean;
    onToggleDarkMode: () => void;
    onShowAuth: () => void;
    onLogout: () => void;
    onShowAchievements: () => void;
    onNavigate: (view: string) => void;
    streak: number;
    todayPoints: number;
}

function ShieldIcon({ className = 'h-5 w-5' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7.5 3v5.25c0 5.25-3.6 8.85-7.5 9.75-3.9-.9-7.5-4.5-7.5-9.75V6L12 3Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m9.5 12 1.75 1.75L14.5 10.5" />
        </svg>
    );
}

function BellIcon({ className = 'h-5 w-5' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 16.5h11" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16.5V10a4 4 0 1 1 8 0v6.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 16.5 1.5 2.5h11L19 16.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19a2 2 0 0 0 4 0" />
        </svg>
    );
}

function ChartIcon({ className = 'h-5 w-5' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
    );
}

function PencilIcon({ className = 'h-5 w-5' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
    );
}

function TrophyIcon({ className = 'h-5 w-5' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .982-3.172M12 3.75a3.75 3.75 0 0 0-3.75 3.75 7.5 7.5 0 0 0 3.75 6.75 7.5 7.5 0 0 0 3.75-6.75A3.75 3.75 0 0 0 12 3.75Z" />
        </svg>
    );
}

function UsersIcon({ className = 'h-5 w-5' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
        </svg>
    );
}

function SettingsIcon({ className = 'h-5 w-5' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="12" cy="12" r="3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .29 1.7 1.7 0 0 0-.8 1.46V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.4 19.4a1.7 1.7 0 0 0-1-.29 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.29-1 1.7 1.7 0 0 0-1.46-.8H2.8a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.4a1.7 1.7 0 0 0 .29-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6c.3 0 .69-.1 1-.29.49-.3.8-.84.8-1.46V2.8a2 2 0 1 1 4 0v.09c0 .62.31 1.16.8 1.46.31.19.7.29 1 .29a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c0 .3.1.69.29 1 .3.49.84.8 1.46.8h.09a2 2 0 1 1 0 4h-.09c-.62 0-1.16.31-1.46.8-.19.31-.29.7-.29 1Z" />
        </svg>
    );
}

function MoonSunIcon({ className = 'h-5 w-5', dark = false }: { className?: string; dark?: boolean }) {
    if (dark) {
        return (
            <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
        );
    }

    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        </svg>
    );
}

function ArrowIcon({ className = 'h-4 w-4' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
    );
}

function SectionHeader({
    eyebrow,
    title,
    description,
}: {
    eyebrow: string;
    title: string;
    description?: string;
}) {
    return (
        <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-700">{eyebrow}</p>
            <h3 className="mt-2 font-display text-[1.45rem] leading-none text-slate-950">{title}</h3>
            {description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
    );
}

function StatCard({
    label,
    value,
    hint,
}: {
    label: string;
    value: string | number;
    hint: string;
}) {
    return (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white/92 p-5 shadow-[0_22px_70px_-48px_rgba(15,23,42,0.28)]">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{label}</p>
            <div className="mt-3 text-[2rem] font-semibold leading-none text-slate-950">{value}</div>
            <p className="mt-3 text-xs leading-5 text-slate-500">{hint}</p>
        </div>
    );
}

function ActionCard({
    icon,
    title,
    desc,
    badge,
    onClick,
}: {
    icon: ReactNode;
    title: string;
    desc: string;
    badge?: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="group flex w-full items-start gap-4 rounded-[1.55rem] border border-slate-200 bg-white/92 p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_80px_-50px_rgba(15,23,42,0.3)] focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100"
        >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-950">{title}</h4>
                    {badge ? (
                        <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700">
                            {badge}
                        </span>
                    ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p>
            </div>
            <ArrowIcon className="mt-1 h-5 w-5 text-slate-300 transition group-hover:text-slate-600" />
        </button>
    );
}

function ModeButton({
    active,
    title,
    desc,
    onClick,
}: {
    active: boolean;
    title: string;
    desc: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex w-full flex-col rounded-[1.35rem] border px-4 py-4 text-left transition duration-200 ${
                active
                    ? 'border-cyan-200 bg-cyan-50 text-slate-950 shadow-[0_18px_50px_-36px_rgba(8,145,178,0.35)]'
                    : 'border-slate-200 bg-white/85 text-slate-700 hover:border-slate-300'
            }`}
        >
            <span className="text-sm font-semibold">{title}</span>
            <span className={`mt-2 text-xs leading-5 ${active ? 'text-slate-600' : 'text-slate-500'}`}>{desc}</span>
        </button>
    );
}

export default function MePage({
    currentUser,
    isDarkMode,
    onToggleDarkMode,
    onShowAuth,
    onLogout,
    onShowAchievements,
    onNavigate,
    streak,
    todayPoints,
}: MePageProps) {
    const { profile, stats, loadProfile, loadStats, updateProfile } = useProfileStore();
    const { unreadCount, loadUnreadCount } = useNotificationStore();
    const { mode, setMode, hydrateFromProfile } = useUIModeStore();
    const { lang } = useI18n();

    const tx = (zh: string, en: string) => (lang === 'zh' ? zh : en);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (currentUser && token) {
            loadProfile(token);
            loadStats(token);
            loadUnreadCount(token);
        }
    }, [currentUser, loadProfile, loadStats, loadUnreadCount]);

    useEffect(() => {
        hydrateFromProfile(profile?.ui_mode);
    }, [profile?.ui_mode, hydrateFromProfile]);

    const handleSwitchMode = async (nextMode: UIMode) => {
        setMode(nextMode);
        const token = localStorage.getItem('token');
        if (token && currentUser) {
            await updateProfile(token, {
                ui_mode: nextMode,
                senior_mode_enabled: nextMode === 'senior',
            });
        }
    };

    if (!currentUser) {
        return (
            <div className="mx-auto w-full max-w-[1120px] px-1 pb-8 pt-1 sm:px-0">
                <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_36%),linear-gradient(180deg,#ffffff_0%,#f8fcff_55%,#f0fdfa_100%)] p-7 shadow-[0_36px_120px_-56px_rgba(15,23,42,0.32)] lg:p-10">
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-700">账号服务</p>
                            <h2 className="mt-4 font-display text-[2.6rem] leading-[0.95] tracking-[-0.04em] text-slate-950 sm:text-[3.2rem]">
                                {tx('登录后同步你的记录与设置。', 'Sign in to sync your records and settings.')}
                            </h2>
                            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                                {tx(
                                    '保存评估记录、趋势回看、课程进度与个性化模式设置，让你的支持体验持续而不是一次性的。',
                                    'Save assessments, trends, programs, and personalization settings so support becomes continuous rather than one-off.'
                                )}
                            </p>
                            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                                <button
                                    onClick={onShowAuth}
                                    className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-slate-950 px-7 py-3 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-slate-900"
                                >
                                    {tx('登录 / 注册', 'Login / Register')}
                                </button>
                                <button
                                    onClick={() => onNavigate('settings')}
                                    className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-slate-300 bg-white/90 px-7 py-3 text-sm font-semibold text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-slate-400"
                                >
                                    {tx('先查看设置', 'Preview settings')}
                                </button>
                            </div>
                        </div>

                        <div className="rounded-[1.9rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_32px_100px_-52px_rgba(15,23,42,0.85)]">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                                    <ShieldIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">登录后可继续使用</p>
                                    <h3 className="mt-2 text-lg font-semibold text-white">{tx('你的记录与模式会被持续保存', 'Your records and modes stay synced')}</h3>
                                </div>
                            </div>
                            <div className="mt-6 grid gap-3">
                                {[
                                    tx('查看评估历史与趋势报告', 'Assessment history and trends'),
                                    tx('同步课程进度与练习完成情况', 'Program progress and practice sync'),
                                    tx('切换标准版 / 老年版并持久保存', 'Persist standard / senior mode'),
                                ].map((item) => (
                                    <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const assessmentsCount = stats?.assessments_total ?? 0;
    const toolCompletions7d = stats?.tool_completions_7d ?? 0;
    const checkinTotal = stats?.checkin_total ?? 0;
    const preferredInputLabel =
        profile?.preferred_input === 'voice'
            ? tx('语音优先', 'Voice first')
            : profile?.preferred_input === 'text'
                ? tx('文字优先', 'Text first')
                : tx('混合模式', 'Mixed mode');

    return (
        <div className="mx-auto w-full max-w-[1520px] px-1 pb-8 pt-1 sm:px-0 lg:pb-10">
            <div className="space-y-6">
                <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(140deg,rgba(15,23,42,0.96),rgba(15,23,42,0.9)),radial-gradient(circle_at_top_left,rgba(34,211,238,0.22),transparent_40%)] p-7 text-white shadow-[0_36px_120px_-56px_rgba(15,23,42,0.9)] lg:p-8">
                    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_380px] xl:items-start">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300">个人中心</p>
                            <div className="mt-6 flex items-center gap-4">
                                <div className="flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-white/10 text-2xl font-semibold shadow-lg shadow-cyan-900/15">
                                    {(currentUser.nickname || currentUser.username || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="font-display text-[2.2rem] leading-none text-white">
                                        {currentUser.nickname || currentUser.username}
                                    </h2>
                                    <p className="mt-2 text-sm text-slate-300">@{currentUser.username}</p>
                                </div>
                            </div>
                            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">
                                {tx(
                                    '这里可以查看账号信息、成长记录和使用偏好。',
                                    'This is where you can review account details, progress, mode switching, and preferences.'
                                )}
                            </p>
                            <div className="mt-6 flex flex-wrap gap-2">
                                {[
                                    preferredInputLabel,
                                    profile?.tts_enabled ? tx('语音播报开启', 'TTS enabled') : tx('语音播报关闭', 'TTS off'),
                                    profile?.high_contrast ? tx('高对比度', 'High contrast') : tx('标准对比度', 'Standard contrast'),
                                ].map((chip) => (
                                    <span key={chip} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200">
                                        {chip}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[1.85rem] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                            <SectionHeader
                                eyebrow={tx('模式与偏好', 'Mode & Preferences')}
                                title={tx('界面模式', 'Interface mode')}
                                description={tx('可在标准版与老年版之间切换，系统会保存你的选择。', 'Switch between standard mode and senior mode, and we will save your choice.')}
                            />
                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                <ModeButton
                                    active={mode === 'standard'}
                                    title={tx('标准版', 'Standard')}
                                    desc={tx('信息更完整，适合日常查看和管理。', 'A fuller layout for daily viewing and management.')}
                                    onClick={() => handleSwitchMode('standard')}
                                />
                                <ModeButton
                                    active={mode === 'senior'}
                                    title={tx('老年版', 'Senior')}
                                    desc={tx('更大字号、更高对比，阅读和操作更轻松。', 'Larger text and stronger contrast for easier reading and interaction.')}
                                    onClick={() => handleSwitchMode('senior')}
                                />
                            </div>
                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                <button
                                    onClick={onToggleDarkMode}
                                    className="flex min-h-[52px] items-center justify-between rounded-[1.35rem] border border-white/10 bg-slate-950/35 px-4 py-3 text-left text-sm text-white transition hover:bg-slate-950/50"
                                >
                                    <span className="flex items-center gap-3">
                                        <MoonSunIcon className="h-5 w-5" dark={isDarkMode} />
                                        {isDarkMode ? tx('当前深色模式', 'Dark mode active') : tx('当前浅色模式', 'Light mode active')}
                                    </span>
                                    <ArrowIcon className="h-4 w-4 text-slate-400" />
                                </button>
                                <button
                                    onClick={() => onNavigate('messages')}
                                    className="flex min-h-[52px] items-center justify-between rounded-[1.35rem] border border-white/10 bg-slate-950/35 px-4 py-3 text-left text-sm text-white transition hover:bg-slate-950/50"
                                >
                                    <span className="flex items-center gap-3">
                                        <BellIcon className="h-5 w-5" />
                                        {tx('消息中心', 'Messages')}
                                    </span>
                                    <span className="rounded-full bg-cyan-400/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-200">
                                        {unreadCount > 0 ? unreadCount : tx('已读', 'Clear')}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label={tx('连续打卡', 'Streak')}
                        value={streak}
                        hint={tx('保持每日记录，趋势更有解释力。', 'Daily logging makes trends more meaningful.')}
                    />
                    <StatCard
                        label={tx('总积分', 'Points')}
                        value={todayPoints}
                        hint={tx('成就系统仍然保留，并可继续叠加。', 'Your achievement system remains fully intact.')}
                    />
                    <StatCard
                        label={tx('本周练习', 'This week')}
                        value={toolCompletions7d}
                        hint={tx('统计近 7 天已完成的工具练习。', 'Counts completed tool practices in the last 7 days.')}
                    />
                    <StatCard
                        label={tx('累计签到', 'Check-ins')}
                        value={checkinTotal}
                        hint={tx('作为状态数据和推荐刷新基础。', 'Used as the basis for status history and recommendations.')}
                    />
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                    <section className="desktop-section">
                        <SectionHeader
                            eyebrow={tx('记录中心', 'Data Center')}
                            title={tx('你的记录与成长', 'Your records & growth')}
                            description={tx('在这里查看消息、成就、评估记录与使用设置。', 'Review messages, achievements, assessments, and settings here.')}
                        />
                        <div className="mt-6 grid gap-4 lg:grid-cols-2">
                            <ActionCard
                                icon={<BellIcon className="h-5 w-5" />}
                                title={tx('消息中心', 'Messages')}
                                desc={unreadCount > 0 ? tx(`你有 ${unreadCount} 条未读消息，适合先集中处理。`, `You have ${unreadCount} unread messages ready to review.`) : tx('查看通知、提醒与互动动态。', 'Review notifications, reminders, and interactions.')}
                                badge={unreadCount > 0 ? `${unreadCount}` : undefined}
                                onClick={() => onNavigate('messages')}
                            />
                            <ActionCard
                                icon={<ChartIcon className="h-5 w-5" />}
                                title={tx('评估报告', 'Assessments')}
                                desc={tx(`已完成 ${assessmentsCount} 次评估，可继续查看趋势与报告。`, `${assessmentsCount} assessments completed. Open trends and reports.`)}
                                onClick={() => onNavigate('trend')}
                            />
                            <ActionCard
                                icon={<PencilIcon className="h-5 w-5" />}
                                title={tx('心情日记', 'Mood Journal')}
                                desc={tx('记录今天的想法、波动与触发点，作为长期回看素材。', 'Capture thoughts, shifts, and triggers for long-term reflection.')}
                                onClick={() => onNavigate('journal')}
                            />
                            <ActionCard
                                icon={<TrophyIcon className="h-5 w-5" />}
                                title={tx('我的成就', 'Achievements')}
                                desc={tx('查看累计积分与成长徽章，延续已有的激励链路。', 'View points and badges while keeping the existing gamification flow intact.')}
                                onClick={onShowAchievements}
                            />
                        </div>
                    </section>

                    <div className="space-y-6">
                        <section className="desktop-section">
                            <SectionHeader
                                eyebrow={tx('社区服务', 'Community')}
                                title={tx('互动与支持', 'Interaction & support')}
                                description={tx('在这里进入社区互动、外观切换和更多设置。', 'Access community, appearance settings, and more controls here.')}
                            />
                            <div className="mt-6 space-y-4">
                                <ActionCard
                                    icon={<UsersIcon className="h-5 w-5" />}
                                    title={tx('温暖社区', 'Community')}
                                    desc={tx('与同伴互相鼓励支持，继续使用原有社区与私信入口。', 'Support one another using the existing community and messaging flows.')}
                                    onClick={() => onNavigate('community')}
                                />
                                <ActionCard
                                    icon={<MoonSunIcon className="h-5 w-5" dark={isDarkMode} />}
                                    title={tx('外观模式', 'Appearance')}
                                    desc={isDarkMode ? tx('当前为深色模式，点击可切换。', 'Dark mode is active. Tap to switch.') : tx('当前为浅色模式，点击可切换。', 'Light mode is active. Tap to switch.')}
                                    onClick={onToggleDarkMode}
                                />
                                <ActionCard
                                    icon={<SettingsIcon className="h-5 w-5" />}
                                    title={tx('更多设置', 'More settings')}
                                    desc={tx('提醒、语言、数据导出与其他平台级偏好。', 'Reminders, language, data export, and other platform preferences.')}
                                    onClick={() => onNavigate('settings')}
                                />
                            </div>
                        </section>

                        <section className="desktop-section">
                            <SectionHeader
                                eyebrow={tx('系统信息', 'System Notes')}
                                title={tx('当前资料摘要', 'Current profile summary')}
                                description={tx('这些设置会影响你的日常使用体验与辅助功能。', 'These settings affect your daily experience and accessibility support.')}
                            />
                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/85 p-4">
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{tx('提醒频率', 'Reminder')}</div>
                                    <div className="mt-2 text-sm font-semibold text-slate-950">{profile?.reminder_freq || tx('未设置', 'Unset')}</div>
                                </div>
                                <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/85 p-4">
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{tx('输入偏好', 'Input')}</div>
                                    <div className="mt-2 text-sm font-semibold text-slate-950">{preferredInputLabel}</div>
                                </div>
                                <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/85 p-4">
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{tx('字体缩放', 'Font scale')}</div>
                                    <div className="mt-2 text-sm font-semibold text-slate-950">{profile?.font_scale ?? 1.0}x</div>
                                </div>
                                <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/85 p-4">
                                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{tx('当前模式', 'Current mode')}</div>
                                    <div className="mt-2 text-sm font-semibold text-slate-950">{mode === 'senior' ? tx('老年版', 'Senior') : tx('标准版', 'Standard')}</div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                <button
                    onClick={onLogout}
                    className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-rose-200 bg-white px-6 py-3 text-sm font-semibold text-rose-600 transition duration-200 hover:-translate-y-0.5 hover:bg-rose-50"
                >
                    {tx('退出登录', 'Logout')}
                </button>

                <div className="pb-4 text-center text-xs leading-6 text-slate-500">
                    <p>NeuraSense · By MaRunqi</p>
                    <p>{tx('本平台仅供参考，不能替代专业医疗诊断。', 'For reference only, not a substitute for professional diagnosis.')}</p>
                </div>
            </div>
        </div>
    );
}
