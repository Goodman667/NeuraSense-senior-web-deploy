import { useEffect, useMemo, useState } from 'react';
import { SeniorIcon } from '../components/SeniorIcon';
import { SeniorPageHeader } from '../components/SeniorPageHeader';
import { SeniorResultCard } from '../components/SeniorResultCard';
import { SeniorSafetyActions } from '../components/SeniorSafetyActions';
import { useSeniorTTS } from '../hooks/useSeniorTTS';
import { seniorApi } from '../services/seniorApi';
import type { SeniorCheckupAnswer, SeniorCheckupQuestion, SeniorCheckupScaleSnapshot, SeniorPage, SeniorSummary } from '../types/senior';

const modeOptions = [
  { id: 'comprehensive', label: '综合小测', desc: '心情、担心、孤单、睡眠和身体都看一点' },
  { id: 'mood', label: '心情多一点', desc: '更适合最近提不起劲或没意思的时候' },
  { id: 'sleep', label: '睡眠多一点', desc: '更适合睡不好、白天没精神的时候' },
  { id: 'loneliness', label: '陪伴多一点', desc: '更适合觉得孤单、想有人说话的时候' },
];

const sourceLabels: Record<string, string> = {
  gds15: '老年心情题',
  gad7_short: '担心与放松题',
  ucla3: '陪伴题',
  sleep_short: '睡眠困扰题',
  body_safety: '身体不舒服题',
  safety: '安心保护题',
};

function sourceLabel(scale?: string) {
  return sourceLabels[scale || ''] || '生活状态题';
}

function dimensionTone(snapshot?: SeniorCheckupScaleSnapshot) {
  if (!snapshot) return [];
  return [
    { label: '心情', value: snapshot.mood_score },
    { label: '担心', value: snapshot.anxiety_score },
    { label: '孤单', value: snapshot.loneliness_score },
    { label: '睡眠', value: snapshot.sleep_score },
  ].sort((a, b) => b.value - a.value);
}

