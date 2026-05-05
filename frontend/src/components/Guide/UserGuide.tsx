/**
 * UserGuide.tsx
 * 
 * Interactive onboarding tour to guide users through the dashboard features.
 * Uses a darkened overlay with highlighted elements and tooltips.
 */

import { useState, useEffect } from 'react';

interface Step {
    target: string; // CSS selector of target element
    title: string;
    content: string;
    position: 'top' | 'bottom' | 'left' | 'right';
}

const STEPS: Step[] = [
    {
        target: '[data-tour="welcome"]',
        title: '欢迎来到 NeuraSense',
        content: '这是您的个人心理健康仪表盘。在这里，您可以查看每日状态、积分和连击奖励。',
        position: 'bottom',
    },
    {
        target: '[data-tour="actions"]',
        title: '快速行动',
        content: '随时开始咨询对话、记录今日心情，或进行快速的画钟认知测试。',
        position: 'bottom',
    },
    {
        target: '[data-tour="phenotyping"]',
        title: 'AI 生理洞察',
        content: '连接您的可穿戴设备，AI 将实时分析您的心率、睡眠和压力水平，生成五维雷达图。',
        position: 'top',
    },
    {
        target: '[data-tour="immersive"]',
        title: '沉浸式疗愈',
        content: '进入 3D 森林场景，通过生物反馈调节呼吸和心率，获得深度放松体验。',
        position: 'top',
    },
    {
        target: '[data-tour="community"]',
        title: '温暖社区',
        content: '在这里匿名分享您的感受，或为他人送去鼓励。每一份温暖都会被看见。',
        position: 'top',
    },
];

export const UserGuide = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

    useEffect(() => {
        // Check if user has seen the guide
        const hasSeenGuide = localStorage.getItem('has_seen_user_guide');
        if (!hasSeenGuide) {
            // Small delay to ensure elements are rendered
            setTimeout(() => {
                setIsVisible(true);
            }, 1000);
        }
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        const updatePosition = () => {
            const step = STEPS[currentStep];
            const element = document.querySelector(step.target);

            if (element) {
                const rect = element.getBoundingClientRect();

                // If element is completely off screen, scroll to it first
                if (rect.top < 0 || rect.bottom > window.innerHeight) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                // Update position using VIEWPORT coordinates (since container is fixed)
                setPosition({
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                });
            }
        };

        // Initial update
        const timer = setTimeout(updatePosition, 100);

        // Add listeners
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, { passive: true, capture: true });

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, { capture: true });
        };
    }, [currentStep, isVisible]);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(c => c + 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        setIsVisible(false);
        localStorage.setItem('has_seen_user_guide', 'true');
    };

    if (!isVisible) return null;

    const step = STEPS[currentStep];

    // Calculate tooltip position with smart flip
    const getTooltipStyle = () => {
        const gap = 12;
        const tooltipHeight = 200; // Approximate max height

        let placement = step.position;

        // Smart flip logic
        // If bottom placement would go off screen bottom, flip to top
        if (placement === 'bottom' && (position.top + position.height + tooltipHeight > window.innerHeight)) {
            placement = 'top';
        }
        // If top placement would go off screen top, flip to bottom
        if (placement === 'top' && (position.top - tooltipHeight < 0)) {
            placement = 'bottom';
        }

        if (placement === 'bottom') {
            return {
                top: position.top + position.height + gap,
                left: position.left,
                maxHeight: window.innerHeight - (position.top + position.height + gap) - 20
            };
        }
        if (placement === 'top') {
            return {
                bottom: window.innerHeight - position.top + gap,
                left: position.left,
                maxHeight: position.top - gap - 20
            };
        }
        return { top: position.top, left: position.left };
    };

    const tooltipStyle = getTooltipStyle();

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none">
            {/* The Highlight Box / cutout - using huge shadow to create overlay effect */}
            <div
                className="absolute rounded-xl transition-all duration-200 ease-out border-2 border-primary-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"
                style={{
                    top: position.top - 4,
                    left: position.left - 4,
                    width: position.width + 8,
                    height: position.height + 8,
                    // If dimensions are 0 (e.g. init), hide to avoid flash
                    opacity: position.width === 0 ? 0 : 1
                }}
            />

            {/* Tooltip */}
            <div
                className="absolute w-80 bg-white rounded-2xl shadow-2xl p-6 transition-all duration-300 animate-fadeIn pointer-events-auto overflow-y-auto"
                style={tooltipStyle as any}
            >
                <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-accent-500 uppercase tracking-wider">
                        新手引导 {currentStep + 1}/{STEPS.length}
                    </span>
                    <button onClick={handleClose} className="text-warm-400 hover:text-warm-600">
                        ✕
                    </button>
                </div>

                <h3 className="text-xl font-bold text-warm-800 mb-2">{step.title}</h3>
                <p className="text-warm-600 text-sm mb-6 leading-relaxed">
                    {step.content}
                </p>

                <div className="flex justify-between items-center">
                    <button
                        onClick={handleClose}
                        className="text-sm text-warm-500 hover:text-warm-700"
                    >
                        跳过
                    </button>
                    <button
                        onClick={handleNext}
                        className="px-6 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                    >
                        {currentStep === STEPS.length - 1 ? '开始体验' : '下一步'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserGuide;
