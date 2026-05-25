import type { SeniorPage, SeniorRiskAction, SeniorRiskLevel } from '../types/senior';
import { SeniorIcon } from './SeniorIcon';

export function SeniorRiskModal({
  action,
  level,
  onNavigate,
  onClose,
}: {
  action: SeniorRiskAction;
  level: SeniorRiskLevel;
  onNavigate: (page: SeniorPage) => void;
  onClose: () => void;
}) {
  const urgent = level === 'urgent' || level === 'medical_emergency';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-[2.4rem] border border-rose-100 bg-white p-6 shadow-[0_40px_140px_-60px_rgba(15,23,42,0.8)] md:p-8">
        <div className={`rounded-[2rem] p-5 ${urgent ? 'bg-rose-50 text-rose-950' : 'bg-amber-50 text-amber-950'}`}>
          <div className="flex items-start gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white">
              <SeniorIcon name={urgent ? 'warning' : 'heart'} className="h-9 w-9" />
            </span>
            <div>
              <p className="text-lg font-black">{urgent ? '现在先保证安全' : '我想先提醒您一下'}</p>
              <h2 className="mt-2 text-3xl font-black leading-tight">先别一个人硬扛</h2>
              <p className="mt-3 text-xl font-bold leading-9">{action.user_message}</p>
            </div>
          </div>
        </div>

        {action.reason ? (
          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-lg font-black text-slate-500">为什么出现这个提醒</p>
            <p className="mt-2 text-xl font-bold leading-9 text-slate-900">{action.reason}</p>
          </div>
        ) : null}

        {action.steps?.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {action.steps.slice(0, 3).map((step, index) => (
              <div key={`${step}-${index}`} className="rounded-3xl border border-cyan-100 bg-cyan-50 p-4 text-cyan-950">
                <p className="text-base font-black text-cyan-700">第 {index + 1} 步</p>
                <p className="mt-2 text-xl font-black leading-8">{step}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <p className="inline-flex items-center gap-2 text-lg font-black"><SeniorIcon name="clipboard" className="h-5 w-5" />已经准备好的家人说明</p>
          <p className="mt-2 text-xl font-bold leading-9">{action.family_message}</p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <button
            onClick={() => onNavigate('help')}
            className="min-h-[72px] rounded-2xl bg-rose-700 px-5 text-xl font-black text-white hover:bg-rose-800"
          >
            现在联系家人
          </button>
          <button
            onClick={() => onNavigate('relax')}
            className="min-h-[72px] rounded-2xl border border-emerald-200 bg-emerald-50 px-5 text-xl font-black text-emerald-900 hover:bg-emerald-100"
          >
            我先坐下休息一分钟
          </button>
          <button
            onClick={() => {
              onClose();
              onNavigate('home');
            }}
            className="min-h-[72px] rounded-2xl border border-slate-200 bg-white px-5 text-xl font-black text-slate-800 hover:bg-slate-50"
          >
            返回首页
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 min-h-[56px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 text-lg font-black text-slate-700"
        >
          我知道了，先留在当前页面
        </button>
      </div>
    </div>
  );
}
