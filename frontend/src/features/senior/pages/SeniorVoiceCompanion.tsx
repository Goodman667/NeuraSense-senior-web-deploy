import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SeniorIcon } from '../components/SeniorIcon';
import { SeniorResultCard } from '../components/SeniorResultCard';
import { SeniorSafetyActions } from '../components/SeniorSafetyActions';
import { SeniorStatusNotice } from '../components/SeniorStatusNotice';
import { SeniorVoiceStatusCard } from '../components/SeniorVoiceStatusCard';
import { buildSeniorQuestionSet, getSeniorQuestionContext } from '../data/seniorQuestionBank';
import { useSeniorSpeechRecognition } from '../hooks/useSeniorSpeechRecognition';
import { markSeniorProgress } from '../hooks/useSeniorDailyProgress';
import { useSeniorTTS } from '../hooks/useSeniorTTS';
import { seniorApi } from '../services/seniorApi';
import { useSeniorAudioStore } from '../store/useSeniorAudioStore';
import { LeafShadow } from '../components/LeafShadow';
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
      <div className="mx-auto max-w-6xl">
        <SeniorSafetyActions onNavigate={onNavigate} onEnd={() => onNavigate('home')} endLabel="先到这里" />
        <SeniorResultCard summary={summary} onNext={() => onNavigate(resolveSummaryNextPage(summary))} onHelp={() => onNavigate('help')} />
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={restart} className="sn-btn sn-btn-quiet"><SeniorIcon name="reset" />换一组问题，重新回答</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <SeniorSafetyActions
        onNavigate={onNavigate}
        onBack={() => {
          if (index > 0) {
            setIndex(index - 1);
            const previous = answers.slice(0, -1);
            setAnswers(previous);
            setAnswer(answers[answers.length - 1]?.answer_text || '');
          } else {
            onNavigate('home');
          }
        }}
        onEnd={() => onNavigate('home')}
      />

      <section className="sn-wall sn-rise flex min-h-[24rem] flex-col items-center justify-center rounded-[28px] border border-[var(--sn-line)] px-6 py-12 text-center">
        <LeafShadow />
        <p className="text-[1.1rem] tracking-[0.04em] text-[#2a2420]/70">第 {index + 1} 个问题 · 共 {questions.length} 个</p>
        <h1 className="mt-5 max-w-3xl text-[clamp(2.1rem,3.4vw,3.2rem)] leading-[1.25] text-[#2a2420] [text-wrap:balance]">{current.text}</h1>
        <p className="mt-4 max-w-2xl text-[1.18rem] leading-8 text-[#2a2420]/75">{current.helper || '说一句就可以。说完看一眼文字对不对，再点继续。'}</p>
        <span className="mt-7 block h-12 w-px bg-[#2a2420]/25" aria-hidden="true" />
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button onClick={() => speakSafely(current.speakText || current.text)} disabled={speech.isListening} className="sn-btn sn-btn-glass">
            <SeniorIcon name="volume" />再读一遍
          </button>
        </div>
        <div className="mt-6 w-full max-w-sm">
          <div className="sn-progress !bg-[#2a2420]/10"><span style={{ width: `${progress}%` }} /></div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <button
            onClick={speech.isListening ? speech.stop : () => { stopAndClearAudio(); speech.start(); }}
            className={`flex w-full flex-col items-center justify-center gap-3 rounded-[24px] px-6 py-8 text-[#FBF8F3] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#8FB9B3] ${speech.isListening ? 'bg-[var(--sn-help)]' : 'bg-[var(--sn-teal)] hover:bg-[var(--sn-teal-deep)]'}`}
          >
            <span className="flex h-24 w-24 items-center justify-center rounded-full border border-white/30 bg-white/10">
              <SeniorIcon name={speech.isListening ? 'pause' : 'mic'} className="h-12 w-12" />
            </span>
            <span className="text-[1.7rem] leading-none">{speech.isListening ? '正在听…' : '按一下，开始说'}</span>
            <span className="text-[1.05rem] text-white/80">{speech.isListening ? '说完再按一下' : '不方便说话，也可以打字'}</span>
          </button>
          <SeniorVoiceStatusCard status={speech.status} hint={speech.hint} />
        </div>

        <div className="sn-sheet p-5 md:p-6">
          <label htmlFor="sn-answer" className="flex items-center gap-2 text-[1.3rem]">
            <SeniorIcon name="edit" className="h-6 w-6 text-[var(--sn-teal)]" />
            我听到的 / 您写的
          </label>
          <textarea id="sn-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="不方便说话，可以直接在这里打字。" className="sn-textarea mt-3 min-h-[11rem] text-[1.4rem]" />
          {current.chips?.length ? (
            <div className="mt-4">
              <p className="sn-small mb-2">或者直接点一个：</p>
              <div className="flex flex-wrap gap-2">
                {current.chips.map((chip) => (
                  <button key={chip} onClick={() => setAnswer(chip)} aria-pressed={answer === chip} className="sn-chip">{chip}</button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={next} disabled={submitting} className="sn-btn sn-btn-primary sn-btn-lg min-w-[14rem] flex-[2_1_14rem]">
              {submitting ? '正在整理…' : index >= questions.length - 1 ? '完成，看看建议' : '继续下一步'}
              {!submitting ? <SeniorIcon name="arrow" /> : null}
            </button>
            <button onClick={() => setAnswer('我现在说不清楚，先跳过这个。')} className="sn-btn sn-btn-quiet sn-btn-lg flex-[1_1_10rem]">不知道怎么说</button>
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
          {answers.length ? (
            <div className="mt-6 border-t border-[var(--sn-line)] pt-4">
              <p className="sn-small">前面已经记下</p>
              <ol className="mt-2 space-y-2">
                {answers.slice(-4).map((item, idx) => (
                  <li key={`${item.question_id}-${idx}`} className="text-[1.05rem] leading-7">
                    <span className="text-[var(--sn-ink-3)]">{item.question_text}</span>
                    <span className="ml-2 text-[var(--sn-ink)]">{item.answer_text}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
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
