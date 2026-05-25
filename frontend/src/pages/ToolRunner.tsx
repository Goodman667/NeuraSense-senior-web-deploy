/**
 * ToolRunner — 练习执行器
 * 渲染工具的步骤：计时、下一步引导、完成打卡 + 感受评分
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../config/api';
import { incrementToolCompletionCount } from '../lib/dailyProgress';
import type { ToolItem } from './ToolboxPage';

interface ToolRunnerProps {
    tool: ToolItem;
    onBack: () => void;
    onComplete?: () => void;
}

type Phase = 'detail' | 'running' | 'feedback' | 'done';

export default function ToolRunner({ tool, onBack, onComplete }: ToolRunnerProps) {
    const [phase, setPhase] = useState<Phase>('detail');
    const [stepIdx, setStepIdx] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const [totalElapsed, setTotalElapsed] = useState(0);
    const [rating, setRating] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef(0);

    const step = tool.steps[stepIdx];
    const isLastStep = stepIdx >= tool.steps.length - 1;

    // 计时器
    useEffect(() => {
        if (phase !== 'running') return;
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 200);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [phase, stepIdx]);

    const nextStep = useCallback(() => {
        setTotalElapsed((t) => t + elapsed);
        if (isLastStep) {
            if (timerRef.current) clearInterval(timerRef.current);
            setPhase('feedback');
        } else {
            setElapsed(0);
            setStepIdx((i) => i + 1);
        }
    }, [isLastStep, elapsed]);

    const handleComplete = useCallback(async () => {
        setSubmitting(true);
        const finalDuration = totalElapsed + elapsed;
        try {
            const token = localStorage.getItem('token');
            if (token) {
                await fetch(`${API_BASE}/tools/${tool.id}/complete?token=${token}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ duration_sec: finalDuration, rating: rating || null }),
                });
            }
        } catch { /* 离线也允许完成 */ }

        try {
            incrementToolCompletionCount();
        } catch {
            // localStorage 不可用时忽略，不影响完成链路
        }

        setSubmitting(false);
        setPhase('done');
        onComplete?.();
        if (onComplete) {
            onBack();
        }
    }, [tool.id, totalElapsed, elapsed, rating, onComplete, onBack]);

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const stepProgress = step ? Math.min(1, step.duration_sec > 0 ? elapsed / step.duration_sec : 0) : 0;

    // ===== DETAIL (工具详情 + 开始按钮) =====
    if (phase === 'detail') {
        return (
            <div className="animate-fadeIn">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/80 border border-warm-200/50 flex items-center justify-center text-warm-500 hover:text-warm-700 transition-all active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    <h2 className="text-lg font-semibold text-warm-800">{tool.title}</h2>
                </div>

                {/* 信息卡 */}
                <div className="bg-white/80 backdrop-blur rounded-2xl p-6 border border-warm-100/60 mb-4">
                    <div className="text-center mb-5">
                        <span className="text-5xl">{tool.icon}</span>
                        <h3 className="text-xl font-bold text-warm-800 mt-3">{tool.title}</h3>
                        <p className="text-warm-500 mt-1">{tool.subtitle}</p>
                    </div>

                    <div className="flex justify-center gap-6 text-sm text-warm-500 mb-6">
                        <span>{tool.duration_min} 分钟</span>
                        <span>{tool.steps.length} 步骤</span>
                        <span>{tool.difficulty === 'easy' ? '简单' : tool.difficulty === 'medium' ? '中等' : '进阶'}</span>
                    </div>

                    {tool.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-center mb-6">
                            {tool.tags.map((tag) => (
                                <span key={tag} className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-xs font-medium">{tag}</span>
                            ))}
                        </div>
                    )}

                    {/* 步骤预览 */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-warm-700">练习步骤</h4>
                        {tool.steps.map((s, i) => (
                            <div key={i} className="flex items-center gap-3 py-2">
                                <span className="w-6 h-6 rounded-full bg-warm-100 text-warm-500 flex items-center justify-center text-xs font-medium flex-shrink-0">{i + 1}</span>
                                <span className="text-sm text-warm-600">{s.title}</span>
                                {s.duration_sec > 0 && <span className="text-xs text-warm-400 ml-auto">{formatTime(s.duration_sec)}</span>}
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => setPhase('running')}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-bold text-lg shadow-lg shadow-primary-300/30 active:scale-[0.97] transition-transform"
                >
                    开始练习
                </button>
            </div>
        );
    }

    // ===== RUNNING (步骤执行) =====
    if (phase === 'running' && step) {
        return (
            <div className="animate-fadeIn">
                {/* 进度 */}
                <div className="flex items-center gap-2 mb-6">
                    <button onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setPhase('detail'); setStepIdx(0); setElapsed(0); setTotalElapsed(0); }}
                        className="w-10 h-10 rounded-xl bg-white/80 border border-warm-200/50 flex items-center justify-center text-warm-500 active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="flex-1">
                        <div className="flex justify-between text-xs text-warm-500 mb-1">
                            <span>步骤 {stepIdx + 1} / {tool.steps.length}</span>
                            <span>{formatTime(elapsed)}</span>
                        </div>
                        <div className="h-1.5 bg-warm-200/60 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-primary-400 to-accent-400 rounded-full"
                                animate={{ width: `${(stepIdx / tool.steps.length) * 100 + (stepProgress / tool.steps.length) * 100}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    </div>
                </div>

                {/* 步骤内容 */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={stepIdx}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ type: 'spring' as const, stiffness: 300, damping: 28 }}
                        className="bg-white/80 backdrop-blur rounded-2xl p-6 border border-warm-100/60 text-center min-h-[280px] flex flex-col justify-center"
                    >
                        <span className="text-4xl mb-4">{tool.icon}</span>
                        <h3 className="text-xl font-bold text-warm-800 mb-3">{step.title}</h3>
                        <p className="text-warm-600 leading-relaxed text-base">{step.body}</p>

                        {/* 步骤倒计时环 */}
                        {step.duration_sec > 0 && step.duration_sec <= 60 && (
                            <div className="mt-6 flex justify-center">
                                <div className="relative w-20 h-20">
                                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
                                        <circle cx="36" cy="36" r="30" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                                        <circle cx="36" cy="36" r="30" fill="none" stroke="url(#timer-gradient)" strokeWidth="4" strokeLinecap="round"
                                            strokeDasharray={2 * Math.PI * 30}
                                            strokeDashoffset={2 * Math.PI * 30 * (1 - stepProgress)}
                                        />
                                        <defs>
                                            <linearGradient id="timer-gradient"><stop stopColor="#8B5CF6" /><stop offset="1" stopColor="#EC4899" /></linearGradient>
                                        </defs>
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-warm-700">
                                        {Math.max(0, step.duration_sec - elapsed)}s
                                    </span>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* 引导语 */}
                {tool.guidance[Math.min(stepIdx, tool.guidance.length - 1)] && (
                    <p className="text-center text-sm text-warm-400 italic mt-4">
                        "{tool.guidance[Math.min(stepIdx, tool.guidance.length - 1)]}"
                    </p>
                )}

                {/* 下一步按钮 */}
                <button
                    onClick={nextStep}
                    className="w-full mt-6 py-4 rounded-2xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-bold shadow-lg shadow-primary-300/30 active:scale-[0.97] transition-transform"
                >
                    {isLastStep ? '完成练习' : '下一步'}
                </button>
            </div>
        );
    }

    // ===== FEEDBACK (完成感受评分) =====
    if (phase === 'feedback') {
        const emojis = ['😞', '😐', '🙂', '😊', '🤩'];
        const labels = ['不太好', '一般', '还不错', '很好', '非常棒'];
        return (
            <div className="animate-fadeIn">
                <div className="bg-white/80 backdrop-blur rounded-2xl p-6 border border-warm-100/60 text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring' as const, stiffness: 260, damping: 15 }}
                        className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg"
                    >
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </motion.div>

                    <h3 className="text-xl font-bold text-warm-800 mb-2">练习完成!</h3>
                    <p className="text-warm-500 mb-6">用时 {formatTime(totalElapsed + elapsed)}，做得很好</p>

                    <h4 className="text-sm font-semibold text-warm-700 mb-3">这次练习感觉怎么样？</h4>
                    <div className="flex justify-center gap-3 mb-6">
                        {emojis.map((emoji, i) => (
                            <button
                                key={i}
                                onClick={() => setRating(i + 1)}
                                className={`w-14 h-14 rounded-xl text-2xl transition-all ${
                                    rating === i + 1
                                        ? 'bg-primary-100 border-2 border-primary-400 scale-110'
                                        : 'bg-warm-50 border-2 border-transparent hover:border-warm-200'
                                }`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                    {rating > 0 && <p className="text-sm text-primary-600 font-medium mb-4">{labels[rating - 1]}</p>}

                    <button
                        onClick={handleComplete}
                        disabled={submitting}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-bold shadow-lg active:scale-[0.97] transition-transform disabled:opacity-50"
                    >
                        {submitting ? '提交中...' : '提交打卡'}
                    </button>
                </div>
            </div>
        );
    }

    // ===== DONE =====
    return (
        <div className="animate-fadeIn text-center py-12">
            <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring' as const, stiffness: 200, damping: 15 }}
                className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl"
            >
                <span className="text-5xl">🎉</span>
            </motion.div>
            <h3 className="text-2xl font-bold text-warm-800 mb-2">打卡成功</h3>
            <p className="text-warm-500 mb-8">坚持练习，你会看到变化</p>
            <button
                onClick={onBack}
                className="px-8 py-3 rounded-2xl bg-primary-500 text-white font-medium active:scale-[0.97] transition-transform"
            >
                返回
            </button>
        </div>
    );
}
