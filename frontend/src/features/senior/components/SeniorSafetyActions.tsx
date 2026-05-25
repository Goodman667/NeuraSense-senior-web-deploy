import type { SeniorPage } from '../types/senior';
import { SeniorIcon } from './SeniorIcon';

export function SeniorSafetyActions({
  onNavigate,
  onBack,
  onEnd,
  backLabel = '返回上一步',
  endLabel = '结束当前练习',
}: {
  onNavigate: (page: SeniorPage) => void;
  onBack?: () => void;
  onEnd?: () => void;
  backLabel?: string;
  endLabel?: string;
}) {
  const goHome = () => onNavigate('home');
  return (
    <div className="mb-5 grid gap-3 rounded-[2rem] border border-cyan-100 bg-white/90 p-3 shadow-[0_22px_80px_-66px_rgba(15,23,42,0.35)] md:grid-cols-4">
      <button
        onClick={onBack || goHome}
        className="min-h-[58px] rounded-2xl border border-slate-200 bg-white px-4 text-lg font-black text-slate-800 hover:bg-slate-50"
      >
        <span className="inline-flex items-center gap-2"><SeniorIcon name="arrow" className="h-5 w-5 rotate-180" />{backLabel}</span>
      </button>
      <button
        onClick={goHome}
        className="min-h-[58px] rounded-2xl border border-cyan-200 bg-cyan-50 px-4 text-lg font-black text-cyan-900 hover:bg-cyan-100"
      >
        <span className="inline-flex items-center gap-2"><SeniorIcon name="home" className="h-5 w-5" />返回首页</span>
      </button>
      <button
        onClick={onEnd || goHome}
        className="min-h-[58px] rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-lg font-black text-emerald-900 hover:bg-emerald-100"
      >
        <span className="inline-flex items-center gap-2"><SeniorIcon name="check" className="h-5 w-5" />{endLabel}</span>
      </button>
      <button
        onClick={() => onNavigate('help')}
        className="min-h-[58px] rounded-2xl bg-rose-700 px-4 text-lg font-black text-white hover:bg-rose-800"
      >
        <span className="inline-flex items-center gap-2"><SeniorIcon name="phone" className="h-5 w-5" />紧急求助</span>
      </button>
    </div>
  );
}
