/**
 * PhysiologicalInsights.tsx
 * 
 * 五维生理雷达图组件
 * 展示心率变异性、睡眠、活动、压力、社交等多维数据
 * 使用原生 SVG 实现以确保稳定渲染 (替换 Recharts)
 */

import React, { useMemo } from 'react';

interface InsightDimension {
    name: string;
    value: number; // 0-1
    color?: string;
}

interface PhysiologicalInsightsProps {
    data: {
        dimensions: InsightDimension[];
        overallScore: number;
    } | null;
    isLoading?: boolean;
    className?: string;
    onConnect?: () => void;
}

export const PhysiologicalInsights: React.FC<PhysiologicalInsightsProps> = ({
    data,
    isLoading = false,
    className = '',
    onConnect
}) => {
    // 默认数据
    const defaultData = useMemo(() => [
        { name: '心率变异性', value: 0.8 },
        { name: '睡眠质量', value: 0.7 },
        { name: '活动水平', value: 0.6 },
        { name: '压力弹性', value: 0.75 },
        { name: '情绪状态', value: 0.85 },
    ], []);

    const dimensions = useMemo(() => {
        if (!data || !data.dimensions) return defaultData;
        return data.dimensions.map(d => ({
            name: d.name,
            value: (typeof d.value === 'number' && isFinite(d.value)) ? d.value : 0,
        }));
    }, [data, defaultData]);

    const score = data ? Math.round(data.overallScore * 100) : 0;

    const getScoreColor = (s: number) => {
        if (s >= 80) return 'text-emerald-600';
        if (s >= 60) return 'text-blue-600';
        if (s >= 40) return 'text-amber-600';
        return 'text-rose-600';
    };

    // SVG 配置
    const width = 320;
    const height = 250;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 90;
    const angles = [0, 72, 144, 216, 288];

    // 极坐标转笛卡尔坐标
    const polarToCartesian = (r: number, angleDeg: number) => {
        const angleRad = (angleDeg - 90) * (Math.PI / 180.0);
        return {
            x: centerX + r * Math.cos(angleRad),
            y: centerY + r * Math.sin(angleRad)
        };
    };

    // 生成多边形路径 points 字符串
    const makePath = (values: number[], maxR: number) => {
        return values.map((v, i) => {
            const { x, y } = polarToCartesian(v * maxR, angles[i]);
            return `${x},${y}`;
        }).join(' ');
    };

    // 背景网格 (0.2, 0.4, 0.6, 0.8, 1.0)
    const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

    // 数据多边形
    const dataValues = dimensions.map(d => Math.max(0, Math.min(1, d.value)));
    const polygonPoints = makePath(dataValues, radius);

    return (
        <div className={`bg-white/80 backdrop-blur rounded-2xl p-6 border border-warm-200/50 hover:shadow-xl transition-all ${className}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <span className="text-2xl">🧬</span>
                    <h3 className="font-bold text-warm-800">生理洞察</h3>
                </div>
                <div className="flex items-center gap-2">
                    {isLoading && <span className="text-xs text-warm-500 animate-pulse">分析中...</span>}
                    {onConnect && (
                        <button
                            onClick={onConnect}
                            className="text-xs px-2 py-1 bg-primary-50 text-primary-600 rounded hover:bg-primary-100 transition-colors"
                        >
                            连接设备
                        </button>
                    )}
                </div>
            </div>

            <p className="text-sm text-warm-500 mb-4">基于可穿戴设备与生物信号的多维分析</p>

            <div className="relative flex items-center justify-center h-64 w-full">
                <svg width="320" height="250" viewBox="0 0 320 250">
                    {/* 网格 */}
                    {gridLevels.map((level, i) => (
                        <polygon
                            key={`grid-${i}`}
                            points={makePath(new Array(5).fill(level), radius)}
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="1"
                        />
                    ))}

                    {/* 轴线 */}
                    {angles.map((angle, i) => {
                        const end = polarToCartesian(radius, angle);
                        return (
                            <line
                                key={`axis-${i}`}
                                x1={centerX} y1={centerY}
                                x2={end.x} y2={end.y}
                                stroke="#e5e7eb"
                                strokeWidth="1"
                            />
                        );
                    })}

                    {/* 标签 */}
                    {dimensions.map((d, i) => {
                        const { x, y } = polarToCartesian(radius + 20, angles[i]);
                        // 调整标签位置，避免重叠
                        let anchor = 'middle';
                        let baseline = 'middle';
                        if (x < centerX - 10) anchor = 'end';
                        if (x > centerX + 10) anchor = 'start';
                        if (y < centerY - 10) baseline = 'auto'; // Top
                        if (y > centerY + 10) baseline = 'hanging'; // Bottom

                        return (
                            <text
                                key={`label-${i}`}
                                x={x} y={y}
                                textAnchor={anchor}
                                dominantBaseline={baseline}
                                fontSize="11"
                                fill="#4b5563"
                            >
                                {d.name}
                            </text>
                        );
                    })}

                    {/* 数据区域 */}
                    <polygon
                        points={polygonPoints}
                        fill="#8b5cf6"
                        fillOpacity="0.4"
                        stroke="#8b5cf6"
                        strokeWidth="2"
                    />

                    {/* 数据点 */}
                    {dimensions.map((_, i) => {
                        const { x, y } = polarToCartesian(dataValues[i] * radius, angles[i]);
                        return (
                            <circle
                                key={`point-${i}`}
                                cx={x} cy={y}
                                r="3"
                                fill="#8b5cf6"
                            />
                        );
                    })}
                </svg>

                {/* 中心分数 */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                        {score}
                    </div>
                    <div className="text-xs text-warm-400">综合分</div>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="bg-emerald-50 rounded-lg p-2 text-center">
                    <div className="text-xs text-emerald-600 mb-1">HRV状态</div>
                    <div className="font-bold text-emerald-700">正常</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                    <div className="text-xs text-blue-600 mb-1">睡眠债</div>
                    <div className="font-bold text-blue-700">-1.5h</div>
                </div>
            </div>
        </div >
    );
};

export default PhysiologicalInsights;