export function SeniorCheckup({ userId, onNavigate }: { userId: string; onNavigate: (page: SeniorPage) => void }) {
  const [mode, setMode] = useState('comprehensive');
  const [sessionId, setSessionId] = useState('');
  const [intro, setIntro] = useState('');
  const [questions, setQuestions] = useState<SeniorCheckupQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<SeniorCheckupAnswer[]>([]);
  const [summary, setSummary] = useState<SeniorSummary | null>(null);
  const [snapshot, setSnapshot] = useState<SeniorCheckupScaleSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const { speak } = useSeniorTTS();

  const current = questions[index];
  const progress = questions.length ? Math.round(((index + 1) / questions.length) * 100) : 0;
  const importantSources = useMemo(() => Array.from(new Set(questions.map(q => sourceLabel(q.scale)))).slice(0, 5), [questions]);

  const loadQuestions = async (nextMode = mode) => {
    setLoading(true);
    setError('');
    setSummary(null);
    setSnapshot(null);
    setAnswers([]);
    setIndex(0);
    try {
      const res = await seniorApi.getCheckupQuestions(userId, nextMode);
      setSessionId(res.session_id);
      setIntro(res.intro);
      setQuestions(res.questions || []);
      const first = res.questions?.[0];
      window.setTimeout(() => {
        speak(`${res.intro} 第一题，${first?.text || ''}`, { voice: 'xiaoyi', emotion: 'friendly' });
      }, 350);
    } catch (exc) {
      setError('小测题目暂时没有加载成功。您可以点下面按钮再试一次。');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions('comprehensive');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const chooseMode = (nextMode: string) => {
    setMode(nextMode);
    loadQuestions(nextMode);
  };

  const finishAndAnalyze = async (finalAnswers: SeniorCheckupAnswer[]) => {
    setAnalyzing(true);
    setError('');
    try {
      const res = await seniorApi.analyzeCheckup(userId, {
        session_id: sessionId,
        mode,
        questions,
        answers: finalAnswers,
      });
      setSummary(res.summary);
      setSnapshot(res.scale_snapshot);
      window.setTimeout(() => speak(res.summary.tts_text || res.summary.plain_summary, { voice: 'xiaoyi', emotion: res.summary.risk_level === 'normal' ? 'friendly' : 'calm' }), 300);
    } catch (exc) {
      setError('小测已经完成，但建议生成暂时失败。请点“重新生成建议”再试一次。');
    } finally {
      setAnalyzing(false);
    }
  };

  const answer = (question: SeniorCheckupQuestion, value: string, label: string) => {
    const nextAnswers = [
      ...answers,
      {
        question_id: question.id,
        question_text: question.text,
        answer_value: value,
        answer_label: label,
        dimension: question.dimension,
        scale: question.scale,
      },
    ];
    setAnswers(nextAnswers);
    const nextIndex = index + 1;
    setIndex(nextIndex);
    const nextQuestion = questions[nextIndex];
    if (nextQuestion) {
      window.setTimeout(() => speak(`下一题，${nextQuestion.text}`, { voice: 'xiaoyi', emotion: 'friendly' }), 220);
    } else {
      window.setTimeout(() => speak('小测答完了。我正在根据这些回答整理今天的建议。', { voice: 'xiaoyi', emotion: 'friendly' }), 220);
      finishAndAnalyze(nextAnswers);
    }
  };

  const retryAnalyze = () => finishAndAnalyze(answers);

  if (summary) {
    const tones = dimensionTone(snapshot || undefined);
    return (
      <div className="mx-auto max-w-6xl">
        <SeniorSafetyActions onNavigate={onNavigate} onEnd={() => onNavigate('home')} endLabel="回到首页" />
        <div className="mb-5 rounded-[2rem] border border-cyan-100 bg-white/92 p-5">
          <p className="inline-flex items-center gap-2 text-xl font-black text-cyan-900">
            <SeniorIcon name="clipboard" className="h-6 w-6" />
            今天的建议已经整理好
          </p>
          <p className="mt-2 text-lg leading-8 text-slate-600">
            下面会一张一张看。每张只讲一件事：先照顾哪里、现在做什么、如果更不舒服该找谁。
          </p>
          {tones.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {tones.map(item => (
                <div key={item.label} className="rounded-2xl bg-cyan-50 p-4">
                  <p className="text-base font-black text-cyan-800">{item.label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{item.value > 0 ? '有线索' : '较平稳'}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <SeniorResultCard
          summary={summary}
          onNext={() => {
            const route = summary.next_action.route as SeniorPage;
            onNavigate(route === 'summary' ? 'home' : route);
          }}
          onHelp={() => onNavigate('help')}
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <button onClick={() => loadQuestions(mode)} className="min-h-[64px] rounded-2xl border border-cyan-200 bg-cyan-50 px-5 text-xl font-black text-cyan-900">换一组题再测一次</button>
          <button onClick={() => onNavigate('home')} className="min-h-[64px] rounded-2xl bg-slate-950 px-5 text-xl font-black text-white">回到首页</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <SeniorPageHeader eyebrow="老年版小测" title="正在准备题目" desc="这次不再是固定几道题，会根据当前模式换一组题。" />
        <section className="rounded-[2.4rem] border border-cyan-100 bg-white p-8 text-center shadow-[0_30px_100px_-70px_rgba(15,23,42,0.45)]">
          <p className="text-3xl font-black text-slate-950">正在准备...</p>
          <p className="mt-3 text-xl leading-9 text-slate-600">请稍等一下。</p>
        </section>
      </div>
    );
  }

  if (analyzing || (questions.length > 0 && answers.length >= questions.length && !summary && !error)) {
    return (
      <div className="mx-auto max-w-5xl">
        <SeniorSafetyActions onNavigate={onNavigate} onEnd={() => onNavigate('home')} />
        <SeniorPageHeader eyebrow="老年版小测" title="正在整理今天的建议" desc="小测已经答完了。现在会把这轮问题和答案整理成几张容易看的建议卡。" />
        <section className="rounded-[2.4rem] border border-emerald-100 bg-emerald-50 p-8 text-center shadow-[0_30px_100px_-70px_rgba(15,23,42,0.45)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-emerald-800 shadow-sm">
            <SeniorIcon name="spark" className="h-10 w-10" />
          </div>
          <p className="mt-5 text-3xl font-black text-emerald-950">请稍等一下</p>
          <p className="mt-3 text-xl leading-9 text-emerald-900">马上就好。整理完成后，会一张一张告诉您今天先照顾哪里、现在先做哪一步。</p>
        </section>
      </div>
    );
  }

  if (!analyzing && questions.length > 0 && answers.length >= questions.length && error) {
    return (
      <div className="mx-auto max-w-5xl">
        <SeniorSafetyActions onNavigate={onNavigate} onEnd={() => onNavigate('home')} />
        <SeniorPageHeader eyebrow="老年版小测" title="小测答完了，但建议没有整理成功" desc={error} />
        <div className="grid gap-3 md:grid-cols-2">
          <button onClick={retryAnalyze} className="min-h-[64px] rounded-2xl bg-cyan-900 px-6 text-xl font-black text-white">重新生成建议</button>
          <button onClick={() => loadQuestions(mode)} className="min-h-[64px] rounded-2xl border border-cyan-200 bg-cyan-50 px-6 text-xl font-black text-cyan-900">换一组题再测一次</button>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="mx-auto max-w-5xl">
        <SeniorSafetyActions onNavigate={onNavigate} />
        <SeniorPageHeader eyebrow="老年版小测" title="题目暂时没有加载出来" desc={error || '可以重新加载一次，或者先回首页。'} />
        <button onClick={() => loadQuestions(mode)} className="min-h-[64px] rounded-2xl bg-cyan-900 px-6 text-xl font-black text-white">重新加载题目</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <SeniorSafetyActions
        onNavigate={onNavigate}
        onBack={() => {
          if (index === 0) onNavigate('home');
          else {
            setIndex(index - 1);
            setAnswers(prev => prev.slice(0, -1));
          }
        }}
        onEnd={() => onNavigate('home')}
      />
      <SeniorPageHeader
        eyebrow={`老年版小测 · 第 ${index + 1} 题 / 共 ${questions.length} 题`}
        title="一题一题来，不用答得很标准"
        desc="这组题会看心情、担心、孤单、睡眠和身体不舒服。答完后，会整理成适合今天的一步建议。"
      />
      <section className="mb-5 rounded-[2rem] border border-cyan-100 bg-white/92 p-5">
        <div className="grid gap-3 md:grid-cols-4">
          {modeOptions.map(option => (
            <button
              key={option.id}
              onClick={() => chooseMode(option.id)}
              className={`rounded-2xl p-4 text-left transition ${mode === option.id ? 'bg-cyan-900 text-white' : 'border border-cyan-100 bg-cyan-50 text-cyan-950'}`}
            >
              <span className="block text-xl font-black">{option.label}</span>
              <span className={`mt-2 block text-sm leading-6 ${mode === option.id ? 'text-cyan-50' : 'text-cyan-800'}`}>{option.desc}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-base font-bold leading-7 text-slate-600">本轮会从这些方面了解：{importantSources.join('、')}。不用背概念，只按最近感觉回答就好。</p>
      </section>
      <section className="rounded-[2.4rem] border border-cyan-100 bg-white p-7 shadow-[0_30px_100px_-70px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-cyan-900 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="rounded-full bg-cyan-50 px-4 py-2 text-base font-black text-cyan-900">{sourceLabel(current.scale)}</span>
        </div>
        <h2 className="mt-8 text-4xl font-black leading-tight text-slate-950 md:text-5xl">{current.text}</h2>
        <p className="mt-4 text-2xl leading-10 text-slate-600">{current.helper || intro}</p>
        <div className={`mt-8 grid gap-4 ${current.options.length >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          {current.options.map(option => (
            <button
              key={option.value}
              onClick={() => answer(current, option.value, option.label)}
              className="min-h-[112px] rounded-[2rem] border border-cyan-100 bg-cyan-50 px-5 text-2xl font-black text-cyan-950 transition hover:-translate-y-0.5 hover:bg-cyan-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200"
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={() => speak(current.text, { voice: 'xiaoyi', emotion: 'friendly' })} className="min-h-[64px] rounded-2xl border border-cyan-200 bg-cyan-50 px-6 text-xl font-black text-cyan-900">
            <span className="inline-flex items-center gap-2"><SeniorIcon name="volume" className="h-6 w-6" />再读一遍</span>
          </button>
          <button onClick={() => loadQuestions(mode)} className="min-h-[64px] rounded-2xl border border-slate-200 bg-white px-6 text-xl font-black text-slate-800">
            换一组题
          </button>
        </div>
      </section>
      {analyzing ? (
        <div className="mt-5 rounded-[2rem] border border-emerald-100 bg-emerald-50 p-5 text-xl font-black leading-8 text-emerald-950">
          正在整理今天的建议，请稍等。
        </div>
      ) : null}
      {error ? (
        <div className="mt-5 rounded-[2rem] border border-rose-100 bg-rose-50 p-5 text-xl font-black leading-8 text-rose-900">
          {error}
          {answers.length ? <button onClick={retryAnalyze} className="ml-0 mt-3 block min-h-[56px] rounded-2xl bg-rose-700 px-5 text-lg font-black text-white md:ml-3 md:mt-0 md:inline-block">重新生成建议</button> : null}
        </div>
      ) : null}
    </div>
  );
}
