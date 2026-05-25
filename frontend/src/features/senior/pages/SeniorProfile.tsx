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
      <SeniorPageHeader eyebrow="个人中心" title={`${displayName}，这里可以管理账号`} desc="不用回到完整功能，也可以在陪伴版里查看账号、进入设置或退出登录。" />

      <section className="rounded-[2.4rem] border border-cyan-100 bg-white p-7 shadow-[0_30px_100px_-70px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-cyan-50 text-cyan-900">
              <SeniorIcon name="user" className="h-10 w-10" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-950">{displayName}</p>
              <p className="mt-2 text-lg leading-8 text-slate-500">账号 ID：{userId}</p>
            </div>
          </div>
          <button onClick={() => onNavigate('settings')} className="min-h-[64px] rounded-2xl bg-cyan-900 px-6 text-xl font-black text-white">
            去设置联系人
          </button>
        </div>
      </section>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="rounded-[2.2rem] border border-cyan-100 bg-cyan-50 p-6 text-cyan-950">
          <p className="flex items-center gap-2 text-2xl font-black"><SeniorIcon name="settings" className="h-7 w-7" />常用设置</p>
          <p className="mt-3 text-xl leading-9">可以调整字号、朗读声音，也可以添加或更换紧急联系人。</p>
          <button onClick={() => onNavigate('settings')} className="mt-5 min-h-[60px] rounded-2xl bg-white px-6 text-lg font-black text-cyan-900">打开设置</button>
        </section>
        <section className="rounded-[2.2rem] border border-slate-200 bg-white p-6 text-slate-950">
          <p className="flex items-center gap-2 text-2xl font-black"><SeniorIcon name="logout" className="h-7 w-7" />切换使用方式</p>
          <p className="mt-3 text-xl leading-9">如果需要更多功能，可以切到完整功能；如果要换账号，可以直接退出登录。</p>
          <div className="mt-5 grid gap-3">
            <button onClick={onSwitchToStandard} className="min-h-[60px] rounded-2xl bg-slate-950 px-6 text-lg font-black text-white">使用完整功能</button>
            <button onClick={() => setConfirmingLogout(true)} className="min-h-[60px] rounded-2xl border border-rose-200 bg-rose-50 px-6 text-lg font-black text-rose-800">退出当前账号</button>
          </div>
        </section>
      </div>
      {confirmingLogout ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-xl rounded-[2.2rem] border border-rose-100 bg-white p-6 shadow-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-lg font-black text-rose-800">
              <SeniorIcon name="logout" className="h-5 w-5" />
              确认退出
            </p>
            <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950">要退出当前账号吗？</h2>
            <p className="mt-3 text-xl leading-9 text-slate-600">退出后会回到欢迎页面。下次需要重新登录，才能看到这个账号的数据。</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button onClick={onLogout} className="min-h-[64px] rounded-2xl bg-rose-700 px-6 text-xl font-black text-white">确认退出</button>
              <button onClick={() => setConfirmingLogout(false)} className="min-h-[64px] rounded-2xl border border-slate-200 bg-white px-6 text-xl font-black text-slate-700">先不退出</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
