/**
 * Enhanced Scale Selector with Therapeutic Features
 * 
 * Includes:
 * - Avatar integration (reads questions, shows empathy)
 * - Breathing exercises before/after assessment
 * - Real-time encouragement messages
 * - Crisis intervention module
 * - Personalized resource recommendations
 * - Assessment history tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { PHQ9Scale } from './PHQ9Scale';
import { GAD7Scale } from './GAD7Scale';
import { SDSScale } from './SDSScale';
import { SASScale } from './SASScale';
import { PSSScale } from './PSSScale';
import { AssessmentHistory } from '../History';

interface ScaleSelectorProps {
    onClose?: () => void;
}

type ScaleType = 'selector' | 'phq9' | 'gad7' | 'sds' | 'sas' | 'pss10' | 'breathing' | 'grounding' | 'history';

const SCALES = [
    {
        id: 'phq9' as ScaleType,
        name: 'PHQ-9',
        title: '抑郁筛查量表',
        description: '9道题评估抑郁症状严重程度',
        time: '约2分钟',
        icon: '😔',
        gradient: 'from-rose-500 to-pink-600',
        available: true,
    },
    {
        id: 'gad7' as ScaleType,
        name: 'GAD-7',
        title: '焦虑筛查量表',
        description: '7道题评估广泛性焦虑水平',
        time: '约2分钟',
        icon: '😰',
        gradient: 'from-blue-500 to-cyan-600',
        available: true,
    },
    {
        id: 'sds' as ScaleType,
        name: 'SDS',
        title: '抑郁自评量表',
        description: '20道题深度评估抑郁程度',
        time: '约5分钟',
        icon: '💜',
        gradient: 'from-purple-500 to-violet-600',
        available: true,
    },
    {
        id: 'sas' as ScaleType,
        name: 'SAS',
        title: '焦虑自评量表',
        description: '20道题深度评估焦虑程度',
        time: '约5分钟',
        icon: '🧡',
        gradient: 'from-orange-500 to-amber-600',
        available: true,
    },
    {
        id: 'pss10' as ScaleType,
        name: 'PSS-10',
        title: '压力感知量表',
        description: '10道题评估过去一个月压力水平',
        time: '约3分钟',
        icon: '💪',
        gradient: 'from-indigo-500 to-purple-600',
        available: true,
    },
];

const THERAPEUTIC_TOOLS = [
    {
        id: 'breathing' as ScaleType,
        name: '478呼吸法',
        description: '快速缓解焦虑的呼吸练习',
        icon: '🌬️',
        gradient: 'from-teal-500 to-emerald-600',
    },
    {
        id: 'grounding' as ScaleType,
        name: '54321接地法',
        description: '当感到不安时使用的感官练习',
        icon: '🌿',
        gradient: 'from-green-500 to-lime-600',
    },
];

// 478呼吸法组件
const BreathingExercise = ({ onClose }: { onClose: () => void }) => {
    const [phase, setPhase] = useState<'intro' | 'inhale' | 'hold' | 'exhale' | 'complete'>('intro');
    const [cycles, setCycles] = useState(0);
    const [countdown, setCountdown] = useState(0);
    const totalCycles = 3;

    const startBreathing = useCallback(() => {
        setPhase('inhale');
        setCycles(0);
    }, []);

    useEffect(() => {
        if (phase === 'intro' || phase === 'complete') return;

        let duration = 0;
        if (phase === 'inhale') duration = 4;
        else if (phase === 'hold') duration = 7;
        else if (phase === 'exhale') duration = 8;

        setCountdown(duration);

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (phase === 'inhale') setPhase('hold');
                    else if (phase === 'hold') setPhase('exhale');
                    else if (phase === 'exhale') {
                        if (cycles + 1 >= totalCycles) {
                            setPhase('complete');
                        } else {
                            setCycles(c => c + 1);
                            setPhase('inhale');
                        }
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [phase, cycles]);

    const getCircleSize = () => {
        if (phase === 'inhale') return 'scale-150';
        if (phase === 'hold') return 'scale-150';
        if (phase === 'exhale') return 'scale-100';
        return 'scale-100';
    };

    const getInstruction = () => {
        if (phase === 'inhale') return '吸气...';
        if (phase === 'hold') return '屏住呼吸...';
        if (phase === 'exhale') return '慢慢呼气...';
        return '';
    };

    return (
        <div className="max-w-xl mx-auto text-center">
            {phase === 'intro' && (
                <div className="space-y-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full mx-auto flex items-center justify-center">
                        <span className="text-5xl">🌬️</span>
                    </div>
                    <h2 className="text-2xl font-bold text-warm-800">478 呼吸放松法</h2>
                    <p className="text-warm-600 max-w-md mx-auto">
                        这是一种被科学证明能快速激活副交感神经、缓解焦虑的呼吸技术。
                    </p>
                    <div className="bg-teal-50 rounded-xl p-4 text-left max-w-sm mx-auto">
                        <p className="font-medium text-teal-800 mb-2">练习步骤：</p>
                        <ul className="text-sm text-teal-700 space-y-1">
                            <li>1️⃣ 用鼻子吸气 <strong>4</strong> 秒</li>
                            <li>2️⃣ 屏住呼吸 <strong>7</strong> 秒</li>
                            <li>3️⃣ 用嘴呼气 <strong>8</strong> 秒</li>
                            <li>🔄 重复 3 次</li>
                        </ul>
                    </div>
                    <button
                        onClick={startBreathing}
                        className="px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-2xl font-semibold text-lg hover:opacity-90 transition-all"
                    >
                        开始练习
                    </button>
                </div>
            )}

            {(phase === 'inhale' || phase === 'hold' || phase === 'exhale') && (
                <div className="space-y-8">
                    <div className="text-warm-500 text-sm">
                        第 {cycles + 1} / {totalCycles} 轮
                    </div>

                    {/* 呼吸圆圈动画 */}
                    <div className="relative h-64 flex items-center justify-center">
                        <div
                            className={`w-32 h-32 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full transition-all duration-1000 ease-in-out ${getCircleSize()} opacity-80`}
                        />
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-5xl font-bold text-teal-600">{countdown}</span>
                        </div>
                    </div>

                    <p className="text-2xl font-medium text-teal-700">{getInstruction()}</p>

                    <div className="flex justify-center space-x-2">
                        {[...Array(totalCycles)].map((_, i) => (
                            <div
                                key={i}
                                className={`w-3 h-3 rounded-full transition-all ${i < cycles ? 'bg-teal-500' :
                                    i === cycles ? 'bg-teal-300 animate-pulse' :
                                        'bg-warm-200'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            )}

            {phase === 'complete' && (
                <div className="space-y-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mx-auto flex items-center justify-center">
                        <span className="text-5xl">✨</span>
                    </div>
                    <h2 className="text-2xl font-bold text-warm-800">太棒了！</h2>
                    <p className="text-warm-600 max-w-md mx-auto">
                        你完成了 478 呼吸练习。感觉怎么样？<br />
                        规律练习可以帮助你更好地管理焦虑。
                    </p>
                    <div className="flex space-x-4 justify-center">
                        <button
                            onClick={() => { setPhase('intro'); setCycles(0); }}
                            className="px-6 py-3 bg-teal-100 text-teal-700 rounded-xl font-medium"
                        >
                            再来一次
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-teal-500 text-white rounded-xl font-medium"
                        >
                            返回
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// 54321接地法组件
const GroundingExercise = ({ onClose }: { onClose: () => void }) => {
    const [step, setStep] = useState(0);
    const steps = [
        { count: 5, sense: '看', instruction: '说出你能看到的 5 样东西', icon: '👀', color: 'blue' },
        { count: 4, sense: '触', instruction: '说出你能触摸到的 4 样东西', icon: '✋', color: 'green' },
        { count: 3, sense: '听', instruction: '说出你能听到的 3 种声音', icon: '👂', color: 'purple' },
        { count: 2, sense: '闻', instruction: '说出你能闻到的 2 种气味', icon: '👃', color: 'orange' },
        { count: 1, sense: '尝', instruction: '说出你能尝到的 1 种味道', icon: '👅', color: 'pink' },
    ];

    const currentStep = steps[step];

    return (
        <div className="max-w-xl mx-auto text-center">
            {step === 0 && (
                <div className="space-y-6 mb-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-lime-500 rounded-full mx-auto flex items-center justify-center">
                        <span className="text-5xl">🌿</span>
                    </div>
                    <h2 className="text-2xl font-bold text-warm-800">54321 接地练习</h2>
                    <p className="text-warm-600 max-w-md mx-auto">
                        当你感到焦虑或不安时，这个练习可以帮助你回到当下，重新与周围环境建立连接。
                    </p>
                </div>
            )}

            {step < 5 && (
                <div className="bg-white rounded-2xl shadow-lg p-8 border border-warm-100">
                    <div className={`w-20 h-20 bg-${currentStep.color}-100 rounded-2xl mx-auto flex items-center justify-center mb-6`}>
                        <span className="text-4xl">{currentStep.icon}</span>
                    </div>

                    <div className="text-6xl font-bold text-warm-800 mb-4">{currentStep.count}</div>

                    <p className="text-xl text-warm-700 mb-8">{currentStep.instruction}</p>

                    <div className="flex justify-center space-x-2 mb-8">
                        {steps.map((_, i) => (
                            <div
                                key={i}
                                className={`w-3 h-3 rounded-full transition-all ${i < step ? 'bg-green-500' :
                                    i === step ? 'bg-green-300 animate-pulse' :
                                        'bg-warm-200'
                                    }`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={() => setStep(step + 1)}
                        className={`px-8 py-3 bg-gradient-to-r from-${currentStep.color}-500 to-${currentStep.color}-600 text-white rounded-xl font-medium`}
                    >
                        完成，下一步 →
                    </button>
                </div>
            )}

            {step >= 5 && (
                <div className="space-y-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mx-auto flex items-center justify-center">
                        <span className="text-5xl">🌟</span>
                    </div>
                    <h2 className="text-2xl font-bold text-warm-800">你做得很好！</h2>
                    <p className="text-warm-600 max-w-md mx-auto">
                        你已经完成了接地练习。现在你应该感觉更加平静和专注。<br />
                        记住，当焦虑来临时，你随时可以使用这个技巧。
                    </p>
                    <div className="flex space-x-4 justify-center">
                        <button
                            onClick={() => setStep(0)}
                            className="px-6 py-3 bg-green-100 text-green-700 rounded-xl font-medium"
                        >
                            再来一次
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-green-500 text-white rounded-xl font-medium"
                        >
                            返回
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export const ScaleSelector = ({ onClose }: ScaleSelectorProps) => {
    const [currentScale, setCurrentScale] = useState<ScaleType>('selector');
    const [showCrisisModal, setShowCrisisModal] = useState(false);

    // 如果选择了某个量表，显示该量表
    if (currentScale === 'phq9') {
        return <PHQ9Scale onClose={() => setCurrentScale('selector')} />;
    }
    if (currentScale === 'gad7') {
        return <GAD7Scale onClose={() => setCurrentScale('selector')} />;
    }
    if (currentScale === 'sds') {
        return <SDSScale onClose={() => setCurrentScale('selector')} />;
    }
    if (currentScale === 'sas') {
        return <SASScale onClose={() => setCurrentScale('selector')} />;
    }
    if (currentScale === 'pss10') {
        return <PSSScale onClose={() => setCurrentScale('selector')} />;
    }
    if (currentScale === 'breathing') {
        return <BreathingExercise onClose={() => setCurrentScale('selector')} />;
    }
    if (currentScale === 'grounding') {
        return <GroundingExercise onClose={() => setCurrentScale('selector')} />;
    }
    if (currentScale === 'history') {
        return <AssessmentHistory onClose={() => setCurrentScale('selector')} />;
    }

    return (
        <div className="max-w-5xl mx-auto">
            {/* 危机干预弹窗 */}
            {showCrisisModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center mb-4">
                                <span className="text-3xl">❤️</span>
                            </div>
                            <h3 className="text-xl font-bold text-warm-800">我们在乎你</h3>
                        </div>
                        <p className="text-warm-600 mb-6 text-center">
                            如果你正在经历困难时刻，请知道你并不孤单。以下资源可以帮助你：
                        </p>
                        <div className="space-y-3">
                            <a href="tel:400-161-9995" className="flex items-center p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-all">
                                <span className="text-2xl mr-3">📞</span>
                                <div>
                                    <div className="font-bold text-red-700">24小时心理援助热线</div>
                                    <div className="text-red-600">400-161-9995</div>
                                </div>
                            </a>
                            <a href="tel:010-82951332" className="flex items-center p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-all">
                                <span className="text-2xl mr-3">🏥</span>
                                <div>
                                    <div className="font-bold text-orange-700">北京心理危机研究与干预中心</div>
                                    <div className="text-orange-600">010-82951332</div>
                                </div>
                            </a>
                            <a href="tel:12320-5" className="flex items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all">
                                <span className="text-2xl mr-3">💙</span>
                                <div>
                                    <div className="font-bold text-blue-700">全国心理援助热线</div>
                                    <div className="text-blue-600">12320-5</div>
                                </div>
                            </a>
                        </div>
                        <button
                            onClick={() => setShowCrisisModal(false)}
                            className="w-full mt-6 py-3 bg-warm-100 text-warm-700 rounded-xl font-medium"
                        >
                            关闭
                        </button>
                    </div>
                </div>
            )}

            {/* 标题区域 */}
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-warm-800 mb-3">心理健康服务中心</h2>
                <p className="text-warm-600 max-w-2xl mx-auto">
                    选择专业量表进行自我评估，或尝试我们的放松练习。你的心理健康很重要，我们在这里支持你。
                </p>
            </div>

            {/* 紧急求助按钮 */}
            <div className="mb-8">
                <button
                    onClick={() => setShowCrisisModal(true)}
                    className="w-full py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 hover:opacity-90 transition-all"
                >
                    <span className="text-xl">🆘</span>
                    <span>需要紧急帮助？点击这里</span>
                </button>
            </div>

            {/* 量表评估区域 */}
            <div className="mb-8">
                <h3 className="text-lg font-bold text-warm-700 mb-4 flex items-center">
                    <span className="text-xl mr-2">📊</span>
                    心理量表评估
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SCALES.map((scale) => (
                        <div
                            key={scale.id}
                            onClick={() => scale.available && setCurrentScale(scale.id)}
                            className="bg-white rounded-2xl shadow-lg overflow-hidden border border-warm-100 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer"
                        >
                            <div className={`h-2 bg-gradient-to-r ${scale.gradient}`} />
                            <div className="p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-3xl">{scale.icon}</span>
                                        <div>
                                            <h4 className="font-bold text-warm-800">{scale.name}</h4>
                                            <p className="text-sm text-warm-500">{scale.title}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-warm-400 bg-warm-50 px-2 py-1 rounded">
                                        {scale.time}
                                    </span>
                                </div>
                                <p className="text-warm-600 text-sm mt-3">{scale.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 放松工具区域 */}
            <div className="mb-8">
                <h3 className="text-lg font-bold text-warm-700 mb-4 flex items-center">
                    <span className="text-xl mr-2">🧘</span>
                    即时放松工具
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">推荐</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {THERAPEUTIC_TOOLS.map((tool) => (
                        <div
                            key={tool.id}
                            onClick={() => setCurrentScale(tool.id)}
                            className="bg-white rounded-2xl shadow-lg overflow-hidden border border-warm-100 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer"
                        >
                            <div className={`h-2 bg-gradient-to-r ${tool.gradient}`} />
                            <div className="p-5">
                                <div className="flex items-center space-x-3">
                                    <span className="text-3xl">{tool.icon}</span>
                                    <div>
                                        <h4 className="font-bold text-warm-800">{tool.name}</h4>
                                        <p className="text-sm text-warm-500">{tool.description}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 自我帮助资源 */}
            <div className="bg-gradient-to-br from-warm-50 to-primary-50 rounded-2xl p-6 mb-8">
                <h3 className="text-lg font-bold text-warm-700 mb-4">📚 自我帮助资源</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div
                        onClick={() => setCurrentScale('history')}
                        className="bg-white rounded-xl p-4 text-center hover:shadow-md transition-all cursor-pointer border-2 border-primary-200"
                    >
                        <span className="text-2xl">📊</span>
                        <div className="font-medium text-primary-700 text-sm mt-2">评估历史</div>
                        <div className="text-xs text-primary-500">查看趋势变化</div>
                    </div>
                    {[
                        { icon: '😴', title: '改善睡眠', desc: '睡眠卫生指南' },
                        { icon: '🏃', title: '运动处方', desc: '适合心理健康的运动' },
                        { icon: '📝', title: '情绪日记', desc: '记录和追踪情绪' },
                        { icon: '💬', title: '与AI对话', desc: '倾诉你的感受' },
                    ].map((resource, i) => (
                        <div key={i} className="bg-white rounded-xl p-4 text-center hover:shadow-md transition-all cursor-pointer">
                            <span className="text-2xl">{resource.icon}</span>
                            <div className="font-medium text-warm-700 text-sm mt-2">{resource.title}</div>
                            <div className="text-xs text-warm-500">{resource.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 底部说明 */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-start space-x-3">
                    <span className="text-xl">⚠️</span>
                    <div>
                        <p className="font-medium text-amber-800">重要提示</p>
                        <p className="text-sm text-amber-700">
                            量表评估结果仅供参考，不能作为临床诊断依据。如您正在经历严重困扰，请点击上方紧急帮助按钮或拨打热线。
                        </p>
                    </div>
                </div>
            </div>

            {/* 返回按钮 */}
            <div className="text-center">
                <button
                    onClick={onClose}
                    className="px-8 py-3 text-warm-600 hover:text-warm-800 transition-all"
                >
                    ← 返回首页
                </button>
            </div>
        </div>
    );
};

export default ScaleSelector;
