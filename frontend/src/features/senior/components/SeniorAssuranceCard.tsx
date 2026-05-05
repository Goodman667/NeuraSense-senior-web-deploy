import type { SeniorSummary } from '../types/senior';
import { SeniorIcon } from './SeniorIcon';

export function SeniorAssuranceCard({
  summary,
  onNext,
  onHelp,
}: {
  summary: SeniorSummary;
  onNext: () => void;
  onHelp: () => void;
}) {
  const needsHelp = summary.risk_level === 'elevated' || summary.risk_level === 'urgent';
  const firstStep = summary.recommendation.title || summary.next_action.label || '先停下来休息一下';
  return (
    <section className={`rounded-[2rem] border p-6 ${needsHelp ? 'border-rose-200 bg-rose-50 text-rose-950' : 'border-cyan-100 bg-cyan-50 text-cyan-950'}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-lg font-black">
            <SeniorIcon name={needsHelp ? 'shield' : 'heart'} className="h-5 w-5" />
            安心卡
          </p>
          <h3 className="mt-4 text-3xl font-black leading-tight">{needsHelp ? '现在先不要一个人扛' : '如果等下又不舒服，就照这张卡做'}</h3>
          <p className="mt-3 text-xl leading-9 opacity-85">这是一张“现在可以照做”的小卡片，先照顾当下就好。</p>
        </div>
        <button onClick={needsHelp ? onHelp : onNext} className={`min-h-[64px] rounded-2xl px-6 text-xl font-black text-white shadow-lg ${needsHelp ? 'bg-rose-700 shadow-rose-700/15 hover:bg-rose-800' : 'bg-cyan-900 shadow-cyan-900/15 hover:bg-cyan-950'}`}>
          {needsHelp ? '马上找帮助' : summary.next_action.label}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white/82 p-5">
          <p className="flex items-center gap-2 text-xl font-black"><SeniorIcon name="clock" className="h-6 w-6" />先做 3 分钟</p>
          <p className="mt-3 text-xl leading-9">只做一件事：{firstStep}。做完就可以停，不需要继续加任务。</p>
        </div>
        <div className="rounded-3xl bg-white/82 p-5">
          <p className="flex items-center gap-2 text-xl font-black"><SeniorIcon name="leaf" className="h-6 w-6" />身体先放松</p>
          <p className="mt-3 text-xl leading-9">坐稳，喝一口水，把注意力放到呼气上。慢一点比标准更重要。</p>
        </div>
        <div className="rounded-3xl bg-white/82 p-5">
          <p className="flex items-center gap-2 text-xl font-black"><SeniorIcon name="phone" className="h-6 w-6" />如果加重</p>
          <p className="mt-3 text-xl leading-9">如果很难受、很不安全，先联系身边可信任的人或专业帮助。</p>
        </div>
      </div>
    </section>
  );
}
