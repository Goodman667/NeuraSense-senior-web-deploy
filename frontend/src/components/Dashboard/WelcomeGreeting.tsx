/**
 * Welcome Greeting Component
 * 
 * Personalized greeting with time-based message, user name, and daily recommendations
 */

import { useMemo } from 'react';

interface WelcomeGreetingProps {
    userName?: string;
    streak?: number;
    todayPoints?: number;
    onStartJournal?: () => void;
    onStartBreathing?: () => void;
    onStartAssessment?: () => void;
}

interface Recommendation {
    title: string;
    description: string;
    icon: string;
    action: () => void;
    priority: 'high' | 'medium' | 'low';
    gradient: string;
}

export const WelcomeGreeting = ({
    userName = '朋友',
    streak = 0,
    todayPoints = 0,
    onStartJournal,
    onStartBreathing,
    onStartAssessment,
}: WelcomeGreetingProps) => {
    // Time-based greeting
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 6) return { text: '夜深了', emoji: '🌙', tip: '注意休息哦' };
        if (hour < 9) return { text: '早安', emoji: '🌅', tip: '新的一天，从关心自己开始' };
        if (hour < 12) return { text: '上午好', emoji: '☀️', tip: '今天也要元气满满' };
        if (hour < 14) return { text: '中午好', emoji: '🌤️', tip: '记得午休充电' };
        if (hour < 18) return { text: '下午好', emoji: '🌈', tip: '累了就休息一下吧' };
        if (hour < 21) return { text: '晚上好', emoji: '🌆', tip: '放松一下，回顾今天' };
        return { text: '夜安', emoji: '🌃', tip: '好好休息，明天会更好' };
    }, []);

    // Smart recommendations based on time and user state
    const recommendations = useMemo((): Recommendation[] => {
        const hour = new Date().getHours();
        const recs: Recommendation[] = [];

        // Morning: encourage journaling
        if (hour >= 6 && hour < 12) {
            recs.push({
                title: '今日心情打卡',
                description: '记录此刻的感受，开启美好一天',
                icon: '📝',
                action: onStartJournal || (() => { }),
                priority: 'high',
                gradient: 'from-amber-400 to-orange-500',
            });
        }

        // Afternoon: if stressed, suggest breathing
        if (hour >= 14 && hour < 18) {
            recs.push({
                title: '呼吸放松',
                description: '下午时光，来一次深呼吸吧',
                icon: '🧘',
                action: onStartBreathing || (() => { }),
                priority: 'medium',
                gradient: 'from-teal-400 to-cyan-500',
            });
        }

        // Evening: reflection and gratitude
        if (hour >= 18 || hour < 6) {
            recs.push({
                title: '感恩日记',
                description: '写下今天值得感恩的三件事',
                icon: '🙏',
                action: onStartJournal || (() => { }),
                priority: 'high',
                gradient: 'from-purple-400 to-pink-500',
            });
        }

        return recs.slice(0, 3);
    }, [onStartJournal, onStartBreathing, onStartAssessment]);

    return (
        <div className="mb-8">
            {/* Main Greeting Card */}
            <div className="bg-gradient-to-r from-primary-500 via-accent-500 to-purple-500 rounded-3xl p-8 text-white shadow-xl mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center space-x-2 mb-2">
                            <span className="text-3xl">{greeting.emoji}</span>
                            <h1 className="text-3xl font-bold">
                                {greeting.text}，{userName}！
                            </h1>
                        </div>
                        <p className="text-white/80 text-lg">{greeting.tip}</p>

                        {/* Streak & Points */}
                        <div className="flex items-center space-x-4 mt-4">
                            {streak > 0 && (
                                <div className="flex items-center space-x-1 bg-white/20 rounded-full px-3 py-1">
                                    <span className="text-lg">🔥</span>
                                    <span className="font-semibold">{streak} 天连击</span>
                                </div>
                            )}
                            <div className="flex items-center space-x-1 bg-white/20 rounded-full px-3 py-1">
                                <span className="text-lg">⭐</span>
                                <span className="font-semibold">{todayPoints} 今日积分</span>
                            </div>
                        </div>
                    </div>

                    {/* Avatar or decoration */}
                    <div className="hidden md:block">
                        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
                            <span className="text-5xl">💜</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendations.map((rec, idx) => (
                    <button
                        key={idx}
                        onClick={rec.action}
                        className={`bg-gradient-to-br ${rec.gradient} text-white rounded-2xl p-5 text-left hover:scale-[1.02] hover:shadow-lg transition-all group`}
                    >
                        <div className="flex items-center space-x-3 mb-2">
                            <span className="text-2xl">{rec.icon}</span>
                            <h3 className="font-bold text-lg">{rec.title}</h3>
                        </div>
                        <p className="text-white/80 text-sm">{rec.description}</p>
                        <div className="mt-3 flex items-center text-white/70 text-sm group-hover:text-white transition-colors">
                            <span>开始</span>
                            <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default WelcomeGreeting;
