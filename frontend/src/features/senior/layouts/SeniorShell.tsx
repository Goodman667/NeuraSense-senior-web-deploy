import { useEffect, useState, type ReactNode } from 'react';
import type { SeniorPage } from '../types/senior';
import { SeniorPlaybackBar } from '../components/SeniorPlaybackBar';
import { SeniorIcon, type SeniorIconName } from '../components/SeniorIcon';

const FONT_SCALE_STORAGE = 'neurasense-senior-font-scale';

const navItems: Array<{ page: SeniorPage; label: string; icon: SeniorIconName }> = [
  { page: 'home', label: '今天', icon: 'home' },
  { page: 'chat', label: '聊聊', icon: 'chat' },
  { page: 'relax', label: '放松', icon: 'leaf' },
  { page: 'checkup', label: '小测', icon: 'clipboard' },
  { page: 'help', label: '帮助', icon: 'help' },
  { page: 'settings', label: '设置', icon: 'settings' },
  { page: 'profile', label: '我的', icon: 'user' },
];

const fontScalePx: Record<string, string> = {
  large: '18px',
  larger: '20px',
  largest: '22px',
};

// Heritage Grove brand mark: an upright oval with a small sprig.
function BrandMark({ className = 'h-10 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 120" fill="none" stroke="currentColor" strokeWidth="3" className={className} aria-hidden="true">
      <ellipse cx="48" cy="60" rx="45" ry="57" />
      <path d="M48 88V46" strokeLinecap="round" />
      <path d="M48 58c-8-2-14-8-16-16 9 0 15 5 16 16Zm0 0c8-2 14-8 16-16-9 0-15 5-16 16Z" />
      <path d="M48 74c-9-2-15-8-17-17 10 0 16 6 17 17Zm0 0c9-2 15-8 17-17-10 0-16 6-17 17Z" />
      <path d="M48 46c-6-3-9-9-8-16 6 3 9 9 8 16Zm0 0c6-3 9-9 8-16-6 3-9 9-8 16Z" />
    </svg>
  );
}

export function SeniorShell({
  page,
  onNavigate,
  onSwitchToStandard,
  currentUserName,
  contactRequired = false,
  onBack,
  onLogout,
  children,
}: {
  page: SeniorPage;
  onNavigate: (page: SeniorPage) => void;
  onSwitchToStandard: () => void;
  currentUserName?: string;
  contactRequired?: boolean;
  /** Back to the previous page; shown above the content on every page except home. */
  onBack?: () => void;
  /** Log out; shown in the header with a confirmation. */
  onLogout?: () => void;
  children: ReactNode;
}) {
  const [fontScale, setFontScale] = useState(() => localStorage.getItem(FONT_SCALE_STORAGE) || 'large');
  const [navNotice, setNavNotice] = useState('');
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

  const go = (target: SeniorPage) => {
    const locked = contactRequired && target !== 'settings' && target !== 'help' && target !== 'profile';
    if (locked) {
      setNavNotice('先添加一位能联系到的人，填完马上就能用。');
      return;
    }
    setNavNotice('');
    onNavigate(target);
  };

  return (
    <div className="sn senior-ui min-h-screen">
      <a href="#senior-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-[#13282B] focus:px-5 focus:py-3 focus:text-white">跳到主要内容</a>

      <header className="sticky top-0 z-30 border-b border-[var(--sn-line)] bg-[rgba(241,235,228,0.92)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-3 lg:px-8">
          <button onClick={() => go('home')} className="flex items-center gap-3 text-[var(--sn-teal-deep)]" aria-label="回到今天">
            <BrandMark className="h-11 w-9" />
            <span className="text-left">
              <span className="block text-[1.5rem] leading-none">NeuraSense</span>
              <span className="mt-1 block text-base text-[var(--sn-ink-3)]">陪伴版 · {currentUserName ? `${currentUserName}，` : ''}{date}</span>
            </span>
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => onNavigate('help')} className="sn-btn sn-btn-help">
              <SeniorIcon name="phone" />需要帮助
            </button>
            <button onClick={onSwitchToStandard} className="sn-btn sn-btn-outline">完整功能</button>
            {onLogout ? (
              <button
                onClick={() => { if (window.confirm('确定要退出登录吗？')) onLogout(); }}
                className="sn-btn sn-btn-outline"
              >
                退出登录
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8 lg:px-8">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <nav className="grid grid-cols-4 gap-1.5 sm:grid-cols-7 lg:grid-cols-1" aria-label="陪伴版导航">
            {navItems.map((item) => {
              const locked = contactRequired && item.page !== 'settings' && item.page !== 'help' && item.page !== 'profile';
              return (
                <button
                  key={item.page}
                  onClick={() => go(item.page)}
                  aria-current={item.page === page ? 'page' : undefined}
                  data-locked={locked ? 'true' : undefined}
                  className="sn-nav-item max-lg:flex-col max-lg:justify-center max-lg:gap-1 max-lg:py-2 max-lg:text-base"
                >
                  <SeniorIcon name={item.icon} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          {navNotice ? (
            <p className="mt-3 rounded-2xl border border-[#E5CFA2] bg-[#F7EEDC] px-4 py-3 text-lg leading-8 text-[#5B4313]" role="status">{navNotice}</p>
          ) : null}
          <div className="mt-5 hidden lg:block"><SeniorPlaybackBar /></div>
        </aside>

        <main id="senior-main" className="min-w-0 pb-10" tabIndex={-1}>
          <div className="mb-5 lg:hidden"><SeniorPlaybackBar /></div>
          {onBack && page !== 'home' ? (
            <button onClick={onBack} className="sn-btn sn-btn-outline mb-5" aria-label="返回上一页">
              <SeniorIcon name="arrow" className="h-6 w-6 rotate-180" />返回上一页
            </button>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
