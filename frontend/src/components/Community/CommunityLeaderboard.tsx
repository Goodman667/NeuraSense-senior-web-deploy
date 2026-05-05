/**
 * CommunityLeaderboard Component
 * 
 * Displays ranking of community members by points and activity
 */

import { useState, useEffect } from 'react';

interface LeaderboardEntry {
    rank: number;
    nickname: string;
    avatar?: string;
    points: number;
    streak: number;
    posts: number;
}

// Mock data - in production this would come from API
const MOCK_LEADERBOARD: LeaderboardEntry[] = [
    { rank: 1, nickname: '正能量小太阳', points: 2850, streak: 45, posts: 28, avatar: '🌟' },
    { rank: 2, nickname: '心灵守护者', points: 2340, streak: 32, posts: 35, avatar: '💜' },
    { rank: 3, nickname: '微笑面对', points: 1980, streak: 28, posts: 22, avatar: '😊' },
    { rank: 4, nickname: '每天进步', points: 1720, streak: 21, posts: 18, avatar: '📈' },
    { rank: 5, nickname: '温暖如你', points: 1560, streak: 18, posts: 15, avatar: '🌸' },
    { rank: 6, nickname: '阳光心情', points: 1340, streak: 15, posts: 12, avatar: '☀️' },
    { rank: 7, nickname: '勇敢前行', points: 1180, streak: 12, posts: 10, avatar: '💪' },
    { rank: 8, nickname: '心有阳光', points: 920, streak: 9, posts: 8, avatar: '🌻' },
];

interface CommunityLeaderboardProps {
    onClose?: () => void;
}

export const CommunityLeaderboard = ({ onClose }: CommunityLeaderboardProps) => {
    const [activeTab, setActiveTab] = useState<'points' | 'streak' | 'posts'>('points');
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(MOCK_LEADERBOARD);

    // Sort by selected metric
    useEffect(() => {
        const sorted = [...MOCK_LEADERBOARD].sort((a, b) => {
            if (activeTab === 'points') return b.points - a.points;
            if (activeTab === 'streak') return b.streak - a.streak;
            return b.posts - a.posts;
        }).map((entry, idx) => ({ ...entry, rank: idx + 1 }));
        setLeaderboard(sorted);
    }, [activeTab]);

    const getRankStyle = (rank: number) => {
        if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white';
        if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400 text-white';
        if (rank === 3) return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
        return 'bg-warm-100 text-warm-600';
    };

    const getRankIcon = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `${rank}`;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-accent-500 p-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            🏆 社区排行榜
                        </h2>
                        <p className="text-white/80 text-sm mt-1">
                            看看谁是最活跃的正能量传播者！
                        </p>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-warm-200 dark:border-gray-700">
                {[
                    { key: 'points', label: '积分榜', icon: '⭐' },
                    { key: 'streak', label: '连续签到', icon: '🔥' },
                    { key: 'posts', label: '发帖数', icon: '📝' },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${activeTab === tab.key
                                ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'text-warm-500 hover:text-warm-700 dark:text-gray-400'
                            }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Leaderboard List */}
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {leaderboard.map((entry) => (
                    <div
                        key={entry.rank}
                        className={`flex items-center p-4 rounded-xl transition-all hover:scale-[1.02] ${entry.rank <= 3
                                ? 'bg-gradient-to-r from-warm-50 to-primary-50 dark:from-gray-700 dark:to-gray-600'
                                : 'bg-warm-50 dark:bg-gray-700'
                            }`}
                    >
                        {/* Rank Badge */}
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${getRankStyle(entry.rank)}`}
                        >
                            {getRankIcon(entry.rank)}
                        </div>

                        {/* Avatar */}
                        <div className="w-12 h-12 ml-3 bg-gradient-to-br from-primary-100 to-accent-100 rounded-full flex items-center justify-center text-2xl">
                            {entry.avatar}
                        </div>

                        {/* Info */}
                        <div className="ml-4 flex-1">
                            <h3 className="font-semibold text-warm-800 dark:text-white">
                                {entry.nickname}
                            </h3>
                            <div className="flex gap-4 text-xs text-warm-500 dark:text-gray-400 mt-1">
                                <span>🔥 {entry.streak}天</span>
                                <span>📝 {entry.posts}帖</span>
                            </div>
                        </div>

                        {/* Score */}
                        <div className="text-right">
                            <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
                                {activeTab === 'points' && `${entry.points}`}
                                {activeTab === 'streak' && `${entry.streak}天`}
                                {activeTab === 'posts' && `${entry.posts}篇`}
                            </div>
                            <div className="text-xs text-warm-400 dark:text-gray-500">
                                {activeTab === 'points' && '积分'}
                                {activeTab === 'streak' && '连续签到'}
                                {activeTab === 'posts' && '发帖'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* My Ranking */}
            <div className="p-4 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-gray-700 dark:to-gray-600 border-t border-warm-200 dark:border-gray-600">
                <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
                        42
                    </div>
                    <div className="w-12 h-12 ml-3 bg-gradient-to-br from-primary-200 to-accent-200 rounded-full flex items-center justify-center text-2xl">
                        😊
                    </div>
                    <div className="ml-4 flex-1">
                        <h3 className="font-semibold text-warm-800 dark:text-white">我的排名</h3>
                        <div className="text-xs text-warm-500 dark:text-gray-400 mt-1">
                            距离上一名还差 85 积分，继续加油！
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-bold text-primary-600 dark:text-primary-400">320</div>
                        <div className="text-xs text-warm-400 dark:text-gray-500">积分</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommunityLeaderboard;
