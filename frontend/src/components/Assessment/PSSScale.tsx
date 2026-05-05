/**
 * PSS-10 (Perceived Stress Scale) Component
 * 
 * 10-item scale measuring perceived stress over the past month.
 * Scores range from 0-40.
 */

import { useState, useCallback } from 'react';
import { API_BASE } from '../../config/api';
import { PDFDownloadButton } from './PDFDownloadButton';
import { MarkdownText } from './MarkdownText';

const PSS_QUESTIONS = [
    { id: 1, text: "在过去一个月里，您有多少次因为发生了意想不到的事情而感到心烦意乱？", reverse: false },
    { id: 2, text: "在过去一个月里，您有多少次感到无法控制生活中重要的事情？", reverse: false },
    { id: 3, text: "在过去一个月里，您有多少次感到紧张和有压力？", reverse: false },
    { id: 4, text: "在过去一个月里，您有多少次成功地处理了日常烦人的琐事？", reverse: true },
    { id: 5, text: "在过去一个月里，您有多少次感到有效地应对了生活中重要的变化？", reverse: true },
    { id: 6, text: "在过去一个月里，您有多少次对自己处理个人问题的能力感到自信？", reverse: true },
    { id: 7, text: "在过去一个月里，您有多少次感到事情正朝着有利于您的方向发展？", reverse: true },
    { id: 8, text: "在过去一个月里，您有多少次发现自己无法处理所有必须做的事情？", reverse: false },
    { id: 9, text: "在过去一个月里，您有多少次能够控制生活中的烦心事？", reverse: true },
    { id: 10, text: "在过去一个月里，您有多少次感到困难积累太多而无法克服？", reverse: false },
];

const OPTIONS = [
    { value: 0, label: "从不" },
    { value: 1, label: "几乎不" },
    { value: 2, label: "有时" },
    { value: 3, label: "较多" },
    { value: 4, label: "很多" },
];

const getSeverity = (score: number) => {
    if (score <= 13) return { level: '低压力', color: 'green', description: '压力水平良好' };
    if (score <= 26) return { level: '中等压力', color: 'yellow', description: '存在一定压力，建议调节' };
    return { level: '高压力', color: 'red', description: '压力较大，建议寻求帮助' };
};

interface PSSScaleProps {
    onComplete?: (result: PSSResult) => void;
    onClose?: () => void;
}

export interface PSSResult {
    totalScore: number;
    answers: number[];
    severity: string;
    timestamp: Date;
    aiInterpretation?: string;
}

