/**
 * Mood Journal Component
 * 
 * Daily mood check-in with emotion wheel, journal text, and gratitude entries
 */

import { useState, useCallback } from 'react';
import { API_BASE } from '../../config/api';
import { useGamificationStore } from '../../store/useGamificationStore';

interface MoodJournalProps {
    onComplete?: () => void;
    onClose?: () => void;
}

interface MoodOption {
    id: string;
    name: string;
    emoji: string;
    color: string;
    gradient: string;
}

const MOOD_OPTIONS: MoodOption[] = [
    { id: 'happy', name: '开心', emoji: '😊', color: '#FCD34D', gradient: 'from-yellow-400 to-amber-500' },
    { id: 'calm', name: '平静', emoji: '😌', color: '#34D399', gradient: 'from-emerald-400 to-teal-500' },
    { id: 'grateful', name: '感恩', emoji: '🥰', color: '#F472B6', gradient: 'from-pink-400 to-rose-500' },
    { id: 'excited', name: '兴奋', emoji: '🤩', color: '#FB923C', gradient: 'from-orange-400 to-red-500' },
    { id: 'tired', name: '疲惫', emoji: '😴', color: '#94A3B8', gradient: 'from-slate-400 to-gray-500' },
    { id: 'anxious', name: '焦虑', emoji: '😰', color: '#A78BFA', gradient: 'from-violet-400 to-purple-500' },
    { id: 'sad', name: '难过', emoji: '😢', color: '#60A5FA', gradient: 'from-blue-400 to-indigo-500' },
    { id: 'angry', name: '生气', emoji: '😤', color: '#F87171', gradient: 'from-red-400 to-rose-600' },
];

