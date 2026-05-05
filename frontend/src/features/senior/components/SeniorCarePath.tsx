import type { SeniorPage } from '../types/senior';
import { SeniorIcon, type SeniorIconName } from './SeniorIcon';

type StepState = 'done' | 'active' | 'next';

const stateText: Record<StepState, string> = {
  done: '已完成',
  active: '现在做',
  next: '下一步',
};

export function SeniorCarePath({
  hasSummary,
  onNavigate,
}: {
  hasSummary: boolean;
  onNavigate: (page: SeniorPage) => void;
}) {
  const steps: Array<{ title: string; desc: string; icon: SeniorIconName; page: SeniorPage; state: StepState }> = [
    { title: hasSummary ? '再聊一轮' : '聊几句', desc: hasSummary ? '换一组问题重新整理' : '说说睡眠、心情和挂念的事', icon: 'chat', page: 'companion', state: hasSummary ? 'done' : 'active' },
    { title: '看建议', desc: '看今天最适合先做哪一步', icon: 'spark', page: 'summary', state: hasSummary ? 'active' : 'next' },
    { title: '做一步', desc: '只推荐一个放松或求助动作', icon: 'leaf', page: 'relax', state: hasSummary ? 'next' : 'next' },
  ];

  return (
    <section className="rounded-[2rem] border border-cyan-100 bg-white/92 p-5 shadow-[0_22px_70px_-60px_rgba(15,23,42,0.38)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-lg font-black text-cyan-800">今天三步</p>
          <h2 className="mt-1 text-3xl font-black text-slate-950">一步一步来，不用自己找</h2>
        </div>
        <p className="text-lg font-bold text-slate-500">不用自己找功能</p>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {steps.map((step, index) => {
          const active = step.state === 'active';
          const done = step.state === 'done';
          return (
            <button
              key={step.title}
              onClick={() => onNavigate(step.page)}
              className={`group min-h-[138px] rounded-[1.75rem] border p-5 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200 ${
                active ? 'border-cyan-200 bg-cyan-900 text-white shadow-xl shadow-cyan-900/10' : done ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-cyan-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${active ? 'bg-white/16' : done ? 'bg-white text-emerald-700' : 'bg-white text-cyan-800'}`}>
                  <SeniorIcon name={done ? 'check' : step.icon} className="h-7 w-7" />
                </span>
                <span className={`rounded-full px-3 py-1 text-sm font-black ${active ? 'bg-white text-cyan-900' : done ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-slate-500'}`}>
                  {index + 1} · {stateText[step.state]}
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-black">{step.title}</h3>
              <p className={`mt-2 text-lg leading-8 ${active ? 'text-cyan-50' : 'text-slate-600'}`}>{step.desc}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
