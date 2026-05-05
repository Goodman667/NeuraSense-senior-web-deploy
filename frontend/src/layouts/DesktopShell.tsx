import type { ReactNode } from 'react';
import type { TabId } from './TabBar';

interface DesktopShellProps {
    activeTab: TabId;
    pageTitle: string;
    pageDescription?: string;
    uiMode?: 'standard' | 'senior';
    currentUser?: {
        username?: string;
        nickname?: string;
    } | null;
    onTabChange: (tab: TabId) => void;
    onOpenCommunity: () => void;
    onOpenMessages: () => void;
    onOpenSettings: () => void;
    onSwitchToSenior?: () => void;
    onSwitchToStandard?: () => void;
    children: ReactNode;
}

interface NavItem {
    id: TabId;
    label: string;
    description: string;
    icon: ReactNode;
}

interface UtilityItem {
    id: 'community' | 'messages' | 'settings';
    label: string;
    description: string;
    icon: ReactNode;
    onClick: () => void;
}

const IconHome = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5.25 9.75V21h13.5V9.75" />
        <path d="M9.75 21v-6h4.5v6" />
    </svg>
);

const IconChat = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M8 10h8" />
        <path d="M8 14h5" />
        <path d="M6 19.5A3.5 3.5 0 0 1 2.5 16V8A3.5 3.5 0 0 1 6 4.5h12A3.5 3.5 0 0 1 21.5 8v8a3.5 3.5 0 0 1-3.5 3.5H6Z" />
    </svg>
);

const IconGrid = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
);

const IconBook = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M5 4.5h11.5A2.5 2.5 0 0 1 19 7v12.5H7.5A2.5 2.5 0 0 0 5 22V4.5Z" />
        <path d="M5 19.5A2.5 2.5 0 0 1 7.5 17H19" />
        <path d="M9 8h6" />
        <path d="M9 12h5" />
    </svg>
);

const IconUser = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
);

const IconCommunity = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="8" cy="9" r="3" />
        <circle cx="16" cy="10.5" r="2.5" />
        <path d="M3.5 19a4.5 4.5 0 0 1 9 0" />
        <path d="M13 18.5a3.5 3.5 0 0 1 7 0" />
    </svg>
);

const IconBell = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M6.5 16.5h11" />
        <path d="M8 16.5V10a4 4 0 1 1 8 0v6.5" />
        <path d="m5 16.5 1.5 2.5h11L19 16.5" />
        <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
);

const IconSettings = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .29 1.7 1.7 0 0 0-.8 1.46V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.4 19.4a1.7 1.7 0 0 0-1-.29 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.29-1 1.7 1.7 0 0 0-1.46-.8H2.8a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.4a1.7 1.7 0 0 0 .29-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6c.3 0 .69-.1 1-.29.49-.3.8-.84.8-1.46V2.8a2 2 0 1 1 4 0v.09c0 .62.31 1.16.8 1.46.31.19.7.29 1 .29a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c0 .3.1.69.29 1 .3.49.84.8 1.46.8h.09a2 2 0 1 1 0 4h-.09c-.62 0-1.16.31-1.46.8-.19.31-.29.7-.29 1Z" />
    </svg>
);

const IconCare = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M20.5 8.8c0 6.2-8.5 10.7-8.5 10.7S3.5 15 3.5 8.8A4.7 4.7 0 0 1 12 6a4.7 4.7 0 0 1 8.5 2.8Z" />
        <path d="M8.5 10.5h7" />
    </svg>
);

const navItems: NavItem[] = [
    { id: 'today', label: '今日概览', description: '查看状态、推荐与任务', icon: <IconHome /> },
    { id: 'chat', label: 'AI陪伴', description: '情绪支持与日常对话', icon: <IconChat /> },
    { id: 'toolbox', label: '工具箱', description: '练习与评估入口', icon: <IconGrid /> },
    { id: 'programs', label: '课程计划', description: '课程进度与每日任务', icon: <IconBook /> },
    { id: 'me', label: '个人中心', description: '账号与个性设置', icon: <IconUser /> },
];

