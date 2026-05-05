/**
 * StroopTest Component
 * 
 * Gamified cognitive assessment using the Stroop effect.
 * Users must identify the COLOR of text, not the word itself.
 * Measures cognitive flexibility, attention, and processing speed.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type GamePhase = 'intro' | 'countdown' | 'playing' | 'result';

interface StroopTrial {
    word: string;           // The word displayed (color name)
    displayColor: string;   // The actual color of the text
    correctAnswer: string;  // The correct answer (display color)
    isCongruent: boolean;   // Whether word matches color
}

interface TrialResult {
    trial: StroopTrial;
    responseTime: number;   // In milliseconds
    isCorrect: boolean;
    userAnswer: string;
}

interface StroopTestResult {
    totalTrials: number;
    correctAnswers: number;
    accuracy: number;
    avgResponseTime: number;
    congruentAvgTime: number;
    incongruentAvgTime: number;
    stroopEffect: number;       // Difference in response time
    cognitiveFlexibility: number; // 0-100 score
    attentionScore: number;     // 0-100 score
    timestamp: Date;
}

interface StroopTestProps {
    onComplete?: (result: StroopTestResult) => void;
    onClose?: () => void;
    trialCount?: number;
}

// Color definitions
const COLORS = [
    { name: '红色', value: '#EF4444', key: 'r' },
    { name: '蓝色', value: '#3B82F6', key: 'b' },
    { name: '绿色', value: '#22C55E', key: 'g' },
    { name: '黄色', value: '#EAB308', key: 'y' },
];

// Generate a random trial
const generateTrial = (forceCongruent?: boolean): StroopTrial => {
    const wordIndex = Math.floor(Math.random() * COLORS.length);
    let colorIndex: number;

    if (forceCongruent !== undefined) {
        colorIndex = forceCongruent ? wordIndex :
            (wordIndex + 1 + Math.floor(Math.random() * (COLORS.length - 1))) % COLORS.length;
    } else {
        // 30% congruent, 70% incongruent for better Stroop effect measurement
        colorIndex = Math.random() < 0.3 ? wordIndex :
            (wordIndex + 1 + Math.floor(Math.random() * (COLORS.length - 1))) % COLORS.length;
    }

    return {
        word: COLORS[wordIndex].name,
        displayColor: COLORS[colorIndex].value,
        correctAnswer: COLORS[colorIndex].name,
        isCongruent: wordIndex === colorIndex,
    };
};

export const StroopTest = ({
    onComplete,
    onClose,
    trialCount = 20,
}: StroopTestProps) => {
    const [phase, setPhase] = useState<GamePhase>('intro');
    const [countdown, setCountdown] = useState(3);
    const [currentTrial, setCurrentTrial] = useState<StroopTrial | null>(null);
    const [trialIndex, setTrialIndex] = useState(0);
    const [results, setResults] = useState<TrialResult[]>([]);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [finalResult, setFinalResult] = useState<StroopTestResult | null>(null);

    const trialStartTimeRef = useRef<number>(0);
    const feedbackTimeoutRef = useRef<number | null>(null);

    // Start the game
    const startGame = useCallback(() => {
        setPhase('countdown');
        setCountdown(3);
        setResults([]);
        setTrialIndex(0);

        // Countdown
        let count = 3;
        const interval = setInterval(() => {
            count--;
            setCountdown(count);
            if (count <= 0) {
                clearInterval(interval);
                setPhase('playing');
                setCurrentTrial(generateTrial());
                trialStartTimeRef.current = Date.now();
            }
        }, 1000);
    }, []);

    // Handle user response
    const handleResponse = useCallback((colorName: string) => {
        if (!currentTrial || phase !== 'playing') return;

        const responseTime = Date.now() - trialStartTimeRef.current;
        const isCorrect = colorName === currentTrial.correctAnswer;

        const result: TrialResult = {
            trial: currentTrial,
            responseTime,
            isCorrect,
            userAnswer: colorName,
        };

        setResults(prev => [...prev, result]);
        setFeedback(isCorrect ? 'correct' : 'wrong');

        // Clear feedback after short delay
        if (feedbackTimeoutRef.current) {
            clearTimeout(feedbackTimeoutRef.current);
        }

        feedbackTimeoutRef.current = window.setTimeout(() => {
            setFeedback(null);

            if (trialIndex + 1 >= trialCount) {
                // Game complete
                calculateFinalResult([...results, result]);
                setPhase('result');
            } else {
                // Next trial
                setTrialIndex(prev => prev + 1);
                setCurrentTrial(generateTrial());
                trialStartTimeRef.current = Date.now();
            }
        }, 300);
    }, [currentTrial, phase, trialIndex, trialCount, results]);

    // Calculate final result
    const calculateFinalResult = useCallback((allResults: TrialResult[]) => {
        const total = allResults.length;
        const correct = allResults.filter(r => r.isCorrect).length;
        const accuracy = (correct / total) * 100;

        const correctResults = allResults.filter(r => r.isCorrect);
        const avgTime = correctResults.length > 0
            ? correctResults.reduce((sum, r) => sum + r.responseTime, 0) / correctResults.length
            : 0;

        const congruentResults = correctResults.filter(r => r.trial.isCongruent);
        const incongruentResults = correctResults.filter(r => !r.trial.isCongruent);

        const congruentAvgTime = congruentResults.length > 0
            ? congruentResults.reduce((sum, r) => sum + r.responseTime, 0) / congruentResults.length
            : 0;

        const incongruentAvgTime = incongruentResults.length > 0
            ? incongruentResults.reduce((sum, r) => sum + r.responseTime, 0) / incongruentResults.length
            : 0;

        // Stroop effect = difference in response time
        const stroopEffect = incongruentAvgTime - congruentAvgTime;

        // Cognitive flexibility: lower stroop effect = better
        const cognitiveFlexibility = Math.round(
            Math.max(0, Math.min(100, 100 - (stroopEffect / 10)))
        );

        // Attention score: based on accuracy and speed
        const speedScore = Math.max(0, 100 - (avgTime - 500) / 20);
        const attentionScore = Math.round((accuracy * 0.6 + speedScore * 0.4));

        const result: StroopTestResult = {
            totalTrials: total,
            correctAnswers: correct,
            accuracy: Math.round(accuracy * 10) / 10,
            avgResponseTime: Math.round(avgTime),
            congruentAvgTime: Math.round(congruentAvgTime),
            incongruentAvgTime: Math.round(incongruentAvgTime),
            stroopEffect: Math.round(stroopEffect),
            cognitiveFlexibility,
            attentionScore,
            timestamp: new Date(),
        };

        setFinalResult(result);
        if (onComplete) {
            onComplete(result);
        }
    }, [onComplete]);

    // Keyboard handling
    useEffect(() => {
        if (phase !== 'playing') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const color = COLORS.find(c => c.key === e.key.toLowerCase());
            if (color) {
                handleResponse(color.name);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [phase, handleResponse]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (feedbackTimeoutRef.current) {
                clearTimeout(feedbackTimeoutRef.current);
            }
        };
    }, []);

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-500';
        if (score >= 60) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className="max-w-lg mx-auto">
            <AnimatePresence mode="wait">
                {/* Intro Phase */}
                {phase === 'intro' && (
                    <motion.div
                        key="intro"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white rounded-2xl shadow-xl p-8 text-center"
                    >
                        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto flex items-center justify-center mb-6">
                            <span className="text-4xl">🎮</span>
                        </div>

                        <h2 className="text-2xl font-bold text-warm-800 mb-4">Stroop 色词测试</h2>

                        <p className="text-warm-600 mb-6">
                            屏幕上会显示表示颜色的文字，但文字本身的颜色可能不同。<br />
                            请<span className="font-bold text-purple-600">点击文字显示的颜色</span>，而不是文字的含义！
                        </p>

                        {/* Example */}
                        <div className="bg-warm-50 rounded-xl p-4 mb-6">
                            <p className="text-sm text-warm-500 mb-2">示例：</p>
                            <p className="text-2xl font-bold" style={{ color: '#3B82F6' }}>红色</p>
                            <p className="text-sm text-warm-500 mt-2">正确答案是：<span className="text-blue-500 font-bold">蓝色</span></p>
                        </div>

                        {/* Controls hint */}
                        <div className="grid grid-cols-4 gap-2 mb-6">
                            {COLORS.map(c => (
                                <div key={c.name} className="text-center">
                                    <div
                                        className="w-8 h-8 rounded-lg mx-auto mb-1 flex items-center justify-center text-white font-bold"
                                        style={{ backgroundColor: c.value }}
                                    >
                                        {c.key.toUpperCase()}
                                    </div>
                                    <span className="text-xs text-warm-500">{c.name}</span>
                                </div>
                            ))}
                        </div>

                        <p className="text-xs text-warm-400 mb-6">
                            💡 可以使用键盘快捷键 R/B/G/Y 快速作答
                        </p>

                        <div className="flex space-x-3">
                            {onClose && (
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 border border-warm-300 text-warm-600 rounded-xl hover:bg-warm-50 transition-all"
                                >
                                    返回
                                </button>
                            )}
                            <button
                                onClick={startGame}
                                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
                            >
                                开始测试 ({trialCount} 题)
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Countdown Phase */}
                {phase === 'countdown' && (
                    <motion.div
                        key="countdown"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        className="flex items-center justify-center h-80"
                    >
                        <motion.div
                            key={countdown}
                            initial={{ scale: 1.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className="text-8xl font-bold text-purple-500"
                        >
                            {countdown}
                        </motion.div>
                    </motion.div>
                )}

                {/* Playing Phase */}
                {phase === 'playing' && currentTrial && (
                    <motion.div
                        key="playing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="bg-white rounded-2xl shadow-xl p-8"
                    >
                        {/* Progress */}
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-warm-500">第 {trialIndex + 1} / {trialCount} 题</span>
                            <div className="w-32 h-2 bg-warm-100 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-purple-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${((trialIndex + 1) / trialCount) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Word Display */}
                        <div className="relative h-32 flex items-center justify-center mb-8">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={trialIndex}
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.5, opacity: 0 }}
                                    className="text-5xl font-bold"
                                    style={{ color: currentTrial.displayColor }}
                                >
                                    {currentTrial.word}
                                </motion.div>
                            </AnimatePresence>

                            {/* Feedback overlay */}
                            {feedback && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className={`absolute inset-0 flex items-center justify-center ${feedback === 'correct' ? 'text-green-500' : 'text-red-500'
                                        }`}
                                >
                                    <span className="text-6xl">
                                        {feedback === 'correct' ? '✓' : '✗'}
                                    </span>
                                </motion.div>
                            )}
                        </div>

                        {/* Color Buttons */}
                        <div className="grid grid-cols-4 gap-3">
                            {COLORS.map(color => (
                                <motion.button
                                    key={color.name}
                                    onClick={() => handleResponse(color.name)}
                                    className="py-4 rounded-xl text-white font-medium transition-all hover:scale-105 active:scale-95"
                                    style={{ backgroundColor: color.value }}
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    {color.name}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Result Phase */}
                {phase === 'result' && finalResult && (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white rounded-2xl shadow-xl p-8"
                    >
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mx-auto flex items-center justify-center mb-4">
                                <span className="text-4xl">🏆</span>
                            </div>
                            <h2 className="text-2xl font-bold text-warm-800">测试完成！</h2>
                        </div>

                        {/* Main Scores */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-purple-50 rounded-xl p-4 text-center">
                                <div className={`text-3xl font-bold ${getScoreColor(finalResult.attentionScore)}`}>
                                    {finalResult.attentionScore}
                                </div>
                                <div className="text-sm text-purple-400">注意力评分</div>
                            </div>
                            <div className="bg-pink-50 rounded-xl p-4 text-center">
                                <div className={`text-3xl font-bold ${getScoreColor(finalResult.cognitiveFlexibility)}`}>
                                    {finalResult.cognitiveFlexibility}
                                </div>
                                <div className="text-sm text-pink-400">认知灵活性</div>
                            </div>
                        </div>

                        {/* Detailed Stats */}
                        <div className="bg-warm-50 rounded-xl p-4 space-y-2 mb-6">
                            <div className="flex justify-between">
                                <span className="text-warm-600">正确率</span>
                                <span className="font-medium">{finalResult.accuracy}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-warm-600">平均反应时间</span>
                                <span className="font-medium">{finalResult.avgResponseTime}ms</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-warm-600">Stroop效应</span>
                                <span className="font-medium">{finalResult.stroopEffect}ms</span>
                            </div>
                        </div>

                        {/* Interpretation */}
                        <div className="bg-blue-50 rounded-xl p-4 mb-6">
                            <p className="text-sm text-blue-700">
                                {finalResult.cognitiveFlexibility >= 80
                                    ? '🎉 太棒了！您的认知灵活性非常好，能够快速切换注意力。'
                                    : finalResult.cognitiveFlexibility >= 60
                                        ? '👍 不错！您的认知功能处于正常水平。'
                                        : '💡 建议多进行类似的认知训练游戏来提升注意力灵活性。'}
                            </p>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={() => setPhase('intro')}
                                className="flex-1 py-3 border border-purple-300 text-purple-600 rounded-xl hover:bg-purple-50 transition-all"
                            >
                                再玩一次
                            </button>
                            {onClose && (
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-all"
                                >
                                    完成
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

StroopTest.displayName = 'StroopTest';
