/**
 * Mental Health Dashboard Component
 * 
 * Provides an overview of the user's mental health status including:
 * - Recent assessment scores
 * - Trend indicators
 * - Quick actions
 * - Daily mood tracking
 */

import { useState, useEffect } from 'react';
import { API_BASE } from '../../config/api';

interface DashboardProps {
    onStartAssessment?: () => void;
    onStartChat?: () => void;
    userName?: string;
}

interface RecentScore {
    scale_type: string;
    total_score: number;
    severity: string;
    created_at: string;
}

const SCALE_INFO: Record<string, { name: string; maxScore: number; icon: string; color: string }> = {
    phq9: { name: 'PHQ-9 抑郁', maxScore: 27, icon: '😔', color: 'rose' },
    gad7: { name: 'GAD-7 焦虑', maxScore: 21, icon: '😰', color: 'blue' },
    sds: { name: 'SDS 抑郁', maxScore: 80, icon: '💜', color: 'purple' },
    sas: { name: 'SAS 焦虑', maxScore: 80, icon: '🧡', color: 'orange' },
    pss10: { name: 'PSS-10 压力', maxScore: 40, icon: '💪', color: 'indigo' },
};

const MOOD_OPTIONS = [
    { value: 5, emoji: '😊', label: '很好' },
    { value: 4, emoji: '🙂', label: '不错' },
    { value: 3, emoji: '😐', label: '一般' },
    { value: 2, emoji: '😕', label: '不太好' },
    { value: 1, emoji: '😢', label: '很差' },
];

