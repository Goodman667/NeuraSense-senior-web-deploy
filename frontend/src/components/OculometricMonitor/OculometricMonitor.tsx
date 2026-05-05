/**
 * OculometricMonitor Component
 * 
 * Visualization component for real-time fatigue monitoring
 * using the useOculometricSensor hook.
 */

import { useEffect, useState, useCallback } from 'react';
import {
    useOculometricSensor,
    FatigueLevel,
    EyeState,
    type BioSignalMetrics
} from '../../hooks/useOculometricSensor';
import { API_BASE } from '../../config/api';

export interface OculometricMonitorProps {
    onMetricsUpdate?: (metrics: BioSignalMetrics) => void;
    showVideo?: boolean;
    showDebugCanvas?: boolean;
    className?: string;
}

/**
 * Get color for fatigue level
 */
const getFatigueLevelColor = (level: FatigueLevel): string => {
    switch (level) {
        case FatigueLevel.NORMAL:
            return 'text-green-500';
        case FatigueLevel.MILD:
            return 'text-yellow-500';
        case FatigueLevel.MODERATE:
            return 'text-orange-500';
        case FatigueLevel.SEVERE:
            return 'text-red-500';
        default:
            return 'text-gray-500';
    }
};

/**
 * Get label for fatigue level in Chinese
 */
const getFatigueLevelLabel = (level: FatigueLevel): string => {
    switch (level) {
        case FatigueLevel.NORMAL:
            return '正常';
        case FatigueLevel.MILD:
            return '轻度疲劳';
        case FatigueLevel.MODERATE:
            return '中度疲劳';
        case FatigueLevel.SEVERE:
            return '重度疲劳';
        default:
            return '未知';
    }
};

/**
 * Get eye state label in Chinese
 */
const getEyeStateLabel = (state: EyeState): string => {
    switch (state) {
        case EyeState.OPEN:
            return '睁眼';
        case EyeState.BLINKING:
            return '眨眼中';
        case EyeState.CLOSED:
            return '闭眼';
        default:
            return '未知';
    }
};

