/**
 * SAS (Zung Self-Rating Anxiety Scale) Component
 * 
 * 20-item self-report questionnaire for anxiety assessment.
 * Each item is rated on a 4-point scale (1-4).
 * Total score ranges from 20-80, with index score = raw score × 1.25
 */

import { useState, useCallback } from 'react';
import { API_BASE } from '../../config/api';
import { PDFDownloadButton } from './PDFDownloadButton';
import { MarkdownText } from './MarkdownText';

// SAS 问题定义（20题）
const SAS_QUESTIONS = [
    { id: 1, text: "我感到比往常更紧张和焦虑", reverse: false },
    { id: 2, text: "我无缘无故地感到害怕", reverse: false },
    { id: 3, text: "我容易心烦意乱或感到恐慌", reverse: false },
    { id: 4, text: "我感到我可能要发疯", reverse: false },
    { id: 5, text: "我感到一切都好，不会发生不幸", reverse: true },
    { id: 6, text: "我的手脚发抖打颤", reverse: false },
    { id: 7, text: "我因头痛、颈痛、背痛而烦恼", reverse: false },
    { id: 8, text: "我感到无力且容易疲劳", reverse: false },
    { id: 9, text: "我感到平静，能安静坐下来", reverse: true },
    { id: 10, text: "我感到我的心跳很快", reverse: false },
    { id: 11, text: "我因阵阵头晕而烦恼", reverse: false },
    { id: 12, text: "我有过晕倒或感到要晕倒", reverse: false },
    { id: 13, text: "我呼吸时进出气都很容易", reverse: true },
    { id: 14, text: "我的手脚麻木和刺痛", reverse: false },
    { id: 15, text: "我因胃痛和消化不良而烦恼", reverse: false },
    { id: 16, text: "我需要经常排尿", reverse: false },
    { id: 17, text: "我的手常常是干燥温暖的", reverse: true },
    { id: 18, text: "我脸发烧发红", reverse: false },
    { id: 19, text: "我容易入睡，睡眠很好", reverse: true },
    { id: 20, text: "我做噩梦", reverse: false },
];

const OPTIONS = [
    { value: 1, label: "很少", description: "偶尔或无" },
    { value: 2, label: "有时", description: "少部分时间" },
    { value: 3, label: "经常", description: "相当多时间" },
    { value: 4, label: "总是", description: "绝大部分或全部时间" },
];

// 严重程度解读
const getSeverity = (indexScore: number) => {
    if (indexScore < 50) return { level: '正常', color: 'green', description: '无明显焦虑症状' };
    if (indexScore < 60) return { level: '轻度焦虑', color: 'yellow', description: '存在轻度焦虑倾向' };
    if (indexScore < 70) return { level: '中度焦虑', color: 'orange', description: '建议寻求专业帮助' };
    return { level: '重度焦虑', color: 'red', description: '请尽快寻求专业心理治疗' };
};

interface SASScaleProps {
    onComplete?: (result: SASResult) => void;
    onClose?: () => void;
}

export interface SASResult {
    rawScore: number;
    indexScore: number;
    answers: number[];
    severity: string;
    timestamp: Date;
    aiInterpretation?: string;
}

