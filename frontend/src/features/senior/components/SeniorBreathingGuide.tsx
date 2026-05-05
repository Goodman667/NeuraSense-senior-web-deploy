import { useEffect, useMemo, useState } from 'react';
import { SeniorIcon } from './SeniorIcon';

type Phase = { label: string; hint: string; seconds: number; scale: string };

const phases: Phase[] = [
  { label: '慢慢吸气', hint: '像闻一朵花，不用太用力。', seconds: 4, scale: 'scale-110' },
  { label: '停一下', hint: '肩膀放松，身体坐稳。', seconds: 2, scale: 'scale-110' },
  { label: '慢慢呼气', hint: '像轻轻吹一口热茶。', seconds: 6, scale: 'scale-90' },
];

export function SeniorBreathingGuide({ onComplete }: { onComplete?: () => void }) {
  const totalSeconds = 180;
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const phaseCursor = useMemo(() => {
    const cycle = phases.reduce((sum, phase) => sum + phase.seconds, 0);
    let cursor = elapsed % cycle;
    for (let i = 0; i < phases.length; i += 1) {
      if (cursor < phases[i].seconds) return { phase: phases[i], index: i, left: phases[i].seconds - cursor };
      cursor -= phases[i].seconds;
    }
    return { phase: phases[0], index: 0, left: phases[0].seconds };
  }, [elapsed]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setElapsed((prev) => {
        const next = Math.min(prev + 1, totalSeconds);
        if (next >= totalSeconds) {
          window.clearInterval(timer);
          setRunning(false);
          onComplete?.();
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, onComplete]);

  const percent = Math.round((elapsed / totalSeconds) * 100);
  const minutes = Math.floor((totalSeconds - elapsed) / 60);
  const seconds = (totalSeconds - elapsed) % 60;

  return (
    <section className="rounded-[2.2rem] border border-emerald-100 bg-white p-6 shadow-[0_28px_90px_-70px_rgba(15,23,42,0.42)]">
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-center">
        <div className="flex flex-col items-center justify-center rounded-[2rem] bg-emerald-50 p-6">
          <div className="relative flex h-52 w-52 items-center justify-center">
            <div className={`absolute h-40 w-40 rounded-full bg-emerald-200/70 blur-xl transition-transform duration-[1200ms] motion-reduce:transition-none ${phaseCursor.phase.scale}`} />
            <div className={`absolute h-36 w-36 rounded-full border border-emerald-100 bg-white/80 shadow-2xl shadow-emerald-900/10 transition-transform duration-[1200ms] motion-reduce:transition-none ${phaseCursor.phase.scale}`} />
            <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full bg-emerald-800 text-white">
              <span className="text-4xl font-black">{phaseCursor.left}</span>
              <span className="text-base font-bold">秒</span>
            </div>
          </div>
          <p className="mt-2 text-center text-3xl font-black text-emerald-950">{phaseCursor.phase.label}</p>
          <p className="mt-2 text-center text-lg leading-8 text-emerald-800">{phaseCursor.phase.hint}</p>
        </div>

        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-lg font-black text-emerald-800">
            <SeniorIcon name="leaf" className="h-5 w-5" />
            三分钟慢呼吸
          </p>
          <h2 className="mt-4 text-4xl font-black text-slate-950">跟着圆圈，慢慢来</h2>
          <p className="mt-3 text-xl leading-9 text-slate-600">不追求标准。只要跟着吸气、停一下、呼气，做几轮就很好。</p>

          <div className="mt-6">
            <div className="flex items-center justify-between text-lg font-black text-slate-600">
              <span>剩余 {minutes}:{seconds.toString().padStart(2, '0')}</span>
              <span>{percent}%</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-700 transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <button onClick={() => setRunning(true)} disabled={running || elapsed >= totalSeconds} className="min-h-[64px] rounded-2xl bg-emerald-800 px-5 text-xl font-black text-white disabled:opacity-50">
              <span className="inline-flex items-center gap-2"><SeniorIcon name="play" className="h-6 w-6" />开始</span>
            </button>
            <button onClick={() => setRunning(false)} disabled={!running} className="min-h-[64px] rounded-2xl border border-slate-200 bg-white px-5 text-xl font-black text-slate-800 disabled:opacity-50">
              <span className="inline-flex items-center gap-2"><SeniorIcon name="pause" className="h-6 w-6" />暂停</span>
            </button>
            <button onClick={() => { setRunning(false); setElapsed(0); }} className="min-h-[64px] rounded-2xl border border-slate-200 bg-white px-5 text-xl font-black text-slate-800">
              <span className="inline-flex items-center gap-2"><SeniorIcon name="reset" className="h-6 w-6" />重来</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
