import { useRef, useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useAppStore, useUIModeStore } from './store';
import { useGamificationStore } from './store/useGamificationStore';
import { useOnboardingStore } from './store/useOnboardingStore';
import { useProfileStore } from './store/useProfileStore';
import { useCheckinStore } from './store/useCheckinStore';
import {
    VirtualAvatar,
    type VirtualAvatarRef,
    DrawingCanvas,
    ResultModal,
    type AssessmentResult,
    OculometricMonitor,
    VoiceAnalyzerMonitor,
    EmbodiedAvatar,
    type EmbodiedAvatarRef,
    AuthModal,
    type UserInfo,
    BioSignalAIPanel,
    MoodJournal,
    CrisisPanel,
    AchievementCenter,
    EMACheckIn,
    CommunityFeed,
    CommunityLeaderboard,
    PrivateMessage,
    PsyChat,
    InterventionModal,
    BiofeedbackScene,
} from './components';
import {
    useBioSignalAggregator,
    useOculometricSensor,
    useVoiceAnalyzer,
    useKeystrokeDynamics,
    useJITAI,
    useHealthConnect,
    useDigitalPhenotyping
} from './hooks';

// API base URL
import { API_BASE } from './config/api';
import { markDailyTaskCompleted } from './lib/dailyProgress';
// Layout & Pages
import TabBar, { type TabId } from './layouts/TabBar';
import DesktopShell from './layouts/DesktopShell';
import { PageSkeleton, ChatSkeleton, ToolboxSkeleton, ProgramsSkeleton, MeSkeleton } from './components/PageSkeleton';
import LazyErrorBoundary from './components/LazyErrorBoundary';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import type { ToolItem } from './pages/ToolboxPage';
import SeniorRoutes from './features/senior/routes/SeniorRoutes';

// Lazy-loaded pages — 按需加载，减小首屏体积
// lazyRetry: 动态导入失败时自动重试，避免快速切换Tab导致白屏
function lazyRetry<T extends { default: React.ComponentType<any> }>(
    importFn: () => Promise<T>,
): React.LazyExoticComponent<T['default']> {
    return lazy(() =>
        importFn().catch(() =>
            // 失败后等 100ms 重试一次（清除浏览器缓存的失败 promise）
            new Promise<T>((resolve) => setTimeout(() => resolve(importFn()), 100))
        )
    );
}

const TodayPage = lazyRetry(() => import('./pages/TodayPage'));
const ToolboxPage = lazyRetry(() => import('./pages/ToolboxPage'));
const ToolRunner = lazyRetry(() => import('./pages/ToolRunner'));
const ProgramsPage = lazyRetry(() => import('./pages/ProgramsPage'));
const AssessmentCenterPage = lazyRetry(() => import('./pages/AssessmentCenterPage'));
const MePage = lazyRetry(() => import('./pages/MePage'));
const SettingsPage = lazyRetry(() => import('./pages/SettingsPage'));
const MessageCenterPage = lazyRetry(() => import('./pages/MessageCenterPage'));
const LandingPage = lazyRetry(() => import('./pages/LandingPage'));
const OnboardingWizard = lazyRetry(() => import('./pages/OnboardingWizard'));
const SeniorHomePage = lazyRetry(() => import('./features/senior/pages/SeniorHomePage'));

// ====== INLINE STROOP TEST VIEW ======
interface StroopTestViewProps {
    onComplete: () => void;
}

const STROOP_COLORS = [
    { name: '红色', value: '#EF4444', key: 'r' },
    { name: '蓝色', value: '#3B82F6', key: 'b' },
    { name: '绿色', value: '#22C55E', key: 'g' },
    { name: '黄色', value: '#EAB308', key: 'y' },
];

