import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { API_BASE } from '../../../config/api';
import { useCheckinStore, type CheckinData } from '../../../store/useCheckinStore';
import { useUIModeStore } from '../../../store/useUIModeStore';
import { markDailyTaskCompleted } from '../../../lib/dailyProgress';
import type { ToolItem } from '../../../pages/ToolboxPage';

type SeniorView = 'home' | 'voice' | 'status' | 'result' | 'help';

interface SeniorAssessmentResult {
    summary: string;
    sleep: string;
    mood: string;
    stress: string;
    suggestion: string;
    createdAt: string;
}

interface SeniorHomePageProps {
    userId: string;
    currentUserName?: string;
    onStartChat: () => void;
    onOpenTool: (tool: ToolItem) => void;
    onOpenSettings: () => void;
}

const QUESTIONS = [
    '先说说现在的心情吧。今天有没有让您开心、烦心，或者放不下的事情？',
    '昨晚睡得怎么样？醒来以后是比较有精神，还是有些累？',
    '这几天吃饭和身体感觉怎么样？有没有哪里不舒服？',
    '最近有没有一直惦记、担心，或者不好开口说的事情？',
    '接下来您更希望我怎么陪您？听您聊聊，还是带您做一个放松练习？',
];

const CHECKIN_STEPS: Array<{
    key: keyof Pick<CheckinData, 'mood' | 'stress' | 'energy' | 'sleep_quality'>;
    title: string;
    helper: string;
    choices: Array<{ label: string; value: number; note: string }>;
}> = [
    {
        key: 'mood',
        title: '今天心情怎么样？',
        helper: '不用想太多，选最接近的一项就好。',
        choices: [
            { label: '不太好', value: 3, note: '有些低落或烦闷' },
            { label: '一般', value: 6, note: '没有特别好，也没有特别差' },
            { label: '还不错', value: 8, note: '比较平稳或轻松' },
        ],
    },
    {
        key: 'sleep_quality',
        title: '昨晚睡得好吗？',
        helper: '只记录大概感受，不需要填写时间。',
        choices: [
            { label: '不太好', value: 3, note: '难入睡、醒得多或早醒' },
            { label: '一般', value: 6, note: '睡了一些，但不算踏实' },
            { label: '较好', value: 8, note: '醒来后还算舒服' },
        ],
    },
    {
        key: 'energy',
        title: '现在精神体力如何？',
        helper: '这会帮助系统判断今天适合做轻一点还是稍微主动一点的练习。',
        choices: [
            { label: '有点累', value: 3, note: '想休息，不想费力' },
            { label: '还可以', value: 6, note: '能做一点简单事情' },
            { label: '比较好', value: 8, note: '精神还不错' },
        ],
    },
    {
        key: 'stress',
        title: '最近压力大吗？',
        helper: '如果有事一直放不下，可以选“较高”。',
        choices: [
            { label: '较轻', value: 3, note: '基本能放松下来' },
            { label: '中等', value: 5, note: '有些担心，但还能处理' },
            { label: '较高', value: 8, note: '一直惦记，比较难受' },
        ],
    },
];

function IconMic({ className = 'h-7 w-7' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 14a3.5 3.5 0 0 0 3.5-3.5v-4a3.5 3.5 0 0 0-7 0v4A3.5 3.5 0 0 0 12 14Z" />
            <path d="M18.5 10.5a6.5 6.5 0 0 1-13 0" />
            <path d="M12 17v4" />
            <path d="M8.5 21h7" />
        </svg>
    );
}

function IconHeart({ className = 'h-7 w-7' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.5 8.8c0 6.2-8.5 10.7-8.5 10.7S3.5 15 3.5 8.8A4.7 4.7 0 0 1 12 6a4.7 4.7 0 0 1 8.5 2.8Z" />
        </svg>
    );
}

function IconWind({ className = 'h-7 w-7' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8h12a3 3 0 1 0-3-3" />
            <path d="M3 12h17a3 3 0 1 1-3 3" />
            <path d="M3 16h8a3 3 0 1 1-3 3" />
        </svg>
    );
}

function IconHelp({ className = 'h-7 w-7' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21a9 9 0 1 0-9-9" />
            <path d="M9.3 9a3 3 0 1 1 4.9 2.3c-1 .7-1.6 1.2-1.6 2.7" />
            <path d="M12 17h.01" />
            <path d="M3 21l3-3" />
        </svg>
    );
}