export const SASScale = ({ onComplete, onClose }: SASScaleProps) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<(number | null)[]>(new Array(20).fill(null));
    const [isComplete, setIsComplete] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);

    // 计算原始分和指数分
    const calculateScores = useCallback(() => {
        let rawScore = 0;
        answers.forEach((answer, index) => {
            if (answer === null) return;
            const question = SAS_QUESTIONS[index];
            if (question.reverse) {
                rawScore += (5 - answer);
            } else {
                rawScore += answer;
            }
        });
        const indexScore = Math.round(rawScore * 1.25);
        return { rawScore, indexScore };
    }, [answers]);

    const { rawScore, indexScore } = calculateScores();
    const severity = getSeverity(indexScore);

    // 选择答案
    const handleAnswer = useCallback((value: number) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestion] = value;
        setAnswers(newAnswers);

        if (currentQuestion < 19) {
            setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
        }
    }, [currentQuestion, answers]);

    // 完成评估
    const handleComplete = useCallback(async () => {
        if (answers.some(a => a === null)) return;

        setIsLoading(true);

        try {
            // 构建包含维度信息的个性化 prompt
            const highItems = SAS_QUESTIONS
                .filter((_, i) => {
                    const a = answers[i] ?? 1;
                    const q = SAS_QUESTIONS[i];
                    return q.reverse ? a <= 2 : a >= 3;
                })
                .map(q => q.text);

            const detailedPrompt = `作为心理健康顾问，请根据以下 SAS 焦虑自评量表结果给出个性化建议。

## 评估数据
- 指数分：${indexScore}（${severity.level}）
- 原始分：${rawScore}
${highItems.length > 0 ? `- 需重点关注的项目：${highItems.slice(0, 5).join('、')}` : '- 各项得分均较低，状态良好'}

## 回复要求
1. 直接给出建议，不要以"当然可以"、"好的"等寒暄开头
2. 针对突出的焦虑症状给出具体缓解建议
3. 用以下结构回复：

### 总体评估
（1-2句话概括焦虑状态）

### 重点建议
（针对突出症状的 2-3 条具体可操作建议，每条用 - 开头）

### 日常调节
（呼吸法、运动、睡眠、减少刺激物各 1 条简短建议，用 - 开头）

${indexScore >= 60 ? '### 专业资源\n（推荐就医科室和心理援助热线 400-161-9995）' : ''}

请保持温暖但简洁，总字数控制在 300 字以内。`;

            const response = await fetch(`${API_BASE}/counselor/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: detailedPrompt,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setAiInterpretation(data.message || data.reply);
            }

            // 保存到历史记录
            const token = localStorage.getItem('token');
            if (token) {
                await fetch(`${API_BASE}/history/save?token=${token}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        scale_type: 'sas',
                        total_score: indexScore,
                        answers: answers,
                        severity: severity.level,
                        ai_interpretation: aiInterpretation,
                    }),
                });
            }
        } catch (error) {
            console.error('Failed to get AI interpretation:', error);
        }

        setIsLoading(false);
        setIsComplete(true);

        onComplete?.({
            rawScore,
            indexScore,
            answers: answers as number[],
            severity: severity.level,
            timestamp: new Date(),
            aiInterpretation: aiInterpretation || undefined,
        });
    }, [answers, rawScore, indexScore, severity, onComplete, aiInterpretation]);

    const progress = ((currentQuestion + 1) / 20) * 100;

    return (
        <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-warm-800 mb-2">SAS 焦虑自评量表</h2>
                <p className="text-warm-600">
                    请根据您 <span className="font-semibold text-orange-600">最近一周</span> 的实际感受选择最符合的选项
                </p>
            </div>

            {!isComplete ? (
                <>
                    <div className="mb-8">
                        <div className="flex justify-between text-sm text-warm-500 mb-2">
                            <span>问题 {currentQuestion + 1} / 20</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border border-orange-100">
                        <p className="text-xl text-warm-800 font-medium mb-8 min-h-[60px]">
                            {SAS_QUESTIONS[currentQuestion].text}
                        </p>

                        <div className="space-y-3">
                            {OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleAnswer(option.value)}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${answers[currentQuestion] === option.value
                                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                                        : 'border-warm-200 hover:border-orange-300 hover:bg-warm-50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="font-medium">{option.label}</span>
                                            <span className="text-warm-500 text-sm ml-2">({option.description})</span>
                                        </div>
                                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${answers[currentQuestion] === option.value
                                            ? 'border-orange-500 bg-orange-500'
                                            : 'border-warm-300'
                                            }`}>
                                            {answers[currentQuestion] === option.value && (
                                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <button
                            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                            disabled={currentQuestion === 0}
                            className="px-6 py-3 text-warm-600 hover:text-warm-800 disabled:opacity-50"
                        >
                            ← 上一题
                        </button>

                        {currentQuestion === 19 ? (
                            <button
                                onClick={handleComplete}
                                disabled={answers.some(a => a === null) || isLoading}
                                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50"
                            >
                                {isLoading ? '分析中...' : '完成评估'}
                            </button>
                        ) : (
                            <button
                                onClick={() => setCurrentQuestion(Math.min(19, currentQuestion + 1))}
                                disabled={answers[currentQuestion] === null}
                                className="px-6 py-3 text-orange-600 hover:text-orange-700 disabled:opacity-50"
                            >
                                下一题 →
                            </button>
                        )}
                    </div>
                </>
            ) : (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-lg p-8 border border-orange-100">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-warm-800">SAS 评估报告</h2>
                                <p className="text-warm-500 text-sm">{new Date().toLocaleDateString('zh-CN')}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-bold text-orange-600">{indexScore}</div>
                                <div className="text-sm text-warm-500">指数分</div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="flex justify-between text-xs text-warm-500 mb-2">
                                <span>正常 (&lt;50)</span>
                                <span>轻度 (50-59)</span>
                                <span>中度 (60-69)</span>
                                <span>重度 (70+)</span>
                            </div>
                            <div className="h-4 bg-gradient-to-r from-green-400 via-yellow-400 via-orange-400 to-red-500 rounded-full relative">
                                <div
                                    className="absolute w-4 h-6 bg-white border-2 border-warm-800 rounded-full -top-1 shadow-lg transition-all"
                                    style={{ left: `${Math.min((indexScore / 80) * 100, 98)}%`, transform: 'translateX(-50%)' }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-center">
                            <span className={`px-6 py-2 rounded-full text-lg font-bold ${indexScore < 50 ? 'bg-green-100 text-green-700' :
                                indexScore < 60 ? 'bg-yellow-100 text-yellow-700' :
                                    indexScore < 70 ? 'bg-orange-100 text-orange-700' :
                                        'bg-red-100 text-red-700'
                                }`}>
                                {severity.level}
                            </span>
                        </div>
                    </div>

                    {aiInterpretation && (
                        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-lg p-6 text-white">
                            <div className="flex items-start space-x-4">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <span className="text-2xl">💬</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg mb-3">小心的专业建议</h3>
                                    <MarkdownText text={aiInterpretation} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PDF 下载按钮 */}
                    <PDFDownloadButton
                        scaleType="sas"
                        totalScore={indexScore}
                        answers={answers as number[]}
                        aiInterpretation={aiInterpretation || undefined}
                        className="w-full mb-4"
                    />

                    <div className="flex space-x-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 bg-warm-100 text-warm-700 rounded-xl font-medium hover:bg-warm-200 transition-all"
                        >
                            ← 返回
                        </button>
                        <button
                            onClick={() => {
                                setCurrentQuestion(0);
                                setAnswers(new Array(20).fill(null));
                                setIsComplete(false);
                                setAiInterpretation(null);
                            }}
                            className="flex-1 py-4 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-all"
                        >
                            重新评估
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SASScale;