export const Dashboard = ({ onStartAssessment, onStartChat, userName }: DashboardProps) => {
    const [recentScores, setRecentScores] = useState<RecentScore[]>([]);
    const [todayMood, setTodayMood] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [greeting, setGreeting] = useState('');

    // 加载数据
    useEffect(() => {
        const loadData = async () => {
            // 设置问候语
            const hour = new Date().getHours();
            if (hour < 12) setGreeting('早上好');
            else if (hour < 18) setGreeting('下午好');
            else setGreeting('晚上好');

            // 加载历史评分
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const response = await fetch(`${API_BASE}/history?token=${token}`);
                    if (response.ok) {
                        const data = await response.json();
                        // 获取每个量表最近的评分
                        const latestByScale: Record<string, RecentScore> = {};
                        const sorted = (data.history || []).sort(
                            (a: RecentScore, b: RecentScore) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        );

                        sorted.forEach((record: RecentScore) => {
                            if (!latestByScale[record.scale_type]) {
                                latestByScale[record.scale_type] = record;
                            }
                        });
                        setRecentScores(Object.values(latestByScale));
                    }
                } catch (error) {
                    console.error('Failed to load history:', error);
                }
            }

            // 加载今日心情
            const savedMood = localStorage.getItem(`mood_${new Date().toDateString()}`);
            if (savedMood) {
                setTodayMood(parseInt(savedMood));
            }

            setIsLoading(false);
        };

        loadData();
    }, []);

    // 保存心情
    const handleMoodSelect = (mood: number) => {
        setTodayMood(mood);
        localStorage.setItem(`mood_${new Date().toDateString()}`, String(mood));
    };

    // 计算整体健康状态
    const getOverallStatus = () => {
        if (recentScores.length === 0) return null;

        const severities = recentScores.map(s => s.severity);
        if (severities.some(s => s.includes('重度') || s.includes('高'))) {
            return { level: '需要关注', color: 'red', message: '建议寻求专业帮助' };
        }
        if (severities.some(s => s.includes('中度') || s.includes('中等'))) {
            return { level: '轻度困扰', color: 'yellow', message: '定期评估，保持关注' };
        }
        if (severities.every(s => s.includes('正常') || s.includes('轻度') || s.includes('低'))) {
            return { level: '状态良好', color: 'green', message: '继续保持健康生活方式' };
        }
        return { level: '需要评估', color: 'gray', message: '完成更多评估了解自己' };
    };

    const overallStatus = getOverallStatus();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 欢迎区域 */}
            <div className="bg-gradient-to-br from-primary-500 via-accent-500 to-calm-500 rounded-2xl p-8 text-white">
                <h1 className="text-3xl font-bold mb-2">
                    {greeting}，{userName || '朋友'}！
                </h1>
                <p className="opacity-90 text-lg">
                    今天感觉怎么样？让我们一起关注你的心理健康。
                </p>

                {/* 今日心情选择 */}
                <div className="mt-6">
                    <p className="text-sm opacity-80 mb-3">今日心情</p>
                    <div className="flex space-x-3">
                        {MOOD_OPTIONS.map((mood) => (
                            <button
                                key={mood.value}
                                onClick={() => handleMoodSelect(mood.value)}
                                className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all ${todayMood === mood.value
                                        ? 'bg-white text-primary-600 scale-110 shadow-lg'
                                        : 'bg-white/20 hover:bg-white/30'
                                    }`}
                            >
                                <span className="text-2xl">{mood.emoji}</span>
                                <span className="text-[10px] mt-0.5">{mood.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 整体状态 */}
            {overallStatus && (
                <div className={`bg-${overallStatus.color}-50 border border-${overallStatus.color}-200 rounded-xl p-4 flex items-center space-x-4`}>
                    <div className={`w-12 h-12 bg-${overallStatus.color}-100 rounded-full flex items-center justify-center`}>
                        <span className="text-2xl">
                            {overallStatus.color === 'green' ? '✅' : overallStatus.color === 'yellow' ? '⚠️' : '🔴'}
                        </span>
                    </div>
                    <div>
                        <p className={`font-bold text-${overallStatus.color}-800`}>{overallStatus.level}</p>
                        <p className={`text-sm text-${overallStatus.color}-600`}>{overallStatus.message}</p>
                    </div>
                </div>
            )}

            {/* 快捷操作 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                    onClick={onStartAssessment}
                    className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center space-y-2 border border-warm-100"
                >
                    <span className="text-3xl">📊</span>
                    <span className="font-medium text-warm-700">做量表</span>
                </button>
                <button
                    onClick={onStartChat}
                    className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center space-y-2 border border-warm-100"
                >
                    <span className="text-3xl">💬</span>
                    <span className="font-medium text-warm-700">AI对话</span>
                </button>
                <button
                    onClick={onStartAssessment}
                    className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center space-y-2 border border-warm-100"
                >
                    <span className="text-3xl">🧘</span>
                    <span className="font-medium text-warm-700">放松练习</span>
                </button>
                <button className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col items-center space-y-2 border border-warm-100">
                    <span className="text-3xl">📖</span>
                    <span className="font-medium text-warm-700">心理知识</span>
                </button>
            </div>

            {/* 最近评分 */}
            {recentScores.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-warm-100">
                    <h3 className="font-bold text-warm-800 mb-4">📈 最近评估</h3>
                    <div className="space-y-3">
                        {recentScores.map((score, index) => {
                            const info = SCALE_INFO[score.scale_type] || { name: score.scale_type, maxScore: 100, icon: '📋', color: 'gray' };
                            const percent = (score.total_score / info.maxScore) * 100;

                            return (
                                <div key={index} className="flex items-center space-x-4">
                                    <span className="text-2xl">{info.icon}</span>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-warm-700">{info.name}</span>
                                            <span className="text-sm text-warm-500">{score.severity}</span>
                                        </div>
                                        <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${percent < 30 ? 'bg-green-400' :
                                                        percent < 60 ? 'bg-yellow-400' :
                                                            percent < 80 ? 'bg-orange-400' : 'bg-red-500'
                                                    }`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="font-bold text-warm-800">{score.total_score}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 没有历史记录时的提示 */}
            {recentScores.length === 0 && (
                <div className="bg-white rounded-xl shadow-sm p-8 border border-warm-100 text-center">
                    <span className="text-5xl mb-4 block">🌱</span>
                    <h3 className="font-bold text-warm-800 text-lg mb-2">开始你的心理健康之旅</h3>
                    <p className="text-warm-600 mb-6">完成你的第一个评估，了解自己的心理状态</p>
                    <button
                        onClick={onStartAssessment}
                        className="px-8 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold hover:opacity-90 transition-all"
                    >
                        开始评估
                    </button>
                </div>
            )}

            {/* 每日提示 */}
            <div className="bg-gradient-to-br from-calm-50 to-primary-50 rounded-xl p-6 border border-calm-100">
                <h3 className="font-bold text-calm-800 mb-2">💡 今日小贴士</h3>
                <p className="text-calm-700">
                    {[
                        '深呼吸可以帮助缓解焦虑。试试 4-7-8 呼吸法：吸气4秒，屏息7秒，呼气8秒。',
                        '每天保证7-8小时的睡眠对心理健康至关重要。',
                        '适度运动可以释放内啡肽，改善情绪。每天散步30分钟就很有帮助。',
                        '与亲友保持联系。社交支持是心理健康的重要保护因素。',
                        '给自己一些独处的时间。冥想或安静地坐一会儿都可以帮助减压。',
                    ][new Date().getDay() % 5]}
                </p>
            </div>
        </div>
    );
};

export default Dashboard;
