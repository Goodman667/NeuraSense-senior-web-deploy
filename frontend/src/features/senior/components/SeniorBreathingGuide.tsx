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
    <section className="sn-sheet overflow-hidden">
      <div className="grid lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="flex flex-col items-center justify-center bg-[#E9E4DA] p-8">
          <div className="relative flex h-56 w-56 items-center justify-center">
            <div className={`absolute h-48 w-48 rounded-full bg-[#C9D3BE]/70 blur-xl transition-transform duration-[1200ms] motion-reduce:transition-none ${phaseCursor.phase.scale}`} />
            <div className={`absolute h-40 w-40 rounded-full border border-[#B9C3AB] bg-[#F4F1EC]/90 transition-transform duration-[1200ms] motion-reduce:transition-none ${phaseCursor.phase.scale}`} />
            <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-full bg-[var(--sn-forest)] text-[#F4EFE8]">
              <span className="text-[2.6rem] leading-none tabular-nums">{phaseCursor.left}</span>
              <span className="mt-1 text-sm">秒</span>
            </div>
          </div>
          <p className="mt-4 text-[2rem] text-[var(--sn-forest)]">{phaseCursor.phase.label}</p>
          <p className="mt-1 text-center text-[1.1rem] leading-8 text-[var(--sn-ink-2)]">{phaseCursor.phase.hint}</p>
        </div>

        <div className="p-6 md:p-8">
          <p className="sn-kicker"><SeniorIcon name="leaf" className="h-5 w-5" />三分钟慢呼吸</p>
          <h2 className="sn-h1 mt-2">跟着圆圈，慢慢来</h2>
          <p className="sn-lede mt-2">不用做得标准。吸气、停一下、呼气，做几轮就很好。</p>
          <div className="mt-6">
            <div className="flex items-center justify-between text-[1.1rem] tabular-nums text-[var(--sn-ink-2)]">
              <span>还剩 {minutes}:{seconds.toString().padStart(2, '0')}</span>
              <span>{percent}%</span>
            </div>
            <div className="sn-progress mt-2"><span style={{ width: `${percent}%` }} /></div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <button onClick={() => setRunning(true)} disabled={running || elapsed >= totalSeconds} className="sn-btn sn-btn-primary"><SeniorIcon name="play" />开始</button>
            <button onClick={() => setRunning(false)} disabled={!running} className="sn-btn sn-btn-quiet"><SeniorIcon name="pause" />暂停</button>
            <button onClick={() => { setRunning(false); setElapsed(0); }} className="sn-btn sn-btn-quiet"><SeniorIcon name="reset" />重来</button>
          </div>
        </div>
      </div>
    </section>
  );
}
