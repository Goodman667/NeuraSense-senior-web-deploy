/**
 * BioSignalAIPanel Component
 * 
 * Unified control panel for all bio-signal analysis features:
 * - Eye fatigue monitoring with AI analysis
 * - Voice emotion analysis with AI insights
 * - Facial emotion detection
 * - Cognitive function tests
 */

import { useState } from 'react';
import { OculometricMonitor } from '../OculometricMonitor/OculometricMonitor';
import { VoiceAnalyzerMonitor } from '../VoiceAnalyzerMonitor/VoiceAnalyzerMonitor';
import { EmotionDetector } from '../EmotionDetector';
import { CognitiveTestPanel } from '../CognitiveTest';

type TabType = 'eye' | 'voice' | 'emotion' | 'cognitive';

interface BioSignalAIPanelProps {
    onClose?: () => void;
    className?: string;
}

const TABS: { id: TabType; label: string; icon: string; color: string }[] = [
    { id: 'eye', label: '眼部监测', icon: '👁️', color: 'from-primary-500 to-accent-500' },
    { id: 'voice', label: '语音分析', icon: '🎤', color: 'from-accent-500 to-rose-500' },
    { id: 'emotion', label: '表情识别', icon: '😊', color: 'from-pink-500 to-rose-500' },
    { id: 'cognitive', label: '认知测试', icon: '🧩', color: 'from-indigo-500 to-purple-500' },
];

export const BioSignalAIPanel = ({
    onClose,
    className = '',
}: BioSignalAIPanelProps) => {
    const [activeTab, setActiveTab] = useState<TabType>('eye');

    return (
        <div className={`bg-gradient-to-br from-warm-50 to-primary-50 rounded-2xl shadow-xl border border-warm-200/50 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold flex items-center space-x-2">
                            <span>🧠</span>
                            <span>AI 心理生物信号分析中心</span>
                        </h2>
                        <p className="text-sm text-indigo-200 mt-1">
                            多模态生物信号智能分析，洞察您的心理健康状态
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

            {/* Tab Navigation */}
            <div className="flex bg-white/80 border-b border-warm-200/50">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-3 px-4 text-sm font-medium transition-all flex items-center justify-center space-x-2
                            ${activeTab === tab.id
                                ? 'text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/50'
                                : 'text-warm-500 hover:text-warm-700 hover:bg-warm-50'
                            }`}
                    >
                        <span>{tab.icon}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="p-4">
                {activeTab === 'eye' && (
                    <OculometricMonitor />
                )}

                {activeTab === 'voice' && (
                    <VoiceAnalyzerMonitor />
                )}

                {activeTab === 'emotion' && (
                    <EmotionDetector />
                )}

                {activeTab === 'cognitive' && (
                    <CognitiveTestPanel />
                )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-white/60 border-t border-warm-200/50">
                <p className="text-xs text-warm-400 text-center">
                    💡 所有分析结果仅供参考，不能替代专业心理评估。如需帮助，请咨询专业人士。
                </p>
            </div>
        </div>
    );
};

BioSignalAIPanel.displayName = 'BioSignalAIPanel';
