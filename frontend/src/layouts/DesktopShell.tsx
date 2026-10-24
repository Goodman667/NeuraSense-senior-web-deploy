import type { ReactNode } from 'react';
import type { TabId } from './TabBar';
import { standardAssets } from '../lib/standardAssets';

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
    /** Show the page title row (every page except the Today home). */
    showPageHeader?: boolean;
    /** Back to the previous page; shown in the page title row. */
    onBack?: () => void;
    /** Log out; shown in the top bar when someone is signed in. */
    onLogout?: () => void;
    children: ReactNode;
}

const navItems: Array<{ id: TabId; label: string }> = [
    { id: 'today', label: '今日' },
    { id: 'chat', label: 'AI 陪伴' },
    { id: 'toolbox', label: '工具箱' },
    { id: 'programs', label: '课程计划' },
    { id: 'me', label: '个人中心' },
];

// Nexar-style brand mark: a black rounded square holding four dots.
function BrandMark() {
    return (
        <span className="grid h-7 w-7 grid-cols-2 place-items-center gap-[3px] rounded-md bg-black p-[6px]" aria-hidden="true">
            <span className="h-[5px] w-[5px] rounded-full bg-white" />
            <span className="h-[5px] w-[5px] rounded-full bg-white" />
            <span className="h-[5px] w-[5px] rounded-full bg-white" />
            <span className="h-[5px] w-[5px] rounded-full bg-white" />
        </span>
    );
}

const IconBell = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M12 2.5a6 6 0 0 0-6 6v3.6l-1.6 3.2A1 1 0 0 0 5.3 17h13.4a1 1 0 0 0 .9-1.7L18 12.1V8.5a6 6 0 0 0-6-6Zm-2.6 16a2.7 2.7 0 0 0 5.2 0H9.4Z" />
    </svg>
);

const IconBack = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" />
    </svg>
);

const IconLogout = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
        <path d="M10 17l-5-5 5-5" />
        <path d="M5 12h11" />
    </svg>
);

const IconSettings = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
);

export default function DesktopShell({
    activeTab,
    pageTitle,
    pageDescription,
    currentUser,
    onTabChange,
    onOpenCommunity,
    onOpenMessages,
    onOpenSettings,
    onSwitchToSenior,
    showPageHeader,
    onBack,
    onLogout,
    children,
}: DesktopShellProps) {
    const isLoggedIn = !!(currentUser?.username || currentUser?.nickname);
    const confirmLogout = () => {
        if (onLogout && window.confirm('确定要退出登录吗？')) onLogout();
    };

    return (
        <>
            {/* Nexar: fullscreen looping sky video behind every standard page */}
            <div className="pointer-events-none fixed inset-0 z-0 bg-[#cfe3f5]" aria-hidden="true">
                <video
                    className="h-full w-full object-cover motion-reduce:hidden"
                    autoPlay
                    loop
                    muted
                    playsInline
                    poster={standardAssets.skyPoster}
                >
                    <source src={standardAssets.skyVideo} type="video/mp4" />
                </video>
                <div className="absolute inset-0 hidden bg-slate-950/55 dark:block" />
            </div>

            <div className="nexar-light relative z-10 flex min-h-screen flex-1 flex-col">
                <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6 lg:px-8">
                    <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4 rounded-full bg-white px-4 py-2 shadow-sm sm:px-6 sm:py-3">
                        <button onClick={() => onTabChange('today')} className="flex items-center gap-2.5" aria-label="回到今日">
                            <BrandMark />
                            <span className="font-display-cn whitespace-nowrap text-2xl leading-none text-black sm:text-[1.7rem]">NeuraSense</span>
                        </button>

                        <nav className="hidden items-center gap-1 lg:flex" aria-label="主导航">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onTabChange(item.id)}
                                    aria-current={activeTab === item.id ? 'page' : undefined}
                                    className={`whitespace-nowrap rounded-full px-3 py-2 text-[15px] transition-colors xl:px-4 ${activeTab === item.id ? 'font-medium text-black' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                            <button onClick={onOpenCommunity} className="hidden whitespace-nowrap rounded-full px-3 py-2 text-[15px] text-gray-500 transition-colors hover:text-gray-900 lg:block xl:px-4">社区</button>
                        </nav>

                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="hidden items-center rounded-full bg-gray-100 p-1 sm:flex" role="group" aria-label="界面模式">
                                <span className="whitespace-nowrap rounded-full bg-black px-4 py-1.5 text-sm text-white">标准</span>
                                <button
                                    onClick={onSwitchToSenior}
                                    disabled={!onSwitchToSenior}
                                    className="whitespace-nowrap rounded-full px-4 py-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
                                >
                                    关怀
                                </button>
                            </div>
                            <button onClick={onOpenSettings} className="hidden h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-800 transition hover:bg-gray-200 sm:flex" aria-label="设置">
                                <IconSettings />
                            </button>
                            <button onClick={onOpenMessages} className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition hover:bg-gray-800" aria-label="消息中心">
                                <IconBell />
                            </button>
                            {isLoggedIn && onLogout ? (
                                <button
                                    onClick={confirmLogout}
                                    className="flex h-9 items-center gap-1.5 rounded-full border border-black/15 px-3 text-sm text-gray-700 transition hover:border-black/40 hover:text-black"
                                    aria-label="退出登录"
                                    title="退出登录"
                                >
                                    <IconLogout />
                                    <span className="hidden whitespace-nowrap sm:inline">退出登录</span>
                                </button>
                            ) : null}
                        </div>
                    </div>
                </header>

                {showPageHeader ? (
                    <>
                        <div className="mx-auto hidden w-full max-w-[1800px] px-4 pt-6 sm:px-6 lg:block lg:px-8">
                            <div className="flex items-end justify-between gap-6 border-b border-black/10 pb-5">
                                <div className="flex items-center gap-4">
                                    {onBack ? (
                                        <button
                                            onClick={onBack}
                                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black/15 bg-white text-gray-800 transition hover:border-black/40"
                                            aria-label="返回上一页"
                                            title="返回上一页"
                                        >
                                            <IconBack />
                                        </button>
                                    ) : null}
                                    <h1 className="font-display-cn text-[40px] leading-none text-black">{pageTitle}</h1>
                                </div>
                                {pageDescription ? <p className="max-w-xl pb-1 text-right text-[15px] leading-6 text-black/60">{pageDescription}</p> : null}
                            </div>
                        </div>
                        <div className="mx-auto flex w-full items-center gap-3 px-4 pt-4 sm:px-6 lg:hidden">
                            {onBack ? (
                                <button
                                    onClick={onBack}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/15 bg-white text-gray-800"
                                    aria-label="返回上一页"
                                >
                                    <IconBack />
                                </button>
                            ) : null}
                            <h1 className="font-display-cn truncate text-[26px] leading-none text-black">{pageTitle}</h1>
                        </div>
                    </>
                ) : null}

                {children}
            </div>
        </>
    );
}
