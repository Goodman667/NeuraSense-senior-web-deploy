/**
 * Assessment History Component
 * 
 * Displays user's assessment history with trend charts and comparison.
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../../config/api';

interface HistoryRecord {
    id: string;
    scale_type: string;
    total_score: number;
    answers: number[];
    severity: string;
    ai_interpretation?: string;
    created_at: string;
}

interface AssessmentHistoryProps {
    onClose?: () => void;
}

const SCALE_INFO: Record<string, { name: string; maxScore: number; icon: string; color: string }> = {
    phq9: { name: 'PHQ-9 抑郁', maxScore: 27, icon: '😔', color: 'rose' },
    gad7: { name: 'GAD-7 焦虑', maxScore: 21, icon: '😰', color: 'blue' },
    sds: { name: 'SDS 抑郁自评', maxScore: 80, icon: '💜', color: 'purple' },
    sas: { name: 'SAS 焦虑自评', maxScore: 80, icon: '🧡', color: 'orange' },
    pss10: { name: 'PSS-10 压力感知', maxScore: 40, icon: '💪', color: 'indigo' },
};

export const AssessmentHistory = ({ onClose }: AssessmentHistoryProps) => {
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedScale, setSelectedScale] = useState<string | null>(null);
    const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null);

    // 加载历史记录
    useEffect(() => {
        const loadHistory = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch(
                    `${API_BASE}/history?token=${token}${selectedScale ? `&scale_type=${selectedScale}` : ''}`
                );
                if (response.ok) {
                    const data = await response.json();
                    setHistory(data.history || []);
                }
            } catch (error) {
                console.error('Failed to load history:', error);
            }
            setIsLoading(false);
        };

        loadHistory();
    }, [selectedScale]);

    // 格式化日期
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // 计算趋势
    const getTrend = useCallback(() => {
        if (history.length < 2) return null;
        const recent = history.slice(0, 5);
        const avgRecent = recent.slice(0, 2).reduce((s, r) => s + r.total_score, 0) / Math.min(2, recent.length);
        const avgOlder = recent.slice(2).reduce((s, r) => s + r.total_score, 0) / Math.max(1, recent.slice(2).length);

        if (avgRecent < avgOlder - 2) return { direction: 'improving', text: '好转中', icon: '📈', color: 'green' };
        if (avgRecent > avgOlder + 2) return { direction: 'worsening', text: '需关注', icon: '📉', color: 'red' };
        return { direction: 'stable', text: '保持稳定', icon: '➡️', color: 'yellow' };
    }, [history]);

    const trend = getTrend();

    // 未登录状态
    if (!localStorage.getItem('token')) {
        return (
            <div className="max-w-2xl mx-auto text-center py-16">
                <div className="w-20 h-20 bg-warm-100 rounded-full mx-auto flex items-center justify-center mb-6">
                    <span className="text-4xl">🔒</span>
                </div>
                <h2 className="text-2xl font-bold text-warm-800 mb-3">请先登录</h2>
                <p className="text-warm-600 mb-6">登录后可以查看和保存你的评估历史记录</p>
                <button
                    onClick={onClose}
                    className="px-6 py-3 bg-primary-500 text-white rounded-xl font-medium"
                >
                    返回
                </button>
            </div>
        );
    }

    // 加载中
    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto text-center py-16">
                <div className="animate-spin w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full mx-auto mb-4" />
                <p className="text-warm-600">加载历史记录...</p>
            </div>
        );
    }

    // 详情视图
    if (selectedRecord) {
        const info = SCALE_INFO[selectedRecord.scale_type] || { name: selectedRecord.scale_type, maxScore: 27, icon: '📋', color: 'gray' };
        return (
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={() => setSelectedRecord(null)}
                    className="mb-6 text-warm-600 hover:text-warm-800"
                >
                    ← 返回列表
                </button>

                <div className="bg-white rounded-2xl shadow-lg p-6 border border-warm-100">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <span className="text-3xl">{info.icon}</span>
                            <div>
                                <h3 className="font-bold text-lg text-warm-800">{info.name}</h3>
                                <p className="text-sm text-warm-500">{formatDate(selectedRecord.created_at)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-primary-600">{selectedRecord.total_score}</div>
                            <div className="text-sm text-warm-500">/ {info.maxScore}</div>
                        </div>
                    </div>

                    <div className={`px-4 py-2 rounded-lg bg-${info.color}-50 text-${info.color}-700 font-medium text-center mb-6`}>
                        {selectedRecord.severity}
                    </div>

                    {selectedRecord.ai_interpretation && (
                        <div className="bg-gradient-to-br from-primary-50 to-accent-50 rounded-xl p-4 mb-4">
                            <h4 className="font-medium text-warm-700 mb-2">AI 解读</h4>
                            <p className="text-warm-600 text-sm">{selectedRecord.ai_interpretation}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* 标题 */}
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-warm-800 mb-2">评估历史记录</h2>
                <p className="text-warm-600">追踪你的心理健康变化趋势</p>
            </div>

            {/* 趋势卡片 */}
            {trend && history.length >= 2 && (
                <div className={`mb-6 p-4 bg-${trend.color}-50 border border-${trend.color}-200 rounded-xl flex items-center space-x-4`}>
                    <span className="text-2xl">{trend.icon}</span>
                    <div>
                        <p className={`font-medium text-${trend.color}-800`}>整体趋势: {trend.text}</p>
                        <p className={`text-sm text-${trend.color}-600`}>
                            基于最近 {Math.min(5, history.length)} 次评估分析
                        </p>
                    </div>
                </div>
            )}

            {/* 筛选器 */}
            <div className="flex space-x-2 mb-6 flex-wrap">
                {[
                    { key: null, label: '全部', className: 'bg-primary-500 text-white', inactive: 'bg-warm-100 text-warm-700 hover:bg-warm-200' },
                    { key: 'phq9', label: '😔 PHQ-9', className: 'bg-rose-500 text-white', inactive: 'bg-warm-100 text-warm-700 hover:bg-warm-200' },
                    { key: 'gad7', label: '😰 GAD-7', className: 'bg-blue-500 text-white', inactive: 'bg-warm-100 text-warm-700 hover:bg-warm-200' },
                    { key: 'sds', label: '💜 SDS', className: 'bg-purple-500 text-white', inactive: 'bg-warm-100 text-warm-700 hover:bg-warm-200' },
                    { key: 'sas', label: '🧡 SAS', className: 'bg-orange-500 text-white', inactive: 'bg-warm-100 text-warm-700 hover:bg-warm-200' },
                    { key: 'pss10', label: '💪 PSS-10', className: 'bg-indigo-500 text-white', inactive: 'bg-warm-100 text-warm-700 hover:bg-warm-200' },
                ].map((btn) => (
                    <button
                        key={btn.key ?? 'all'}
                        onClick={() => setSelectedScale(btn.key as string | null)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedScale === btn.key || (!btn.key && !selectedScale)
                                ? btn.className
                                : btn.inactive
                            }`}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>

            {/* 历史列表 */}
            {history.length === 0 ? (
                <div className="text-center py-16 bg-warm-50 rounded-2xl">
                    <span className="text-5xl mb-4 block">📊</span>
                    <p className="text-warm-600">暂无评估记录</p>
                    <p className="text-warm-500 text-sm mt-2">完成一次量表评估后，记录将会显示在这里</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {history.map((record) => {
                        const info = SCALE_INFO[record.scale_type] || { name: record.scale_type, maxScore: 27, icon: '📋', color: 'gray' };
                        const scorePercent = (record.total_score / info.maxScore) * 100;

                        return (
                            <div
                                key={record.id}
                                onClick={() => setSelectedRecord(record)}
                                className="bg-white rounded-xl p-4 border border-warm-100 hover:shadow-md transition-all cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-2xl">{info.icon}</span>
                                        <div>
                                            <h4 className="font-medium text-warm-800">{info.name}</h4>
                                            <p className="text-xs text-warm-500">{formatDate(record.created_at)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <div className="text-right">
                                            <div className="font-bold text-lg text-warm-800">{record.total_score}</div>
                                            <div className="text-xs text-warm-500">{record.severity}</div>
                                        </div>
                                        <div className="w-24 h-2 bg-warm-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${scorePercent < 30 ? 'bg-green-400' :
                                                        scorePercent < 60 ? 'bg-yellow-400' :
                                                            scorePercent < 80 ? 'bg-orange-400' :
                                                                'bg-red-500'
                                                    }`}
                                                style={{ width: `${scorePercent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 返回按钮 */}
            <div className="mt-8 text-center">
                <button
                    onClick={onClose}
                    className="px-8 py-3 text-warm-600 hover:text-warm-800 transition-all"
                >
                    ← 返回
                </button>
            </div>
        </div>
    );
};

export default AssessmentHistory;
