import { useEffect, useMemo, useState } from 'react';
import { emitStudyEvent } from '../../../lib/studyEvents';
import { SeniorIcon } from '../components/SeniorIcon';
import { SeniorPageHeader } from '../components/SeniorPageHeader';
import { SeniorResultCard } from '../components/SeniorResultCard';
import { SeniorSafetyActions } from '../components/SeniorSafetyActions';
import { SeniorLoadingCard } from '../components/SeniorLoadingCard';
import { SeniorStatusNotice } from '../components/SeniorStatusNotice';
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
      emitStudyEvent('senior-checkup-done');
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
        <SeniorSafetyActions onNavigate={onNavigate} />
        <section className="sn-sheet mb-5 p-6">
          <p className="sn-kicker"><SeniorIcon name="clipboard" className="h-5 w-5" />小测做完了</p>
          <h1 className="sn-h1 mt-2">今天的建议已经整理好</h1>
          <p className="sn-body mt-2">下面一张一张看，每张只讲一件事：先照顾哪里、现在做什么、更不舒服时找谁。</p>
          {tones.length ? (
            <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {tones.map(item => (
                <div key={item.label} className="sn-sheet-flat flex items-center justify-between gap-3 p-4">
                  <dt className="whitespace-nowrap text-[1.2rem] text-[var(--sn-ink-2)]">{item.label}</dt>
                  <dd className={`whitespace-nowrap rounded-full px-3 py-1 text-[1.05rem] ${item.value > 0 ? 'bg-[#F3E2D4] text-[#8A4A1F]' : 'bg-[#E7EEDD] text-[#33441C]'}`}>{item.value > 0 ? '有些线索' : '比较平稳'}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
        <SeniorResultCard
          summary={summary}
          onNext={() => {
            const route = summary.next_action.route as SeniorPage;
            onNavigate(route === 'summary' ? 'home' : route);
          }}
          onHelp={() => onNavigate('help')}
        />
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={() => loadQuestions(mode)} className="sn-btn sn-btn-quiet"><SeniorIcon name="reset" />换一组题再测一次</button>
          <button onClick={() => onNavigate('home')} className="sn-btn sn-btn-dark">回到今天</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <SeniorPageHeader eyebrow="小测" title="正在准备题目" desc="每次会换一组题，请稍等一下。" />
        <SeniorLoadingCard title="正在准备题目" lines={3} />
      </div>
    );
  }

  if (analyzing || (questions.length > 0 && answers.length >= questions.length && !summary && !error)) {
    return (
      <div className="mx-auto max-w-5xl">
        <SeniorSafetyActions onNavigate={onNavigate} />
        <section className="sn-sheet flex flex-col items-center p-10 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--sn-teal-soft)] text-[var(--sn-teal)]"><SeniorIcon name="spark" className="h-10 w-10 motion-safe:animate-pulse" /></span>
          <h1 className="sn-h1 mt-5">正在整理今天的建议</h1>
          <p className="sn-lede mt-3 max-w-2xl">题都答完了。马上就好，整理完会一张一张告诉您：今天先照顾哪里，现在先做哪一步。</p>
        </section>
      </div>
    );
  }

  if (!analyzing && questions.length > 0 && answers.length >= questions.length && error) {
    return (
      <div className="mx-auto max-w-5xl">
        <SeniorSafetyActions onNavigate={onNavigate} />
        <SeniorPageHeader eyebrow="小测" title="小测答完了，但建议没有整理成功" desc={error} />
        <div className="flex flex-wrap gap-3">
          <button onClick={retryAnalyze} className="sn-btn sn-btn-primary">重新生成建议</button>
          <button onClick={() => loadQuestions(mode)} className="sn-btn sn-btn-quiet">换一组题再测一次</button>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="mx-auto max-w-5xl">
        <SeniorSafetyActions onNavigate={onNavigate} />
        <SeniorPageHeader eyebrow="小测" title="题目暂时没有加载出来" desc={error || '可以重新加载一次，或者先回首页。'} />
        <button onClick={() => loadQuestions(mode)} className="sn-btn sn-btn-primary">重新加载题目</button>
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

      <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="小测重点">
        <span className="sn-small mr-1">这次多看一点：</span>
        {modeOptions.map(option => (
          <button key={option.id} onClick={() => chooseMode(option.id)} aria-pressed={mode === option.id} className="sn-chip" title={option.desc}>
            {option.label}
          </button>
        ))}
      </div>

      <section className="sn-sheet sn-rise overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 border-b border-[var(--sn-line)] px-6 py-4 md:px-8">
          <span className="text-[1.15rem] tabular-nums text-[var(--sn-ink-2)]">第 {index + 1} 题 · 共 {questions.length} 题</span>
          <div className="sn-progress min-w-[8rem] flex-1"><span style={{ width: `${progress}%` }} /></div>
          <span className="rounded-full bg-[var(--sn-teal-soft)] px-3 py-1 text-[1rem] text-[var(--sn-teal-deep)]">{sourceLabel(current.scale)}</span>
        </div>
        <div className="px-6 py-8 md:px-10 md:py-10">
          <h1 className="sn-display !text-[var(--sn-ink)]">{current.text}</h1>
          <p className="sn-lede mt-3">{current.helper || intro}</p>
          <div className={`mt-8 grid gap-3 ${current.options.length >= 4 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3'}`}>
            {current.options.map(option => (
              <button
                key={option.value}
                onClick={() => answer(current, option.value, option.label)}
                className="min-h-[6.5rem] rounded-[18px] border-[1.5px] border-[var(--sn-line-strong)] bg-[#FFFDF9] px-5 text-[1.5rem] text-[var(--sn-ink)] transition hover:-translate-y-0.5 hover:border-[var(--sn-teal)] hover:bg-[var(--sn-teal-soft)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#8FB9B3]"
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => speak(current.text, { voice: 'xiaoyi', emotion: 'friendly' })} className="sn-btn sn-btn-quiet"><SeniorIcon name="volume" />再读一遍</button>
            <button onClick={() => loadQuestions(mode)} className="sn-btn sn-btn-quiet"><SeniorIcon name="reset" />换一组题</button>
          </div>
          <p className="sn-small mt-6">这一轮会了解：{importantSources.join('、')}。不用背概念，按最近的感觉回答就好。</p>
        </div>
      </section>
      {error ? (
        <div className="mt-5">
          <SeniorStatusNotice tone="danger" title="建议没有整理好" desc={error} actionLabel={answers.length ? '重新生成建议' : undefined} onAction={answers.length ? retryAnalyze : undefined} />
        </div>
      ) : null}
    </div>
  );
}
