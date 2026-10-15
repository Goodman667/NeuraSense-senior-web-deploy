import { SeniorIcon, type SeniorIconName } from './SeniorIcon';

type Tone = 'info' | 'success' | 'warning' | 'danger' | 'loading';

const toneIcon: Record<Tone, SeniorIconName> = {
  info: 'shield',
  success: 'check',
  warning: 'warning',
  danger: 'warning',
  loading: 'reset',
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
  return (
    <div className={`sn-notice tone-${tone === 'loading' ? 'info' : tone} flex-col sm:flex-row sm:items-center sm:justify-between`} aria-live={tone === 'danger' || tone === 'warning' ? 'assertive' : 'polite'}>
      <div className="flex items-start gap-3">
        <SeniorIcon name={toneIcon[tone]} className={`mt-1 h-7 w-7 shrink-0 ${tone === 'loading' ? 'motion-safe:animate-spin' : ''}`} />
        <div>
          <p className="text-[1.35rem] leading-snug">{title}</p>
          {desc ? <p className="mt-1 text-[1.1rem] leading-8 opacity-90">{desc}</p> : null}
        </div>
      </div>
      {actionLabel && onAction ? (
        <button onClick={onAction} className="sn-btn sn-btn-quiet shrink-0">{actionLabel}</button>
      ) : null}
    </div>
  );
}
