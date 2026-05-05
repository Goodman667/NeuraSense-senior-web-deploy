import { SeniorIcon, type SeniorIconName } from './SeniorIcon';

type Tone = 'info' | 'success' | 'warning' | 'danger' | 'loading';

const toneMap: Record<Tone, { cls: string; icon: SeniorIconName }> = {
  info: { cls: 'border-cyan-100 bg-cyan-50 text-cyan-950', icon: 'shield' },
  success: { cls: 'border-emerald-100 bg-emerald-50 text-emerald-950', icon: 'check' },
  warning: { cls: 'border-amber-200 bg-amber-50 text-amber-950', icon: 'warning' },
  danger: { cls: 'border-rose-200 bg-rose-50 text-rose-950', icon: 'warning' },
  loading: { cls: 'border-slate-200 bg-slate-50 text-slate-800', icon: 'reset' },
};

export function SeniorStatusNotice({
  tone = 'info',
  title,
  desc,
  actionLabel,
  onAction,
}: {
  tone?: Tone;
  title: string;
  desc?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const toneConfig = toneMap[tone];
  return (
    <div className={`rounded-[1.75rem] border p-5 ${toneConfig.cls}`} aria-live={tone === 'danger' || tone === 'warning' ? 'assertive' : 'polite'}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80">
            <SeniorIcon name={toneConfig.icon} className={`h-7 w-7 ${tone === 'loading' ? 'motion-safe:animate-spin' : ''}`} />
          </span>
          <div>
            <p className="text-2xl font-black">{title}</p>
            {desc ? <p className="mt-2 text-lg leading-8 opacity-85">{desc}</p> : null}
          </div>
        </div>
        {actionLabel && onAction ? (
          <button onClick={onAction} className="min-h-[54px] shrink-0 rounded-2xl bg-white px-5 text-lg font-black text-slate-900 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200">
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
