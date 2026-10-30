/**
 * Achievement Center
 * 
 * Display all badges and achievements with unlock status
 */

import { useGamificationStore } from '../../store/useGamificationStore';

interface AchievementCenterProps {
    onClose?: () => void;
}

export const AchievementCenter = ({ onClose }: AchievementCenterProps) => {
    const { badges, unlockedBadges, totalPoints, streak } = useGamificationStore();

    const unlockedCount = unlockedBadges.length;
    const totalBadges = badges.length;
    const progress = (unlockedCount / totalBadges) * 100;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-tour-pause>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <span className="text-4xl">🏆</span>
                            <div>
                                <h2 className="text-2xl font-bold">成就中心</h2>
                                <p className="text-white/80 text-sm">你已解锁 {unlockedCount}/{totalBadges} 个徽章</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors text-xl"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="flex space-x-6">
                        <div className="bg-white/20 rounded-xl px-4 py-2">
                            <div className="text-2xl font-bold">{totalPoints}</div>
                            <div className="text-xs text-white/70">总积分</div>
                        </div>
                        <div className="bg-white/20 rounded-xl px-4 py-2">
                            <div className="text-2xl font-bold">{streak}</div>
                            <div className="text-xs text-white/70">连击天数</div>
                        </div>
                        <div className="bg-white/20 rounded-xl px-4 py-2 flex-1">
                            <div className="text-sm mb-1">徽章进度</div>
                            <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white rounded-full transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Badges Grid */}
                <div className="p-6 overflow-y-auto max-h-[55vh]">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {badges.map(badge => {
                            const isUnlocked = unlockedBadges.includes(badge.id);
                            return (
                                <div
                                    key={badge.id}
                                    className={`relative p-4 rounded-2xl border-2 transition-all ${isUnlocked
                                            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300 shadow-md'
                                            : 'bg-gray-50 border-gray-200 opacity-60'
                                        }`}
                                >
                                    {/* Lock overlay for locked badges */}
                                    {!isUnlocked && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50 rounded-2xl">
                                            <span className="text-3xl">🔒</span>
                                        </div>
                                    )}

                                    <div className="text-center">
                                        <div className={`text-4xl mb-2 ${!isUnlocked && 'grayscale'}`}>
                                            {badge.icon}
                                        </div>
                                        <h4 className={`font-bold ${isUnlocked ? 'text-warm-800' : 'text-gray-400'}`}>
                                            {badge.name}
                                        </h4>
                                        <p className="text-xs text-warm-500 mt-1">
                                            {badge.description}
                                        </p>
                                        <div className={`text-xs mt-2 px-2 py-1 rounded-full inline-block ${isUnlocked
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            {isUnlocked ? '✓ 已解锁' : badge.requirement}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-warm-100 bg-warm-50">
                    <p className="text-center text-sm text-warm-500">
                        🌟 继续完成每日任务，解锁更多成就！
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AchievementCenter;
