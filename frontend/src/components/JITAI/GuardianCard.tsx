/**
 * JITAI Guardian Card Component
 * 
 * Displays real-time risk level with warm colors
 * and triggers intervention notifications
 */

import { useMemo } from 'react';
import type { RiskLevel } from '../../hooks/useJITAI';

interface GuardianCardProps {
    vulnerabilityScore: number;
    riskLevel: RiskLevel;
    contributingFactors: string[];
    lastCheck: Date | null;
    isLoading: boolean;
    onCheckNow?: () => void;
}

const RISK_CONFIG = {
    low: {
        label: '状态良好',
        icon: '💚',
        gradient: 'from-emerald-400 to-teal-500',
        bgGradient: 'from-emerald-50 to-teal-50',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-200',
        description: '你的心理健康状态良好，继续保持！',
    },
    medium: {
        label: '需要关注',
        icon: '💛',
        gradient: 'from-amber-400 to-orange-400',
        bgGradient: 'from-amber-50 to-orange-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
        description: '最近可能有些压力，记得照顾自己。',
    },
    high: {
        label: '建议干预',
        icon: '🧡',
        gradient: 'from-orange-400 to-rose-400',
        bgGradient: 'from-orange-50 to-rose-50',
        textColor: 'text-orange-700',
        borderColor: 'border-orange-200',
        description: '检测到你可能需要一些支持。',
    },
};

export const GuardianCard = ({
    vulnerabilityScore,
    riskLevel,
    contributingFactors,
    lastCheck,
    isLoading,
    onCheckNow,
}: GuardianCardProps) => {
    const config = RISK_CONFIG[riskLevel];

    const formattedTime = useMemo(() => {
        if (!lastCheck) return '尚未检测';
        const now = new Date();
        const diff = Math.floor((now.getTime() - lastCheck.getTime()) / 1000);
        if (diff < 60) return '刚刚';
        if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
        return `${Math.floor(diff / 3600)}小时前`;
    }, [lastCheck]);

    const scorePercent = Math.round(vulnerabilityScore * 100);

    return (
        <div className={`bg-gradient-to-br ${config.bgGradient} rounded-2xl border ${config.borderColor} p-5 shadow-lg overflow-hidden relative`}>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
                <div className={`w-full h-full bg-gradient-to-br ${config.gradient} rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2`} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 bg-gradient-to-br ${config.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                        <span className="text-2xl">{config.icon}</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-warm-800 flex items-center space-x-2">
                            <span>实时守护</span>
                            {isLoading && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                            )}
                        </h3>
                        <p className="text-sm text-warm-500">
                            上次检测: {formattedTime}
                        </p>
                    </div>
                </div>

                {onCheckNow && (
                    <button
                        onClick={onCheckNow}
                        disabled={isLoading}
                        className="p-2 rounded-lg bg-white/50 hover:bg-white/80 transition-colors disabled:opacity-50"
                        title="立即检测"
                    >
                        <svg className={`w-5 h-5 text-warm-600 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Risk Level Display */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className={`font-bold ${config.textColor}`}>{config.label}</span>
                    <span className="text-sm text-warm-500">{scorePercent}%</span>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                    <div
                        className={`h-full bg-gradient-to-r ${config.gradient} transition-all duration-500 ease-out`}
                        style={{ width: `${scorePercent}%` }}
                    />
                </div>

                <p className="text-sm text-warm-600 mt-2">{config.description}</p>
            </div>

            {/* Contributing factors */}
            {contributingFactors.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs text-warm-500 font-medium">影响因素:</p>
                    <div className="flex flex-wrap gap-2">
                        {contributingFactors.slice(0, 3).map((factor, idx) => (
                            <span
                                key={idx}
                                className="px-2 py-1 bg-white/50 rounded-lg text-xs text-warm-600"
                            >
                                {factor}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Pulsing animation for high risk */}
            {riskLevel === 'high' && (
                <div className="absolute top-3 right-3 w-3 h-3">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
                </div>
            )}
        </div>
    );
};

export default GuardianCard;