export const MoodJournal = ({ onComplete, onClose }: MoodJournalProps) => {
    const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);
    const [journalText, setJournalText] = useState('');
    const [gratitudeItems, setGratitudeItems] = useState(['', '', '']);
    const [step, setStep] = useState<'mood' | 'journal' | 'gratitude' | 'done'>('mood');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [aiResponse, setAiResponse] = useState('');

    const { completeTask } = useGamificationStore();

    const handleMoodSelect = (mood: MoodOption) => {
        setSelectedMood(mood);
        setStep('journal');
    };

    const handleGratitudeChange = (index: number, value: string) => {
        const newItems = [...gratitudeItems];
        newItems[index] = value;
        setGratitudeItems(newItems);
    };

    const handleSubmit = useCallback(async () => {
        if (!selectedMood) return;

        setIsSubmitting(true);

        try {
            // Save to backend
            const response = await fetch(`${API_BASE}/journal/daily`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mood: selectedMood.id,
                    mood_name: selectedMood.name,
                    journal_text: journalText,
                    gratitude_items: gratitudeItems.filter(g => g.trim()),
                    timestamp: new Date().toISOString(),
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setAiResponse(data.ai_response || '感谢你的分享！记录心情是了解自己的第一步。继续保持！💜');

                // Award points
                completeTask('mood_checkin');
                if (journalText.trim()) {
                    completeTask('journal');
                }
                if (gratitudeItems.filter(g => g.trim()).length >= 3) {
                    completeTask('gratitude');
                }

                setStep('done');
            } else {
                // Fallback response
                setAiResponse('今天的心情已记录！每天关注自己的感受，是非常温暖的习惯。💜');
                setStep('done');
            }
        } catch (err) {
            console.error('Journal save failed:', err);
            // Still show success with local storage fallback
            setAiResponse('日记已保存在本地！感谢你愿意记录今天的感受。💜');
            setStep('done');

            // Save to localStorage as backup
            const journals = JSON.parse(localStorage.getItem('mood_journals') || '[]');
            journals.push({
                mood: selectedMood.id,
                mood_name: selectedMood.name,
                journal_text: journalText,
                gratitude_items: gratitudeItems.filter(g => g.trim()),
                timestamp: new Date().toISOString(),
            });
            localStorage.setItem('mood_journals', JSON.stringify(journals));

            completeTask('mood_checkin');
        } finally {
            setIsSubmitting(false);
        }
    }, [selectedMood, journalText, gratitudeItems, completeTask]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
                {/* Header */}
                <div className={`p-6 text-white bg-gradient-to-r ${selectedMood?.gradient || 'from-primary-500 to-accent-500'}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">
                                {step === 'mood' && '今天心情如何？'}
                                {step === 'journal' && '写下你的感受'}
                                {step === 'gratitude' && '感恩时刻'}
                                {step === 'done' && '太棒了！'}
                            </h2>
                            <p className="text-white/80 text-sm mt-1">
                                {step === 'mood' && '选择最接近你此刻的心情'}
                                {step === 'journal' && '可以是今天发生的事，或者此刻的想法'}
                                {step === 'gratitude' && '写下3件今天值得感恩的事'}
                                {step === 'done' && '你已完成今日心情打卡'}
                            </p>
                        </div>
                        {selectedMood && step !== 'mood' && (
                            <span className="text-5xl">{selectedMood.emoji}</span>
                        )}
                    </div>
                </div>

                <div className="p-6">
                    {/* Step 1: Mood Selection */}
                    {step === 'mood' && (
                        <div className="grid grid-cols-4 gap-4">
                            {MOOD_OPTIONS.map(mood => (
                                <button
                                    key={mood.id}
                                    onClick={() => handleMoodSelect(mood)}
                                    className="flex flex-col items-center p-4 rounded-2xl hover:bg-warm-50 transition-all hover:scale-110"
                                >
                                    <span className="text-4xl mb-2">{mood.emoji}</span>
                                    <span className="text-sm text-warm-700">{mood.name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Step 2: Journal Text */}
                    {step === 'journal' && (
                        <div className="space-y-4">
                            <textarea
                                value={journalText}
                                onChange={(e) => setJournalText(e.target.value)}
                                placeholder="今天发生了什么？你在想什么？随便写点什么都好..."
                                className="w-full h-40 p-4 border border-warm-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            <div className="flex justify-between">
                                <button
                                    onClick={() => setStep('mood')}
                                    className="text-warm-500 hover:text-warm-700"
                                >
                                    ← 返回
                                </button>
                                <button
                                    onClick={() => setStep('gratitude')}
                                    className="px-6 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                                >
                                    下一步 →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Gratitude */}
                    {step === 'gratitude' && (
                        <div className="space-y-4">
                            <p className="text-warm-600 text-sm mb-4">
                                研究表明，每天记录感恩的事可以显著提升幸福感 ✨
                            </p>
                            {gratitudeItems.map((item, idx) => (
                                <div key={idx} className="flex items-center space-x-3">
                                    <span className="text-2xl">🙏</span>
                                    <input
                                        type="text"
                                        value={item}
                                        onChange={(e) => handleGratitudeChange(idx, e.target.value)}
                                        placeholder={`感恩的事 ${idx + 1}...`}
                                        className="flex-1 p-3 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    />
                                </div>
                            ))}
                            <div className="flex justify-between pt-4">
                                <button
                                    onClick={() => setStep('journal')}
                                    className="text-warm-500 hover:text-warm-700"
                                >
                                    ← 返回
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? '保存中...' : '完成打卡 ✨'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Done */}
                    {step === 'done' && (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-4">
                                <span className="text-4xl">🎉</span>
                            </div>
                            <div className="bg-warm-50 rounded-xl p-4 mb-6">
                                <p className="text-warm-700">{aiResponse}</p>
                            </div>
                            <div className="flex items-center justify-center space-x-2 text-amber-600 font-semibold mb-6">
                                <span>⭐</span>
                                <span>+15 积分</span>
                            </div>
                            <button
                                onClick={onComplete || onClose}
                                className="px-8 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                            >
                                太好了！
                            </button>
                        </div>
                    )}
                </div>

                {/* Close Button */}
                {step !== 'done' && (
                    <div className="px-6 pb-6">
                        <button
                            onClick={onClose}
                            className="w-full text-center text-warm-400 hover:text-warm-600 text-sm"
                        >
                            稍后再说
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MoodJournal;
