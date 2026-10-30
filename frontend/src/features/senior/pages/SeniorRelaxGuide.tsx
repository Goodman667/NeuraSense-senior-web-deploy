import { useEffect, useMemo, useRef, useState } from 'react';
import { SeniorIcon } from '../components/SeniorIcon';
import { SeniorSafetyActions } from '../components/SeniorSafetyActions';
import { RELAX_EXERCISES, exerciseSeconds, recommendRelaxExercise, type RelaxExercise } from '../data/seniorRelaxExercises';
import type { SeniorPage, SeniorSummary } from '../types/senior';
import { markSeniorProgress } from '../hooks/useSeniorDailyProgress';
import { useSeniorTTS } from '../hooks/useSeniorTTS';
import { seniorAssets } from '../lib/seniorAssets';
import { emitStudyEvent } from '../../../lib/studyEvents';

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/** Breathing circle: grows for 4 s (breathe in), shrinks for 6 s (breathe out). */
function BreathCircle({ running }: { running: boolean }) {
  const [inhale, setInhale] = useState(true);
  useEffect(() => {
    if (!running) return;
    let alive = true;
    let timer = 0;
    const loop = (isIn: boolean) => {
      if (!alive) return;
      setInhale(isIn);
      timer = window.setTimeout(() => loop(!isIn), isIn ? 4000 : 6000);
    };
    loop(true);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [running]);
  return (
    <div className="flex flex-col items-center gap-3 py-2" aria-hidden="true">
      <div className="flex h-44 w-44 items-center justify-center">
        <div
          className="rounded-full bg-[var(--sn-teal-soft)] ring-4 ring-[var(--sn-teal)]/30"
          style={{ width: running && inhale ? '11rem' : '6.5rem', height: running && inhale ? '11rem' : '6.5rem', transition: `all ${inhale ? 4 : 6}s ease-in-out` }}
        />
      </div>
      <p className="text-[1.4rem] text-[var(--sn-teal-deep)]">{running ? (inhale ? '慢慢吸气' : '慢慢呼气') : '准备好就点开始'}</p>
    </div>
  );
}

/** Plays one exercise: each step is read aloud and timed. "我做完了" can be pressed at any time. */
function RelaxPlayer({ exercise, onDone, onBack }: { exercise: RelaxExercise; onDone: () => void; onBack: () => void }) {
  const { speak, stop } = useSeniorTTS();
  const total = exerciseSeconds(exercise);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const spokenRef = useRef(-1);

  const stepIndex = useMemo(() => {
    let t = elapsed;
    for (let i = 0; i < exercise.steps.length; i++) {
      if (t < exercise.steps[i].seconds) return i;
      t -= exercise.steps[i].seconds;
    }
    return exercise.steps.length - 1;
  }, [elapsed, exercise]);
  const step = exercise.steps[stepIndex];
  const finished = elapsed >= total;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setElapsed((e) => Math.min(e + 1, total)), 1000);
    return () => window.clearInterval(timer);
  }, [running, total]);

  useEffect(() => {
    if (finished) setRunning(false);
  }, [finished]);

  useEffect(() => {
    if (!running || spokenRef.current === stepIndex) return;
    spokenRef.current = stepIndex;
    speak(step.text, { voice: 'xiaoyi', emotion: 'gentle' });
  }, [running, stepIndex, step, speak]);

  useEffect(() => () => stop(), [stop]);

  const start = () => {
    if (finished) { setElapsed(0); spokenRef.current = -1; }
    if (elapsed === 0 && spokenRef.current === -1) {
      spokenRef.current = 0;
      speak(`${exercise.intro} ${exercise.steps[0].text}`, { voice: 'xiaoyi', emotion: 'gentle' });
    }
    setRunning(true);
  };

  return (
    <section className="sn-sheet p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="sn-h1">{exercise.title}</h2>
        <span className="rounded-full bg-[var(--sn-teal-soft)] px-4 py-1.5 text-[1.15rem] tabular-nums text-[var(--sn-teal-deep)]">还剩 {fmt(total - elapsed)}</span>
      </div>
      <p className="sn-lede mt-2">{exercise.intro}</p>
      <div className="sn-progress mt-5"><span style={{ width: `${(elapsed / total) * 100}%` }} /></div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-center">
        <ol className="space-y-3">
          {exercise.steps.map((s, i) => (
            <li key={s.text} className={`flex gap-4 rounded-[16px] px-4 py-3 transition ${i === stepIndex && (running || elapsed > 0) ? 'bg-[var(--sn-teal-soft)]' : ''}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[1.15rem] ${i < stepIndex || finished ? 'border-[var(--sn-teal)] bg-[var(--sn-teal)] text-white' : 'border-[var(--sn-line-strong)] text-[var(--sn-teal-deep)]'}`}>
                {i < stepIndex || finished ? '✓' : i + 1}
              </span>
              <p className="text-[1.3rem] leading-9 text-[var(--sn-ink)]">{s.text}</p>
            </li>
          ))}
        </ol>
        {exercise.steps.some((s) => s.breathe) ? <BreathCircle running={running && !!step.breathe} /> : null}
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        {running ? (
          <button onClick={() => { setRunning(false); stop(); }} className="sn-btn sn-btn-quiet sn-btn-lg"><SeniorIcon name="pause" />暂停</button>
        ) : (
          <button onClick={start} className="sn-btn sn-btn-primary sn-btn-lg"><SeniorIcon name="volume" />{elapsed > 0 && !finished ? '继续' : '开始练习'}</button>
        )}
        <button onClick={() => speak(step.text, { voice: 'xiaoyi', emotion: 'gentle' })} className="sn-btn sn-btn-quiet sn-btn-lg">再听一遍</button>
        <button onClick={() => { stop(); setRunning(false); onDone(); }} className="sn-btn sn-btn-dark sn-btn-lg"><SeniorIcon name="check" />我做完了</button>
        <button onClick={() => { stop(); setRunning(false); onBack(); }} className="sn-btn sn-btn-outline sn-btn-lg">换一个练习</button>
      </div>
    </section>
  );
}

