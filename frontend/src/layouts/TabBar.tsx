import type { ReactElement } from 'react';
import { motion } from 'framer-motion';

export type TabId = 'today' | 'chat' | 'toolbox' | 'programs' | 'me';

interface TabItem {
    id: TabId;
    label: string;
    icon: (active: boolean) => ReactElement;
}

const tabs: TabItem[] = [
    {
        id: 'today',
        label: '今日',
        icon: (active) => (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
        ),
    },
    {
        id: 'chat',
        label: '聊愈',
        icon: (active) => (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
        ),
    },
    {
        id: 'toolbox',
        label: '工具箱',
        icon: (active) => (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
        ),
    },
    {
        id: 'programs',
        label: '课程',
        icon: (active) => (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                <line x1="8" y1="7" x2="16" y2="7" />
                <line x1="8" y1="11" x2="13" y2="11" />
            </svg>
        ),
    },
    {
        id: 'me',
        label: '我的',
        icon: (active) => (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
            </svg>
        ),
    },
];

interface TabBarProps {
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
}

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50">
            {/* 毛玻璃背景 */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-warm-200/60 dark:border-gray-700/60 shadow-[0_-2px_20px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-around max-w-lg mx-auto px-2">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <motion.button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                whileTap={{ scale: 0.88 }}
                                className={`relative flex flex-col items-center justify-center py-2 pt-3 flex-1 transition-colors duration-200 ${
                                    isActive ? 'text-primary-600 dark:text-primary-400' : 'text-warm-400 dark:text-gray-500'
                                }`}
                            >
                                {/* 激活指示器 */}
                                {isActive && (
                                    <motion.div
                                        layoutId="tab-indicator"
                                        className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-gradient-to-r from-primary-400 to-accent-400"
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}

                                <motion.div
                                    animate={isActive ? { y: -1 } : { y: 0 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                >
                                    {tab.icon(isActive)}
                                </motion.div>

                                <span className={`text-[11px] mt-1 leading-none font-medium ${
                                    isActive ? 'text-primary-600 dark:text-primary-400' : 'text-warm-400 dark:text-gray-500'
                                }`}>
                                    {tab.label}
                                </span>
                            </motion.button>
                        );
                    })}
                </div>
                {/* iOS 安全区域填充 */}
                <div className="h-[env(safe-area-inset-bottom,0px)]" />
            </div>
        </nav>
    );
}