function IconArrow({ className = 'h-5 w-5' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
        </svg>
    );
}

function IconCheck({ className = 'h-6 w-6' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
        </svg>
    );
}

function getTone(checkin?: CheckinData | null) {
    if (!checkin) {
        return {
            label: '等待记录',
            summary: '先记录一下今天的状态，我再给您安排更合适的建议。',
            sleep: '未记录',
            mood: '未记录',
            stress: '未记录',
            next: '建议先从“和我聊聊”开始。',
        };
    }

    const mood = checkin.mood >= 7 ? '较平稳' : checkin.mood >= 4 ? '一般' : '有些低落';
    const sleep = checkin.sleep_quality >= 7 ? '较好' : checkin.sleep_quality >= 4 ? '一般' : '不太好';
    const stress = checkin.stress >= 7 ? '偏高' : checkin.stress >= 4 ? '中等' : '较轻';
    const label = checkin.stress >= 7 || checkin.mood <= 4 || checkin.sleep_quality <= 4 ? '需要多照顾' : '总体平稳';

    return {
        label,
        summary: label === '总体平稳' ? '今天的状态整体还可以，可以做一个短练习保持节律。' : '今天可以先把节奏放慢一点，做一个短练习会更舒服。',
        sleep,
        mood,
        stress,
        next: label === '总体平稳' ? '适合做一个短练习，保持好状态。' : '建议先做 3 分钟呼吸放松，再决定要不要继续聊。',
    };
}

function speak(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.92;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
}

