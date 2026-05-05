/**
 * EmotionRadarChart Component
 * 
 * Real-time 7-axis emotion radar visualization using Recharts.
 * Displays AI-detected micro-expressions and emotion intensity.
 */

import { useMemo } from 'react';
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';

export interface EmotionData {
    neutral: number;    // 0-100
    happy: number;
    sad: number;
    angry: number;
    fearful: number;
    disgusted: number;
    surprised: number;
}

interface EmotionRadarChartProps {
    data: EmotionData;
    previousData?: EmotionData;
    showComparison?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const EMOTION_LABELS: Record<keyof EmotionData, string> = {
    neutral: '平静',
    happy: '快乐',
    sad: '悲伤',
    angry: '愤怒',
    fearful: '恐惧',
    disgusted: '厌恶',
    surprised: '惊讶',
};

const EMOTION_COLORS: Record<keyof EmotionData, string> = {
    neutral: '#9CA3AF',
    happy: '#FCD34D',
    sad: '#60A5FA',
    angry: '#F87171',
    fearful: '#A78BFA',
    disgusted: '#34D399',
    surprised: '#F472B6',
};

export const EmotionRadarChart = ({
    data,
    previousData,
    showComparison = false,
    size = 'md',
    className = '',
}: EmotionRadarChartProps) => {
    const chartData = useMemo(() => {
        return (Object.keys(data) as (keyof EmotionData)[]).map(key => ({
            emotion: EMOTION_LABELS[key],
            current: data[key],
            previous: previousData?.[key] ?? 0,
            fullMark: 100,
        }));
    }, [data, previousData]);

    // Find dominant emotion
    const dominantEmotion = useMemo(() => {
        let max = 0;
        let dominant: keyof EmotionData = 'neutral';
        (Object.keys(data) as (keyof EmotionData)[]).forEach(key => {
            if (data[key] > max) {
                max = data[key];
                dominant = key;
            }
        });
        return { key: dominant, value: max };
    }, [data]);

    const sizeClasses = {
        sm: 'h-48',
        md: 'h-64',
        lg: 'h-80',
    };

    return (
        <div className={`${className}`}>
            {/* Dominant Emotion Indicator */}
            <div className="flex items-center justify-center mb-2">
                <span
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                        backgroundColor: `${EMOTION_COLORS[dominantEmotion.key]}20`,
                        color: EMOTION_COLORS[dominantEmotion.key],
                    }}
                >
                    {EMOTION_LABELS[dominantEmotion.key]} {dominantEmotion.value.toFixed(0)}%
                </span>
            </div>

            {/* Radar Chart */}
            <div className={sizeClasses[size]}>
                <ResponsiveContainer width="100%" height="100%">
                    {/* @ts-expect-error recharts type incompatibility with React 19 */}
                    <RadarChart data={chartData}>
                        <PolarGrid
                            stroke="#E5E7EB"
                            strokeDasharray="3 3"
                        />
                        <PolarAngleAxis
                            dataKey="emotion"
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                        />
                        <PolarRadiusAxis
                            angle={90}
                            domain={[0, 100]}
                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                            tickCount={5}
                        />

                        {/* Previous data for comparison */}
                        {showComparison && previousData && (
                            <Radar
                                name="历史"
                                dataKey="previous"
                                stroke="#9CA3AF"
                                fill="#9CA3AF"
                                fillOpacity={0.1}
                                strokeWidth={1}
                                strokeDasharray="5 5"
                            />
                        )}

                        {/* Current data */}
                        <Radar
                            name="当前"
                            dataKey="current"
                            stroke="#8B5CF6"
                            fill="#8B5CF6"
                            fillOpacity={0.3}
                            strokeWidth={2}
                            animationDuration={300}
                        />

                        <Tooltip
                            content={({ payload }) => {
                                if (!payload || !payload.length) return null;
                                const item = payload[0];
                                return (
                                    <div className="bg-white rounded-lg shadow-lg p-2 text-sm border">
                                        <div className="font-medium">{item.payload.emotion}</div>
                                        <div className="text-purple-600">
                                            当前: {(item.value as number).toFixed(1)}%
                                        </div>
                                        {showComparison && (
                                            <div className="text-gray-400">
                                                历史: {item.payload.previous.toFixed(1)}%
                                            </div>
                                        )}
                                    </div>
                                );
                            }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            {/* Emotion Legend */}
            <div className="flex flex-wrap justify-center gap-2 mt-2">
                {(Object.keys(data) as (keyof EmotionData)[]).map(key => (
                    <div
                        key={key}
                        className="flex items-center space-x-1"
                    >
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: EMOTION_COLORS[key] }}
                        />
                        <span className="text-xs text-warm-500">
                            {EMOTION_LABELS[key]}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

EmotionRadarChart.displayName = 'EmotionRadarChart';
