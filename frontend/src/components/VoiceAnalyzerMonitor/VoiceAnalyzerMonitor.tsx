/**
 * VoiceAnalyzerMonitor Component
 * 
 * Visualization component for real-time voice prosody analysis.
 */

import { useEffect, useState, useCallback } from 'react';
import {
    useVoiceAnalyzer,
    type VoiceMetrics
} from '../../hooks/useVoiceAnalyzer';
import { API_BASE } from '../../config/api';

export interface VoiceAnalyzerMonitorProps {
    onMetricsUpdate?: (metrics: VoiceMetrics) => void;
    className?: string;
}

export const VoiceAnalyzerMonitor = ({
    onMetricsUpdate,
    className = '',
}: VoiceAnalyzerMonitorProps) => {
    const {
        metrics,
        isRunning,
        error,
        permissionStatus,
        startAnalyzer,
        stopAnalyzer,
        sampleRate,
    } = useVoiceAnalyzer();

    // Callback when metrics update
    useEffect(() => {
        if (onMetricsUpdate && metrics.features) {
            onMetricsUpdate(metrics);
        }
    }, [metrics, onMetricsUpdate]);

    // AI Analysis state
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState<{
        overall_state?: string;
        stress_level?: number;
        fatigue_index?: number;
        attention_score?: number;
        emotional_state?: string;
        analysis?: string;
        recommendations?: string[];
    } | null>(null);
    const [showAiModal, setShowAiModal] = useState(false);

    // AI Analysis function
    const handleAiAnalysis = useCallback(async () => {
        if (!metrics.features) return;

        setIsAnalyzing(true);
        try {
            const response = await fetch(`${API_BASE}/biosignal/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    voice_metrics: {
                        jitter: metrics.features.jitter,
                        shimmer: metrics.features.shimmer,
                        mean_pitch: metrics.features.pitch,
                        speech_rate: 4.0,
                        pause_ratio: metrics.silenceDuration / (metrics.speakingDuration + metrics.silenceDuration + 0.01),
                        voice_activity: metrics.speechActivityLevel / 100,
                    },
                    analysis_type: 'voice_only',
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setAiResult(data);
                setShowAiModal(true);
            }
        } catch (error) {
            console.error('AI analysis failed:', error);
        }
        setIsAnalyzing(false);
    }, [metrics]);

    // Format time as MM:SS
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Get bar color based on value (0-100)
    const getBarColor = (value: number): string => {
        if (value < 30) return 'bg-green-500';
        if (value < 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-warm-200/50 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-accent-500 to-rose-500 px-4 py-3 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        <span className="font-medium">语音特征分析</span>
                    </div>
                    {isRunning && (
                        <span className="flex items-center space-x-1 text-sm">
                            <span className={`w-2 h-2 rounded-full ${metrics.isSpeaking ? 'bg-green-400 animate-pulse' : 'bg-warm-300'}`}></span>
                            <span>{metrics.isSpeaking ? '正在说话' : '静音'}</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Error display */}
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Permission denied message */}
                {permissionStatus === 'denied' && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                        请在浏览器设置中允许麦克风权限
                    </div>
                )}

                {/* Main metrics */}
                {isRunning && metrics.features && (
                    <>
                        {/* Pitch Display */}
                        <div className="text-center py-3 bg-warm-50 rounded-xl">
                            <p className="text-sm text-warm-500 mb-1">基频 (Pitch)</p>
                            <p className="text-3xl font-bold text-warm-800">
                                {metrics.features.pitch !== null
                                    ? `${metrics.features.pitch.toFixed(0)} Hz`
                                    : '—'
                                }
                            </p>
                            <p className="text-xs text-warm-400">
                                平均: {metrics.avgPitch.toFixed(0)} Hz
                            </p>
                        </div>

                        {/* Jitter & Shimmer Bars */}
                        <div className="space-y-3">
                            {/* Jitter */}
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-warm-600">Jitter (周期抖动)</span>
                                    <span className="font-medium text-warm-800">
                                        {metrics.jitterPercent.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-300 ${getBarColor(metrics.jitterPercent)}`}
                                        style={{ width: `${Math.min(100, metrics.jitterPercent)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Shimmer */}
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-warm-600">Shimmer (振幅抖动)</span>
                                    <span className="font-medium text-warm-800">
                                        {metrics.shimmerPercent.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-300 ${getBarColor(metrics.shimmerPercent)}`}
                                        style={{ width: `${Math.min(100, metrics.shimmerPercent)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Speech Activity */}
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-warm-600">语音活跃度</span>
                                    <span className="font-medium text-warm-800">
                                        {metrics.speechActivityLevel.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary-500 transition-all duration-300"
                                        style={{ width: `${metrics.speechActivityLevel}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Statistics */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-3 bg-warm-50 rounded-xl">
                                <p className="text-xs text-warm-500">说话时长</p>
                                <p className="text-lg font-bold text-warm-800">
                                    {formatTime(metrics.speakingDuration)}
                                </p>
                            </div>
                            <div className="text-center p-3 bg-warm-50 rounded-xl">
                                <p className="text-xs text-warm-500">静音时长</p>
                                <p className="text-lg font-bold text-warm-800">
                                    {formatTime(metrics.silenceDuration)}
                                </p>
                            </div>
                        </div>

                        {/* Technical Info */}
                        <div className="text-xs text-warm-400 text-center">
                            采样率: {sampleRate} Hz |
                            RMS: {metrics.features.rmsDb?.toFixed(1) ?? '—'} dB
                        </div>

                        {/* Human-readable Voice Analysis Interpretation */}
                        <div className="p-3 bg-gradient-to-r from-accent-50 to-rose-50 rounded-xl border border-accent-100">
                            <p className="text-sm font-medium text-warm-800 mb-1">🎤 语音分析解读</p>
                            <p className="text-sm text-warm-600">
                                {metrics.jitterPercent < 30 && metrics.shimmerPercent < 30 &&
                                    "您的语音状态稳定，情绪平稳。语音特征显示放松状态。"
                                }
                                {metrics.jitterPercent >= 30 && metrics.jitterPercent < 60 &&
                                    "语音略有波动，可能有轻微紧张或疲劳。建议放松肩膀，做几次深呼吸。"
                                }
                                {metrics.jitterPercent >= 60 &&
                                    "语音波动较大，可能感到紧张或焦虑。建议尝试呼吸放松：吸气4秒、屏住4秒、呼气6秒。"
                                }
                            </p>
                            {metrics.jitterPercent >= 50 && (
                                <div className="mt-2 p-2 bg-white/60 rounded-lg">
                                    <p className="text-xs text-warm-700">
                                        💡 <strong>放松技巧：</strong>试着用腹式呼吸，说话时放慢语速，会让声音更稳定哦。
                                    </p>
                                </div>
                            )}
                            {metrics.speechActivityLevel < 20 && metrics.silenceDuration > 30 && (
                                <p className="text-xs text-primary-600 mt-2">
                                    💬 您已经沉默了一会儿，如果想聊聊什么，我随时都在。
                                </p>
                            )}
                        </div>
                    </>
                )}

                {/* Control Buttons */}
                <div className="flex space-x-3">
                    {!isRunning ? (
                        <button
                            onClick={startAnalyzer}
                            className="flex-1 py-2.5 bg-gradient-to-r from-accent-500 to-rose-500 text-white rounded-xl font-medium hover:from-accent-600 hover:to-rose-600 transition-all flex items-center justify-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                            <span>开始分析</span>
                        </button>
                    ) : (
                        <button
                            onClick={stopAnalyzer}
                            className="flex-1 py-2.5 bg-warm-200 text-warm-700 rounded-xl font-medium hover:bg-warm-300 transition-all flex items-center justify-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                            </svg>
                            <span>停止分析</span>
                        </button>
                    )}
                </div>

                {/* AI Analysis Button */}
                {isRunning && metrics.speakingDuration > 5 && (
                    <button
                        onClick={handleAiAnalysis}
                        disabled={isAnalyzing}
                        className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
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
                                <span>🎤</span>
                                <span>AI 语音情绪分析</span>
                            </>
                        )}
                    </button>
                )}

                {/* Info text */}
                <p className="text-xs text-warm-400 text-center">
                    基于 Web Audio API 和 AudioWorklet 的实时语音分析
                </p>
            </div>

            {/* AI Analysis Result Modal */}
            {showAiModal && aiResult && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAiModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 text-white">
                            <h3 className="text-lg font-bold flex items-center space-x-2">
                                <span>🎤</span>
                                <span>AI 语音情绪分析</span>
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Status Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-purple-50 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-bold text-purple-600">{aiResult.overall_state || '良好'}</div>
                                    <div className="text-xs text-purple-400">整体状态</div>
                                </div>
                                <div className="bg-pink-50 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-bold text-pink-600">{aiResult.emotional_state || '平静'}</div>
                                    <div className="text-xs text-pink-400">情绪状态</div>
                                </div>
                                <div className="bg-blue-50 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-bold text-blue-600">{aiResult.stress_level || 30}%</div>
                                    <div className="text-xs text-blue-400">压力指数</div>
                                </div>
                                <div className="bg-green-50 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-bold text-green-600">{aiResult.attention_score || 75}</div>
                                    <div className="text-xs text-green-400">活跃度评分</div>
                                </div>
                            </div>

                            {/* Analysis */}
                            {aiResult.analysis && (
                                <div className="bg-warm-50 rounded-xl p-4">
                                    <h4 className="font-medium text-warm-800 mb-2">🎵 语音特征分析</h4>
                                    <p className="text-sm text-warm-600 leading-relaxed">{aiResult.analysis}</p>
                                </div>
                            )}

                            {/* Recommendations */}
                            {aiResult.recommendations && aiResult.recommendations.length > 0 && (
                                <div className="bg-green-50 rounded-xl p-4">
                                    <h4 className="font-medium text-green-800 mb-2">💡 情绪调节建议</h4>
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
                                className="w-full py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-all"
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

VoiceAnalyzerMonitor.displayName = 'VoiceAnalyzerMonitor';
