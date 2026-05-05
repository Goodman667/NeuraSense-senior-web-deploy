/**
 * PredictionTrendChart Component
 * 
 * Visualizes historical PHQ-9 scores (solid line) and AI-predicted future trends (dashed line).
 * Uses recharts for rendering with confidence interval shading.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Area,
    ComposedChart,
    ReferenceLine,
} from 'recharts';
import { API_BASE } from '../../config/api';

interface PredictionData {
    predicted_scores: number[];
    dates: string[];
    confidence_lower: number[];
    confidence_upper: number[];
    trend_direction: string;
    risk_level: string;
    model_confidence: number;
    interpretation: string;
}

interface HistoricalPoint {
    date: string;
    score: number;
}

interface PredictionTrendChartProps {
    historicalData?: HistoricalPoint[];
    onRefresh?: () => void;
    className?: string;
}



export const PredictionTrendChart = ({
    historicalData,
    onRefresh,
    className = '',
}: PredictionTrendChartProps) => {
    const [predictionData, setPredictionData] = useState<PredictionData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch prediction from API
    const fetchPrediction = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/prediction/demo`);
            if (!response.ok) throw new Error('Failed to fetch prediction');

            const data = await response.json();
            setPredictionData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        }

        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchPrediction();
    }, [fetchPrediction]);

    // Combine historical and prediction data for chart
    const chartData = (() => {
        const data: Array<{
            date: string;
            historical?: number;
            predicted?: number;
            confidenceLower?: number;
            confidenceUpper?: number;
        }> = [];

        // Default demo historical data
        const history = historicalData || [
            { date: '12-08', score: 7 },
            { date: '12-09', score: 9 },
            { date: '12-10', score: 8 },
            { date: '12-11', score: 10 },
            { date: '12-12', score: 11 },
            { date: '12-13', score: 9 },
            { date: '12-14', score: 10 },
        ];

        // Add historical points
        history.forEach(point => {
            data.push({
                date: point.date,
                historical: point.score,
            });
        });

        // Add prediction points
        if (predictionData) {
            predictionData.dates.forEach((dateStr, idx) => {
                const date = dateStr.slice(5); // Extract MM-DD
                data.push({
                    date,
                    predicted: predictionData.predicted_scores[idx],
                    confidenceLower: predictionData.confidence_lower[idx],
                    confidenceUpper: predictionData.confidence_upper[idx],
                });
            });
        }

        return data;
    })();

    // Get trend color
    const getTrendColor = (trend: string) => {
        switch (trend) {
            case 'improving': return 'text-green-500';
            case 'worsening': return 'text-red-500';
            default: return 'text-yellow-500';
        }
    };

    // Get risk color
    const getRiskColor = (risk: string) => {
        switch (risk) {
            case 'low': return 'bg-green-100 text-green-700';
            case 'moderate': return 'bg-yellow-100 text-yellow-700';
            case 'high': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-warm-800 flex items-center space-x-2">
                        <span>📈</span>
                        <span>心理健康趋势预测</span>
                    </h3>
                    <p className="text-sm text-warm-500 mt-1">
                        基于历史数据的 AI 智能 7 天趋势预测
                    </p>
                </div>
                <button
                    onClick={() => {
                        fetchPrediction();
                        onRefresh?.();
                    }}
                    disabled={isLoading}
                    className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-all disabled:opacity-50"
                >
                    {isLoading ? '加载中...' : '刷新'}
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Chart */}
            <div className="h-64 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                    {/* @ts-expect-error recharts type incompatibility with React 19 */}
                    <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                            axisLine={{ stroke: '#E5E7EB' }}
                        />
                        <YAxis
                            domain={[0, 27]}
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                            axisLine={{ stroke: '#E5E7EB' }}
                            label={{
                                value: 'PHQ-9',
                                angle: -90,
                                position: 'insideLeft',
                                style: { fontSize: 12, fill: '#9CA3AF' }
                            }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            }}
                            formatter={(value: number, name: string) => {
                                const labels: Record<string, string> = {
                                    historical: '历史数据',
                                    predicted: '预测值',
                                };
                                return [value.toFixed(1), labels[name] || name];
                            }}
                        />
                        <Legend />

                        {/* Severity reference lines */}
                        <ReferenceLine y={5} stroke="#22C55E" strokeDasharray="5 5" label={{ value: '正常', fill: '#22C55E', fontSize: 10 }} />
                        <ReferenceLine y={10} stroke="#EAB308" strokeDasharray="5 5" label={{ value: '轻度', fill: '#EAB308', fontSize: 10 }} />
                        <ReferenceLine y={15} stroke="#F97316" strokeDasharray="5 5" label={{ value: '中度', fill: '#F97316', fontSize: 10 }} />

                        {/* Confidence interval area */}
                        <Area
                            type="monotone"
                            dataKey="confidenceUpper"
                            stroke="none"
                            fill="url(#confidenceGradient)"
                        />

                        {/* Historical line (solid) */}
                        <Line
                            type="monotone"
                            dataKey="historical"
                            stroke="#3B82F6"
                            strokeWidth={3}
                            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, fill: '#3B82F6' }}
                            name="历史数据"
                        />

                        {/* Prediction line (dashed) */}
                        <Line
                            type="monotone"
                            dataKey="predicted"
                            stroke="#8B5CF6"
                            strokeWidth={3}
                            strokeDasharray="8 4"
                            dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, fill: '#8B5CF6' }}
                            name="预测值"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Prediction Summary */}
            {predictionData && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-warm-50 rounded-xl">
                        <div className={`text-lg font-bold ${getTrendColor(predictionData.trend_direction)}`}>
                            {predictionData.trend_direction === 'improving' ? '↗️ 趋势改善' :
                                predictionData.trend_direction === 'worsening' ? '↘️ 需关注' : '→ 稳定'}
                        </div>
                        <div className="text-xs text-warm-500 mt-1">趋势方向</div>
                    </div>

                    <div className="text-center p-3 bg-warm-50 rounded-xl">
                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(predictionData.risk_level)}`}>
                            {predictionData.risk_level === 'low' ? '低风险' : predictionData.risk_level === 'moderate' ? '中风险' : '高风险'}
                        </div>
                        <div className="text-xs text-warm-500 mt-1">风险等级</div>
                    </div>

                    <div className="text-center p-3 bg-warm-50 rounded-xl">
                        <div className="text-lg font-bold text-indigo-600">
                            {Math.round(predictionData.model_confidence * 100)}%
                        </div>
                        <div className="text-xs text-warm-500 mt-1">模型置信度</div>
                    </div>
                </div>
            )}

            {/* Interpretation */}
            {predictionData?.interpretation && (
                <div className="mt-4 p-4 bg-indigo-50 rounded-xl">
                    <p className="text-sm text-indigo-700">
                        🤖 <strong>AI解读：</strong> {predictionData.interpretation}
                    </p>
                </div>
            )}
        </div>
    );
};

PredictionTrendChart.displayName = 'PredictionTrendChart';
