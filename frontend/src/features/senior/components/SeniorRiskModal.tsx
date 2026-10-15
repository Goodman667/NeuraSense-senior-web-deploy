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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(19,40,43,0.5)] p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="sn-risk-title">
      <div className="sn sn-sheet max-h-[92vh] w-full max-w-2xl overflow-auto p-6 md:p-8">
        <div className={`rounded-[18px] p-5 ${urgent ? 'bg-[var(--sn-help-soft)] text-[#5E1F18]' : 'bg-[#F7EEDC] text-[#5B4313]'}`}>
          <div className="flex items-start gap-4">
            <SeniorIcon name={urgent ? 'warning' : 'heart'} className="mt-1 h-9 w-9 shrink-0" />
            <div>
              <p className="text-[1.1rem] opacity-80">{urgent ? '现在先保证安全' : '想先提醒您一下'}</p>
              <h2 id="sn-risk-title" className="sn-h1 mt-1 !text-inherit">先别一个人硬扛</h2>
              <p className="mt-3 text-[1.25rem] leading-9">{action.user_message}</p>
            </div>
          </div>
        </div>

        {action.reason ? (
          <div className="mt-5">
            <p className="sn-small">为什么会出现这个提醒</p>
            <p className="mt-1 text-[1.2rem] leading-8">{action.reason}</p>
          </div>
        ) : null}

        {action.steps?.length ? (
          <ol className="mt-5 grid gap-3 md:grid-cols-3">
            {action.steps.slice(0, 3).map((step, index) => (
              <li key={`${step}-${index}`} className="sn-sheet-flat p-4">
                <span className="text-[1rem] text-[var(--sn-ink-3)]">第 {index + 1} 步</span>
                <p className="mt-1 text-[1.2rem] leading-8">{step}</p>
              </li>
            ))}
          </ol>
        ) : null}

        <div className="mt-5 rounded-[16px] bg-[#F4F1EC] p-5">
          <p className="sn-small flex items-center gap-2"><SeniorIcon name="clipboard" className="h-5 w-5" />已经准备好给家人的话</p>
          <p className="mt-2 text-[1.2rem] leading-9">{action.family_message}</p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <button onClick={() => onNavigate('help')} className="sn-btn sn-btn-help">现在联系家人</button>
          <button onClick={() => onNavigate('relax')} className="sn-btn sn-btn-quiet">先坐下休息一分钟</button>
          <button onClick={() => { onClose(); onNavigate('home'); }} className="sn-btn sn-btn-quiet">回到今天</button>
        </div>
        <button onClick={onClose} className="sn-btn sn-btn-quiet sn-btn-block mt-3">我知道了，先留在这一页</button>
      </div>
    </div>
  );
}
