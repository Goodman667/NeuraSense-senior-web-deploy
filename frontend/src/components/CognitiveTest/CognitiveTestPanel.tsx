/**
 * CognitiveTestPanel Component
 * 
 * Interactive cognitive assessment tests including:
 * - Eye tracking challenge (follow moving target)
 * - Attention focus test (maintain gaze on target)
 * - Reaction time test
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { API_BASE } from '../../config/api';

type TestType = 'eye_tracking' | 'attention' | 'reaction';
type TestStatus = 'idle' | 'countdown' | 'running' | 'completed';

interface TestResult {
    testType: TestType;
    score: number;
    accuracy: number;
    averageTime: number;
    timestamp: number;
}

interface CognitiveTestPanelProps {
    onTestComplete?: (result: TestResult) => void;
    className?: string;
}

// Test configurations
const TEST_CONFIG = {
    eye_tracking: {
        name: '眼球追踪测试',
        description: '用眼睛跟随移动的目标点',
        duration: 15000,
        icon: '👁️',
        color: 'from-blue-500 to-cyan-500',
    },
    attention: {
        name: '注意力集中测试',
        description: '持续注视中心目标',
        duration: 30000,
        icon: '🎯',
        color: 'from-green-500 to-emerald-500',
    },
    reaction: {
        name: '反应速度测试',
        description: '目标出现时快速点击',
        duration: 20000,
        icon: '⚡',
        color: 'from-yellow-500 to-orange-500',
    },
};

export const CognitiveTestPanel = ({
    onTestComplete,
    className = '',
}: CognitiveTestPanelProps) => {
    const [selectedTest, setSelectedTest] = useState<TestType | null>(null);
    const [status, setStatus] = useState<TestStatus>('idle');
    const [countdown, setCountdown] = useState(3);
    const [result, setResult] = useState<TestResult | null>(null);

    // Eye tracking test state
    const [targetPosition, setTargetPosition] = useState({ x: 50, y: 50 });
    const [clickPositions, setClickPositions] = useState<{ x: number, y: number }[]>([]);

    // Reaction test state
    const [showTarget, setShowTarget] = useState(false);
    const [reactionTimes, setReactionTimes] = useState<number[]>([]);
    const targetAppearTimeRef = useRef<number>(0);
    const testIntervalRef = useRef<number | null>(null);

    // Attention test state
    const [attentionScore, setAttentionScore] = useState(100);
    const [gazeBreaks, setGazeBreaks] = useState(0);

    // AI Analysis
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState<{
        analysis?: string;
        recommendations?: string[];
        cognitive_score?: number;
    } | null>(null);
    const [showAiModal, setShowAiModal] = useState(false);

    // Start test with countdown
    const startTest = useCallback((testType: TestType) => {
        setSelectedTest(testType);
        setStatus('countdown');
        setCountdown(3);
        setResult(null);
        setClickPositions([]);
        setReactionTimes([]);
        setAttentionScore(100);
        setGazeBreaks(0);

        // Countdown
        let count = 3;
        const countdownInterval = setInterval(() => {
            count--;
            setCountdown(count);
            if (count <= 0) {
                clearInterval(countdownInterval);
                setStatus('running');
                runTest(testType);
            }
        }, 1000);
    }, []);

    // Run specific test
    const runTest = useCallback((testType: TestType) => {
        const config = TEST_CONFIG[testType];

        if (testType === 'eye_tracking') {
            // Moving target test
            testIntervalRef.current = window.setInterval(() => {
                setTargetPosition({
                    x: 10 + Math.random() * 80,
                    y: 10 + Math.random() * 80,
                });
            }, 1000);

            setTimeout(() => endTest(testType), config.duration);
        }

        if (testType === 'reaction') {
            // Reaction time test - show target at random intervals
            let attempts = 0;
            const showNewTarget = () => {
                if (attempts >= 10) {
                    endTest(testType);
                    return;
                }

                setShowTarget(false);
                const delay = 1000 + Math.random() * 2000;

                setTimeout(() => {
                    targetAppearTimeRef.current = Date.now();
                    setShowTarget(true);
                    attempts++;
                }, delay);
            };

            showNewTarget();

            // Store function for later cleanup
            (window as any).__reactionTestFunc = showNewTarget;
        }

        if (testType === 'attention') {
            // Attention test - track gaze breaks
            let score = 100;
            testIntervalRef.current = window.setInterval(() => {
                // Simulate gaze detection (in real app, would use eye tracking)
                const gazeMaintained = Math.random() > 0.1;
                if (!gazeMaintained) {
                    score = Math.max(0, score - 5);
                    setAttentionScore(score);
                    setGazeBreaks(prev => prev + 1);
                }
            }, 500);

            setTimeout(() => endTest(testType), config.duration);
        }
    }, []);

    // End test and calculate results
    const endTest = useCallback((testType: TestType) => {
        if (testIntervalRef.current) {
            clearInterval(testIntervalRef.current);
            testIntervalRef.current = null;
        }

        setShowTarget(false);
        setStatus('completed');

        let testResult: TestResult;

        if (testType === 'eye_tracking') {
            const accuracy = Math.min(100, clickPositions.length * 10);
            testResult = {
                testType,
                score: accuracy,
                accuracy,
                averageTime: 1000, // Placeholder
                timestamp: Date.now(),
            };
        } else if (testType === 'reaction') {
            const avgTime = reactionTimes.length > 0
                ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
                : 1000;
            // Score based on reaction time (lower is better)
            const score = Math.max(0, 100 - (avgTime - 200) / 10);
            testResult = {
                testType,
                score: Math.round(score),
                accuracy: (reactionTimes.length / 10) * 100,
                averageTime: Math.round(avgTime),
                timestamp: Date.now(),
            };
        } else {
            testResult = {
                testType,
                score: attentionScore,
                accuracy: 100 - gazeBreaks * 5,
                averageTime: 0,
                timestamp: Date.now(),
            };
        }

        setResult(testResult);
        if (onTestComplete) {
            onTestComplete(testResult);
        }
    }, [clickPositions, reactionTimes, attentionScore, gazeBreaks, onTestComplete]);

    // Handle click during tests
    const handleTestAreaClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (status !== 'running') return;

        if (selectedTest === 'eye_tracking') {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            setClickPositions(prev => [...prev, { x, y }]);
        }

        if (selectedTest === 'reaction' && showTarget) {
            const reactionTime = Date.now() - targetAppearTimeRef.current;
            setReactionTimes(prev => [...prev, reactionTime]);
            setShowTarget(false);

            // Show next target
            const showNewTarget = (window as any).__reactionTestFunc;
            if (showNewTarget) {
                setTimeout(showNewTarget, 500);
            }
        }
    }, [status, selectedTest, showTarget]);

    // AI Analysis of results
    const handleAiAnalysis = useCallback(async () => {
        if (!result) return;

        setIsAnalyzing(true);
        try {
            const response = await fetch(`${API_BASE}/counselor/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `请分析以下认知测试结果并给出专业建议：
测试类型: ${TEST_CONFIG[result.testType].name}
得分: ${result.score}分
准确率: ${result.accuracy}%
${result.testType === 'reaction' ? `平均反应时间: ${result.averageTime}ms` : ''}

请从以下几个方面分析（用JSON格式回复）：
1. analysis: 对测试结果的专业解读 (50-80字)
2. cognitive_score: 认知功能评分 (0-100)
3. recommendations: 3条改善建议`,
                    user_id: 'cognitive_test',
                }),
            });

            if (response.ok) {
                const data = await response.json();
                try {
                    const parsed = JSON.parse(data.response.match(/\{[\s\S]*\}/)?.[0] || '{}');
                    setAiResult(parsed);
                } catch {
                    setAiResult({
                        analysis: data.response,
                        cognitive_score: result.score,
                        recommendations: ['保持规律作息', '适当进行认知训练', '充足睡眠'],
                    });
                }
                setShowAiModal(true);
            }
        } catch (error) {
            console.error('AI analysis failed:', error);
        }
        setIsAnalyzing(false);
    }, [result]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (testIntervalRef.current) {
                clearInterval(testIntervalRef.current);
            }
        };
    }, []);

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-500';
        if (score >= 60) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-warm-200/50 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 text-white">
                <div className="flex items-center space-x-2">
                    <span className="text-xl">🧩</span>
                    <span className="font-medium">认知功能测试</span>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Test Selection */}
                {status === 'idle' && !result && (
                    <div className="space-y-3">
                        <p className="text-sm text-warm-600 text-center">
                            选择一项测试来评估您的认知功能
                        </p>
                        {(Object.entries(TEST_CONFIG) as [TestType, typeof TEST_CONFIG.eye_tracking][]).map(([type, config]) => (
                            <button
                                key={type}
                                onClick={() => startTest(type)}
                                className={`w-full p-4 rounded-xl bg-gradient-to-r ${config.color} text-white hover:opacity-90 transition-all`}
                            >
                                <div className="flex items-center space-x-3">
                                    <span className="text-2xl">{config.icon}</span>
                                    <div className="text-left">
                                        <div className="font-medium">{config.name}</div>
                                        <div className="text-sm opacity-80">{config.description}</div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Countdown */}
                {status === 'countdown' && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="text-6xl font-bold text-indigo-500 animate-pulse">
                            {countdown}
                        </div>
                        <p className="mt-4 text-warm-600">准备开始...</p>
                    </div>
                )}

                {/* Test Area */}
                {status === 'running' && selectedTest && (
                    <div
                        className="relative aspect-square bg-warm-50 rounded-xl cursor-crosshair overflow-hidden"
                        onClick={handleTestAreaClick}
                    >
                        {/* Eye Tracking Target */}
                        {selectedTest === 'eye_tracking' && (
                            <div
                                className="absolute w-8 h-8 bg-blue-500 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center"
                                style={{
                                    left: `${targetPosition.x}%`,
                                    top: `${targetPosition.y}%`,
                                    transform: 'translate(-50%, -50%)',
                                }}
                            >
                                <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                        )}

                        {/* Attention Target */}
                        {selectedTest === 'attention' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full border-4 border-green-500 flex items-center justify-center">
                                        <div className="w-4 h-4 bg-green-500 rounded-full" />
                                    </div>
                                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-sm text-warm-600">
                                        注视中心点
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Reaction Target */}
                        {selectedTest === 'reaction' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                {showTarget ? (
                                    <div className="w-20 h-20 bg-yellow-500 rounded-full shadow-xl animate-ping-once flex items-center justify-center cursor-pointer">
                                        <span className="text-2xl">👆</span>
                                    </div>
                                ) : (
                                    <p className="text-warm-400">等待目标出现...</p>
                                )}
                            </div>
                        )}

                        {/* Progress indicator */}
                        <div className="absolute bottom-2 left-2 right-2 text-center">
                            {selectedTest === 'eye_tracking' && (
                                <span className="text-sm text-warm-500">点击: {clickPositions.length}</span>
                            )}
                            {selectedTest === 'reaction' && (
                                <span className="text-sm text-warm-500">完成: {reactionTimes.length}/10</span>
                            )}
                            {selectedTest === 'attention' && (
                                <span className="text-sm text-warm-500">专注度: {attentionScore}%</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Results */}
                {status === 'completed' && result && (
                    <div className="space-y-4">
                        <div className="text-center">
                            <div className="text-6xl mb-2">{TEST_CONFIG[result.testType].icon}</div>
                            <h3 className="text-lg font-bold text-warm-800">测试完成！</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-indigo-50 rounded-xl p-3 text-center">
                                <div className={`text-3xl font-bold ${getScoreColor(result.score)}`}>
                                    {result.score}
                                </div>
                                <div className="text-xs text-indigo-400">综合得分</div>
                            </div>
                            <div className="bg-purple-50 rounded-xl p-3 text-center">
                                <div className={`text-3xl font-bold ${getScoreColor(result.accuracy)}`}>
                                    {result.accuracy.toFixed(0)}%
                                </div>
                                <div className="text-xs text-purple-400">准确率</div>
                            </div>
                        </div>

                        {result.testType === 'reaction' && (
                            <div className="bg-yellow-50 rounded-xl p-3 text-center">
                                <div className="text-2xl font-bold text-yellow-600">
                                    {result.averageTime}ms
                                </div>
                                <div className="text-xs text-yellow-400">平均反应时间</div>
                            </div>
                        )}

                        {/* AI Analysis Button */}
                        <button
                            onClick={handleAiAnalysis}
                            disabled={isAnalyzing}
                            className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                        >
                            {isAnalyzing ? (
                                <>
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>分析中...</span>
                                </>
                            ) : (
                                <>
                                    <span>🧠</span>
                                    <span>AI 认知分析</span>
                                </>
                            )}
                        </button>

                        {/* Restart */}
                        <button
                            onClick={() => { setStatus('idle'); setResult(null); setSelectedTest(null); }}
                            className="w-full py-2.5 bg-warm-100 text-warm-700 rounded-xl font-medium hover:bg-warm-200 transition-all"
                        >
                            返回测试选择
                        </button>
                    </div>
                )}
            </div>

            {/* AI Result Modal */}
            {showAiModal && aiResult && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAiModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4 text-white">
                            <h3 className="text-lg font-bold flex items-center space-x-2">
                                <span>🧠</span>
                                <span>AI 认知分析报告</span>
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            {aiResult.cognitive_score !== undefined && (
                                <div className="bg-indigo-50 rounded-xl p-4 text-center">
                                    <div className={`text-4xl font-bold ${getScoreColor(aiResult.cognitive_score)}`}>
                                        {aiResult.cognitive_score}
                                    </div>
                                    <div className="text-sm text-indigo-400">认知功能评分</div>
                                </div>
                            )}

                            {aiResult.analysis && (
                                <div className="bg-warm-50 rounded-xl p-4">
                                    <h4 className="font-medium text-warm-800 mb-2">📊 专业分析</h4>
                                    <p className="text-sm text-warm-600 leading-relaxed">{aiResult.analysis}</p>
                                </div>
                            )}

                            {aiResult.recommendations && aiResult.recommendations.length > 0 && (
                                <div className="bg-green-50 rounded-xl p-4">
                                    <h4 className="font-medium text-green-800 mb-2">💡 改善建议</h4>
                                    <ul className="space-y-1">
                                        {aiResult.recommendations.map((rec, i) => (
                                            <li key={i} className="text-sm text-green-600 flex items-start">
                                                <span className="mr-2">•</span>
                                                <span>{rec}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button
                                onClick={() => setShowAiModal(false)}
                                className="w-full py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-all"
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

CognitiveTestPanel.displayName = 'CognitiveTestPanel';
