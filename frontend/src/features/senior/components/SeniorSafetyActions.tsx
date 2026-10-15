import type { SeniorPage } from '../types/senior';
import { SeniorIcon } from './SeniorIcon';

// Quiet navigation row shown at the top of each guided page.
// The help button lives in the header on every page, so it is not repeated here.
export function SeniorSafetyActions({
  onNavigate,
  onBack,
  onEnd,
  backLabel = '返回上一步',
  endLabel = '结束这一次',
}: {
  onNavigate: (page: SeniorPage) => void;
  onBack?: () => void;
  onEnd?: () => void;
  backLabel?: string;
  endLabel?: string;
}) {
  const goHome = () => onNavigate('home');
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2" aria-label="页面操作">
      <button onClick={onBack || goHome} className="sn-btn sn-btn-quiet">
        <SeniorIcon name="arrow" className="rotate-180" />{backLabel}
      </button>
      <button onClick={goHome} className="sn-btn sn-btn-quiet">
        <SeniorIcon name="home" />回到今天
      </button>
      {onEnd ? (
        <button onClick={onEnd} className="sn-btn sn-btn-quiet">
          <SeniorIcon name="check" />{endLabel}
        </button>
      ) : null}
    </nav>
  );
}