export function SeniorRelaxGuide({ userId, latestSummary, onNavigate }: { userId: string; latestSummary: SeniorSummary | null; onNavigate: (page: SeniorPage) => void }) {
  const { stop } = useSeniorTTS();
  const recommended = useMemo(() => recommendRelaxExercise(latestSummary), [latestSummary]);
  const [selected, setSelected] = useState<RelaxExercise | null>(null);
  const [doneExercise, setDoneExercise] = useState<RelaxExercise | null>(null);
  const familyMessage = cleanText(latestSummary?.family_message);

  const completeRelax = (exercise: RelaxExercise) => {
    setDoneExercise(exercise);
    setSelected(null);
    markSeniorProgress(userId, 'relax');
    emitStudyEvent('senior-relax-done', { exercise: exercise.id });
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  return (
    <div className="mx-auto max-w-6xl">
      <SeniorSafetyActions onNavigate={onNavigate} onEnd={() => { stop(); onNavigate('home'); }} endLabel="今天先到这里" />

      <section className="sn-rise relative h-[16rem] overflow-hidden rounded-[28px] border border-[var(--sn-line)] bg-[#E8E4DA] md:h-[20rem]">
        <img src={seniorAssets.stoneValley} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <p className="absolute inset-x-0 top-6 z-[5] text-center text-[clamp(4rem,10vw,8rem)] leading-[0.9] tracking-[0.2em] text-[#010101]/80 md:top-8" aria-hidden="true">慢慢来</p>
        <img src={seniorAssets.stoneCutout} alt="" className="absolute inset-0 z-10 h-full w-full object-cover" />
      </section>

      {doneExercise ? (
        <div className="sn-notice tone-success mt-6 flex-col">
          <p className="flex items-center gap-2 text-[1.5rem]"><SeniorIcon name="check" className="h-7 w-7" />做得很好</p>
          <p className="text-[1.2rem] leading-9">{doneExercise.completionText}</p>
          {familyMessage ? (
            <p className="rounded-[14px] bg-white/60 p-4 text-[1.1rem] leading-8">想告诉家人的话，可以这样说：{familyMessage}</p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setDoneExercise(null)} className="sn-btn sn-btn-quiet">再做一个练习</button>
            <button onClick={() => onNavigate('chat')} className="sn-btn sn-btn-quiet">做完还想说说话</button>
            <button onClick={() => onNavigate('home')} className="sn-btn sn-btn-quiet">回到今天</button>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className="mt-6">
          <RelaxPlayer exercise={selected} onDone={() => completeRelax(selected)} onBack={() => setSelected(null)} />
        </div>
      ) : (
        <section className="mt-6">
          <h1 className="sn-h1">选一个放松练习</h1>
          <p className="sn-lede mt-2">每个大约 5 分钟。我会一步一步读给您听，跟着做就好；随时都可以停下来。</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {RELAX_EXERCISES.map((exercise) => (
              <button
                key={exercise.id}
                data-tour={`relax-${exercise.id}`}
                onClick={() => { setDoneExercise(null); setSelected(exercise); }}
                className="sn-sheet flex flex-col items-start gap-2 p-6 text-left transition hover:-translate-y-0.5 hover:border-[var(--sn-teal)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#8FB9B3]"
              >
                <span className="flex w-full flex-wrap items-center gap-2">
                  <span className="text-[1.6rem] text-[var(--sn-ink)]">{exercise.title}</span>
                  {exercise.id === recommended.id ? <span className="rounded-full bg-[var(--sn-teal)] px-3 py-1 text-[1rem] text-white">今天推荐</span> : null}
                  <span className="ml-auto inline-flex items-center gap-1 text-[1.05rem] text-[var(--sn-ink-2)]"><SeniorIcon name="clock" className="h-5 w-5" />约 5 分钟</span>
                </span>
                <span className="sn-body">{exercise.suitableFor}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function cleanText(text?: string) {
  return (text || '')
    .replace(/NeuraSense|项目|平台|AI|人工智能|算法|模型|诊断|评分|分数|量表|风险等级/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}
