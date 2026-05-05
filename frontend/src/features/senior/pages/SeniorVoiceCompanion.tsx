import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SeniorIcon } from '../components/SeniorIcon';
import { SeniorPageHeader } from '../components/SeniorPageHeader';
import { SeniorResultCard } from '../components/SeniorResultCard';
import { SeniorStatusNotice } from '../components/SeniorStatusNotice';
import { SeniorVoiceStatusCard } from '../components/SeniorVoiceStatusCard';
import { buildSeniorQuestionSet, getSeniorQuestionContext } from '../data/seniorQuestionBank';
import { useSeniorSpeechRecognition } from '../hooks/useSeniorSpeechRecognition';
import { markSeniorProgress } from '../hooks/useSeniorDailyProgress';
import { useSeniorTTS } from '../hooks/useSeniorTTS';
import { seniorApi } from '../services/seniorApi';
import { useSeniorAudioStore } from '../store/useSeniorAudioStore';
import type { SeniorPage, SeniorQuestionAnswer, SeniorSummary } from '../types/senior';

export function SeniorVoiceCompanion({ userId, onNavigate, onSummary }: { userId: string; onNavigate: (page: SeniorPage) => void; onSummary: (summary: SeniorSummary) => void }) {
  const [questionRun, setQuestionRun] = useState(0);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [answers, setAnswers] = useState<SeniorQuestionAnswer[]>([]);
  const [lastFinalAnswers, setLastFinalAnswers] = useState<SeniorQuestionAnswer[]>([]);
  const questions = useMemo(() => buildSeniorQuestionSet(lastFinalAnswers), [questionRun]);
  const [summary, setSummary] = useState<SeniorSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [canRetrySummary, setCanRetrySummary] = useState(false);
  const current = questions[index];
  const { speak, stop } = useSeniorTTS();
  const stopAndClearAudio = useCallback(() => {
    stop();
    useSeniorAudioStore.setState({ currentText: '', error: null });
  }, [stop]);
  const setRecognizedText = useCallback((text: string) => setAnswer(text), []);
  const speech = useSeniorSpeechRecognition(setRecognizedText);
  const speechRef = useRef(speech);
  const lastUserIdRef = useRef(userId);
  useEffect(() => {
    speechRef.current = speech;
  }, [speech]);
  const speakSafely = useCallback((text: string) => {
    if (speechRef.current.isListening) speechRef.current.stop();
    speak(text, { voice: 'xiaoyi', emotion: 'friendly' });
  }, [speak]);

  useEffect(() => {
    if (summary || submitting) return;
    speakSafely(`您好，我们慢慢来。第一个问题，${questions[0].speakText || questions[0].text}`);
    return () => stopAndClearAudio();
  }, [questionRun, speakSafely, stopAndClearAudio]);

  useEffect(() => {
    if (lastUserIdRef.current === userId) return;
    lastUserIdRef.current = userId;
    stopAndClearAudio();
    speechRef.current.stop();
    setQuestionRun(prev => prev + 1);
    setIndex(0);
    setAnswer('');
    setAnswers([]);
    setLastFinalAnswers([]);
    setSummary(null);
    setSubmitting(false);
    setError('');
    setCanRetrySummary(false);
  }, [stopAndClearAudio, userId]);

  const progress = useMemo(() => Math.round(((index + 1) / questions.length) * 100), [index, questions.length]);

  const finish = async (finalAnswers: SeniorQuestionAnswer[]) => {
    stopAndClearAudio();
    speechRef.current.stop();
    setLastFinalAnswers(finalAnswers);
    setSubmitting(true); setError(''); setCanRetrySummary(false);
    try {
      let interviewId: string | undefined;
      try {
        const interview = await seniorApi.createInterview(userId, finalAnswers, 'mixed');
        interviewId = interview.interview.id;
      } catch {}
      const result = await seniorApi.createSummary(userId, finalAnswers, interviewId, undefined, {
        ui_mode: 'senior',
        scenario: '老年用户在心理健康支持网站完成 5 个逐步问答，需要把五个问题和回答一起整理成生活化建议。',
        display_style: '结果会以一次一张的小卡片展示，所以每张卡只放一个重点。',
        answer_count: finalAnswers.length,
        source: 'senior_voice_companion',
        question_context: getSeniorQuestionContext(finalAnswers),
      });
      setSummary(result);
      onSummary(result);
      markSeniorProgress(userId, 'companion');
      markSeniorProgress(userId, 'summary');
      setCanRetrySummary(false);
    } catch {
      setError('网络有点慢，今天的建议暂时没有整理好。您刚才说的话不会影响继续使用。');
      setCanRetrySummary(true);
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    const text = answer.trim();
    if (!text) { setError('还没有记录内容。您可以说一句，也可以直接打字。'); setCanRetrySummary(false); return; }
    const nextAnswer: SeniorQuestionAnswer = { question_id: current.id, question_text: current.text, answer_text: text, input_mode: speech.status === 'recognized' ? 'voice' : 'text' };
    const nextAnswers = [...answers, nextAnswer];
    setAnswers(nextAnswers); setAnswer(''); setError(''); setCanRetrySummary(false);
    if (index >= questions.length - 1) { void finish(nextAnswers); return; }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    speakSafely(`下一个问题，${questions[nextIndex].speakText || questions[nextIndex].text}`);
  };

  const restart = () => {
    stopAndClearAudio();
    speechRef.current.stop();
    setQuestionRun(prev => prev + 1);
    setIndex(0);
    setAnswer('');
    setAnswers([]);
    setLastFinalAnswers([]);
    setSummary(null);
    setSubmitting(false);
    setError('');
    setCanRetrySummary(false);
  };

  if (summary) {
    return (
      <div className="space-y-4">
        <div className="mx-auto flex max-w-5xl justify-end">
          <button onClick={restart} className="min-h-[56px] rounded-2xl border border-cyan-200 bg-white px-5 text-lg font-black text-cyan-900 shadow-sm">
            重新回答一轮
          </button>
        </div>
        <SeniorResultCard summary={summary} onNext={() => onNavigate(resolveSummaryNextPage(summary))} onHelp={() => onNavigate('help')} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <SeniorPageHeader eyebrow={`第 ${index + 1} 个问题 / 共 ${questions.length} 个`} title="一次只回答一个问题" desc="每次进入都会换一组问法。您可以说话，也可以直接打字。" />
      <section className="rounded-[2.4rem] border border-cyan-100 bg-white p-6 shadow-[0_30px_90px_-65px_rgba(15,23,42,0.42)] md:p-7">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-900 transition-all" style={{ width: `${progress}%` }} /></div>
            <h2 className="mt-7 text-4xl font-black leading-tight text-slate-950">{current.text}</h2>
            <p className="mt-4 text-xl leading-9 text-slate-600">{current.helper || '可以只说一句。说完后请看一下文字是否正确，再点继续。'}</p>
          </div>
          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
            <p className="text-lg font-black text-slate-500">当前进度</p>
            <p className="mt-2 text-4xl font-black text-slate-950">{index + 1}/{questions.length}</p>
            <p className="mt-2 text-lg leading-8 text-slate-600">每次只回答一个问题，不需要一次说完所有事情。</p>
          </div>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-4">
            <button onClick={speech.isListening ? speech.stop : () => { stopAndClearAudio(); speech.start(); }} className={`min-h-[214px] w-full rounded-[2rem] text-center text-white transition focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200 ${speech.isListening ? 'bg-rose-700' : 'bg-cyan-900 hover:bg-cyan-950'}`}>
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15">
                <SeniorIcon name={speech.isListening ? 'pause' : 'mic'} className="h-11 w-11" />
              </span>
              <span className="mt-5 block text-3xl font-black">{speech.isListening ? '正在听' : '开始说话'}</span>
              <span className="mt-3 block text-xl text-white/90">{speech.isListening ? '点一下可暂停' : '不会用也可以打字'}</span>
            </button>
            <SeniorVoiceStatusCard status={speech.status} hint={speech.hint} />
          </div>

          <div>
            <label className="block">
              <span className="mb-3 flex items-center gap-2 text-xl font-black text-slate-900">
                <SeniorIcon name="edit" className="h-6 w-6 text-cyan-800" />
                我听到 / 记录到的内容
              </span>
              <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="如果不方便说话，可以直接在这里输入。" className="min-h-[276px] w-full rounded-[2rem] border border-slate-300 bg-slate-50 p-6 text-2xl leading-10 text-slate-900 outline-none focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100" />
            </label>
            {current.chips?.length ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {current.chips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setAnswer(chip)}
                    className="min-h-[52px] rounded-2xl border border-cyan-100 bg-cyan-50 px-4 text-lg font-black text-cyan-900 hover:bg-cyan-100"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            ) : null}
            {answers.length ? (
              <div className="mt-4 rounded-[1.75rem] border border-slate-200 bg-white p-4">
                <p className="text-lg font-black text-slate-700">前面已经记录</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {answers.slice(-4).map((item, idx) => (
                    <div key={`${item.question_id}-${idx}`} className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-sm font-black text-slate-500">{item.question_text}</p>
                      <p className="mt-1 line-clamp-2 text-base font-bold text-slate-800">{item.answer_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button onClick={() => speakSafely(current.speakText || current.text)} disabled={speech.isListening} className="min-h-[64px] rounded-2xl border border-slate-300 bg-white px-6 text-xl font-black text-slate-800 disabled:opacity-50">
            <span className="inline-flex items-center gap-2"><SeniorIcon name="volume" className="h-6 w-6" />再读一遍</span>
          </button>
          <button onClick={() => setAnswer('我现在说不清楚，先跳过这个。')} className="min-h-[64px] rounded-2xl border border-slate-300 bg-white px-6 text-xl font-black text-slate-800">不知道怎么说</button>
          <button onClick={next} disabled={submitting} className="min-h-[64px] flex-1 rounded-2xl bg-emerald-800 px-6 text-xl font-black text-white disabled:opacity-60">{submitting ? '正在整理...' : index >= questions.length - 1 ? '完成，看看建议' : '继续下一步'}</button>
        </div>
        {error ? (
          <div className="mt-4">
            <SeniorStatusNotice
              tone={canRetrySummary ? 'danger' : 'warning'}
              title={canRetrySummary ? '建议暂时没有整理好' : '还需要一点内容'}
              desc={error}
              actionLabel={canRetrySummary && lastFinalAnswers.length && !submitting ? '重新整理建议' : undefined}
              onAction={canRetrySummary && lastFinalAnswers.length && !submitting ? () => finish(lastFinalAnswers) : undefined}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function resolveSummaryNextPage(summary: SeniorSummary): SeniorPage {
  if (summary.risk_level === 'urgent' || summary.risk_level === 'medical_emergency' || summary.recommendation.type === 'help') return 'help';
  if (summary.recommendation.type === 'relax' || summary.recommendation.type === 'rest' || summary.recommended_exercise) return 'relax';
  const route = summary.next_action.route as SeniorPage;
  return route === 'home' || route === 'companion' || route === 'chat' || route === 'summary' || route === 'relax' || route === 'help' || route === 'settings'
    ? route
    : 'relax';
}
