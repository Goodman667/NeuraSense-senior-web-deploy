/**
 * DualModalityReport Component
 * 
 * Comprehensive report comparing subjective (questionnaire) and objective (bio-signal) data.
 * Displays side-by-side comparison with AI-generated insights.
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { EmotionRadarChart, type EmotionData } from '../Visualization';
import { API_BASE } from '../../config/api';

export interface SubjectiveData {
    phq9Score?: number;
    gad7Score?: number;
    sdsScore?: number;
    sasScore?: number;
    pssScore?: number;
    selfReportSummary?: string;
}

export interface ObjectiveData {
    // Voice analysis
    voiceEmotionScore?: number;
    voiceStressLevel?: number;

    // Eye tracking
    fatigueIndex?: number;
    attentionScore?: number;

    // Keystroke dynamics
    typingAnxietyIndex?: number;
    typingFocusScore?: number;

    // Stroop test
    stroopCognitiveScore?: number;
    stroopAttentionScore?: number;

    // Emotion detection
    emotionData?: EmotionData;
}

export interface DualModalityReportProps {
    subjective: SubjectiveData;
    objective: ObjectiveData;
    onClose?: () => void;
    className?: string;
}

// Score interpretation helpers
const getScoreLevel = (score: number, thresholds: [number, number, number]) => {
    if (score <= thresholds[0]) return { level: '正常', color: 'green', icon: '✅' };
    if (score <= thresholds[1]) return { level: '轻度', color: 'yellow', icon: '⚠️' };
    if (score <= thresholds[2]) return { level: '中度', color: 'orange', icon: '🔶' };
    return { level: '重度', color: 'red', icon: '🔴' };
};

const getPhq9Level = (score: number) => getScoreLevel(score, [4, 9, 14]);
const getGad7Level = (score: number) => getScoreLevel(score, [4, 9, 14]);

export const DualModalityReport = ({
    subjective,
    objective,
    onClose,
    className = '',
}: DualModalityReportProps) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiComparison, setAiComparison] = useState<string | null>(null);

    // Calculate discrepancy between subjective and objective
    const calculateDiscrepancy = useCallback(() => {
        const subjectiveAvg = (
            (subjective.phq9Score ?? 0) / 27 * 100 +
            (subjective.gad7Score ?? 0) / 21 * 100
        ) / 2;

        const objectiveAvg = (
            (objective.voiceStressLevel ?? 50) +
            (100 - (objective.attentionScore ?? 50)) +
            (objective.typingAnxietyIndex ?? 50)
        ) / 3;

        return {
            subjective: Math.round(subjectiveAvg),
            objective: Math.round(objectiveAvg),
            difference: Math.abs(subjectiveAvg - objectiveAvg),
            warning: Math.abs(subjectiveAvg - objectiveAvg) > 20,
        };
    }, [subjective, objective]);

    // Get AI comparison analysis
    const getAiAnalysis = useCallback(async () => {
        setIsAnalyzing(true);
        try {
            const discrepancy = calculateDiscrepancy();

            const response = await fetch(`${API_BASE}/counselor/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `请对比分析以下心理健康评估数据，并给出专业见解：

【主观评估数据】
- PHQ-9 抑郁评分: ${subjective.phq9Score ?? '未测'}分
- GAD-7 焦虑评分: ${subjective.gad7Score ?? '未测'}分
- 用户自述摘要: ${subjective.selfReportSummary ?? '无'}

【客观生物信号数据】
- 语音情绪评分: ${objective.voiceEmotionScore ?? '未测'}
- 语音压力水平: ${objective.voiceStressLevel ?? '未测'}%
- 眼部疲劳指数: ${objective.fatigueIndex ?? '未测'}
- 注意力评分: ${objective.attentionScore ?? '未测'}
- 键盘焦虑指数: ${objective.typingAnxietyIndex ?? '未测'}
- Stroop认知评分: ${objective.stroopCognitiveScore ?? '未测'}

【一致性分析】
- 主观困扰指数: ${discrepancy.subjective}%
- 客观压力指数: ${discrepancy.objective}%
- 差异度: ${discrepancy.difference}%

请从以下角度分析（100字左右）：
1. 主观与客观数据是否一致
2. 如有不一致，可能的原因
3. 针对性建议`,
                    user_id: 'dual_modality_report',
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setAiComparison(data.response);
            }
        } catch (error) {
            console.error('AI analysis failed:', error);
            setAiComparison('分析失败，请稍后重试。');
        }
        setIsAnalyzing(false);
    }, [subjective, objective, calculateDiscrepancy]);

    const discrepancy = calculateDiscrepancy();
    const phq9Level = subjective.phq9Score !== undefined ? getPhq9Level(subjective.phq9Score) : null;
    const gad7Level = subjective.gad7Score !== undefined ? getGad7Level(subjective.gad7Score) : null;

    return (
        <div className={`bg-white rounded-2xl shadow-xl overflow-hidden ${className}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold flex items-center space-x-2">
                            <span>📊</span>
                            <span>双模态综合分析报告</span>
                        </h2>
                        <p className="text-sm text-indigo-200 mt-1">
                            Dual-Modality Validation Report
                        </p>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6">
                {/* Two Column Comparison */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {/* Subjective Data (Left) */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-blue-50 rounded-xl p-5"
                    >
                        <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center space-x-2">
                            <span>📝</span>
                            <span>模态A: 主观自评</span>
                        </h3>

                        <div className="space-y-4">
                            {/* PHQ-9 */}
                            {subjective.phq9Score !== undefined && phq9Level && (
                                <div className="bg-white rounded-lg p-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-blue-700">PHQ-9 抑郁</span>
                                        <div className="flex items-center space-x-2">
                                            <span className={`text-lg font-bold text-${phq9Level.color}-600`}>
                                                {subjective.phq9Score}分
                                            </span>
                                            <span className={`px-2 py-0.5 text-xs rounded-full bg-${phq9Level.color}-100 text-${phq9Level.color}-700`}>
                                                {phq9Level.level}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full bg-${phq9Level.color}-500 transition-all`}
                                            style={{ width: `${(subjective.phq9Score / 27) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* GAD-7 */}
                            {subjective.gad7Score !== undefined && gad7Level && (
                                <div className="bg-white rounded-lg p-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-blue-700">GAD-7 焦虑</span>
                                        <div className="flex items-center space-x-2">
                                            <span className={`text-lg font-bold text-${gad7Level.color}-600`}>
                                                {subjective.gad7Score}分
                                            </span>
                                            <span className={`px-2 py-0.5 text-xs rounded-full bg-${gad7Level.color}-100 text-${gad7Level.color}-700`}>
                                                {gad7Level.level}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full bg-${gad7Level.color}-500 transition-all`}
                                            style={{ width: `${(subjective.gad7Score / 21) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Self Report Summary */}
                            {subjective.selfReportSummary && (
                                <div className="bg-white rounded-lg p-3">
                                    <span className="text-sm font-medium text-blue-700">用户自述</span>
                                    <p className="text-sm text-gray-600 mt-1 italic">
                                        "{subjective.selfReportSummary}"
                                    </p>
                                </div>
                            )}

                            {/* Subjective Index */}
                            <div className="bg-blue-100 rounded-lg p-3 text-center">
                                <div className="text-3xl font-bold text-blue-700">
                                    {discrepancy.subjective}%
                                </div>
                                <div className="text-sm text-blue-500">主观困扰指数</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Objective Data (Right) */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-purple-50 rounded-xl p-5"
                    >
                        <h3 className="text-lg font-bold text-purple-800 mb-4 flex items-center space-x-2">
                            <span>🧠</span>
                            <span>模态B: 客观监测</span>
                        </h3>

                        <div className="space-y-3">
                            {/* Voice Metrics */}
                            {(objective.voiceEmotionScore !== undefined || objective.voiceStressLevel !== undefined) && (
                                <div className="bg-white rounded-lg p-3">
                                    <span className="text-sm font-medium text-purple-700">🎤 语音分析</span>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {objective.voiceEmotionScore !== undefined && (
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-purple-600">{objective.voiceEmotionScore}</div>
                                                <div className="text-xs text-gray-500">情绪分</div>
                                            </div>
                                        )}
                                        {objective.voiceStressLevel !== undefined && (
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-purple-600">{objective.voiceStressLevel}%</div>
                                                <div className="text-xs text-gray-500">压力</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Eye Tracking */}
                            {(objective.fatigueIndex !== undefined || objective.attentionScore !== undefined) && (
                                <div className="bg-white rounded-lg p-3">
                                    <span className="text-sm font-medium text-purple-700">👁️ 眼动追踪</span>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {objective.fatigueIndex !== undefined && (
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-purple-600">{objective.fatigueIndex}</div>
                                                <div className="text-xs text-gray-500">疲劳度</div>
                                            </div>
                                        )}
                                        {objective.attentionScore !== undefined && (
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-purple-600">{objective.attentionScore}</div>
                                                <div className="text-xs text-gray-500">注意力</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Keystroke */}
                            {objective.typingAnxietyIndex !== undefined && (
                                <div className="bg-white rounded-lg p-3">
                                    <span className="text-sm font-medium text-purple-700">⌨️ 键盘动力学</span>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-purple-600">{objective.typingAnxietyIndex}</div>
                                            <div className="text-xs text-gray-500">焦虑指数</div>
                                        </div>
                                        {objective.typingFocusScore !== undefined && (
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-purple-600">{objective.typingFocusScore}</div>
                                                <div className="text-xs text-gray-500">专注度</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Stroop */}
                            {objective.stroopCognitiveScore !== undefined && (
                                <div className="bg-white rounded-lg p-3">
                                    <span className="text-sm font-medium text-purple-700">🎮 Stroop认知</span>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-purple-600">{objective.stroopCognitiveScore}</div>
                                            <div className="text-xs text-gray-500">认知分</div>
                                        </div>
                                        {objective.stroopAttentionScore !== undefined && (
                                            <div className="text-center">
                                                <div className="text-lg font-bold text-purple-600">{objective.stroopAttentionScore}</div>
                                                <div className="text-xs text-gray-500">注意力</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Objective Index */}
                            <div className="bg-purple-100 rounded-lg p-3 text-center">
                                <div className="text-3xl font-bold text-purple-700">
                                    {discrepancy.objective}%
                                </div>
                                <div className="text-sm text-purple-500">客观压力指数</div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Emotion Radar (if available) */}
                {objective.emotionData && (
                    <div className="mb-6 bg-warm-50 rounded-xl p-4">
                        <h4 className="text-sm font-medium text-warm-700 mb-2 text-center">情绪雷达图</h4>
                        <EmotionRadarChart data={objective.emotionData} size="sm" />
                    </div>
                )}

                {/* Discrepancy Warning */}
                {discrepancy.warning && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6"
                    >
                        <div className="flex items-start space-x-3">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <h4 className="font-medium text-amber-800">数据不一致提醒</h4>
                                <p className="text-sm text-amber-700 mt-1">
                                    您的主观自评与客观监测数据存在较大差异（{discrepancy.difference.toFixed(0)}%）。
                                    这可能提示存在"隐性焦虑"或评估偏差，建议结合AI分析深入了解。
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* AI Analysis Section */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-indigo-800 flex items-center space-x-2">
                            <span>🤖</span>
                            <span>AI 对比分析</span>
                        </h4>
                        {!aiComparison && (
                            <button
                                onClick={getAiAnalysis}
                                disabled={isAnalyzing}
                                className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-all disabled:opacity-50 flex items-center space-x-2"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span>分析中...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>生成分析</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {aiComparison ? (
                        <div className="bg-white rounded-lg p-4">
                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {aiComparison}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white/50 rounded-lg p-4 text-center text-gray-400">
                            点击"生成分析"获取 AI 对主观与客观数据的综合解读
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-warm-200">
                    <p className="text-xs text-warm-400 text-center">
                        ⚕️ 本报告仅供参考，不能替代专业心理评估。如需帮助，请咨询专业人士。
                    </p>
                </div>
            </div>
        </div>
    );
};

DualModalityReport.displayName = 'DualModalityReport';