function SidebarButton({
    active,
    label,
    description,
    icon,
    onClick,
}: {
    active?: boolean;
    label: string;
    description: string;
    icon: ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`group flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/70 ${
                active
                    ? 'border-cyan-200 bg-cyan-50 text-cyan-950 shadow-[0_18px_60px_-36px_rgba(8,145,178,0.45)]'
                    : 'border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white'
            }`}
        >
            <span
                className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
                    active ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white'
                }`}
            >
                {icon}
            </span>
            <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold tracking-[0.01em] ${active ? 'text-slate-950' : 'text-slate-800'}`}>
                    {label}
                </span>
                <span className={`mt-1 block text-xs leading-5 ${active ? 'text-slate-600' : 'text-slate-500'}`}>
                    {description}
                </span>
            </span>
        </button>
    );
}

export default function DesktopShell({
    activeTab,
    pageTitle,
    pageDescription,
    uiMode = 'standard',
    currentUser,
    onTabChange,
    onOpenCommunity,
    onOpenMessages,
    onOpenSettings,
    onSwitchToSenior,
    onSwitchToStandard,
    children,
}: DesktopShellProps) {
    const utilityItems: UtilityItem[] = [
        {
            id: 'community',
            label: '社区',
            description: '动态、私信与排行榜',
            icon: <IconCommunity />,
            onClick: onOpenCommunity,
        },
        {
            id: 'messages',
            label: '消息',
            description: '通知与互动提醒',
            icon: <IconBell />,
            onClick: onOpenMessages,
        },
        {
            id: 'settings',
            label: '设置',
            description: '主题、导出与个性化偏好',
            icon: <IconSettings />,
            onClick: onOpenSettings,
        },
    ];

    const displayName = currentUser?.nickname || currentUser?.username || '访客';
    const displayHandle = currentUser?.username ? `@${currentUser.username}` : '登录后同步数据';

    if (uiMode === 'senior') {
        return (
            <>
                <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17.5rem] p-5 lg:block">
                    <div className="flex h-full flex-col rounded-lg border border-cyan-100 bg-white/92 p-5 shadow-[0_30px_100px_-54px_rgba(15,23,42,0.32)] backdrop-blur-xl">
                        <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-5">
                            <p className="text-sm font-bold tracking-[0.12em] text-cyan-800">NEURASENSE</p>
                            <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-950">关怀模式</h1>
                            <p className="mt-4 text-lg leading-8 text-slate-600">陪您问候、放松和获得支持。</p>
                        </div>

                        <nav className="mt-6 space-y-3">
                            <SidebarButton
                                active={activeTab !== 'chat'}
                                label="今日陪伴"
                                description="问候、练习和帮助"
                                icon={<IconHome />}
                                onClick={() => onTabChange('today')}
                            />
                            <SidebarButton
                                active={activeTab === 'chat'}
                                label="和小心说说"
                                description="说话或打字都可以"
                                icon={<IconChat />}
                                onClick={() => onTabChange('chat')}
                            />
                            <SidebarButton
                                label="设置"
                                description="调整模式和偏好"
                                icon={<IconSettings />}
                                onClick={onOpenSettings}
                            />
                        </nav>

                        <div className="mt-auto space-y-3">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                <p className="text-lg font-bold text-slate-950">{displayName}</p>
                                <p className="mt-1 text-sm text-slate-500">{displayHandle}</p>
                            </div>
                            {onSwitchToStandard ? (
                                <button
                                    onClick={onSwitchToStandard}
                                    className="min-h-[58px] w-full rounded-lg border border-slate-300 bg-white px-4 text-lg font-bold text-slate-700 transition hover:border-cyan-700 hover:text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200"
                                >
                                    使用完整功能
                                </button>
                            ) : null}
                        </div>
                    </div>
                </aside>

                <div className="flex min-h-screen flex-1 flex-col lg:pl-[18.5rem]">
                    <header className="sticky top-0 z-20 hidden border-b border-cyan-100 bg-[rgba(248,252,252,0.9)] px-8 py-5 backdrop-blur-2xl lg:block">
                        <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between gap-6">
                            <div className="min-w-0">
                                <p className="text-sm font-bold tracking-[0.14em] text-cyan-800">NeuraSense 关怀模式</p>
                                <h2 className="mt-2 text-4xl font-bold leading-tight text-slate-950">{pageTitle}</h2>
                                {pageDescription ? (
                                    <p className="mt-2 max-w-3xl text-lg leading-8 text-slate-600">{pageDescription}</p>
                                ) : null}
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => onTabChange('chat')}
                                    className="min-h-[58px] rounded-lg border border-slate-300 bg-white px-5 text-lg font-bold text-slate-700 transition hover:border-cyan-700 hover:text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200"
                                >
                                    和小心说说
                                </button>
                                <button
                                    onClick={onOpenSettings}
                                    className="min-h-[58px] rounded-lg bg-slate-950 px-5 text-lg font-bold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200"
                                >
                                    设置
                                </button>
                            </div>
                        </div>
                    </header>

                    {children}
                </div>
            </>
        );
    }

    return (
        <>
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-[19rem] p-5 lg:block">
                <div className="flex h-full flex-col rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_32px_120px_-48px_rgba(15,23,42,0.35)] backdrop-blur-xl">
                    <div className="rounded-[1.75rem] border border-cyan-100 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_55%),linear-gradient(160deg,#ffffff_0%,#f4fbff_55%,#f0fdfa_100%)] p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-cyan-900/10">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                                    <path d="M12 21c4.97 0 9-4.03 9-9S16.97 3 12 3 3 7.03 3 12s4.03 9 9 9Z" />
                                    <path d="M8 13c1.1-1.33 2.43-2 4-2 1.57 0 2.9.67 4 2" />
                                    <path d="M9 9.5h.01" />
                                    <path d="M15 9.5h.01" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-700">NeuraSense</p>
                                <h1 className="font-display text-xl text-slate-950">{uiMode === 'senior' ? '高可读关怀版' : '心理健康支持平台'}</h1>
                            </div>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-slate-600">
                            {uiMode === 'senior'
                                ? '提供更清晰的文字、更简洁的操作与更高可读性。'
                                : '提供评估、陪伴、练习与成长记录。'}
                        </p>
                    </div>

                    <div className="mt-6">
                        <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">主导航</p>
                        <nav className="mt-3 space-y-2">
                            {navItems.map((item) => (
                                <SidebarButton
                                    key={item.id}
                                    active={activeTab === item.id}
                                    label={item.label}
                                    description={item.description}
                                    icon={item.icon}
                                    onClick={() => onTabChange(item.id)}
                                />
                            ))}
                        </nav>
                    </div>

                    <div className="mt-6">
                        <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">服务</p>
                        <div className="mt-3 space-y-2">
                            {onSwitchToSenior ? (
                                <SidebarButton
                                    label="关怀模式"
                                    description="更大按钮，一步一步使用"
                                    icon={<IconCare />}
                                    onClick={onSwitchToSenior}
                                />
                            ) : null}
                            {utilityItems.map((item) => (
                                <SidebarButton
                                    key={item.id}
                                    label={item.label}
                                    description={item.description}
                                    icon={item.icon}
                                    onClick={item.onClick}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="mt-auto rounded-[1.75rem] border border-slate-200 bg-slate-950 p-4 text-white shadow-[0_28px_90px_-46px_rgba(15,23,42,0.75)]">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold">
                                {displayName.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{displayName}</p>
                                <p className="truncate text-xs text-slate-400">{displayHandle}</p>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
                            <button
                                onClick={onSwitchToSenior}
                                disabled={!onSwitchToSenior}
                                className="rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-cyan-300/60 hover:bg-cyan-300/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/30 disabled:cursor-default"
                            >
                                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">模式</div>
                                <div className="mt-1 font-semibold text-white">标准 · 可切关怀</div>
                            </button>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">账号</div>
                                <div className="mt-1 font-semibold text-white">{currentUser ? '已登录' : '未登录'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            <div className="flex min-h-screen flex-1 flex-col lg:pl-[20rem]">
                <header className="sticky top-0 z-20 hidden border-b border-white/70 bg-[rgba(248,252,252,0.82)] px-8 py-5 backdrop-blur-2xl lg:block">
                    <div className="mx-auto flex w-full max-w-[1520px] items-center justify-between gap-6">
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-700">NeuraSense</p>
                            <h2 className="mt-2 font-display text-[2rem] leading-none text-slate-950">{pageTitle}</h2>
                            {pageDescription ? (
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{pageDescription}</p>
                            ) : null}
                        </div>

                        <div className="flex items-center gap-3">
                            {onSwitchToSenior ? (
                                <button
                                    onClick={onSwitchToSenior}
                                    className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-900 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-100 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/70"
                                >
                                    进入关怀模式
                                </button>
                            ) : null}
                            <button
                                onClick={onOpenMessages}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/70"
                            >
                                消息中心
                            </button>
                            <button
                                onClick={onOpenSettings}
                                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/70"
                            >
                                打开设置
                            </button>
                        </div>
                    </div>
                </header>

                {children}
            </div>
        </>
    );
}