export const PSSScale = ({ onComplete, onClose }: PSSScaleProps) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<(number | null)[]>(new Array(10).fill(null));
    const [isComplete, setIsComplete] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);

    const calculateScore = useCallback(() => {
        let score = 0;
        answers.forEach((answer, index) => {
            if (answer === null) return;
            const question = PSS_QUESTIONS[index];
            if (question.reverse) {
                score += (4 - answer);
            } else {
                score += answer;
            }
        });
        return score;
    }, [answers]);

    const totalScore = calculateScore();
    const severity = getSeverity(totalScore);

    const handleAnswer = useCallback((value: number) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestion] = value;
        setAnswers(newAnswers);
        if (currentQuestion < 9) {
            setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
        }
    }, [currentQuestion, answers]);

    const handleComplete = useCallback(async () => {
        if (answers.some(a => a === null)) return;
        setIsLoading(true);

        try {
            // 构建包含维度信息的个性化 prompt
            const stressItems = PSS_QUESTIONS
                .filter((q, i) => {
                    const a = answers[i] ?? 0;
                    return q.reverse ? a <= 1 : a >= 3;
                })
                .map(q => q.text.replace(/^在过去一个月里，您有多少次/, ''));
            const copingItems = PSS_QUESTIONS
                .filter((q, i) => {
                    const a = answers[i] ?? 0;
                    return q.reverse && a >= 3;
                })
                .map(q => q.text.replace(/^在过去一个月里，您有多少次/, ''));

            const detailedPrompt = `作为心理健康顾问，请根据以下 PSS-10 压力感知量表结果给出个性化建议。

## 评估数据
- 总分：${totalScore}/40（${severity.level}）
${stressItems.length > 0 ? `- 压力来源：${stressItems.slice(0, 3).join('、')}` : '- 压力水平较低'}
${copingItems.length > 0 ? `- 应对能力较好的方面：${copingItems.slice(0, 2).join('、')}` : ''}

## 回复要求
1. 直接给出建议，不要以"当然可以"、"好的"等寒暄开头
2. 针对主要压力来源给出具体建议
3. 用以下结构回复：

### 总体评估
（1-2句话概括压力状态）

### 重点建议
（针对压力来源的 2-3 条具体可操作建议，每条用 - 开头）

### 日常减压
（运动、睡眠、时间管理、放松技巧各 1 条简短建议，用 - 开头）

${totalScore >= 27 ? '### 专业资源\n（推荐就医和心理援助热线 400-161-9995）' : ''}

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

            const token = localStorage.getItem('token');
            if (token) {
                await fetch(`${API_BASE}/history/save?token=${token}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        scale_type: 'pss10',
                        total_score: totalScore,
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
            totalScore,
            answers: answers as number[],
            severity: severity.level,
            timestamp: new Date(),
            aiInterpretation: aiInterpretation || undefined,
        });
    }, [answers, totalScore, severity, onComplete, aiInterpretation]);

    const progress = ((currentQuestion + 1) / 10) * 100;

    return (
        <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-warm-800 mb-2">PSS-10 压力感知量表</h2>
                <p className="text-warm-600">
                    请根据您 <span className="font-semibold text-indigo-600">过去一个月</span> 的实际感受选择最符合的选项
                </p>
            </div>

            {!isComplete ? (
                <>
                    <div className="mb-8">
                        <div className="flex justify-between text-sm text-warm-500 mb-2">
                            <span>问题 {currentQuestion + 1} / 10</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border border-indigo-100">
                        <p className="text-xl text-warm-800 font-medium mb-8 min-h-[80px]">{PSS_QUESTIONS[currentQuestion].text}</p>
                        <div className="grid grid-cols-5 gap-2">
                            {OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleAnswer(option.value)}
                                    className={`p-3 rounded-xl border-2 text-center transition-all ${answers[currentQuestion] === option.value
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                        : 'border-warm-200 hover:border-indigo-300'
                                        }`}
                                >
                                    <div className="text-lg font-bold">{option.value}</div>
                                    <div className="text-xs">{option.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <button onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))} disabled={currentQuestion === 0} className="px-6 py-3 text-warm-600 disabled:opacity-50">← 上一题</button>
                        {currentQuestion === 9 ? (
                            <button onClick={handleComplete} disabled={answers.some(a => a === null) || isLoading} className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50">
                                {isLoading ? '分析中...' : '完成评估'}
                            </button>
                        ) : (
                            <button onClick={() => setCurrentQuestion(Math.min(9, currentQuestion + 1))} disabled={answers[currentQuestion] === null} className="px-6 py-3 text-indigo-600 disabled:opacity-50">下一题 →</button>
                        )}
                    </div>
                </>
            ) : (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-lg p-8 border border-indigo-100">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-warm-800">PSS-10 评估报告</h2>
                                <p className="text-warm-500 text-sm">{new Date().toLocaleDateString('zh-CN')}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-bold text-indigo-600">{totalScore}</div>
                                <div className="text-sm text-warm-500">/ 40</div>
                            </div>
                        </div>
                        <div className="flex items-center justify-center">
                            <span className={`px-6 py-2 rounded-full text-lg font-bold ${totalScore <= 13 ? 'bg-green-100 text-green-700' : totalScore <= 26 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                {severity.level}
                            </span>
                        </div>
                    </div>

                    {aiInterpretation && (
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
                            <h3 className="font-bold text-lg mb-3">💬 小心的建议</h3>
                            <MarkdownText text={aiInterpretation} />
                        </div>
                    )}

                    {/* PDF 下载按钮 */}
                    <PDFDownloadButton
                        scaleType="pss10"
                        totalScore={totalScore}
                        answers={answers as number[]}
                        aiInterpretation={aiInterpretation || undefined}
                        className="w-full mb-4"
                    />

                    <div className="flex space-x-4">
                        <button onClick={onClose} className="flex-1 py-4 bg-warm-100 text-warm-700 rounded-xl font-medium">← 返回</button>
                        <button onClick={() => { setCurrentQuestion(0); setAnswers(new Array(10).fill(null)); setIsComplete(false); setAiInterpretation(null); }} className="flex-1 py-4 bg-indigo-500 text-white rounded-xl font-medium">重新评估</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PSSScale;
