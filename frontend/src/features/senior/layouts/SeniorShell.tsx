import { useEffect, useState, type ReactNode } from 'react';
import type { SeniorPage } from '../types/senior';
import { SeniorPlaybackBar } from '../components/SeniorPlaybackBar';
import { SeniorIcon, type SeniorIconName } from '../components/SeniorIcon';

const FONT_SCALE_STORAGE = 'neurasense-senior-font-scale';

const navItems: Array<{ page: SeniorPage; label: string; desc: string; icon: SeniorIconName }> = [
  { page: 'home', label: '今天', desc: '先从这里开始', icon: 'home' },
  { page: 'chat', label: '聊聊', desc: '陪您说说话', icon: 'chat' },
  { page: 'relax', label: '放松', desc: '做一个短练习', icon: 'leaf' },
  { page: 'help', label: '帮助', desc: '找得到的人', icon: 'help' },
  { page: 'settings', label: '设置', desc: '字号与联系人', icon: 'settings' },
];

const fontScalePx: Record<string, string> = {
  large: '16px',
  larger: '17.5px',
  largest: '19px',
};

export function SeniorShell({
  page,
  onNavigate,
  onSwitchToStandard,
  currentUserName,
  children,
}: {
  page: SeniorPage;
  onNavigate: (page: SeniorPage) => void;
  onSwitchToStandard: () => void;
  currentUserName?: string;
  children: ReactNode;
}) {
  const [fontScale, setFontScale] = useState(() => localStorage.getItem(FONT_SCALE_STORAGE) || 'large');
  const date = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });

  useEffect(() => {
    const previous = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = fontScalePx[fontScale] || fontScalePx.large;
    const sync = () => setFontScale(localStorage.getItem(FONT_SCALE_STORAGE) || 'large');
    window.addEventListener('neurasense-senior-font-scale', sync);
    window.addEventListener('storage', sync);
    return () => {
      document.documentElement.style.fontSize = previous;
      window.removeEventListener('neurasense-senior-font-scale', sync);
      window.removeEventListener('storage', sync);
    };
  }, [fontScale]);

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#fffdf6_0%,#eefcfc_55%,#f4fff7_100%)] text-slate-950 senior-ui">
      <a href="#senior-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-2xl focus:bg-slate-950 focus:px-5 focus:py-3 focus:text-white">跳到主要内容</a>
      <header className="sticky top-0 z-30 border-b border-cyan-100 bg-white/88 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black tracking-[0.18em] text-cyan-800">陪伴版</p>
            <h1 className="mt-1 text-3xl font-black leading-tight text-slate-950">{currentUserName ? `${currentUserName}，` : ''}今天我们慢慢来</h1>
            <p className="mt-1 text-lg text-slate-600">{date} · 每次只做一件事</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => onNavigate('help')} className="min-h-[52px] rounded-2xl bg-rose-50 px-5 text-lg font-black text-rose-800 ring-1 ring-rose-200">需要帮助</button>
            <button onClick={onSwitchToStandard} className="min-h-[52px] rounded-2xl bg-slate-950 px-5 text-lg font-black text-white">使用完整功能</button>
          </div>
        </div>
        <div className="mx-auto mt-4 grid max-w-7xl gap-2 md:grid-cols-3">
          {[
            { icon: 'check' as SeniorIconName, text: '一屏一件事，不让您自己找功能' },
            { icon: 'volume' as SeniorIconName, text: '朗读可以暂停、重听或停止' },
            { icon: 'shield' as SeniorIconName, text: '只给生活建议，需要时找真人帮助' },
          ].map((item) => (
            <div key={item.text} className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-cyan-100 bg-cyan-50/70 px-4 text-base font-bold text-cyan-950">
              <SeniorIcon name={item.icon} className="h-5 w-5 shrink-0" />
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <nav className="grid gap-3 rounded-[2rem] border border-cyan-100 bg-white/92 p-3 shadow-[0_28px_80px_-64px_rgba(15,23,42,0.4)]" aria-label="陪伴版导航">
            {navItems.map((item) => {
              const active = item.page === page;
              return (
                <button
                  key={item.page}
                  onClick={() => onNavigate(item.page)}
                  className={`rounded-3xl px-5 py-4 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200 ${active ? 'bg-cyan-800 text-white' : 'bg-white text-slate-800 hover:bg-cyan-50'}`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${active ? 'bg-white/15 text-white' : 'bg-slate-50 text-cyan-800'}`}>
                      <SeniorIcon name={item.icon} className="h-6 w-6" />
                    </span>
                    <span>
                      <span className="block text-2xl font-black">{item.label}</span>
                      <span className={`mt-1 block text-base ${active ? 'text-cyan-50' : 'text-slate-500'}`}>{item.desc}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
          <div className="mt-4 hidden lg:block"><SeniorPlaybackBar /></div>
        </aside>
        <main id="senior-main" className="min-w-0" tabIndex={-1}>
          <div className="mb-5 lg:hidden"><SeniorPlaybackBar /></div>
          {children}
        </main>
      </div>
    </div>
  );
}