export const OculometricMonitor = ({
    onMetricsUpdate,
    showVideo = true,
    showDebugCanvas = false,
    className = '',
}: OculometricMonitorProps) => {
    const {
        metrics,
        isRunning,
        error,
        startTracking,
        stopTracking,
        videoRef,
        canvasRef,
        config,
    } = useOculometricSensor();

    // AI Analysis state
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState<{
        overall_state?: string;
        stress_level?: number;
        fatigue_index?: number;
        attention_score?: number;
        analysis?: string;
        recommendations?: string[];
    } | null>(null);
    const [showAiModal, setShowAiModal] = useState(false);

    // AI Analysis function
    const handleAiAnalysis = useCallback(async () => {
        if (!metrics.isTracking) return;

        setIsAnalyzing(true);
        try {
            const response = await fetch(`${API_BASE}/biosignal/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eye_metrics: {
                        blink_rate: metrics.blinkRate,
                        perclos: metrics.drowsinessIndex / 100,
                        gaze_stability: 0.85,
                        fatigue_level: metrics.fatigueLevel,
                        tracking_duration: Math.floor(metrics.sessionDuration),
                    },
                    analysis_type: 'eye_only',
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

    // Callback when metrics update
    useEffect(() => {
        if (onMetricsUpdate && metrics.isTracking) {
            onMetricsUpdate(metrics);
        }
    }, [metrics, onMetricsUpdate]);

    // Format time as MM:SS
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-warm-200/50 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-accent-500 px-4 py-3 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="font-medium">眼动疲劳监测</span>
                    </div>
                    {isRunning && (
                        <span className="flex items-center space-x-1 text-sm">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            <span>{metrics.fps} FPS</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Video Feed */}
            <div className="relative">
                <video
                    ref={videoRef}
                    className={`w-full ${showVideo ? 'block' : 'hidden'}`}
                    style={{ maxHeight: 240 }}
                    playsInline
                    muted
                />
                {showDebugCanvas && (
                    <canvas
                        ref={canvasRef}
                        width={config.videoWidth}
                        height={config.videoHeight}
                        className="absolute top-0 left-0 w-full pointer-events-none"
                        style={{ maxHeight: 240 }}
                    />
                )}

                {/* Overlay status */}
                {!isRunning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-warm-100/80">
                        <p className="text-warm-600">点击"开始监测"启动摄像头</p>
                    </div>
                )}
            </div>

            {/* Metrics Grid */}
            <div className="p-4 space-y-4">
                {/* Error display */}
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Main metrics */}
                {isRunning && (
                    <>
                        {/* Fatigue Level - Large Display */}
                        <div className="text-center py-4 bg-warm-50 rounded-xl">
                            <p className="text-sm text-warm-500 mb-1">疲劳等级</p>
                            <p className={`text-3xl font-bold ${getFatigueLevelColor(metrics.fatigueLevel)}`}>
                                {getFatigueLevelLabel(metrics.fatigueLevel)}
                            </p>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-3 gap-3">
                            {/* Blink Rate */}
                            <div className="text-center p-3 bg-warm-50 rounded-xl">
                                <p className="text-xs text-warm-500">眨眼频率</p>
                                <p className={`text-xl font-bold ${metrics.isBlinkRateAbnormal ? 'text-orange-500' : 'text-warm-800'}`}>
                                    {metrics.blinkRate}
                                </p>
                                <p className="text-xs text-warm-400">次/分钟</p>
                            </div>

                            {/* PERCLOS */}
                            <div className="text-center p-3 bg-warm-50 rounded-xl">
                                <p className="text-xs text-warm-500">PERCLOS</p>
                                <p className="text-xl font-bold text-warm-800">
                                    {metrics.drowsinessIndex.toFixed(1)}%
                                </p>
                                <p className="text-xs text-warm-400">闭眼时间占比</p>
                            </div>

                            {/* Session Time */}
                            <div className="text-center p-3 bg-warm-50 rounded-xl">
                                <p className="text-xs text-warm-500">监测时长</p>
                                <p className="text-xl font-bold text-warm-800">
                                    {formatTime(metrics.sessionDuration)}
                                </p>
                                <p className="text-xs text-warm-400">
                                    共 {metrics.blinkCount} 次眨眼
                                </p>
                            </div>
                        </div>

                        {/* Eye State Indicator */}
                        <div className="flex items-center justify-between px-3 py-2 bg-warm-50 rounded-lg">
                            <span className="text-sm text-warm-600">眼睛状态</span>
                            <span className={`text-sm font-medium ${metrics.eyeState === EyeState.OPEN ? 'text-green-500' :
                                metrics.eyeState === EyeState.BLINKING ? 'text-yellow-500' :
                                    'text-red-500'
                                }`}>
                                {getEyeStateLabel(metrics.eyeState)}
                            </span>
                        </div>

                        {/* Human-readable Health Advice */}
                        <div className="p-3 bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl border border-primary-100">
                            <p className="text-sm font-medium text-warm-800 mb-1">💡 健康建议</p>
                            <p className="text-sm text-warm-600">
                                {metrics.fatigueLevel === FatigueLevel.NORMAL &&
                                    "您的状态很好！眼部活动正常，注意力集中。继续保持~"}
                                {metrics.fatigueLevel === FatigueLevel.MILD &&
                                    "检测到轻微疲劳迹象。建议看看远处，让眼睛休息一下。"}
                                {metrics.fatigueLevel === FatigueLevel.MODERATE &&
                                    "您可能有些累了。建议起来走动一下，喝杯水，做几次深呼吸。"}
                                {metrics.fatigueLevel === FatigueLevel.SEVERE &&
                                    "疲劳程度较高，建议尽快休息。如果持续感到疲惫，请考虑进行呼吸放松训练。"}
                            </p>
                            {metrics.drowsinessIndex > 15 && (
                                <p className="text-xs text-orange-600 mt-2">
                                    ⚠️ 闭眼时间偏长（PERCLOS {metrics.drowsinessIndex.toFixed(0)}%），请注意休息
                                </p>
                            )}
                        </div>
                    </>
                )}

                {/* Control Buttons */}
                <div className="flex space-x-3">
                    {!isRunning ? (
                        <button
                            onClick={startTracking}
                            className="flex-1 py-2.5 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-medium hover:from-primary-600 hover:to-accent-600 transition-all flex items-center justify-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>开始监测</span>
                        </button>
                    ) : (
                        <button
                            onClick={stopTracking}
                            className="flex-1 py-2.5 bg-warm-200 text-warm-700 rounded-xl font-medium hover:bg-warm-300 transition-all flex items-center justify-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                            </svg>
                            <span>停止监测</span>
                        </button>
                    )}
                </div>

                {/* AI Analysis Button */}
                {isRunning && metrics.sessionDuration > 10 && (
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
                                <span>AI 智能分析</span>
                            </>
                        )}
                    </button>
                )}

                {/* Info text */}
                <p className="text-xs text-warm-400 text-center">
                    基于 MediaPipe Face Mesh 的非接触式眼动追踪
                </p>
            </div>

            {/* AI Analysis Result Modal */}
            {showAiModal && aiResult && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAiModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4 text-white">
                            <h3 className="text-lg font-bold flex items-center space-x-2">
                                <span>🧠</span>
                                <span>AI 眼部生物信号分析</span>
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Status Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-indigo-50 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-bold text-indigo-600">{aiResult.overall_state || '良好'}</div>
                                    <div className="text-xs text-indigo-400">整体状态</div>
                                </div>
                                <div className="bg-purple-50 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-bold text-purple-600">{aiResult.fatigue_index || 25}%</div>
                                    <div className="text-xs text-purple-400">療劳指数</div>
                                </div>
                                <div className="bg-blue-50 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-bold text-blue-600">{aiResult.stress_level || 30}%</div>
                                    <div className="text-xs text-blue-400">压力指数</div>
                                </div>
                                <div className="bg-green-50 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-bold text-green-600">{aiResult.attention_score || 75}</div>
                                    <div className="text-xs text-green-400">注意力评分</div>
                                </div>
                            </div>

                            {/* Analysis */}
                            {aiResult.analysis && (
                                <div className="bg-warm-50 rounded-xl p-4">
                                    <h4 className="font-medium text-warm-800 mb-2">📊 专业分析</h4>
                                    <p className="text-sm text-warm-600 leading-relaxed">{aiResult.analysis}</p>
                                </div>
                            )}

                            {/* Recommendations */}
                            {aiResult.recommendations && aiResult.recommendations.length > 0 && (
                                <div className="bg-green-50 rounded-xl p-4">
                                    <h4 className="font-medium text-green-800 mb-2">💡 专业建议</h4>
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

OculometricMonitor.displayName = 'OculometricMonitor';
