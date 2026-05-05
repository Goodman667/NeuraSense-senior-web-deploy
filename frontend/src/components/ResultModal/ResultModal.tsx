/**
 * ResultModal Component
 *
 * Displays CDT assessment results with AI analysis.
 * 用于显示画钟测验评估结果的模态框，支持 AI 智能解读
 */

import { useEffect, useRef } from 'react';
import { MarkdownText } from '../Assessment/MarkdownText';

export interface AssessmentResult {
    total_score: number;
    max_score?: number;
    feedback: string[];
    details?: {
        roundness?: number | null;
        hands_angle?: number | null;
        number_count?: number | null;
    };
    clock_face_score?: number;
    clock_hands_score?: number;
    numbers_score?: number;
    ai_interpretation?: string;
    suggestions?: string[];
    scoring_method?: string;
}

export interface ResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    result: AssessmentResult | null;
    title?: string;
}

export const ResultModal = ({
    isOpen,
    onClose,
    result,
    title = '评估结果'
}: ResultModalProps) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    // Click outside to close
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen || !result) return null;

    // Calculate score percentage
    const maxScore = result.max_score ?? 3;
    const scorePercentage = (result.total_score / maxScore) * 100;

    // Determine score color
    const getScoreColor = () => {
        if (scorePercentage >= 80) return 'text-green-500';
        if (scorePercentage >= 50) return 'text-yellow-500';
        return 'text-orange-500';
    };

    // Get score description
    const getScoreDescription = () => {
        if (scorePercentage >= 80) return '表现优秀！';
        if (scorePercentage >= 50) return '表现良好';
        return '仍有提升空间';
    };

    const isAI = result.scoring_method === 'ai';

    // For AI scoring, feedback[0..2] are per-dimension reasons
    const faceReason = isAI ? result.feedback[0] : undefined;
    const handsReason = isAI ? result.feedback[1] : undefined;
    const numbersReason = isAI ? result.feedback[2] : undefined;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-slideUp max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-primary-400 via-accent-400 to-warm-300 p-6 text-white flex-shrink-0">
                    <h2 className="text-2xl font-bold text-center">{title}</h2>
                    <p className="text-center text-white/80 mt-1">{getScoreDescription()}</p>
                </div>

                {/* Score Circle */}
                <div className="flex justify-center -mt-10 flex-shrink-0">
                    <div className="relative w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center">
                        <div className={`text-3xl font-bold ${getScoreColor()}`}>
                            {result.total_score}
                            <span className="text-lg text-warm-400">/{maxScore}</span>
                        </div>
                        {/* Circular progress */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <circle cx="48" cy="48" r="44" fill="none" stroke="#f3f4f6" strokeWidth="6" />
                            <circle
                                cx="48" cy="48" r="44" fill="none"
                                stroke="url(#cdt-gradient)" strokeWidth="6" strokeLinecap="round"
                                strokeDasharray={`${scorePercentage * 2.76} 276`}
                            />
                            <defs>
                                <linearGradient id="cdt-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#a78bfa" />
                                    <stop offset="100%" stopColor="#fbbf24" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>

                {/* Scrollable content area */}
                <div className="overflow-y-auto flex-1 px-6 pt-4 pb-2 space-y-4">
                    {/* Individual Scores with reasons */}
                    {(result.clock_face_score !== undefined) && (
                        <div className="space-y-2">
                            {[
                                { label: '表盘', score: result.clock_face_score, reason: faceReason },
                                { label: '指针', score: result.clock_hands_score, reason: handsReason },
                                { label: '数字', score: result.numbers_score, reason: numbersReason },
                            ].map((item) => (
                                <div key={item.label} className="flex items-start gap-3 p-2.5 bg-warm-50/80 rounded-xl">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        item.score ? 'bg-green-100 text-green-600' : 'bg-warm-100 text-warm-400'
                                    }`}>
                                        <span className="text-sm font-bold">{item.score ? '✓' : '✗'}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-medium text-warm-700">{item.label}</span>
                                        {item.reason && (
                                            <p className="text-xs text-warm-500 mt-0.5 leading-relaxed">{item.reason}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* AI Interpretation */}
                    {isAI && result.ai_interpretation && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100/60">
                            <h3 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                                <span className="w-5 h-5 bg-blue-500 rounded-md flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                                    </svg>
                                </span>
                                AI 智能解读
                            </h3>
                            <MarkdownText text={result.ai_interpretation} light className="[&_div]:text-warm-700" />
                        </div>
                    )}

                    {/* Suggestions */}
                    {isAI && result.suggestions && result.suggestions.length > 0 && (
                        <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-100/60">
                            <h3 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                                <span className="text-base">💡</span>
                                改进建议
                            </h3>
                            <ul className="space-y-1.5">
                                {result.suggestions.map((s, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                                        <span>{s}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Fallback: show old-style feedback for OpenCV scoring */}
                    {!isAI && result.feedback.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium text-warm-500">详细反馈</h3>
                            <ul className="space-y-2">
                                {result.feedback.map((item, index) => (
                                    <li key={index} className="flex items-start space-x-2 text-warm-700 text-sm">
                                        <span className="text-primary-500 mt-0.5">•</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-medium hover:from-primary-600 hover:to-accent-600 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        我知道了
                    </button>
                </div>

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

ResultModal.displayName = 'ResultModal';
