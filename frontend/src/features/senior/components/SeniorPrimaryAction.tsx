import type { ReactNode } from 'react';

export function SeniorPrimaryAction({ title, desc, icon, onClick, tone = 'primary' }: { title: string; desc?: string; icon?: ReactNode; onClick: () => void; tone?: 'primary' | 'light' | 'danger' }) {
  const cls = tone === 'primary'
    ? 'bg-cyan-900 text-white border-cyan-900 hover:bg-cyan-950 shadow-xl shadow-cyan-900/10'
    : tone === 'danger'
      ? 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
      : 'bg-white text-slate-950 border-slate-200 hover:border-cyan-400 hover:bg-cyan-50';
  return (
    <button onClick={onClick} className={`w-full min-h-[104px] rounded-3xl border px-6 py-5 text-left shadow-sm transition focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200 ${cls}`}>
      <span className="flex items-center gap-5">
        {icon ? <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tone === 'primary' ? 'bg-white/16 text-white' : 'bg-slate-50 text-cyan-800'}`}>{icon}</span> : null}
        <span className="min-w-0">
          <span className="block text-2xl font-bold leading-tight">{title}</span>
          {desc ? <span className={`mt-2 block text-lg leading-8 ${tone === 'primary' ? 'text-cyan-50' : 'text-slate-600'}`}>{desc}</span> : null}
        </span>
      </span>
    </button>
  );
}
