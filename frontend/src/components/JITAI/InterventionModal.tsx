/**
 * JITAI Intervention Modal Component
 * 
 * Displays personalized interventions: breathing, CBT, gratitude, community
 */

import { useState, useEffect, useCallback } from 'react';
import type { Intervention, InterventionType } from '../../hooks/useJITAI';

interface InterventionModalProps {
    intervention: Intervention;
    onComplete: (postMood: number) => void;
    onDismiss: () => void;
}

// Breathing exercise component
const BreathingExercise = ({ onFinish }: { onFinish: () => void }) => {
    const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
    const [count, setCount] = useState(4);
    const [cycles, setCycles] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCount(prev => {
                if (prev <= 1) {
                    if (phase === 'inhale') {
                        setPhase('hold');
                        return 4;
                    } else if (phase === 'hold') {
                        setPhase('exhale');
                        return 4;
                    } else {
                        setCycles(c => c + 1);
                        setPhase('inhale');
                        return 4;
                    }
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [phase]);

    useEffect(() => {
        if (cycles >= 3) {
            onFinish();
        }
    }, [cycles, onFinish]);

    const phaseText = {
        inhale: '吸气...',
        hold: '保持...',
        exhale: '呼气...',
    };

    const scale = phase === 'inhale' ? 1.3 : phase === 'exhale' ? 0.8 : 1.15;

    return (
        <div className="flex flex-col items-center py-8">
            <div
                className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-2xl transition-transform duration-1000 ease-in-out"
                style={{ transform: `scale(${scale})` }}
            >
                <span className="text-4xl text-white font-bold">{count}</span>
            </div>
            <p className="text-xl font-medium text-warm-700 mt-6">{phaseText[phase]}</p>
            <p className="text-sm text-warm-500 mt-2">第 {cycles + 1}/3 轮</p>
        </div>
    );
};

// CBT mini exercise
const CBTExercise = ({ onFinish }: { onFinish: () => void }) => {
    const [step, setStep] = useState(0);
    const [thoughts, setThoughts] = useState(['', '', '']);

    const steps = [
        { title: '识别想法', prompt: '刚才脑海中浮现了什么想法？', placeholder: '例如：我总是做不好...' },
        { title: '检验证据', prompt: '有什么证据支持或反驳这个想法？', placeholder: '例如：其实上次我做得不错...' },
        { title: '替代想法', prompt: '有没有更平衡的看法？', placeholder: '例如：有时候会犯错，但我在进步...' },
    ];

    const handleNext = () => {
        if (step < 2) {
            setStep(step + 1);
        } else {
            onFinish();
        }
    };

    return (
        <div className="py-4">
            <div className="flex justify-between mb-4">
                {steps.map((_, i) => (
                    <div key={i} className={`flex items-center ${i <= step ? 'text-purple-600' : 'text-warm-300'}`}>
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i <= step ? 'bg-purple-600 text-white' : 'bg-warm-100'}`}>
                            {i + 1}
                        </span>
                        {i < 2 && <div className={`w-12 h-0.5 ${i < step ? 'bg-purple-600' : 'bg-warm-200'}`} />}
                    </div>
                ))}
            </div>

            <h4 className="font-bold text-warm-800 mb-2">{steps[step].title}</h4>
            <p className="text-warm-600 text-sm mb-3">{steps[step].prompt}</p>
            <textarea
                value={thoughts[step]}
                onChange={(e) => {
                    const newThoughts = [...thoughts];
                    newThoughts[step] = e.target.value;
                    setThoughts(newThoughts);
                }}
                placeholder={steps[step].placeholder}
                className="w-full p-3 border border-warm-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
            />
            <button
                onClick={handleNext}
                className="w-full mt-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium"
            >
                {step < 2 ? '下一步' : '完成练习'}
            </button>
        </div>
    );
};

// Gratitude prompts
const GratitudeExercise = ({ onFinish }: { onFinish: () => void }) => {
    const [items, setItems] = useState(['', '', '']);
    const prompts = [
        '今天有什么让你微笑的事？',
        '有谁帮助过你或让你感到温暖？',
        '你的身体今天帮你完成了什么？',
    ];

    return (
        <div className="py-4 space-y-4">
            {prompts.map((prompt, i) => (
                <div key={i}>
                    <p className="text-sm text-warm-600 mb-1">{prompt}</p>
                    <input
                        type="text"
                        value={items[i]}
                        onChange={(e) => {
                            const newItems = [...items];
                            newItems[i] = e.target.value;
                            setItems(newItems);
                        }}
                        placeholder="写下你的感恩..."
                        className="w-full p-3 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                </div>
            ))}
            <button
                onClick={onFinish}
                disabled={!items.some(i => i.trim())}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-medium disabled:opacity-50"
            >
                记录感恩 💜
            </button>
        </div>
    );
};

// Community positive posts
const CommunityExercise = ({ onFinish }: { onFinish: () => void }) => {
    const [posts] = useState([
        { content: '今天阳光很好，感恩这个美好的早晨', likes: 12 },
        { content: '坚持了7天日记，给自己一个大大的赞！', likes: 8 },
        { content: '每一天都是新的开始，加油！', likes: 15 },
    ]);

    return (
        <div className="py-4">
            <p className="text-warm-600 text-sm mb-4">看看社区里的正能量分享 👇</p>
            <div className="space-y-3">
                {posts.map((post, i) => (
                    <div key={i} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                        <p data-no-translate className="text-warm-700">{post.content}</p>
                        <div className="flex items-center mt-2 text-sm text-warm-500">
                            <span>❤️ {post.likes}</span>
                        </div>
                    </div>
                ))}
            </div>
            <button
                onClick={onFinish}
                className="w-full mt-4 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium"
            >
                去社区互动 →
            </button>
        </div>
    );
};

export const InterventionModal = ({
    intervention,
    onComplete,
    onDismiss,
}: InterventionModalProps) => {
    const [phase, setPhase] = useState<'intro' | 'exercise' | 'feedback'>('intro');
    const [postMood, setPostMood] = useState(5);

    const handleStartExercise = useCallback(() => {
        setPhase('exercise');
    }, []);

    const handleExerciseFinish = useCallback(() => {
        setPhase('feedback');
    }, []);

    const handleSubmitFeedback = useCallback(() => {
        onComplete(postMood);
    }, [postMood, onComplete]);

    const renderExercise = () => {
        switch (intervention.type) {
            case 'breathing':
                return <BreathingExercise onFinish={handleExerciseFinish} />;
            case 'cbt':
                return <CBTExercise onFinish={handleExerciseFinish} />;
            case 'gratitude':
                return <GratitudeExercise onFinish={handleExerciseFinish} />;
            case 'community':
                return <CommunityExercise onFinish={handleExerciseFinish} />;
            default:
                return null;
        }
    };

    const typeIcons: Record<InterventionType, string> = {
        breathing: '🌬️',
        cbt: '💭',
        gratitude: '🙏',
        community: '💜',
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-fadeIn">
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 p-6 text-white relative">
                    <button
                        onClick={onDismiss}
                        className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                    >
                        ✕
                    </button>
                    <div className="flex items-center space-x-3">
                        <span className="text-4xl">{typeIcons[intervention.type as InterventionType]}</span>
                        <div>
                            <h3 className="font-bold text-xl">{intervention.title}</h3>
                            <p className="text-white/80 text-sm">约 {Math.round(intervention.duration_seconds / 60)} 分钟</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {phase === 'intro' && (
                        <div className="text-center py-4">
                            <p className="text-warm-600 mb-6">{intervention.description}</p>
                            <button
                                onClick={handleStartExercise}
                                className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                            >
                                开始练习 ✨
                            </button>
                            <button
                                onClick={onDismiss}
                                className="mt-3 text-warm-500 hover:text-warm-700"
                            >
                                稍后再说
                            </button>
                        </div>
                    )}

                    {phase === 'exercise' && renderExercise()}

                    {phase === 'feedback' && (
                        <div className="text-center py-4">
                            <span className="text-5xl mb-4 block">🎉</span>
                            <h4 className="text-xl font-bold text-warm-800 mb-2">做得很棒！</h4>
                            <p className="text-warm-600 mb-6">现在感觉怎么样？</p>

                            {/* Mood slider */}
                            <div className="mb-6">
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={postMood}
                                    onChange={(e) => setPostMood(Number(e.target.value))}
                                    className="w-full accent-purple-500"
                                />
                                <div className="flex justify-between text-2xl mt-2">
                                    <span>😔</span>
                                    <span>😐</span>
                                    <span>😊</span>
                                </div>
                                <p className="text-warm-500 mt-2">心情: {postMood}/10</p>
                            </div>

                            <button
                                onClick={handleSubmitFeedback}
                                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium"
                            >
                                完成 ✓
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InterventionModal;