function SeniorAction({
    icon,
    title,
    desc,
    onClick,
    primary = false,
}: {
    icon: ReactNode;
    title: string;
    desc: string;
    onClick: () => void;
    primary?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={`group flex min-h-[138px] w-full items-center gap-5 rounded-lg border p-6 text-left transition duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200 ${
                primary
                    ? 'border-cyan-700 bg-cyan-800 text-white shadow-[0_24px_70px_-48px_rgba(8,92,112,0.7)]'
                    : 'border-slate-200 bg-white text-slate-950 hover:border-cyan-500 hover:shadow-[0_18px_60px_-48px_rgba(15,23,42,0.35)]'
            }`}
        >
            <span className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg ${primary ? 'bg-white/14 text-white' : 'bg-cyan-50 text-cyan-800'}`}>
                {icon}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-2xl font-bold leading-tight">{title}</span>
                <span className={`mt-2 block text-lg leading-8 ${primary ? 'text-cyan-50' : 'text-slate-600'}`}>{desc}</span>
            </span>
            <IconArrow className={`h-6 w-6 shrink-0 ${primary ? 'text-white' : 'text-slate-400 group-hover:text-cyan-800'}`} />
        </button>
    );
}

function BackButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="inline-flex min-h-[56px] items-center gap-3 rounded-lg border border-slate-300 bg-white px-5 py-3 text-lg font-semibold text-slate-700 transition hover:border-cyan-700 hover:text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200"
        >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
            </svg>
            返回首页
        </button>
    );
}

function SeniorSafetyStrip({ onHelp }: { onHelp: () => void }) {
    return (
        <div className="mt-6 flex flex-col gap-3 rounded-lg border border-rose-100 bg-rose-50 px-5 py-4 text-rose-950 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-lg font-semibold leading-8">如果现在很难受、害怕自己出事，先点这里找人帮忙。</p>
            <button
                onClick={onHelp}
                className="min-h-[56px] rounded-lg bg-rose-700 px-5 text-lg font-bold text-white transition hover:bg-rose-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-200"
            >
                打开帮助
            </button>
        </div>
    );
}

function SeniorCheckinPanel() {
    const { submitCheckin } = useCheckinStore();
    const [values, setValues] = useState<CheckinData>({
        mood: 6,
        stress: 4,
        energy: 6,
        sleep_quality: 6,
    });
    const [step, setStep] = useState(0);
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const current = CHECKIN_STEPS[step];
    const selectedValue = values[current.key];
    const isLastStep = step === CHECKIN_STEPS.length - 1;

    const choose = (value: number) => {
        setValues((prev) => ({ ...prev, [current.key]: value }));
        setMessage('');
    };

    const handleNext = async () => {
        if (!isLastStep) {
            setStep((prev) => prev + 1);
            return;
        }
        setSubmitting(true);
        const result = await submitCheckin(values);
        setSubmitting(false);
        setMessage(result.ok ? '已经记录好了。今天不用重复填写，想改也可以再记录一次。' : result.message);
    };

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-lg font-bold text-cyan-800">第 {step + 1} 步 / 共 {CHECKIN_STEPS.length} 步</p>
                    <h3 className="mt-3 text-3xl font-bold leading-tight text-slate-950">{current.title}</h3>
                    <p className="mt-3 text-xl leading-9 text-slate-600">{current.helper}</p>
                </div>
                <div className="flex gap-2" aria-label="记录进度">
                    {CHECKIN_STEPS.map((item, index) => (
                        <span key={item.key} className={`h-3 w-12 rounded-full ${index <= step ? 'bg-cyan-800' : 'bg-slate-200'}`} />
                    ))}
                </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3" role="radiogroup" aria-label={current.title}>
                {current.choices.map((choice) => {
                    const active = selectedValue === choice.value;
                    return (
                        <button
                            key={choice.label}
                            onClick={() => choose(choice.value)}
                            role="radio"
                            aria-checked={active}
                            className={`min-h-[128px] rounded-lg border p-5 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200 ${
                                active ? 'border-cyan-800 bg-cyan-800 text-white shadow-[0_20px_60px_-42px_rgba(8,92,112,0.75)]' : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-cyan-500 hover:bg-white'
                            }`}
                        >
                            <span className="flex items-center justify-between gap-3">
                                <span className="text-2xl font-bold">{choice.label}</span>
                                {active ? <IconCheck className="h-6 w-6" /> : null}
                            </span>
                            <span className={`mt-3 block text-lg leading-8 ${active ? 'text-cyan-50' : 'text-slate-600'}`}>{choice.note}</span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
                {step > 0 ? (
                    <button
                        onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
                        className="min-h-[64px] rounded-lg border border-slate-300 bg-white px-6 text-xl font-bold text-slate-700 hover:border-cyan-700 hover:text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200"
                    >
                        上一步
                    </button>
                ) : null}
                <button
                    onClick={handleNext}
                    disabled={submitting}
                    className="min-h-[64px] flex-1 rounded-lg bg-emerald-700 px-6 text-xl font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
                >
                    {submitting ? '正在记录...' : isLastStep ? '完成记录' : '继续下一步'}
                </button>
            </div>
            {message ? <p className="mt-5 rounded-lg bg-emerald-50 p-4 text-center text-lg font-semibold leading-8 text-emerald-800">{message}</p> : null}
        </div>
    );
}

export default function SeniorHomePage({
    userId,
    currentUserName,
    onStartChat,
    onOpenTool,
    onOpenSettings,
}: SeniorHomePageProps) {
    const { setMode } = useUIModeStore();
    const { hasCheckedIn, todayCheckin, loadHistory, loadRecommendations } = useCheckinStore();
    const [view, setView] = useState<SeniorView>('home');
    const [tools, setTools] = useState<ToolItem[]>([]);
    const [questionIndex, setQuestionIndex] = useState(0);
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [answers, setAnswers] = useState<string[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [speechHint, setSpeechHint] = useState('可以点左边大按钮说话，也可以在右边打字。');
    const [result, setResult] = useState<SeniorAssessmentResult | null>(() => {
        if (typeof window === 'undefined') return null;
        const raw = window.localStorage.getItem('psy-senior-assessment-result');
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    });
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        loadHistory('7d');
        loadRecommendations();
    }, [loadHistory, loadRecommendations]);

    useEffect(() => {
        const controller = new AbortController();
        fetch(`${API_BASE}/tools`, { signal: controller.signal })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => setTools(Array.isArray(data?.tools) ? data.tools : []))
            .catch(() => setTools([]));
        return () => controller.abort();
    }, []);

    useEffect(() => {
        return () => {
            recognitionRef.current?.stop?.();
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const tone = useMemo(() => getTone(todayCheckin), [todayCheckin]);
    const preferredTool = useMemo(() => {
        const ids = ['breathing_478', 'breathing_sighing', 'mindfulness_1min', 'sleep_54321', 'breathing_box'];
        return ids.map((id) => tools.find((tool) => tool.id === id)).find(Boolean) || tools[0] || null;
    }, [tools]);

    const resetVoiceFlow = useCallback(() => {
        setQuestionIndex(0);
        setCurrentAnswer('');
        setAnswers([]);
        setSpeechHint('请点“开始说话”，说完后点“继续下一步”。如果不方便说话，可以直接打字。');
        setView('voice');
        speak('您好，我会陪您聊一聊最近的状态。您只需要像平常说话一样告诉我就可以。第一个问题，先说说现在的心情吧。');
    }, []);

    const toggleListening = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setSpeechHint('这个浏览器暂时不能语音识别，请直接在右边输入。');
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop?.();
            setIsListening(false);
            setSpeechHint('已经暂停。确认文字没问题后，可以继续下一步。');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
            const text = Array.from(event.results)
                .map((item: any) => item[0]?.transcript || '')
                .join('');
            setCurrentAnswer(text);
            setSpeechHint('我正在记录您说的话。说完后，可以点“继续下一步”。');
        };
        recognition.onend = () => {
            setIsListening(false);
            setSpeechHint((prev) => (prev.includes('正在记录') ? '已经听完。确认文字没问题后，可以继续下一步。' : prev));
        };
        recognition.onerror = () => {
            setIsListening(false);
            setSpeechHint('刚才没有听清楚，可以再点一次，或者直接打字。');
        };
        recognitionRef.current = recognition;
        setIsListening(true);
        setSpeechHint('正在听您说话。请慢慢说，不用着急。');
        recognition.start();
    }, [isListening]);

    const buildLocalResult = useCallback((allAnswers: string[]): SeniorAssessmentResult => {
        const content = allAnswers.join(' ');
        const sleep = /睡不着|失眠|醒|睡不好|睡得差/.test(content) ? '不太好' : /睡得好|睡眠好|精神/.test(content) ? '较好' : '一般';
        const mood = /难过|低落|没意思|烦|孤单|孤独/.test(content) ? '有些低落' : /开心|高兴|还好|不错/.test(content) ? '较平稳' : '一般';
        const stress = /担心|焦虑|压力|害怕|放不下/.test(content) ? '偏高' : '中等';
        return {
            summary: stress === '偏高' || mood === '有些低落' || sleep === '不太好' ? '最近需要多照顾一下自己。' : '目前状态整体比较平稳。',
            sleep,
            mood,
            stress,
            suggestion: '建议先做一个 3 分钟呼吸放松，然后早点休息。如果愿意，也可以继续和小心聊一聊。',
            createdAt: new Date().toISOString(),
        };
    }, []);

    const finishAssessment = useCallback(async (finalAnswers: string[]) => {
        setIsSubmitting(true);
        const localResult = buildLocalResult(finalAnswers);
        try {
            const response = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    message: `请用适合老年用户的生活化语言，总结以下心理状态访谈，不要出现量表、分数、PHQ、GAD等术语。访谈内容：${finalAnswers.join('；')}`,
                    conversation_history: [],
                    bio_signals: {},
                }),
            });
            if (response.ok) {
                await response.json().catch(() => null);
                markDailyTaskCompleted('chat');
            }
        } catch {
            // 离线时使用本地摘要，保持老年版流程可完成。
        } finally {
            window.localStorage.setItem('psy-senior-assessment-result', JSON.stringify(localResult));
            setResult(localResult);
            setIsSubmitting(false);
            setView('result');
        }
    }, [buildLocalResult, userId]);

    const nextQuestion = useCallback(() => {
        const answer = currentAnswer.trim();
        if (!answer) {
            setSpeechHint('还没有记录内容。您可以说一句，也可以直接打字。');
            return;
        }
        const nextAnswers = [...answers, answer];
        setAnswers(nextAnswers);
        setCurrentAnswer('');
        if (questionIndex >= QUESTIONS.length - 1) {
            finishAssessment(nextAnswers);
            return;
        }
        const nextIndex = questionIndex + 1;
        setQuestionIndex(nextIndex);
        setSpeechHint('请继续回答这个问题。可以说话，也可以打字。');
        speak(QUESTIONS[nextIndex]);
    }, [answers, currentAnswer, finishAssessment, questionIndex]);

    const openRelaxTool = () => {
        if (preferredTool) {
            onOpenTool(preferredTool);
        }
    };

    const handleSwitchToStandard = () => {
        const confirmed = window.confirm('标准版功能更多，但页面也更复杂。确定要切回标准版吗？');
        if (confirmed) {
            setMode('standard');
        }
    };

    if (view === 'voice') {
        return (
            <div className="senior-page mx-auto w-full max-w-5xl px-1 pb-10">
                <BackButton onClick={() => setView('home')} />
                <section className="mt-6 rounded-lg border border-cyan-100 bg-white p-8 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.35)]">
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                        <div>
                            <p className="text-lg font-semibold text-cyan-800">陪伴式问候</p>
                            <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950">一次只回答一个问题</h2>
                            <p className="mt-4 max-w-2xl text-2xl font-semibold leading-10 text-slate-800">{QUESTIONS[questionIndex]}</p>
                        </div>
                        <div className="rounded-lg bg-cyan-50 px-5 py-4 text-xl font-bold text-cyan-900">
                            {questionIndex + 1} / {QUESTIONS.length}
                        </div>
                    </div>

                    <div className="mt-6 rounded-lg border border-amber-100 bg-amber-50 p-5 text-xl font-semibold leading-9 text-amber-950">
                        {speechHint}
                    </div>

                    <div className="mt-8 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                        <button
                            onClick={toggleListening}
                            className={`flex min-h-[220px] flex-col items-center justify-center rounded-lg border text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200 ${
                                isListening ? 'border-rose-600 bg-rose-50 text-rose-700' : 'border-cyan-700 bg-cyan-800 text-white hover:bg-cyan-900'
                            }`}
                        >
                            <IconMic className="h-16 w-16" />
                            <span className="mt-5 text-3xl font-bold">{isListening ? '正在听' : '开始说话'}</span>
                            <span className={`mt-3 text-lg ${isListening ? 'text-rose-600' : 'text-cyan-50'}`}>{isListening ? '说完会自动停下' : '点一下就可以'}</span>
                        </button>
                        <label className="block">
                            <span className="mb-3 block text-xl font-bold text-slate-900">我听到/记录到的内容</span>
                            <textarea
                                value={currentAnswer}
                                onChange={(event) => setCurrentAnswer(event.target.value)}
                                placeholder="这里会显示您说的话；如果不方便说，也可以直接在这里输入。"
                                className="min-h-[198px] w-full rounded-lg border border-slate-300 bg-slate-50 p-6 text-2xl leading-10 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
                            />
                        </label>
                    </div>

                    <div className="mt-6 flex flex-col gap-4 sm:flex-row">
                        <button
                            onClick={() => speak(QUESTIONS[questionIndex])}
                            className="min-h-[64px] rounded-lg border border-slate-300 bg-white px-6 text-xl font-bold text-slate-700 hover:border-cyan-700 hover:text-cyan-900"
                        >
                            再读一遍问题
                        </button>
                        <button
                            onClick={nextQuestion}
                            disabled={!currentAnswer.trim() || isSubmitting}
                            className="min-h-[64px] flex-1 rounded-lg bg-emerald-700 px-6 text-xl font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
                        >
                            {isSubmitting ? '正在整理...' : questionIndex >= QUESTIONS.length - 1 ? '完成，看看小结' : '继续下一步'}
                        </button>
                    </div>
                </section>
                <SeniorSafetyStrip onHelp={() => setView('help')} />
            </div>
        );
    }

    if (view === 'status') {
        return (
            <div className="senior-page mx-auto w-full max-w-5xl px-1 pb-10">
                <BackButton onClick={() => setView('home')} />
                <section className="mt-6 rounded-lg border border-slate-200 bg-white p-8 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.35)]">
                    <p className="text-lg font-semibold text-cyan-800">今日状态</p>
                    <h2 className="mt-3 text-4xl font-bold text-slate-950">{tone.label}</h2>
                    <p className="mt-4 text-xl leading-9 text-slate-600">{tone.summary}</p>
                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        {[
                            ['睡眠', tone.sleep],
                            ['心情', tone.mood],
                            ['压力', tone.stress],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-6">
                                <div className="text-lg font-semibold text-slate-500">{label}</div>
                                <div className="mt-3 text-3xl font-bold text-slate-950">{value}</div>
                            </div>
                        ))}
                    </div>
                    <p className="mt-6 rounded-lg bg-cyan-50 p-5 text-xl font-semibold leading-9 text-cyan-950">{tone.next}</p>
                </section>
                <section className="mt-6">
                    <h3 className="text-3xl font-bold text-slate-950">{hasCheckedIn ? '需要更新今天的状态吗？' : '先记录一下今天的状态'}</h3>
                    <p className="mt-3 text-xl leading-9 text-slate-600">只需要点几个大按钮，不用填写复杂表格。</p>
                    <div className="mt-6">
                        <SeniorCheckinPanel />
                    </div>
                </section>
                <SeniorSafetyStrip onHelp={() => setView('help')} />
            </div>
        );
    }

    if (view === 'result') {
        const current = result || buildLocalResult(answers);
        return (
            <div className="senior-page mx-auto w-full max-w-5xl px-1 pb-10">
                <BackButton onClick={() => setView('home')} />
                <section className="mt-6 rounded-lg border border-emerald-100 bg-white p-8 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.35)]">
                    <p className="text-lg font-semibold text-emerald-700">本次小结</p>
                    <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950">{current.summary}</h2>
                    <p className="mt-4 text-xl leading-9 text-slate-600">下面是根据刚才聊天整理出的简单情况，不显示分数，也不需要您再计算。</p>
                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        {[
                            ['睡眠', current.sleep],
                            ['心情', current.mood],
                            ['压力', current.stress],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-6">
                                <div className="text-lg font-semibold text-slate-500">{label}</div>
                                <div className="mt-3 text-3xl font-bold text-slate-950">{value}</div>
                            </div>
                        ))}
                    </div>
                    <p className="mt-8 rounded-lg bg-emerald-50 p-6 text-2xl font-semibold leading-10 text-emerald-900">{current.suggestion}</p>
                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        <button onClick={openRelaxTool} className="min-h-[68px] rounded-lg bg-cyan-800 px-6 text-xl font-bold text-white hover:bg-cyan-900 disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200" disabled={!preferredTool}>
                            做放松练习
                        </button>
                        <button onClick={onStartChat} className="min-h-[68px] rounded-lg border border-slate-300 bg-white px-6 text-xl font-bold text-slate-800 hover:border-cyan-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200">
                            继续聊聊
                        </button>
                        <button onClick={() => setView('help')} className="min-h-[68px] rounded-lg border border-rose-200 bg-rose-50 px-6 text-xl font-bold text-rose-800 hover:border-rose-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-200">
                            需要帮助
                        </button>
                    </div>
                </section>
            </div>
        );
    }

    if (view === 'help') {
        return (
            <div className="senior-page mx-auto w-full max-w-5xl px-1 pb-10">
                <BackButton onClick={() => setView('home')} />
                <section className="mt-6 rounded-lg border border-rose-100 bg-white p-8 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.35)]">
                    <p className="text-lg font-semibold text-rose-700">帮助支持</p>
                    <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950">如果现在不好受，先找得到的人帮忙</h2>
                    <p className="mt-4 text-xl leading-9 text-slate-600">这些入口会一直放在老年版里，避免需要帮助时到处找。</p>
                    <div className="mt-8 grid gap-4">
                        {[
                            ['24小时心理援助热线', '400-161-9995', 'tel:400-161-9995'],
                            ['北京心理危机干预中心', '010-82951332', 'tel:010-82951332'],
                            ['全国心理援助热线', '12320-5', 'tel:12320-5'],
                        ].map(([label, phone, href]) => (
                            <a key={phone} href={href} className="flex min-h-[96px] items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-6 text-left transition hover:border-rose-400 hover:bg-rose-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-200">
                                <span>
                                    <span className="block text-xl font-bold text-slate-950">{label}</span>
                                    <span className="mt-2 block text-3xl font-bold text-rose-700">{phone}</span>
                                </span>
                                <IconArrow className="h-6 w-6 text-slate-400" />
                            </a>
                        ))}
                    </div>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <button onClick={onStartChat} className="min-h-[68px] rounded-lg bg-cyan-800 px-6 text-xl font-bold text-white hover:bg-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200">
                            继续和小心说说
                        </button>
                        <button onClick={onOpenSettings} className="min-h-[68px] rounded-lg border border-slate-300 bg-white px-6 text-xl font-bold text-slate-800 hover:border-cyan-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200">
                            打开设置
                        </button>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="senior-page mx-auto w-full max-w-6xl px-1 pb-10">
            <section className="overflow-hidden rounded-lg border border-cyan-100 bg-[linear-gradient(135deg,#fffdf8_0%,#f2fbfb_52%,#ecfdf5_100%)] shadow-[0_34px_110px_-62px_rgba(15,23,42,0.32)]">
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="p-8 lg:p-10">
                        <p className="text-lg font-bold text-cyan-800">NeuraSense 关怀模式</p>
                        <h1 className="mt-4 max-w-4xl text-5xl font-bold leading-tight text-slate-950">
                            {currentUserName ? `${currentUserName}，` : ''}不用找功能，先从这里开始。
                        </h1>
                        <p className="mt-5 max-w-3xl text-2xl leading-10 text-slate-600">
                            我会陪您先问候一下今天的状态。想说话、想放松，或者需要帮助，都可以从这里开始。
                        </p>
                        <div className="mt-8 rounded-lg border border-cyan-200 bg-white/90 p-5">
                            <p className="text-lg font-bold text-cyan-800">建议下一步</p>
                            <h2 className="mt-2 text-3xl font-bold leading-tight text-slate-950">{hasCheckedIn ? tone.next : '先做一次简单问候，了解今天的状态。'}</h2>
                            <button
                                onClick={resetVoiceFlow}
                                className="mt-5 flex min-h-[84px] w-full items-center justify-center gap-4 rounded-lg bg-cyan-800 px-6 text-3xl font-bold text-white transition hover:bg-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200"
                            >
                                <IconMic className="h-10 w-10" />
                                和我聊聊
                            </button>
                        </div>
                    </div>
                    <aside className="border-t border-cyan-100 bg-slate-950 p-8 text-white lg:border-l lg:border-t-0">
                        <p className="text-lg font-bold text-cyan-200">今天看一眼就够</p>
                        <h2 className="mt-3 text-4xl font-bold leading-tight">{tone.label}</h2>
                        <p className="mt-4 text-xl leading-9 text-slate-200">{tone.summary}</p>
                        <div className="mt-6 grid gap-3">
                            {[
                                ['睡眠', tone.sleep],
                                ['心情', tone.mood],
                                ['压力', tone.stress],
                            ].map(([label, value]) => (
                                <div key={label} className="flex items-center justify-between rounded-lg bg-white/10 px-4 py-3">
                                    <span className="text-lg text-slate-200">{label}</span>
                                    <span className="text-xl font-bold text-white">{value}</span>
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>
            </section>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <SeniorAction
                    icon={<IconHeart />}
                    title="记录今天状态"
                    desc="一个问题一屏，点大按钮就能完成"
                    onClick={() => setView('status')}
                />
                <SeniorAction
                    icon={<IconWind />}
                    title="做一个放松练习"
                    desc={preferredTool ? `${preferredTool.title}，大约 ${preferredTool.duration_min} 分钟` : '加载适合今天的短练习'}
                    onClick={openRelaxTool}
                />
                <SeniorAction
                    icon={<IconMic />}
                    title="随便说说"
                    desc="不做记录，只是和小心聊一会儿"
                    onClick={onStartChat}
                />
                <SeniorAction
                    icon={<IconHelp />}
                    title="找帮助"
                    desc="热线和支持入口一直在这里"
                    onClick={() => setView('help')}
                />
            </div>

            <section className="mt-6 rounded-lg border border-slate-200 bg-white p-7">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
                    <div>
                        <p className="text-lg font-bold text-cyan-800">最近一次小结</p>
                        <h2 className="mt-3 text-3xl font-bold leading-tight text-slate-950">{result ? result.summary : '还没有小结'}</h2>
                        <p className="mt-4 text-xl leading-9 text-slate-600">{result ? result.suggestion : '完成一次“和我聊聊”后，这里会显示简短建议。'}</p>
                    </div>
                    <div className="grid gap-3">
                        <button
                            onClick={result ? () => setView('result') : resetVoiceFlow}
                            className="min-h-[66px] w-full rounded-lg bg-slate-950 px-6 text-xl font-bold text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-300"
                        >
                            {result ? '查看小结' : '现在开始'}
                        </button>
                        <button
                            onClick={handleSwitchToStandard}
                            className="min-h-[58px] w-full rounded-lg border border-slate-300 bg-white px-6 text-lg font-bold text-slate-700 hover:border-cyan-700 hover:text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200"
                        >
                            使用完整功能
                        </button>
                    </div>
                </div>
            </section>

            <SeniorSafetyStrip onHelp={() => setView('help')} />
        </div>
    );
}