const StroopTestView = ({ onComplete }: StroopTestViewProps) => {
    const [phase, setPhase] = useState<'intro' | 'playing' | 'result'>('intro');
    const [currentTrial, setCurrentTrial] = useState({ word: '红色', color: '#3B82F6', answer: '蓝色' });
    const [trialIndex, setTrialIndex] = useState(0);
    const [correct, setCorrect] = useState(0);
    const [total] = useState(10);
    const startTimeRef = useRef(Date.now());
    const [avgTime, setAvgTime] = useState(0);
    const times: number[] = [];

    const generateTrial = useCallback(() => {
        const wordIdx = Math.floor(Math.random() * 4);
        const colorIdx = Math.random() < 0.3 ? wordIdx : (wordIdx + 1 + Math.floor(Math.random() * 3)) % 4;
        return {
            word: STROOP_COLORS[wordIdx].name,
            color: STROOP_COLORS[colorIdx].value,
            answer: STROOP_COLORS[colorIdx].name,
        };
    }, []);

    const startGame = () => {
        setPhase('playing');
        setTrialIndex(0);
        setCorrect(0);
        setCurrentTrial(generateTrial());
        startTimeRef.current = Date.now();
    };

    const handleAnswer = (selectedColor: string) => {
        const reactionTime = Date.now() - startTimeRef.current;
        times.push(reactionTime);
        if (selectedColor === currentTrial.answer) setCorrect(c => c + 1);

        const i = trialIndex + 1;
        if (i >= total) {
            setAvgTime(Math.round(times.reduce((a, b) => a + b, 0) / times.length));
            setPhase('result');
        } else {
            setTrialIndex(i => i + 1);
            setCurrentTrial(generateTrial());
            startTimeRef.current = Date.now();
        }
    };

    if (phase === 'intro') {
        return (
            <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto flex items-center justify-center mb-6">
                    <span className="text-4xl">🎮</span>
                </div>
                <h2 className="text-2xl font-bold text-warm-800 mb-4">Stroop 色词测试</h2>
                <p className="text-warm-600 mb-6">
                    屏幕上会显示颜色名称的文字，但文字本身的颜色可能不同。<br />
                    请<span className="font-bold text-purple-600">点击文字显示的颜色</span>，而不是文字的含义！
                </p>
                <div className="bg-warm-50 rounded-xl p-4 mb-6">
                    <p className="text-sm text-warm-500 mb-2">示例：</p>
                    <p className="text-3xl font-bold" style={{ color: '#3B82F6' }}>红色</p>
                    <p className="text-sm text-warm-500 mt-2">正确答案是：<span className="text-blue-500 font-bold">蓝色</span></p>
                </div>
                <button onClick={startGame} className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-lg hover:from-purple-600 hover:to-pink-600 transition-all">
                    开始测试 ({total} 题)
                </button>
            </div>
        );
    }

    if (phase === 'playing') {
        return (
            <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl p-8">
                <div className="flex justify-between items-center mb-6">
                    <span className="text-warm-500">第 {trialIndex + 1} / {total} 题</span>
                    <div className="w-32 h-2 bg-warm-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 transition-all" style={{ width: `${((trialIndex + 1) / total) * 100}%` }} />
                    </div>
                </div>
                <div className="h-32 flex items-center justify-center mb-8">
                    <span className="text-5xl font-bold" style={{ color: currentTrial.color }}>{currentTrial.word}</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                    {STROOP_COLORS.map(color => (
                        <button key={color.name} onClick={() => handleAnswer(color.name)} className="py-4 rounded-xl text-white font-medium transition-all hover:scale-105 active:scale-95" style={{ backgroundColor: color.value }}>
                            {color.name}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const accuracy = Math.round((correct / total) * 100);
    const score = Math.round(accuracy * 0.6 + Math.max(0, 100 - avgTime / 10) * 0.4);

    return (
        <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mx-auto flex items-center justify-center mb-4"><span className="text-4xl">🏆</span></div>
            <h2 className="text-2xl font-bold text-warm-800 mb-6">测试完成！</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-purple-50 rounded-xl p-4">
                    <div className={`text-3xl font-bold ${score >= 70 ? 'text-green-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>{score}</div>
                    <div className="text-sm text-purple-400">综合评分</div>
                </div>
                <div className="bg-pink-50 rounded-xl p-4">
                    <div className="text-3xl font-bold text-pink-500">{accuracy}%</div>
                    <div className="text-sm text-pink-400">正确率</div>
                </div>
            </div>
            <div className="bg-warm-50 rounded-xl p-4 mb-6 text-left">
                <div className="flex justify-between mb-2"><span className="text-warm-600">正确题数</span><span className="font-medium">{correct} / {total}</span></div>
                <div className="flex justify-between"><span className="text-warm-600">平均反应时间</span><span className="font-medium">{avgTime}ms</span></div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 mb-6 text-sm text-blue-700">
                {score >= 80 ? '🎉 太棒了！您的认知灵活性非常好！' : score >= 60 ? '👍 不错！继续保持练习。' : '💡 建议多进行类似的认知训练游戏。'}
            </div>
            <div className="flex space-x-3">
                <button onClick={startGame} className="flex-1 py-3 border border-purple-300 text-purple-600 rounded-xl hover:bg-purple-50">再玩一次</button>
                <button onClick={onComplete} className="flex-1 py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600">完成</button>
            </div>
        </div>
    );
};

// ====== INLINE KEYSTROKE ANALYSIS VIEW ======
const KeystrokeAnalysisView = () => {
    const { metrics, isActive, startTracking, stopTracking } = useKeystrokeDynamics();
    const [text, setText] = useState('');
    const [showResult, setShowResult] = useState(false);

    const handleStart = () => { setText(''); setShowResult(false); startTracking(); };
    const handleStop = () => { stopTracking(); setShowResult(true); };

    const getAnxietyColor = (idx: number) => idx < 30 ? 'text-green-500' : idx < 60 ? 'text-yellow-500' : 'text-red-500';
    const getFocusColor = (score: number) => score >= 70 ? 'text-green-500' : score >= 40 ? 'text-yellow-500' : 'text-red-500';

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full mx-auto flex items-center justify-center mb-4"><span className="text-4xl">⌨️</span></div>
                    <h2 className="text-2xl font-bold text-warm-800">键盘动力学分析</h2>
                    <p className="text-warm-600 mt-2">通过分析您的打字模式来评估焦虑和专注度</p>
                </div>
                {!isActive && !showResult && (
                    <div className="text-center">
                        <p className="text-warm-500 mb-6">点击开始后，请在下方输入框中自由打字，系统会实时分析您的打字模式。</p>
                        <button onClick={handleStart} className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-lg hover:from-amber-600 hover:to-orange-600 transition-all">开始分析</button>
                    </div>
                )}
                {isActive && (
                    <>
                        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="请开始打字...可以写下您今天的心情、想法。" className="w-full h-40 p-4 border-2 border-amber-200 rounded-xl focus:border-amber-400 focus:outline-none resize-none text-warm-800" autoFocus />
                        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-amber-50 rounded-xl p-4 text-center"><div className={`text-2xl font-bold ${getAnxietyColor(metrics.anxietyIndex)}`}>{metrics.anxietyIndex}</div><div className="text-xs text-amber-500">焦虑指数</div></div>
                            <div className="bg-green-50 rounded-xl p-4 text-center"><div className={`text-2xl font-bold ${getFocusColor(metrics.focusScore)}`}>{metrics.focusScore}</div><div className="text-xs text-green-500">专注度</div></div>
                            <div className="bg-blue-50 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-blue-500">{metrics.typingSpeed}</div><div className="text-xs text-blue-500">字/分</div></div>
                            <div className="bg-purple-50 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-purple-500">{metrics.totalKeystrokes}</div><div className="text-xs text-purple-500">击键数</div></div>
                        </div>
                        <div className="mt-4 text-center text-sm text-warm-400">{metrics.isTyping ? '✏️ 正在打字...' : '⏸️ 等待输入...'}{' | '}会话时长: {metrics.sessionDuration}秒</div>
                        <button onClick={handleStop} disabled={metrics.totalKeystrokes < 20} className={`mt-6 w-full py-3 rounded-xl font-medium transition-all ${metrics.totalKeystrokes >= 20 ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-warm-200 text-warm-400 cursor-not-allowed'}`}>
                            {metrics.totalKeystrokes >= 20 ? '结束分析' : `请至少输入 ${20 - metrics.totalKeystrokes} 个字符`}
                        </button>
                    </>
                )}
                {showResult && (
                    <div className="text-center">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl p-6">
                                <div className={`text-4xl font-bold ${getAnxietyColor(metrics.anxietyIndex)}`}>{metrics.anxietyIndex}</div>
                                <div className="text-sm text-amber-600 mt-1">焦虑指数</div>
                                <div className="text-xs text-warm-500 mt-2">{metrics.anxietyIndex < 30 ? '状态平静' : metrics.anxietyIndex < 60 ? '略有焦虑' : '焦虑较高'}</div>
                            </div>
                            <div className="bg-gradient-to-br from-green-100 to-teal-100 rounded-xl p-6">
                                <div className={`text-4xl font-bold ${getFocusColor(metrics.focusScore)}`}>{metrics.focusScore}</div>
                                <div className="text-sm text-green-600 mt-1">专注度</div>
                                <div className="text-xs text-warm-500 mt-2">{metrics.focusScore >= 70 ? '非常专注' : metrics.focusScore >= 40 ? '一般专注' : '较分散'}</div>
                            </div>
                        </div>
                        <div className="bg-warm-50 rounded-xl p-4 text-sm text-left space-y-2 mb-6">
                            <div className="flex justify-between"><span className="text-warm-600">打字速度</span><span className="font-medium">{metrics.typingSpeed} 字/分钟</span></div>
                            <div className="flex justify-between"><span className="text-warm-600">平均按键时间</span><span className="font-medium">{metrics.avgDwellTime}ms</span></div>
                            <div className="flex justify-between"><span className="text-warm-600">按键间隔方差</span><span className="font-medium">{metrics.flightTimeVariance}</span></div>
                            <div className="flex justify-between"><span className="text-warm-600">错误率</span><span className="font-medium">{metrics.errorRate}%</span></div>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700 mb-6">
                            {metrics.anxietyIndex < 30 ? '✨ 您的打字模式显示心态平稳，节奏均匀，状态良好！' : metrics.anxietyIndex < 60 ? '💡 检测到轻度焦虑信号，建议适当休息放松。' : '⚠️ 打字模式显示较高焦虑，建议进行放松练习或与人交流。'}
                        </div>
                        <button onClick={handleStart} className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-all">重新测试</button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ====== INLINE TREND PREDICTION VIEW ======
const TrendPredictionView = () => {
    const [predictionData, setPredictionData] = useState<{
        predicted_scores: number[]; dates: string[]; trend_direction: string; risk_level: string; model_confidence: number; interpretation: string;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { setError('请登录并完成至少 3 次 PHQ-9 评估后查看趋势预测'); setIsLoading(false); return; }
        const load = async () => {
            try {
                const historyRes = await fetch(`${API_BASE}/history?token=${token}&scale_type=phq9`);
                if (!historyRes.ok) throw new Error('加载评估历史失败');
                const historyData = await historyRes.json();
                const phqHistory = Array.isArray(historyData.history) ? historyData.history : [];
                const scores = [...phqHistory].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((h: any) => h.total_score);
                if (scores.length < 3) { setError('需要至少 3 次 PHQ-9 记录才能生成趋势预测'); setIsLoading(false); return; }
                const forecastRes = await fetch(`${API_BASE}/prediction/forecast`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phq9_history: scores }) });
                if (!forecastRes.ok) { const errBody = await forecastRes.json().catch(() => ({})); throw new Error(errBody.detail || '预测失败'); }
                setPredictionData(await forecastRes.json());
            } catch (err) { setError(err instanceof Error ? err.message : '加载失败'); } finally { setIsLoading(false); }
        };
        load();
    }, []);

    const getTrendIcon = (trend: string) => { switch (trend) { case 'improving': return '📈 改善中'; case 'worsening': return '📉 需关注'; default: return '➡️ 稳定'; } };
    const getRiskColor = (risk: string) => { switch (risk) { case 'low': return 'bg-green-100 text-green-700'; case 'moderate': return 'bg-yellow-100 text-yellow-700'; case 'high': return 'bg-red-100 text-red-700'; default: return 'bg-gray-100 text-gray-700'; } };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full mx-auto flex items-center justify-center mb-4"><span className="text-4xl">📈</span></div>
                    <h2 className="text-2xl font-bold text-warm-800">AI 趋势预测</h2>
                    <p className="text-warm-600 mt-2">基于 RandomForest + LinearRegression 集成模型的7天心理健康走势预测</p>
                </div>
                {isLoading ? (
                    <div className="text-center py-12"><div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" /><p className="text-warm-500">模型预测中...</p></div>
                ) : error ? (
                    <div className="text-center py-12"><div className="w-16 h-16 rounded-full bg-warm-100 text-3xl flex items-center justify-center mx-auto mb-4">🤔</div><p className="text-warm-600">{error}</p></div>
                ) : predictionData ? (
                    <>
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="bg-indigo-50 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-indigo-600">{getTrendIcon(predictionData.trend_direction)}</div><div className="text-sm text-indigo-400 mt-1">趋势方向</div></div>
                            <div className="bg-warm-50 rounded-xl p-4 text-center"><span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(predictionData.risk_level)}`}>{predictionData.risk_level === 'low' ? '低风险' : predictionData.risk_level === 'moderate' ? '中风险' : '高风险'}</span><div className="text-sm text-warm-400 mt-1">风险等级</div></div>
                            <div className="bg-blue-50 rounded-xl p-4 text-center"><div className="text-2xl font-bold text-blue-600">{Math.round(predictionData.model_confidence * 100)}%</div><div className="text-sm text-blue-400 mt-1">模型置信度</div></div>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 mb-6">
                            <h4 className="font-medium text-indigo-800 mb-4">未来7天 PHQ-9 预测走势</h4>
                            <div className="relative h-48">
                                <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-xs text-gray-400"><span>27</span><span>20</span><span>15</span><span>10</span><span>5</span><span>0</span></div>
                                <div className="ml-10 h-40 relative border-l border-b border-gray-200">
                                    <div className="absolute left-0 right-0 border-t border-dashed border-orange-300" style={{ top: `${100 - (15 / 27) * 100}%` }}><span className="absolute -left-2 -top-2 text-[10px] text-orange-400 bg-white px-1">中度</span></div>
                                    <div className="absolute left-0 right-0 border-t border-dashed border-yellow-300" style={{ top: `${100 - (10 / 27) * 100}%` }}><span className="absolute -left-2 -top-2 text-[10px] text-yellow-500 bg-white px-1">轻度</span></div>
                                    <div className="absolute left-0 right-0 border-t border-dashed border-green-300" style={{ top: `${100 - (5 / 27) * 100}%` }}><span className="absolute -left-2 -top-2 text-[10px] text-green-500 bg-white px-1">正常</span></div>
                                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <defs><linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" /><stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" /></linearGradient></defs>
                                        <path d={`M ${predictionData.predicted_scores.map((score, i) => { const x = predictionData.predicted_scores.length > 1 ? (i / (predictionData.predicted_scores.length - 1)) * 100 : 50; const y = 100 - (score / 27) * 100; return `${x},${y}`; }).join(' L ')} L 100,100 L 0,100 Z`} fill="url(#lineGradient)" />
                                        <polyline points={predictionData.predicted_scores.map((score, i) => { const x = predictionData.predicted_scores.length > 1 ? (i / (predictionData.predicted_scores.length - 1)) * 100 : 50; const y = 100 - (score / 27) * 100; return `${x},${y}`; }).join(' ')} fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                        {predictionData.predicted_scores.map((score, i) => { const x = predictionData.predicted_scores.length > 1 ? (i / (predictionData.predicted_scores.length - 1)) * 100 : 50; const y = 100 - (score / 27) * 100; return <circle key={i} cx={x} cy={y} r="3" fill="white" stroke="#8B5CF6" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />; })}
                                    </svg>
                                </div>
                                <div className="ml-10 flex justify-between text-xs text-gray-500 mt-2">{predictionData.dates.map((date, idx) => <span key={idx}>{date.slice(5)}</span>)}</div>
                            </div>
                        </div>
                        <div className="bg-indigo-50 rounded-xl p-4"><p className="text-sm text-indigo-700">🤖 <strong>AI解读:</strong> {predictionData.interpretation}</p></div>
                    </>
                ) : (
                    <div className="text-center py-12 text-warm-500">无法获取预测数据</div>
                )}
            </div>
        </div>
    );
};

// ====== INLINE BREATHING BALL VIEW ======
const BreathingBallView = () => {
    const [bpm, setBpm] = useState(6);
    const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale' | 'rest'>('rest');
    const [isActive, setIsActive] = useState(false);

    const phaseLabels = {
        inhale: { text: '吸气', color: 'text-blue-500', bg: 'bg-blue-100' },
        hold: { text: '屏息', color: 'text-purple-500', bg: 'bg-purple-100' },
        exhale: { text: '呼气', color: 'text-green-500', bg: 'bg-green-100' },
        rest: { text: '准备', color: 'text-warm-400', bg: 'bg-warm-100' },
    };

    useEffect(() => {
        if (!isActive) return;
        const cycleDuration = (60 / bpm) * 1000;
        const phases = { inhale: 0.4, hold: 0.1, exhale: 0.4, rest: 0.1 };
        const interval = setInterval(() => {
            const now = Date.now() % cycleDuration;
            const progress = now / cycleDuration;
            if (progress < phases.inhale) setPhase('inhale');
            else if (progress < phases.inhale + phases.hold) setPhase('hold');
            else if (progress < phases.inhale + phases.hold + phases.exhale) setPhase('exhale');
            else setPhase('rest');
        }, 100);
        return () => clearInterval(interval);
    }, [isActive, bpm]);

    const getScale = () => {
        if (!isActive) return 1;
        const cycleDuration = (60 / bpm) * 1000;
        const now = Date.now() % cycleDuration;
        const progress = now / cycleDuration;
        if (progress < 0.4) return 1 + 0.3 * (progress / 0.4);
        if (progress < 0.5) return 1.3;
        if (progress < 0.9) return 1.3 - 0.3 * ((progress - 0.5) / 0.4);
        return 1;
    };

    return (
        <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <h2 className="text-2xl font-bold text-warm-800 mb-2">3D 呼吸球</h2>
                <p className="text-warm-600 mb-8">跟随呼吸球的节奏进行深呼吸，激活副交感神经系统</p>
                <div className="relative h-64 flex items-center justify-center mb-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-400/20 to-purple-500/20 rounded-full blur-3xl transition-transform duration-300" style={{ transform: `scale(${getScale()})` }} />
                    <div className="w-48 h-48 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full shadow-2xl flex items-center justify-center transition-transform duration-300 relative" style={{ transform: `scale(${getScale()})` }}>
                        <div className="absolute inset-2 bg-gradient-to-br from-violet-400/50 to-transparent rounded-full" />
                        <span className={`text-3xl font-bold ${phaseLabels[phase].color} z-10`}>{isActive ? phaseLabels[phase].text : '开始'}</span>
                    </div>
                </div>
                <div className={`inline-block px-6 py-2 rounded-full text-lg font-medium ${phaseLabels[phase].bg} ${phaseLabels[phase].color} mb-6 transition-all`}>{isActive ? phaseLabels[phase].text : '点击开始呼吸练习'}</div>
                <div className="mb-6">
                    <label className="text-sm text-warm-500 block mb-2">呼吸频率: {bpm} BPM</label>
                    <input type="range" min="4" max="10" value={bpm} onChange={(e) => setBpm(parseInt(e.target.value))} className="w-full h-2 bg-warm-200 rounded-lg appearance-none cursor-pointer" />
                    <div className="flex justify-between text-xs text-warm-400 mt-1"><span>慢 (放松)</span><span>快 (活力)</span></div>
                </div>
                <button onClick={() => setIsActive(!isActive)} className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${isActive ? 'bg-warm-200 text-warm-600 hover:bg-warm-300' : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700'}`}>
                    {isActive ? '⏸️ 暂停' : '▶️ 开始呼吸'}
                </button>
                <p className="text-xs text-warm-400 mt-4">💡 建议每次练习2-5分钟，每天1-3次效果最佳</p>
            </div>
        </div>
    );
};


// ============================================================
// MAIN APP
// ============================================================
function App() {
    const { error, setError } = useAppStore();
    const avatarRef = useRef<VirtualAvatarRef>(null);
    const embodiedAvatarRef = useRef<EmbodiedAvatarRef>(null);
    const { bindToUser, loadFromServer } = useOnboardingStore();
    const { hasCheckedIn } = useCheckinStore();

    // ===== TOP-LEVEL VIEW: landing | loading | onboarding | main =====
    type AppView = 'landing' | 'loading' | 'onboarding' | 'main';
    const [appView, setAppView] = useState<AppView>(() => {
        if (window.location.pathname.startsWith('/senior')) {
            return 'main';
        }
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                JSON.parse(savedUser) as UserInfo;
                // 已登录用户先进入 loading，等待从服务端同步 onboarding 状态，避免老用户闪入引导页
                return 'loading';
            } catch {
                return 'landing';
            }
        }
        return 'landing';
    });

    // ===== TAB NAVIGATION =====
    const [activeTab, setActiveTab] = useState<TabId>('today');
    const [subView, setSubView] = useState<string | null>(null);

    // State for legacy views
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);

    // Auth state
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);

    // Modal states
    const [showMoodJournal, setShowMoodJournal] = useState(false);
    const [showAchievementCenter, setShowAchievementCenter] = useState(false);
    const [showEMACheckIn, setShowEMACheckIn] = useState(false);

    // Community tab state
    const [communityTab, setCommunityTab] = useState<'feed' | 'leaderboard' | 'messages'>('feed');
    const [selectedMessageUser, setSelectedMessageUser] = useState<string | null>(null);

    // Gamification state
    const { streak, todayPoints, checkStreak, setActiveUser } = useGamificationStore();

    useEffect(() => { checkStreak(); }, [checkStreak]);
    useEffect(() => { setActiveUser(currentUser?.id || null); }, [currentUser?.id, setActiveUser]);

    // Dark mode
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
    const { profile, loadProfile } = useProfileStore();
    const { mode, setMode, hydrateFromProfile } = useUIModeStore();
    useEffect(() => {
        if (isDarkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', String(isDarkMode));
    }, [isDarkMode]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (currentUser && token) loadProfile(token);
    }, [currentUser?.id, currentUser, loadProfile]);

    useEffect(() => {
        hydrateFromProfile(profile?.ui_mode);
    }, [profile?.ui_mode, hydrateFromProfile]);

    useEffect(() => {
        document.documentElement.dataset.uiMode = mode;
    }, [mode]);

    const resolveAppViewForOnboarding = useCallback(() => {
        const ob = useOnboardingStore.getState();
        setAppView(ob.hasCompletedOnboarding ? 'main' : 'onboarding');
    }, []);

    const handleAuthenticatedUser = useCallback((user: UserInfo) => {
        setCurrentUser(user);
        setShowAuthModal(false);
        bindToUser(user.id);

        const token = localStorage.getItem('token');
        if (token) {
            setAppView('loading');
            void loadFromServer(token, user.id).then(resolveAppViewForOnboarding);
        } else {
            setAppView('onboarding');
        }
    }, [bindToUser, loadFromServer, resolveAppViewForOnboarding]);

    const handleLogout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('psy-ui-mode');
        bindToUser(null);
        setMode('standard');
        setActiveTab('today');
        setSubView(null);
        setCurrentUser(null);
        setAppView('landing');
    }, [bindToUser, setMode]);

    useEffect(() => {
        if (window.location.pathname.startsWith('/senior')) {
            setMode('senior');
            setAppView('main');
        }
    }, [setMode]);

    // Check for existing login on mount + sync onboarding
    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser) as UserInfo;
                setCurrentUser(user);
                bindToUser(user.id);
                // 从服务器同步 onboarding 状态
                const token = localStorage.getItem('token');
                if (token) {
                    setAppView('loading');
                    void loadFromServer(token, user.id).then(resolveAppViewForOnboarding);
                }
            } catch { localStorage.removeItem('user'); localStorage.removeItem('token'); }
        }
    }, [bindToUser, loadFromServer, resolveAppViewForOnboarding]);

    // WeChat OAuth callback
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const wechatToken = urlParams.get('wechat_token');
        const wechatUser = urlParams.get('wechat_user');
        if (wechatToken && wechatUser) {
            try {
                const user = JSON.parse(decodeURIComponent(wechatUser));
                localStorage.setItem('token', wechatToken);
                localStorage.setItem('user', JSON.stringify(user));
                handleAuthenticatedUser(user);
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (e) { console.error('Failed to parse WeChat user data:', e); }
        }
        const wechatBind = urlParams.get('wechat_bind');
        if (wechatBind) {
            try {
                sessionStorage.setItem('wechat_bind_info', JSON.stringify(JSON.parse(decodeURIComponent(wechatBind))));
                setShowAuthModal(true);
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (e) { console.error('Failed to parse WeChat bind data:', e); }
        }
        const wechatError = urlParams.get('wechat_error');
        if (wechatError) { alert(`微信登录失败: ${wechatError}`); window.history.replaceState({}, document.title, window.location.pathname); }
    }, [handleAuthenticatedUser]);

    // Chat state
    const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isChatting, setIsChatting] = useState(false);

    // Bio-signal monitoring
    const [showMonitors, setShowMonitors] = useState(false);
    const [guestId] = useState(() => `guest_${Date.now()}`);
    const userId = currentUser?.id || guestId;

    // JITAI
    const jitai = useJITAI(userId, Boolean(currentUser && hasCheckedIn), 300000);

    // Immersive Mode
    const [isPlayingImmersive, setIsPlayingImmersive] = useState(false);

    // Active tool for ToolRunner
    const [activeTool, setActiveTool] = useState<ToolItem | null>(null);
    const [toolCompleteCallback, setToolCompleteCallback] = useState<(() => void) | null>(null);

    // Hooks for bio-signals
    const oculometricSensor = useOculometricSensor({ uiUpdateInterval: 100 });
    const voiceAnalyzer = useVoiceAnalyzer({});
    const bioAggregator = useBioSignalAggregator({ aggregationInterval: 5000, autoReport: false });
    const keystrokeDynamics = useKeystrokeDynamics();

    // Digital Phenotyping
    const health = useHealthConnect();
    const phenotyping = useDigitalPhenotyping();

    useEffect(() => { health.connect(); }, [health.connect]);
    useEffect(() => {
        if (health.data) {
            phenotyping.computeFeatures(health.data, bioAggregator.getLatestSignals(), { moodAvg: 7, stressCount: 1, activityLevel: 'moderate' });
        }
    }, [health.data, bioAggregator.latestAggregation]);

    useEffect(() => {
        if (showMonitors && oculometricSensor.metrics) bioAggregator.addSample({ blinkRate: oculometricSensor.metrics.blinkRate, fatigue: oculometricSensor.metrics.drowsinessIndex });
    }, [showMonitors, oculometricSensor.metrics, bioAggregator]);

    useEffect(() => {
        if (showMonitors && voiceAnalyzer.metrics) bioAggregator.addSample({ jitter: voiceAnalyzer.metrics.jitterPercent || 0, shimmer: voiceAnalyzer.metrics.shimmerPercent || 0 });
    }, [showMonitors, voiceAnalyzer.metrics, bioAggregator]);

    // Auto-start keystroke tracking when chat tab is active
    useEffect(() => {
        if (activeTab === 'chat') {
            if (!keystrokeDynamics.isActive) keystrokeDynamics.startTracking();
        } else {
            if (keystrokeDynamics.isActive) keystrokeDynamics.stopTracking();
        }
    }, [activeTab]);

    // Helper: build full bio_signals payload
    const buildBioSignals = () => {
        const bioSignals = bioAggregator.consumeAggregation();
        const voice = voiceAnalyzer.metrics;
        const keys = keystrokeDynamics.metrics;
        return {
            avg_blink_rate: bioSignals.avg_blink_rate,
            voice_jitter: bioSignals.voice_jitter,
            fatigue_index: bioSignals.fatigue_index,
            shimmer: bioSignals.shimmer,
            avg_ear: bioSignals.avg_ear,
            sample_count: bioSignals.sample_count,
            keystroke_anxiety: keys?.anxietyIndex ?? 0,
            keystroke_focus: keys?.focusScore ?? 0,
            speaking_duration_s: voice?.speakingDuration ?? 0,
            silence_duration_s: voice?.silenceDuration ?? 0,
        };
    };

    const toggleCameraMonitoring = useCallback(async () => {
        if (oculometricSensor.isRunning) {
            oculometricSensor.stopTracking();
            if (!voiceAnalyzer.isRunning) setShowMonitors(false);
            return;
        }

        setShowMonitors(true);
        await oculometricSensor.startTracking();
    }, [oculometricSensor, voiceAnalyzer.isRunning]);

    const toggleVoiceMonitoring = useCallback(async () => {
        if (voiceAnalyzer.isRunning) {
            voiceAnalyzer.stopAnalyzer();
            if (!oculometricSensor.isRunning) setShowMonitors(false);
            return;
        }

        setShowMonitors(true);
        await voiceAnalyzer.startAnalyzer();
    }, [voiceAnalyzer, oculometricSensor.isRunning]);

    const stopAllSpeech = useCallback(() => {
        try {
            avatarRef.current?.stopSpeaking();
        } catch (err) {
            console.warn('Avatar speech stop failed:', err);
        }
        window.speechSynthesis?.cancel();
    }, []);

    const handleAvatarSpeak = async (text: string, emotion: 'happy' | 'sad' | 'neutral' = 'neutral') => {
        stopAllSpeech();
        if (avatarRef.current) {
            try {
                await avatarRef.current.speak(text, emotion);
            } catch (err) {
                console.error('Speech failed:', err);
            }
        }
    };
    const handleAvatarModelLoaded = useCallback(() => {
        console.log('✅ Live2D model loaded');
    }, []);
    const handleAvatarModelError = useCallback((err: unknown) => {
        console.error('❌ Failed to load model:', err);
    }, []);

    // Crisis detection
    const CRISIS_KEYWORDS = ['自杀', '不想活', '死了算了', '跳楼', '割腕', '吃药自杀', '活着没意思', '想死', '结束生命', '没有希望', '自残', '伤害自己', '生不如死', '解脱', '一了百了', '遗书', '告别'];
    const [showCrisisAlert, setShowCrisisAlert] = useState(false);
    const detectCrisis = useCallback((text: string): boolean => CRISIS_KEYWORDS.some(keyword => text.includes(keyword)), []);

    const handleSendMessage = useCallback(async () => {
        if (!inputMessage.trim() || isChatting) return;
        const userMessage = inputMessage.trim();
        if (detectCrisis(userMessage)) setShowCrisisAlert(true);
        setInputMessage('');
        setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsChatting(true);
        try {
            const bio_signals = buildBioSignals();
            const conversationHistory = chatMessages.slice(-10).map(msg => ({ role: msg.role, content: msg.text }));
            const response = await fetch(`${API_BASE}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, message: userMessage, conversation_history: conversationHistory, bio_signals }) });
            if (!response.ok) throw new Error('Chat request failed');
            const result = await response.json();
            setChatMessages(prev => [...prev, { role: 'assistant', text: result.reply_text }]);
            markDailyTaskCompleted('chat');
            if (result.avatar_command) {
                if (result.avatar_command.enable_entrainment && embodiedAvatarRef.current) embodiedAvatarRef.current.startEntrainment();
                if (result.avatar_command.emotion && embodiedAvatarRef.current) embodiedAvatarRef.current.setEmotion(result.avatar_command.emotion);
            }
            await handleAvatarSpeak(result.reply_text, result.risk_flag ? 'sad' : 'neutral');
        } catch (err) {
            console.error('Chat failed:', err);
            setChatMessages(prev => [...prev, { role: 'assistant', text: '抱歉，我现在无法连接到服务器。请稍后再试。' }]);
        } finally { setIsChatting(false); }
    }, [inputMessage, isChatting, userId, bioAggregator]);

    const handleSubmitDrawing = useCallback(async (imageBase64: string) => {
        setIsSubmitting(true); setError(null);
        try {
            const response = await fetch(`${API_BASE}/assessments/cdt/score`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_base64: imageBase64 }) });
            if (!response.ok) throw new Error('评分请求失败');
            const result = await response.json();
            setAssessmentResult(result); setShowResult(true);
            const speakText = result.ai_interpretation
                ? `评估完成了。${result.ai_interpretation.slice(0, 80)}`
                : `评估完成了。您的得分是${result.total_score}分。` + result.feedback.slice(0, 2).join('，');
            await handleAvatarSpeak(speakText, result.total_score >= 2 ? 'happy' : 'neutral');
        } catch (err) { console.error('Scoring failed:', err); setError('评分失败，请检查网络连接后重试'); } finally { setIsSubmitting(false); }
    }, [setError]);

    // Navigation helpers
    const navigateTo = (view: string) => {
        if (view === 'journal') { setShowMoodJournal(true); return; }
        setSubView(view);
    };

    const goBack = () => {
        stopAllSpeech();
        setSubView(null);
        setShowMonitors(false);
        if (oculometricSensor.isRunning) oculometricSensor.stopTracking();
        if (voiceAnalyzer.isRunning) voiceAnalyzer.stopAnalyzer();
    };

    const handleTabChange = (tab: TabId) => {
        if (tab !== 'chat') stopAllSpeech();
        setSubView(null);
        setActiveTab(tab);
        if (tab === 'chat') {
            if (chatMessages.length === 0) {
                setChatMessages([{ role: 'assistant', text: '你好！我是小心，你的心理健康助手。今天感觉怎么样？有什么想和我聊聊的吗？' }]);
            }
            bioAggregator.startCollecting();
        } else {
            setShowMonitors(false);
            if (oculometricSensor.isRunning) oculometricSensor.stopTracking();
            if (voiceAnalyzer.isRunning) voiceAnalyzer.stopAnalyzer();
        }
    };

    // Render sub-view back button
    const SubViewHeader = ({ title }: { title: string }) => (
        <div className="app-surface mb-6 flex items-center gap-4 rounded-[1.75rem] px-5 py-4">
            <button
                onClick={goBack}
                aria-label={`返回${title}`}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/70"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-700">功能详情</p>
                <h2 className="font-display text-2xl text-slate-950">{title}</h2>
            </div>
        </div>
    );

    // Determine if TabBar should show
    const showTabBar = !isPlayingImmersive && mode !== 'senior';

    const pageMeta = (() => {
        if (mode === 'senior' && !subView) {
            return {
                title: '今日陪伴',
                description: '先问候一下今天的状态，需要时再做放松或找支持。',
            };
        }

        if (subView === 'tool-runner' && activeTool) {
            return {
                title: activeTool.title,
                description: activeTool.subtitle || '进入具体练习流程，完成一步一步的沉浸式引导。',
            };
        }

        switch (subView) {
            case 'clock':
                return { title: '画钟测验', description: '完成认知测评并查看 AI 解析。' };
            case 'scale':
                return { title: '测评中心', description: '集中查看标准量表、历史结果与评估入口。' };
            case 'biosignal':
                return { title: '生物信号分析', description: '查看视觉、语音与多模态状态分析。' };
            case 'stroop':
                return { title: 'Stroop 认知测试', description: '进行注意力与抑制控制训练。' };
            case 'keystroke':
                return { title: '键盘动力学分析', description: '通过输入节奏理解紧张感、专注度与即时状态。' };
            case 'trend':
                return { title: '趋势预测', description: '追踪近期评估结果，理解心理状态变化走向。' };
            case 'breathing':
                return { title: '3D 呼吸球', description: '跟随节律完成呼吸放松练习。' };
            case 'demo':
                return { title: '综合体验', description: '把聊天、传感器与具身反馈组合成一体化工作流。' };
            case 'community':
                return { title: '温暖社区', description: '浏览动态、私信与社区互动。' };
            case 'settings':
                return { title: '设置中心', description: '管理提醒、数据导出、主题与语言偏好。' };
            case 'messages':
                return { title: '消息中心', description: '集中查看系统通知、练习提醒与互动更新。' };
            default:
                break;
        }

        switch (activeTab) {
            case 'today':
                return { title: '今日概览', description: '查看今日状态、签到、推荐练习与近期趋势。' };
            case 'chat':
                return { title: 'AI陪伴', description: '在这里进行情绪支持、心理疏导与日常对话。' };
            case 'toolbox':
                return { title: '工具箱', description: '选择呼吸、认知训练、睡眠与放松练习。' };
            case 'programs':
                return { title: '课程计划', description: '查看课程进度、每日任务与复盘记录。' };
            case 'me':
                return { title: '个人中心', description: '管理账号、消息、成就与个性化设置。' };
            default:
                return { title: 'NeuraSense', description: '心理健康支持平台。' };
        }
    })();

    // ===== LANDING PAGE =====
    if (appView === 'landing') {
        return (
            <Suspense fallback={<PageSkeleton />}>
                <LandingPage
                    onGetStarted={() => {
                        bindToUser(null);
                        useOnboardingStore.getState().resetOnboarding();
                        setAppView('onboarding');
                    }}
                    onLogin={() => setShowAuthModal(true)}
                />
                {showAuthModal && (
                    <AuthModal onLoginSuccess={handleAuthenticatedUser} onClose={() => setShowAuthModal(false)} />
                )}
            </Suspense>
        );
    }

    // ===== RESTORE SESSION / SYNC ONBOARDING =====
    if (appView === 'loading') {
        return <PageSkeleton />;
    }

    // ===== ONBOARDING WIZARD =====
    if (appView === 'onboarding') {
        return (
            <Suspense fallback={<PageSkeleton />}>
                <OnboardingWizard onComplete={() => setAppView('main')} />
            </Suspense>
        );
    }

    // ===== MAIN APP =====

    if (mode === 'senior' && !isPlayingImmersive) {
        return (
            <>
                <SeniorRoutes
                    userId={currentUser?.id || userId}
                    currentUserName={currentUser?.nickname || currentUser?.username}
                    onLogout={handleLogout}
                    onSwitchToStandard={() => {
                        stopAllSpeech();
                        setMode('standard');
                        setActiveTab('today');
                        setSubView(null);
                    }}
                />
                <PWAInstallPrompt />
            </>
        );
    }

    return (
        <div className={`app-shell-bg min-h-screen ${mode === 'senior' ? 'senior-ui' : ''}`}>
            {/* Immersive Overlay */}
            {isPlayingImmersive && (
                <div className="fixed inset-0 z-[100]">
                    <BiofeedbackScene hrv={health.data?.hrv || 50} onExit={() => setIsPlayingImmersive(false)} />
                </div>
            )}

            {/* Virtual Avatar */}
            {mode !== 'senior' && (
                <VirtualAvatar
                    ref={avatarRef}
                    modelPath="/models/kei/kei_basic_free.model3.json"
                    scale={0.12}
                    enableEyeTracking={true}
                    enableLipSync={true}
                    onModelLoaded={handleAvatarModelLoaded}
                    onModelError={handleAvatarModelError}
                />
            )}

            {/* Result Modal */}
            <ResultModal isOpen={showResult} onClose={() => { setShowResult(false); setAssessmentResult(null); }} result={assessmentResult} title="画钟测验结果" />

            {/* Auth Modal */}
            {showAuthModal && (
                <AuthModal onLoginSuccess={handleAuthenticatedUser} onClose={() => setShowAuthModal(false)} />
            )}

            {/* Crisis Alert Modal */}
            {showCrisisAlert && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 bg-red-100 rounded-full mx-auto flex items-center justify-center mb-4"><span className="text-4xl">❤️</span></div>
                            <h3 className="text-2xl font-bold text-warm-800">我们非常关心你</h3>
                            <p className="text-warm-600 mt-2">我注意到你可能正在经历一些困难的时刻。请记住，你并不孤单。</p>
                        </div>
                        <div className="space-y-3 mb-6">
                            <a href="tel:400-161-9995" className="flex items-center p-4 bg-red-50 rounded-xl hover:bg-red-100 transition-all border-2 border-red-200"><span className="text-2xl mr-3">📞</span><div><div className="font-bold text-red-700">24小时心理援助热线</div><div className="text-red-600 text-lg">400-161-9995</div></div></a>
                            <a href="tel:010-82951332" className="flex items-center p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-all"><span className="text-2xl mr-3">🏥</span><div><div className="font-bold text-orange-700">北京心理危机干预中心</div><div className="text-orange-600">010-82951332</div></div></a>
                            <a href="tel:12320-5" className="flex items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all"><span className="text-2xl mr-3">💙</span><div><div className="font-bold text-blue-700">全国心理援助热线</div><div className="text-blue-600">12320-5</div></div></a>
                        </div>
                        <p className="text-sm text-warm-500 text-center mb-4">如果你或身边的人正处于危险中，请立即拨打上方热线或前往最近的医院急诊。</p>
                        <button onClick={() => setShowCrisisAlert(false)} className="w-full py-3 bg-warm-100 text-warm-700 rounded-xl font-medium hover:bg-warm-200 transition-all">我知道了，继续对话</button>
                    </div>
                </div>
            )}

            {/* Mood Journal Modal */}
            {showMoodJournal && <MoodJournal onComplete={() => setShowMoodJournal(false)} onClose={() => setShowMoodJournal(false)} />}

            {/* Achievement Center Modal */}
            {showAchievementCenter && <AchievementCenter onClose={() => setShowAchievementCenter(false)} />}

            {/* Crisis Support Panel */}
            {mode !== 'senior' && <CrisisPanel />}

            {/* JITAI Intervention Modal */}
            {jitai.showIntervention && jitai.intervention && (
                <InterventionModal intervention={jitai.intervention} onComplete={(postMood) => jitai.completeIntervention(postMood)} onDismiss={() => jitai.dismissIntervention(false)} />
            )}

            {/* EMA Check-in Modal */}
            {showEMACheckIn && <EMACheckIn onComplete={() => setShowEMACheckIn(false)} onClose={() => setShowEMACheckIn(false)} />}

            {/* Error Alert */}
            {error && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4">
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center space-x-3 shadow-lg">
                        <span>⚠️ {error}</span>
                    </div>
                </div>
            )}

            <DesktopShell
                activeTab={activeTab}
                pageTitle={pageMeta.title}
                pageDescription={pageMeta.description}
                uiMode={mode}
                currentUser={currentUser}
                onTabChange={handleTabChange}
                onOpenCommunity={() => {
                    setCommunityTab('feed');
                    setSubView('community');
                }}
                onOpenMessages={() => setSubView('messages')}
                onOpenSettings={() => setSubView('settings')}
                onSwitchToSenior={() => {
                    setSubView(null);
                    setShowMonitors(false);
                    setActiveTab('today');
                    setMode('senior');
                }}
                onSwitchToStandard={() => {
                    if (window.confirm('完整功能会显示更多菜单和页面。确定要切换吗？')) {
                        setMode('standard');
                    }
                }}
            >
                {/* ============================================================ */}
                {/* MAIN CONTENT AREA                                            */}
                {/* ============================================================ */}
                <main className={`mx-auto w-full max-w-[1520px] flex-1 px-4 py-5 sm:px-6 lg:px-10 lg:py-8 ${showTabBar ? 'pb-[calc(7rem+env(safe-area-inset-bottom,0px))] lg:pb-10' : ''}`}>

                    {/* ===== SUB-VIEWS (overlay current tab) ===== */}
                    {subView === 'clock' && (
                        <section className="animate-fadeIn">
                        <SubViewHeader title="画钟测验" />
                        <div className="text-center mb-6">
                            <p className="text-warm-600">请绘制一个时钟，并将指针设置为 <span className="font-semibold text-primary-600">11:10</span></p>
                        </div>
                        <div className="flex justify-center">
                            <DrawingCanvas width={400} height={400} onSubmit={handleSubmitDrawing} isLoading={isSubmitting} />
                        </div>
                    </section>
                    )}

                    {subView === 'scale' && (
                        <section className="animate-fadeIn">
                        <Suspense fallback={<PageSkeleton />}>
                        <AssessmentCenterPage onClose={goBack} />
                        </Suspense>
                        </section>
                    )}

                    {subView === 'biosignal' && (
                        <section className="animate-fadeIn">
                        <SubViewHeader title="AI 生物信号分析" />
                        <BioSignalAIPanel onClose={goBack} />
                        </section>
                    )}

                    {subView === 'stroop' && (
                        <section className="animate-fadeIn">
                        <SubViewHeader title="Stroop 认知测试" />
                        <StroopTestView onComplete={goBack} />
                        </section>
                    )}

                    {subView === 'keystroke' && (
                        <section className="animate-fadeIn">
                        <SubViewHeader title="键盘动力学分析" />
                        <KeystrokeAnalysisView />
                        </section>
                    )}

                    {subView === 'trend' && (
                        <section className="animate-fadeIn">
                        <SubViewHeader title="AI 趋势预测" />
                        <TrendPredictionView />
                        </section>
                    )}

                    {subView === 'breathing' && (
                        <section className="animate-fadeIn">
                        <SubViewHeader title="3D 呼吸球" />
                        <BreathingBallView />
                        </section>
                    )}

                    {subView === 'demo' && (
                        <section className="animate-fadeIn">
                        <SubViewHeader title="综合体验" />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <OculometricMonitor showVideo={true} onMetricsUpdate={(metrics) => console.log('Fatigue:', metrics.fatigueLevel)} />
                                <VoiceAnalyzerMonitor onMetricsUpdate={(metrics) => console.log('Voice:', metrics)} />
                            </div>
                            <div className="space-y-4">
                                <div className="bg-white/80 backdrop-blur rounded-2xl p-4 border border-warm-200/50">
                                    <h3 className="text-lg font-semibold text-warm-800 mb-3">🧘 呼吸夹带</h3>
                                    <EmbodiedAvatar ref={embodiedAvatarRef} width={300} height={300} userFatigue={oculometricSensor.metrics?.drowsinessIndex || 0} voiceJitter={voiceAnalyzer.metrics?.jitterPercent || 0} enableEntrainment={true} className="mx-auto" />
                                    <div className="flex justify-center mt-3 space-x-2">
                                        <button onClick={() => embodiedAvatarRef.current?.startEntrainment()} className="px-4 py-2 bg-calm-500 text-white rounded-lg text-sm">开始呼吸引导</button>
                                        <button onClick={() => embodiedAvatarRef.current?.stopEntrainment()} className="px-4 py-2 bg-warm-200 text-warm-700 rounded-lg text-sm">停止</button>
                                    </div>
                                </div>
                                <div className="bg-white/80 backdrop-blur rounded-2xl p-4 border border-warm-200/50">
                                    <h3 className="text-lg font-semibold text-warm-800 mb-3">💬 智能对话</h3>
                                    <div className="h-40 overflow-y-auto mb-3 space-y-2">
                                        {chatMessages.slice(-5).map((msg, idx) => (
                                            <div key={idx} className={`text-sm ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                                <span className={`inline-block px-3 py-1 rounded-lg ${msg.role === 'user' ? 'bg-primary-100 text-primary-700' : 'bg-warm-100 text-warm-700'}`}>{msg.text.slice(0, 100)}...</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex space-x-2">
                                        <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="输入消息..." className="flex-1 px-3 py-2 rounded-lg border border-warm-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
                                        <button onClick={handleSendMessage} disabled={isChatting} className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm">发送</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        </section>
                    )}

                    {subView === 'community' && (
                        <section className="animate-fadeIn">
                        <SubViewHeader title="温暖社区" />
                        <div className="app-surface overflow-hidden rounded-[1.75rem]">
                            <div className="flex border-b border-warm-200">
                                {(['feed', 'leaderboard', 'messages'] as const).map((tab) => (
                                    <button key={tab} onClick={() => setCommunityTab(tab)} className={`flex-1 py-4 px-6 text-center font-medium transition-all ${communityTab === tab ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50' : 'text-warm-600 hover:text-warm-800 hover:bg-warm-50'}`}>
                                        {tab === 'feed' ? '📱 动态' : tab === 'leaderboard' ? '🏆 排行榜' : '💌 私信'}
                                    </button>
                                ))}
                            </div>
                            <div className="p-6">
                                {communityTab === 'feed' && <CommunityFeed maxPosts={50} fullPage={true} onStartMessage={(userName) => { setCommunityTab('messages'); setSelectedMessageUser(userName); }} currentUser={currentUser?.nickname || currentUser?.username || '匿名用户'} />}
                                {communityTab === 'leaderboard' && <CommunityLeaderboard />}
                                {communityTab === 'messages' && <PrivateMessage preSelectedUser={selectedMessageUser} currentUser={currentUser?.nickname || '匿名用户'} />}
                            </div>
                        </div>
                        </section>
                    )}

                    {subView === 'tool-runner' && activeTool && (
                        <section className="animate-fadeIn">
                        <Suspense fallback={<PageSkeleton />}>
                        <ToolRunner
                            tool={activeTool}
                            onBack={() => { setSubView(null); setActiveTool(null); setToolCompleteCallback(null); }}
                            onComplete={toolCompleteCallback || undefined}
                        />
                        </Suspense>
                        </section>
                    )}

                    {subView === 'settings' && (
                        <section className="animate-fadeIn">
                        <Suspense fallback={<PageSkeleton />}>
                        <SettingsPage
                            onBack={() => setSubView(null)}
                            authToken={localStorage.getItem('token')}
                        />
                        </Suspense>
                        </section>
                    )}

                    {subView === 'messages' && (
                        <section className="animate-fadeIn">
                        <Suspense fallback={<PageSkeleton />}>
                        <MessageCenterPage
                            onBack={() => setSubView(null)}
                            authToken={localStorage.getItem('token')}
                        />
                        </Suspense>
                        </section>
                    )}

                    {/* ===== TAB PAGES (only show when no subView) ===== */}
                    {!subView && (
                        <LazyErrorBoundary key={activeTab}>
                        {mode === 'senior' && activeTab !== 'chat' && (
                            <Suspense fallback={<PageSkeleton />}>
                            <SeniorHomePage
                                userId={currentUser?.id || userId}
                                currentUserName={currentUser?.nickname || currentUser?.username}
                                onStartChat={() => handleTabChange('chat')}
                                onOpenTool={(tool) => { setActiveTool(tool); setToolCompleteCallback(null); setSubView('tool-runner'); }}
                                onOpenSettings={() => setSubView('settings')}
                            />
                            </Suspense>
                        )}

                        {mode !== 'senior' && activeTab === 'today' && (
                            <Suspense fallback={<PageSkeleton />}>
                            <TodayPage
                                onNavigate={navigateTo}
                                onStartChat={() => handleTabChange('chat')}
                                onOpenTool={(tool) => { setActiveTool(tool); setToolCompleteCallback(null); setSubView('tool-runner'); }}
                            />
                            </Suspense>
                        )}

                        {activeTab === 'chat' && (
                            <Suspense fallback={<ChatSkeleton />}>
                            <PsyChat
                                onSendMessage={async (message, history = []) => {
                                    const bio_signals = buildBioSignals();
                                    const conversationHistory = history
                                        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
                                        .slice(-12)
                                        .map(msg => ({ role: msg.role, content: msg.text }));
                                    const response = await fetch(`${API_BASE}/chat`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            user_id: userId, message,
                                            conversation_history: conversationHistory,
                                            bio_signals,
                                        }),
                                    });
                                    if (!response.ok) throw new Error('Chat request failed');
                                    const result = await response.json();
                                    setChatMessages(prev => [...prev, { role: 'user', text: message }]);
                                    setChatMessages(prev => [...prev, { role: 'assistant', text: result.reply_text }]);
                                    markDailyTaskCompleted('chat');
                                    return result;
                                }}
                                onSpeak={(text, emotion) => handleAvatarSpeak(text, emotion as any)}
                                onStopSpeaking={stopAllSpeech}
                                isSpeaking={window.speechSynthesis?.speaking}
                                authToken={localStorage.getItem('token')}
                                userId={currentUser?.id || userId}
                                onCrisisDetected={() => setShowCrisisAlert(true)}
                                sensorPanel={{
                                    camera: {
                                        isRunning: oculometricSensor.isRunning,
                                        error: oculometricSensor.error,
                                        blinkRate: oculometricSensor.metrics?.blinkRate || 0,
                                        fatigueIndex: oculometricSensor.metrics?.drowsinessIndex || 0,
                                        fatigueLevel: oculometricSensor.metrics?.fatigueLevel || 'NORMAL',
                                        isTracking: oculometricSensor.metrics?.isTracking || false,
                                        videoRef: oculometricSensor.videoRef,
                                        canvasRef: oculometricSensor.canvasRef,
                                        onToggle: toggleCameraMonitoring,
                                    },
                                    microphone: {
                                        isRunning: voiceAnalyzer.isRunning,
                                        permissionStatus: voiceAnalyzer.permissionStatus,
                                        error: voiceAnalyzer.error,
                                        jitterPercent: voiceAnalyzer.metrics?.jitterPercent || 0,
                                        shimmerPercent: voiceAnalyzer.metrics?.shimmerPercent || 0,
                                        speakingDuration: voiceAnalyzer.metrics?.speakingDuration || 0,
                                        silenceDuration: voiceAnalyzer.metrics?.silenceDuration || 0,
                                        isSpeaking: voiceAnalyzer.metrics?.isSpeaking || false,
                                        onToggle: toggleVoiceMonitoring,
                                    },
                                    keystroke: {
                                        isActive: keystrokeDynamics.isActive,
                                        anxietyIndex: keystrokeDynamics.metrics?.anxietyIndex || 0,
                                        focusScore: keystrokeDynamics.metrics?.focusScore || 0,
                                        totalKeystrokes: keystrokeDynamics.metrics?.totalKeystrokes || 0,
                                        typingSpeed: keystrokeDynamics.metrics?.typingSpeed || 0,
                                    },
                                    aggregator: {
                                        isCollecting: bioAggregator.isCollecting,
                                        sampleCount: bioAggregator.sampleCount,
                                    },
                                    multimodalReady: oculometricSensor.isRunning || voiceAnalyzer.isRunning,
                                }}
                            />
                            </Suspense>
                        )}

                        {mode !== 'senior' && activeTab === 'toolbox' && (
                            <Suspense fallback={<ToolboxSkeleton />}>
                            <ToolboxPage
                                onNavigate={navigateTo}
                                onStartImmersive={() => setIsPlayingImmersive(true)}
                                onOpenTool={(tool) => { setActiveTool(tool); setToolCompleteCallback(null); setSubView('tool-runner'); }}
                            />
                            </Suspense>
                        )}

                        {mode !== 'senior' && activeTab === 'programs' && (
                            <Suspense fallback={<ProgramsSkeleton />}>
                            <ProgramsPage
                                onOpenTool={(tool, onComplete) => {
                                    setActiveTool(tool);
                                    setToolCompleteCallback(onComplete ? () => onComplete : null);
                                    setSubView('tool-runner');
                                }}
                            />
                            </Suspense>
                        )}

                        {mode !== 'senior' && activeTab === 'me' && (
                            <Suspense fallback={<MeSkeleton />}>
                            <MePage
                                currentUser={currentUser}
                                isDarkMode={isDarkMode}
                                onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
                                onShowAuth={() => setShowAuthModal(true)}
                                onLogout={handleLogout}
                                onShowAchievements={() => setShowAchievementCenter(true)}
                                onNavigate={navigateTo}
                                streak={streak}
                                todayPoints={todayPoints}
                            />
                            </Suspense>
                        )}
                        </LazyErrorBoundary>
                    )}
                </main>
            </DesktopShell>

            {/* ===== BOTTOM TAB BAR ===== */}
            {showTabBar && (
                <div className="lg:hidden">
                    <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
                </div>
            )}

            {/* ===== PWA 安装引导 ===== */}
            <div className="lg:hidden">
                <PWAInstallPrompt />
            </div>
        </div>
    );
}

export default App;
