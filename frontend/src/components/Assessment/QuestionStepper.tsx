/**
 * QuestionStepper Component
 * 
 * A modern step-by-step questionnaire UI with smooth animations.
 * Designed to reduce user anxiety by showing one question at a time.
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

export interface StepperQuestion {
    id: number;
    text: string;
    helpText?: string;
}

export interface StepperOption {
    value: number;
    label: string;
    description?: string;
    color?: string;
}

interface QuestionStepperProps {
    questions: StepperQuestion[];
    options: StepperOption[];
    title: string;
    subtitle?: string;
    onComplete: (answers: number[]) => void;
    onClose?: () => void;
    accentColor?: string;
}

const pageVariants: Variants = {
    initial: { opacity: 0, x: 50, scale: 0.98 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -50, scale: 0.98 }
};

const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);

const progressVariants: Variants = {
    initial: { width: 0 },
    animate: (progress: number) => ({
        width: `${progress}%`,
        // Custom easing function keeps Motion typings happy on v12
        transition: { duration: 0.5, ease: easeOutQuad }
    })
};

export const QuestionStepper = ({
    questions,
    options,
    title,
    subtitle,
    onComplete,
    onClose,
    accentColor = 'primary'
}: QuestionStepperProps) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<(number | null)[]>(
        new Array(questions.length).fill(null)
    );
    const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

    const totalSteps = questions.length;
    const progress = ((currentStep + 1) / totalSteps) * 100;
    const currentAnswer = answers[currentStep];
    const allAnswered = answers.every(a => a !== null);

    // Handle answer selection
    const handleAnswer = useCallback((value: number) => {
        const newAnswers = [...answers];
        newAnswers[currentStep] = value;
        setAnswers(newAnswers);

        // Auto-advance after short delay
        if (currentStep < totalSteps - 1) {
            setTimeout(() => {
                setDirection(1);
                setCurrentStep(prev => prev + 1);
            }, 400);
        }
    }, [currentStep, answers, totalSteps]);

    // Navigate to previous question
    const handlePrevious = useCallback(() => {
        if (currentStep > 0) {
            setDirection(-1);
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);

    // Navigate to next question
    const handleNext = useCallback(() => {
        if (currentStep < totalSteps - 1 && currentAnswer !== null) {
            setDirection(1);
            setCurrentStep(prev => prev + 1);
        }
    }, [currentStep, totalSteps, currentAnswer]);

    // Handle completion
    const handleComplete = useCallback(() => {
        if (allAnswered) {
            onComplete(answers as number[]);
        }
    }, [allAnswered, answers, onComplete]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') handlePrevious();
            if (e.key === 'ArrowRight' && currentAnswer !== null) handleNext();
            if (e.key >= '1' && e.key <= String(options.length)) {
                handleAnswer(parseInt(e.key) - 1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlePrevious, handleNext, handleAnswer, currentAnswer, options.length]);

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <motion.div
                className="text-center mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h2 className="text-2xl font-bold text-warm-800 mb-2">{title}</h2>
                {subtitle && (
                    <p className="text-warm-600">{subtitle}</p>
                )}
            </motion.div>

            {/* Step Indicator Dots */}
            <div className="flex justify-center space-x-2 mb-6">
                {questions.map((_, idx) => (
                    <motion.button
                        key={idx}
                        onClick={() => {
                            if (answers[idx] !== null || idx <= currentStep) {
                                setDirection(idx > currentStep ? 1 : -1);
                                setCurrentStep(idx);
                            }
                        }}
                        className={`w-3 h-3 rounded-full transition-all ${idx === currentStep
                                ? `bg-${accentColor}-500 scale-125`
                                : answers[idx] !== null
                                    ? `bg-${accentColor}-300`
                                    : 'bg-warm-200'
                            }`}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={answers[idx] === null && idx > currentStep}
                    />
                ))}
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
                <div className="flex justify-between text-sm text-warm-500 mb-2">
                    <span className="font-medium">问题 {currentStep + 1} / {totalSteps}</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full bg-gradient-to-r from-${accentColor}-400 to-${accentColor}-600`}
                        initial="initial"
                        animate="animate"
                        custom={progress}
                        variants={progressVariants}
                    />
                </div>
            </div>

            {/* Question Card with Animation */}
            <div className="relative min-h-[380px]">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentStep}
                        custom={direction}
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="bg-white rounded-2xl shadow-xl p-8 border border-warm-100"
                    >
                        {/* Question Number Badge */}
                        <div className={`inline-flex items-center px-3 py-1 rounded-full bg-${accentColor}-100 text-${accentColor}-700 text-sm font-medium mb-4`}>
                            <span>第 {currentStep + 1} 题</span>
                        </div>

                        {/* Question Text */}
                        <p className="text-xl text-warm-800 font-medium mb-2 leading-relaxed">
                            {questions[currentStep].text}
                        </p>

                        {/* Help Text */}
                        {questions[currentStep].helpText && (
                            <p className="text-warm-500 text-sm mb-6">
                                {questions[currentStep].helpText}
                            </p>
                        )}

                        {/* Options */}
                        <div className="space-y-3 mt-6">
                            {options.map((option, idx) => (
                                <motion.button
                                    key={option.value}
                                    onClick={() => handleAnswer(option.value)}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${currentAnswer === option.value
                                            ? `border-${accentColor}-500 bg-${accentColor}-50 text-${accentColor}-700`
                                            : 'border-warm-200 hover:border-primary-300 hover:bg-warm-50'
                                        }`}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="font-medium">{option.label}</span>
                                            {option.description && (
                                                <span className="text-warm-500 text-sm ml-2">
                                                    ({option.description})
                                                </span>
                                            )}
                                        </div>
                                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${currentAnswer === option.value
                                                ? `border-${accentColor}-500 bg-${accentColor}-500`
                                                : 'border-warm-300'
                                            }`}>
                                            {currentAnswer === option.value && (
                                                <motion.svg
                                                    className="w-4 h-4 text-white"
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: "spring", stiffness: 300 }}
                                                >
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </motion.svg>
                                            )}
                                        </span>
                                    </div>
                                </motion.button>
                            ))}
                        </div>

                        {/* Keyboard hint */}
                        <p className="text-xs text-warm-400 text-center mt-6">
                            💡 可使用键盘数字键 1-{options.length} 快速选择，方向键切换问题
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6">
                <div className="flex space-x-3">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-warm-500 hover:text-warm-700 transition-colors"
                        >
                            ← 退出
                        </button>
                    )}
                    {currentStep > 0 && (
                        <motion.button
                            onClick={handlePrevious}
                            className="px-6 py-2 border border-warm-300 rounded-xl text-warm-600 hover:bg-warm-50 transition-all"
                            whileHover={{ x: -3 }}
                        >
                            ← 上一题
                        </motion.button>
                    )}
                </div>

                {currentStep < totalSteps - 1 ? (
                    <motion.button
                        onClick={handleNext}
                        disabled={currentAnswer === null}
                        className={`px-6 py-2 rounded-xl font-medium transition-all ${currentAnswer !== null
                                ? `bg-${accentColor}-500 text-white hover:bg-${accentColor}-600`
                                : 'bg-warm-200 text-warm-400 cursor-not-allowed'
                            }`}
                        whileHover={currentAnswer !== null ? { x: 3 } : {}}
                    >
                        下一题 →
                    </motion.button>
                ) : (
                    <motion.button
                        onClick={handleComplete}
                        disabled={!allAnswered}
                        className={`px-8 py-3 rounded-xl font-medium transition-all ${allAnswered
                                ? `bg-gradient-to-r from-${accentColor}-500 to-${accentColor}-600 text-white shadow-lg hover:shadow-xl`
                                : 'bg-warm-200 text-warm-400 cursor-not-allowed'
                            }`}
                        whileHover={allAnswered ? { scale: 1.02 } : {}}
                        whileTap={allAnswered ? { scale: 0.98 } : {}}
                    >
                        ✨ 完成评估
                    </motion.button>
                )}
            </div>
        </div>
    );
};

QuestionStepper.displayName = 'QuestionStepper';
