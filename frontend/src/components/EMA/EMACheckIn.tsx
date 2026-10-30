/**
 * EMA Quick Check-in Component
 * 
 * Short 3-question ecological momentary assessment
 * with immediate micro-intervention recommendations
 */

import { useState, useCallback } from 'react';
import { API_BASE } from '../../config/api';
import { useGamificationStore } from '../../store/useGamificationStore';

interface EMACheckInProps {
    onComplete?: (result: EMAResult) => void;
    onClose?: () => void;
}

interface EMAResult {
    moodScore: number;
    stressSource: string;
    currentActivity: string;
    timestamp: string;
}

const STRESS_SOURCES = [
    { id: 'work', label: '工作/学习', icon: '💼' },
    { id: 'relationships', label: '人际关系', icon: '👥' },
    { id: 'health', label: '健康问题', icon: '🏥' },
    { id: 'finance', label: '经济压力', icon: '💰' },
    { id: 'none', label: '没有特别的', icon: '✨' },
    { id: 'other', label: '其他', icon: '📝' },
];

const ACTIVITIES = [
    { id: 'working', label: '工作/学习中', icon: '💻' },
    { id: 'resting', label: '休息中', icon: '🛋️' },
    { id: 'commuting', label: '通勤中', icon: '🚌' },
    { id: 'eating', label: '吃饭中', icon: '🍜' },
    { id: 'exercising', label: '运动中', icon: '🏃' },
    { id: 'socializing', label: '社交中', icon: '🗣️' },
];

const MOOD_EMOJIS = ['😫', '😔', '😕', '😐', '🙂', '😊', '😄', '🥰', '🤩', '🌟'];

export const EMACheckIn = ({ onComplete, onClose }: EMACheckInProps) => {
    const [step, setStep] = useState(1);
    const [moodScore, setMoodScore] = useState(5);
    const [stressSource, setStressSource] = useState('');
    const [currentActivity, setCurrentActivity] = useState('');
    const [intervention, setIntervention] = useState('');

    const { addPoints } = useGamificationStore();

    const getIntervention = useCallback((mood: number, stress: string) => {
        if (mood <= 3) {
            return {
                message: '看起来现在不太好受。来试试深呼吸放松一下？',
                action: '🧘 开始呼吸练习',
                type: 'breathing',
            };
        } else if (stress !== 'none' && mood <= 6) {
            return {
                message: '有些压力是正常的。写下你的想法可能会有帮助。',
                action: '📝 写点什么',
                type: 'journal',
            };
        } else {
            return {
                message: '很高兴你感觉不错！继续保持这份好心情 ✨',
                action: '😊 太好了',
                type: 'positive',
            };
        }
    }, []);

    const handleComplete = useCallback(async () => {
        const result: EMAResult = {
            moodScore,
            stressSource,
            currentActivity,
            timestamp: new Date().toISOString(),
        };

        // Get intervention
        const interventionData = getIntervention(moodScore, stressSource);
        setIntervention(interventionData.message);

        // Save to backend
        try {
            await fetch(`${API_BASE}/ema/record`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(result),
            });
        } catch (err) {
            // Save to localStorage as backup
            const emaHistory = JSON.parse(localStorage.getItem('ema_history') || '[]');
            emaHistory.push(result);
            localStorage.setItem('ema_history', JSON.stringify(emaHistory));
        }

        addPoints(3);
        setStep(4);
        onComplete?.(result);
    }, [moodScore, stressSource, currentActivity, getIntervention, addPoints, onComplete]);

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-tour-pause>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header with progress */}
                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 p-6 text-white">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xl font-bold">快速心情检查</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Progress dots */}
                    <div className="flex space-x-2">
                        {[1, 2, 3].map(s => (
                            <div
                                key={s}
                                className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-white' : 'bg-white/30'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    {/* Step 1: Mood Score */}
                    {step === 1 && (
                        <div className="text-center">
                            <p className="text-warm-600 mb-4">此刻你的心情如何？</p>
                            <div className="text-6xl mb-4">{MOOD_EMOJIS[moodScore - 1]}</div>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={moodScore}
                                onChange={(e) => setMoodScore(Number(e.target.value))}
                                className="w-full h-3 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                style={{
                                    background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${(moodScore - 1) * 11.1}%, #e5e7eb ${(moodScore - 1) * 11.1}%, #e5e7eb 100%)`
                                }}
                            />
                            <div className="flex justify-between text-sm text-warm-400 mt-2">
                                <span>很糟糕</span>
                                <span>非常棒</span>
                            </div>
                            <button
                                onClick={() => setStep(2)}
                                className="mt-6 w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                            >
                                下一步
                            </button>
                        </div>
                    )}

                    {/* Step 2: Stress Source */}
                    {step === 2 && (
                        <div>
                            <p className="text-warm-600 mb-4 text-center">有什么事情让你感到压力吗？</p>
                            <div className="grid grid-cols-2 gap-3">
                                {STRESS_SOURCES.map(source => (
                                    <button
                                        key={source.id}
                                        onClick={() => setStressSource(source.id)}
                                        className={`p-4 rounded-xl text-left transition-all ${stressSource === source.id
                                            ? 'bg-cyan-100 border-2 border-cyan-500'
                                            : 'bg-warm-50 border-2 border-transparent hover:bg-warm-100'
                                            }`}
                                    >
                                        <span className="text-xl">{source.icon}</span>
                                        <div className="text-sm mt-1">{source.label}</div>
                                    </button>
                                ))}
                            </div>
                            <div className="flex space-x-3 mt-6">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-3 bg-warm-100 text-warm-700 rounded-xl font-medium"
                                >
                                    返回
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={!stressSource}
                                    className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold disabled:opacity-50"
                                >
                                    下一步
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Current Activity */}
                    {step === 3 && (
                        <div>
                            <p className="text-warm-600 mb-4 text-center">你现在在做什么？</p>
                            <div className="grid grid-cols-2 gap-3">
                                {ACTIVITIES.map(activity => (
                                    <button
                                        key={activity.id}
                                        onClick={() => setCurrentActivity(activity.id)}
                                        className={`p-4 rounded-xl text-left transition-all ${currentActivity === activity.id
                                            ? 'bg-cyan-100 border-2 border-cyan-500'
                                            : 'bg-warm-50 border-2 border-transparent hover:bg-warm-100'
                                            }`}
                                    >
                                        <span className="text-xl">{activity.icon}</span>
                                        <div className="text-sm mt-1">{activity.label}</div>
                                    </button>
                                ))}
                            </div>
                            <div className="flex space-x-3 mt-6">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex-1 py-3 bg-warm-100 text-warm-700 rounded-xl font-medium"
                                >
                                    返回
                                </button>
                                <button
                                    onClick={handleComplete}
                                    disabled={!currentActivity}
                                    className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold disabled:opacity-50"
                                >
                                    完成
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Intervention */}
                    {step === 4 && (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-4">
                                <span className="text-3xl">✓</span>
                            </div>
                            <h3 className="text-lg font-bold text-warm-800 mb-2">记录完成！</h3>
                            <p className="text-warm-600 mb-4">{intervention}</p>
                            <div className="text-amber-600 font-medium mb-4">⭐ +3 积分</div>
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold"
                            >
                                知道了
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EMACheckIn;
