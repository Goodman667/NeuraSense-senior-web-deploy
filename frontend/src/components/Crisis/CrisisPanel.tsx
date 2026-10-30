/**
 * Crisis Support Panel
 * 
 * Fixed bottom button that expands to show emergency hotlines and safety plan.
 * Can be triggered automatically on high-risk assessment scores.
 */

import { useState, useEffect } from 'react';

interface CrisisPanelProps {
    /** Automatically show panel if true */
    autoShow?: boolean;
    /** Callback when panel is dismissed */
    onDismiss?: () => void;
}

interface SafetyPlanItem {
    id: string;
    text: string;
}

const HOTLINES = [
    { name: '24小时心理援助热线', number: '400-161-9995', icon: '📞', color: 'red' },
    { name: '北京心理危机干预中心', number: '010-82951332', icon: '🏥', color: 'orange' },
    { name: '全国心理援助热线', number: '12320-5', icon: '💙', color: 'blue' },
    { name: '生命热线', number: '400-821-1215', icon: '❤️', color: 'pink' },
    { name: '希望24热线', number: '400-161-9995', icon: '🌟', color: 'purple' },
];

const DEFAULT_SAFETY_PLAN: SafetyPlanItem[] = [
    { id: '1', text: '深呼吸，数到10' },
    { id: '2', text: '联系一个信任的朋友' },
    { id: '3', text: '去一个让我感到安全的地方' },
];

export const CrisisPanel = ({ autoShow = false, onDismiss }: CrisisPanelProps) => {
    const [isExpanded, setIsExpanded] = useState(autoShow);
    const [safetyPlan, setSafetyPlan] = useState<SafetyPlanItem[]>(() => {
        const saved = localStorage.getItem('crisis_safety_plan');
        return saved ? JSON.parse(saved) : DEFAULT_SAFETY_PLAN;
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');

    // Auto show if triggered
    useEffect(() => {
        if (autoShow) {
            setIsExpanded(true);
        }
    }, [autoShow]);

    // Save safety plan to localStorage
    useEffect(() => {
        localStorage.setItem('crisis_safety_plan', JSON.stringify(safetyPlan));
    }, [safetyPlan]);

    const handleAddItem = () => {
        if (editText.trim()) {
            setSafetyPlan([...safetyPlan, {
                id: Date.now().toString(),
                text: editText.trim(),
            }]);
            setEditText('');
            setIsEditing(false);
        }
    };

    const handleRemoveItem = (id: string) => {
        setSafetyPlan(safetyPlan.filter(item => item.id !== id));
    };

    const handleDismiss = () => {
        setIsExpanded(false);
        onDismiss?.();
    };

    return (
        <>
            {/* Fixed Bottom Button */}
            {!isExpanded && (
                <button
                    onClick={() => setIsExpanded(true)}
                    data-tour-always
                    className="fixed bottom-6 right-6 z-40 flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                    <span className="text-xl">❤️</span>
                    <span className="font-medium">需要帮助？</span>
                </button>
            )}

            {/* Expanded Panel */}
            {isExpanded && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4" data-tour-pause>
                    <div className="bg-white rounded-t-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden animate-slide-up">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-red-500 to-pink-500 p-6 text-white">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-3">
                                    <span className="text-3xl">💜</span>
                                    <h2 className="text-2xl font-bold">我们在这里陪你</h2>
                                </div>
                                <button
                                    onClick={handleDismiss}
                                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                            <p className="text-white/90">
                                深呼吸，你并不孤单。如果需要帮助，随时拨打下方热线。
                            </p>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {/* Quick Breathing */}
                            <div className="bg-teal-50 rounded-xl p-4 mb-6 flex items-center space-x-4">
                                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-2xl animate-pulse">
                                    🧘
                                </div>
                                <div>
                                    <p className="font-medium text-teal-800">先做一个深呼吸</p>
                                    <p className="text-sm text-teal-600">吸气4秒，屏住4秒，呼气6秒</p>
                                </div>
                            </div>

                            {/* Hotlines */}
                            <h3 className="font-bold text-warm-800 mb-3 flex items-center">
                                <span className="mr-2">📞</span> 心理援助热线
                            </h3>
                            <div className="space-y-2 mb-6">
                                {HOTLINES.map((hotline, idx) => (
                                    <a
                                        key={idx}
                                        href={`tel:${hotline.number}`}
                                        className={`flex items-center justify-between p-3 bg-${hotline.color}-50 rounded-xl hover:bg-${hotline.color}-100 transition-all border border-${hotline.color}-200`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <span className="text-xl">{hotline.icon}</span>
                                            <div>
                                                <div className="font-medium text-warm-800">{hotline.name}</div>
                                                <div className="text-sm text-warm-500">{hotline.number}</div>
                                            </div>
                                        </div>
                                        <span className="text-warm-400">📱</span>
                                    </a>
                                ))}
                            </div>

                            {/* Safety Plan */}
                            <h3 className="font-bold text-warm-800 mb-3 flex items-center">
                                <span className="mr-2">🛡️</span> 我的安全计划
                            </h3>
                            <p className="text-sm text-warm-500 mb-3">
                                当我感到难以承受时，我可以：
                            </p>
                            <div className="space-y-2 mb-4">
                                {safetyPlan.map((item, idx) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-3 bg-warm-50 rounded-xl group"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold">
                                                {idx + 1}
                                            </span>
                                            <span className="text-warm-700">{item.text}</span>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="text-warm-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add new item */}
                            {isEditing ? (
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        placeholder="添加一个应对策略..."
                                        className="flex-1 p-3 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleAddItem}
                                        className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600"
                                    >
                                        添加
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="w-full p-3 border-2 border-dashed border-warm-200 rounded-xl text-warm-400 hover:border-primary-300 hover:text-primary-500 transition-all"
                                >
                                    + 添加应对策略
                                </button>
                            )}

                            {/* Reminder */}
                            <div className="mt-6 p-4 bg-amber-50 rounded-xl">
                                <p className="text-sm text-amber-700">
                                    💡 <strong>记住：</strong>寻求帮助是勇敢的表现。你值得被爱和支持。
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-warm-100">
                            <button
                                onClick={handleDismiss}
                                className="w-full py-3 bg-warm-100 text-warm-700 rounded-xl font-medium hover:bg-warm-200 transition-all"
                            >
                                我知道了，暂时不需要
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Slide up animation */}
            <style>{`
                @keyframes slide-up {
                    from {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
            `}</style>
        </>
    );
};

export default CrisisPanel;
