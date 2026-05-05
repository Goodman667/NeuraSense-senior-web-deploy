import { useEffect, useState } from 'react';
import { useNotificationStore, type Notification } from '../store/useNotificationStore';
import { useI18n } from '../i18n';

interface MessageCenterPageProps {
    onBack: () => void;
    authToken?: string | null;
}

// 类型 → 图标/颜色映射
const TYPE_CONFIG: Record<string, { icon: string; color: string; darkColor: string }> = {
    system:      { icon: '📢', color: 'bg-blue-50',   darkColor: 'dark:bg-blue-900/30' },
    jitai:       { icon: '🎯', color: 'bg-purple-50', darkColor: 'dark:bg-purple-900/30' },
    achievement: { icon: '🏆', color: 'bg-yellow-50', darkColor: 'dark:bg-yellow-900/30' },
    community:   { icon: '💜', color: 'bg-pink-50',   darkColor: 'dark:bg-pink-900/30' },
    reminder:    { icon: '⏰', color: 'bg-green-50',  darkColor: 'dark:bg-green-900/30' },
    tool:        { icon: '🧘', color: 'bg-teal-50',   darkColor: 'dark:bg-teal-900/30' },
    program:     { icon: '📖', color: 'bg-amber-50',  darkColor: 'dark:bg-amber-900/30' },
};

const FILTER_OPTIONS = [
    { value: 'all', label_zh: '全部', label_en: 'All' },
    { value: 'unread', label_zh: '未读', label_en: 'Unread' },
    { value: 'tool', label_zh: '练习', label_en: 'Tools' },
    { value: 'program', label_zh: '课程', label_en: 'Programs' },
    { value: 'achievement', label_zh: '成就', label_en: 'Achievements' },
];

function timeAgo(dateStr: string, lang: 'zh' | 'en'): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return lang === 'zh' ? '刚刚' : 'Just now';
    if (minutes < 60) return lang === 'zh' ? `${minutes} 分钟前` : `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return lang === 'zh' ? `${hours} 小时前` : `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return lang === 'zh' ? `${days} 天前` : `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

export default function MessageCenterPage({ onBack, authToken }: MessageCenterPageProps) {
    const { lang } = useI18n();
    const { notifications, unreadCount, isLoading, loadNotifications, markRead, markAllRead } = useNotificationStore();
    const [filter, setFilter] = useState('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (authToken) {
            loadNotifications(authToken, filter === 'unread');
        }
    }, [authToken, filter, loadNotifications]);

    const filtered = filter === 'all' || filter === 'unread'
        ? notifications
        : notifications.filter(n => n.type === filter);

    const handleTap = (n: Notification) => {
        if (!n.read && authToken) {
            markRead(authToken, n.id);
        }
        setExpandedId(expandedId === n.id ? null : n.id);
    };

    return (
        <div className="space-y-4 animate-fadeIn">
            {/* 顶栏 */}
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-warm-100 dark:hover:bg-gray-700 transition-colors">
                        <svg className="w-5 h-5 text-warm-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 className="text-xl font-bold text-warm-800 dark:text-gray-100">
                        {lang === 'zh' ? '消息中心' : 'Messages'}
                    </h2>
                    {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </div>
                {unreadCount > 0 && authToken && (
                    <button
                        onClick={() => markAllRead(authToken)}
                        className="text-sm text-primary-500 dark:text-primary-400 hover:underline"
                    >
                        {lang === 'zh' ? '全部已读' : 'Read all'}
                    </button>
                )}
            </div>

            {/* 筛选 */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {FILTER_OPTIONS.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => setFilter(opt.value)}
                        className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap border transition-colors ${
                            filter === opt.value
                                ? 'bg-primary-500 text-white border-primary-500'
                                : 'border-warm-200 dark:border-gray-600 text-warm-600 dark:text-gray-300 hover:bg-warm-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        {lang === 'zh' ? opt.label_zh : opt.label_en}
                    </button>
                ))}
            </div>

            {/* 列表 */}
            {isLoading ? (
                <div className="text-center py-12 text-warm-400 dark:text-gray-500">
                    {lang === 'zh' ? '加载中...' : 'Loading...'}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-warm-400 dark:text-gray-500">
                        {lang === 'zh' ? '暂无消息' : 'No messages'}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(n => {
                        const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
                        const isExpanded = expandedId === n.id;
                        return (
                            <button
                                key={n.id}
                                onClick={() => handleTap(n)}
                                className={`w-full text-left rounded-2xl border transition-all ${
                                    n.read
                                        ? 'bg-white/60 dark:bg-gray-800/60 border-warm-200/30 dark:border-gray-700/30'
                                        : 'bg-white dark:bg-gray-800 border-warm-200/50 dark:border-gray-700/50 shadow-sm'
                                }`}
                            >
                                <div className="flex items-start gap-3 p-4">
                                    <div className={`w-10 h-10 ${cfg.color} ${cfg.darkColor} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                        <span className="text-lg">{cfg.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            {!n.read && (
                                                <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                                            )}
                                            <span className={`font-medium truncate ${n.read ? 'text-warm-600 dark:text-gray-400' : 'text-warm-800 dark:text-gray-100'}`}>
                                                {n.title}
                                            </span>
                                        </div>
                                        <p className={`text-xs mt-1 ${n.read ? 'text-warm-400 dark:text-gray-500' : 'text-warm-500 dark:text-gray-400'} ${isExpanded ? '' : 'line-clamp-2'}`}>
                                            {n.content}
                                        </p>
                                        <span className="text-[11px] text-warm-300 dark:text-gray-600 mt-1 block">
                                            {timeAgo(n.created_at, lang)}
                                        </span>
                                    </div>
                                    <svg className={`w-4 h-4 text-warm-300 dark:text-gray-600 flex-shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
