import { useState } from 'react';
import { SeniorIcon } from '../components/SeniorIcon';
import { SeniorPageHeader } from '../components/SeniorPageHeader';
import type { SeniorPage } from '../types/senior';

export function SeniorProfile({
  userId,
  currentUserName,
  onNavigate,
  onSwitchToStandard,
  onLogout,
}: {
  userId: string;
  currentUserName?: string;
  onNavigate: (page: SeniorPage) => void;
  onSwitchToStandard: () => void;
  onLogout: () => void;
}) {
  const displayName = currentUserName || '当前用户';
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  return (
    <div className="mx-auto max-w-5xl">
      <SeniorPageHeader eyebrow="我的" title={`${displayName}，这里管账号`} desc="不用回到完整功能，也能在这里看账号、去设置、退出登录。" />

      <section className="sn-sheet flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-7">
        <div className="flex items-center gap-4">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--sn-teal-soft)] text-[2rem] text-[var(--sn-teal-deep)]">{displayName.slice(0, 1)}</span>
          <div>
            <p className="sn-h2">{displayName}</p>
            <p className="sn-small mt-1 break-all">账号编号：{userId}</p>
          </div>
        </div>
        <button onClick={() => onNavigate('settings')} className="sn-btn sn-btn-primary">去设置联系人</button>
      </section>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="sn-sheet p-6">
          <h2 className="sn-h3 flex items-center gap-2"><SeniorIcon name="settings" className="h-6 w-6 text-[var(--sn-teal)]" />常用设置</h2>
          <p className="sn-body mt-2">调字号、换朗读声音、添加或更换紧急联系人。</p>
          <button onClick={() => onNavigate('settings')} className="sn-btn sn-btn-quiet mt-5">打开设置</button>
        </section>
        <section className="sn-sheet p-6">
          <h2 className="sn-h3 flex items-center gap-2"><SeniorIcon name="logout" className="h-6 w-6 text-[var(--sn-teal)]" />换一种用法</h2>
          <p className="sn-body mt-2">需要更多功能，可以切到完整功能；要换账号，可以退出登录。</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={onSwitchToStandard} className="sn-btn sn-btn-dark">使用完整功能</button>
            <button onClick={() => setConfirmingLogout(true)} className="sn-btn sn-btn-help-quiet">退出当前账号</button>
          </div>
        </section>
        <section className="sn-sheet p-6 md:col-span-2">
          <h2 className="sn-h3 flex items-center gap-2"><SeniorIcon name="check" className="h-6 w-6 text-[var(--sn-teal)]" />使用感受问卷</h2>
          <p className="sn-body mt-2">10 道题，约 3 分钟，说说您用陪伴版的感受，帮助我们把页面改得更好用。</p>
          <button onClick={() => onNavigate('sus')} className="sn-btn sn-btn-quiet mt-5">填写问卷</button>
        </section>
      </div>
      {confirmingLogout ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(19,40,43,0.45)] p-4" role="dialog" aria-modal="true" aria-labelledby="sn-logout-title">
          <div className="sn sn-sheet w-full max-w-xl p-6 md:p-8">
            <p className="sn-kicker !text-[var(--sn-help)]"><SeniorIcon name="logout" className="h-5 w-5" />确认退出</p>
            <h2 id="sn-logout-title" className="sn-h1 mt-2">要退出当前账号吗？</h2>
            <p className="sn-body mt-2">退出后回到欢迎页。下次要重新登录，才能看到这个账号的记录。</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button onClick={onLogout} className="sn-btn sn-btn-help">确认退出</button>
              <button onClick={() => setConfirmingLogout(false)} className="sn-btn sn-btn-quiet">先不退出</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
