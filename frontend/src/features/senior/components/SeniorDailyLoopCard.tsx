import { useMemo } from 'react';
import { useSeniorDailyProgress } from '../hooks/useSeniorDailyProgress';
import type { SeniorPage } from '../types/senior';
import { SeniorIcon, type SeniorIconName } from './SeniorIcon';

interface Step {
  id: string;
  title: string;
  desc: string;
  done: boolean;
  route: SeniorPage;
  action: string;
  icon: SeniorIconName;
}

export function SeniorDailyLoopCard({
  userId,
  hasSummary,
  onNavigate,
}: {
  userId: string;
  hasSummary: boolean;
  onNavigate: (page: SeniorPage) => void;
}) {
  const { progress } = useSeniorDailyProgress(userId);
  const steps = useMemo<Step[]>(() => [
    {
      id: 'companion',
      title: hasSummary ? '重新问候一次' : '完成今天的问候',
      desc: hasSummary ? '想再说一遍也可以，每次都会换一种问法。' : '回答几个简单问题，不需要说得完整。',
      done: progress.companion || hasSummary,
      route: 'companion',
      action: hasSummary ? '重新问答' : '开始问候',
      icon: 'heart',
    },
    {
      id: 'summary',
      title: '看懂今天适合做什么',
      desc: progress.summary ? '已经看过今天建议。' : '用生活化语言看今天先做哪一步。',
      done: progress.summary,
      route: hasSummary ? 'summary' : 'companion',
      action: hasSummary ? '查看建议' : '先完成问候',
      icon: 'spark',
    },
    {
      id: 'relax',
      title: '做一个短放松',
      desc: progress.relax ? '今天已经停下来照顾过自己。' : '只做一个 3 分钟练习就够。',
      done: progress.relax,
      route: 'relax',
      action: progress.relax ? '再做一次' : '开始放松',
      icon: 'leaf',
    },
  ], [hasSummary, progress.companion, progress.relax, progress.summary]);

  const doneCount = steps.filter(step => step.done).length;
  const percent = Math.round((doneCount / steps.length) * 100);
  const next = steps.find(step => !step.done) || steps[steps.length - 1];

  return (
    <section className="relative overflow-hidden rounded-[2.3rem] border border-cyan-100 bg-white p-6 shadow-[0_24px_82px_-68px_rgba(15,23,42,0.42)]">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-100/70 blur-3xl" />
      <div className="relative grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="rounded-[2rem] bg-cyan-900 p-6 text-white">
          <div
            className="flex h-32 w-32 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(#67e8f9 ${percent * 3.6}deg, rgba(255,255,255,0.18) 0deg)` }}
            aria-label={`今日完成 ${doneCount} 项，共 ${steps.length} 项`}
          >
            <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-cyan-950">
              <span className="text-4xl font-black">{doneCount}</span>
              <span className="text-base font-bold text-cyan-100">/ {steps.length}</span>
            </div>
          </div>
          <h2 className="mt-5 text-3xl font-black">今天照着这三步走</h2>
          <p className="mt-3 text-lg leading-8 text-cyan-50">不用把所有功能都用一遍。想重新说一遍，也可以从第一步再开始。</p>
          <button onClick={() => onNavigate(next.route)} className="mt-5 min-h-[60px] w-full rounded-2xl bg-white px-5 text-xl font-black text-cyan-950 transition hover:bg-cyan-50">
            下一步：{next.action}
          </button>
        </div>

        <div className="grid gap-3">
          {steps.map(step => (
            <button
              key={step.id}
              onClick={() => onNavigate(step.route)}
              className={`group flex min-h-[96px] items-center gap-4 rounded-[1.75rem] border p-4 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-100 ${
                step.done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-white'
              }`}
            >
              <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${step.done ? 'bg-emerald-700 text-white' : 'bg-white text-cyan-800'}`}>
                <SeniorIcon name={step.done ? 'check' : step.icon} className="h-7 w-7" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-2xl font-black text-slate-950">{step.title}</span>
                <span className="mt-1 block text-lg leading-7 text-slate-600">{step.desc}</span>
              </span>
              <span className="hidden shrink-0 rounded-full bg-white px-4 py-2 text-base font-black text-slate-700 shadow-sm md:inline-flex">
                {step.done ? '已完成' : step.action}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
