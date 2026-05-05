import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_install_dismissed';
const DISMISS_DAYS = 7;

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // 已安装就不显示
        if (window.matchMedia('(display-mode: standalone)').matches) return;
        if ((navigator as any).standalone) return;

        // 检查是否在 dismiss 冷却期
        const dismissed = localStorage.getItem(DISMISS_KEY);
        if (dismissed) {
            const diff = Date.now() - parseInt(dismissed, 10);
            if (diff < DISMISS_DAYS * 86400000) return;
        }

        // iOS 检测
        const ua = navigator.userAgent;
        const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
        if (isiOS) {
            setIsIOS(true);
            setShowBanner(true);
            return;
        }

        // Android / Chrome
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowBanner(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') setShowBanner(false);
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
    };

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-50 animate-fadeIn">
            <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-primary-100 dark:border-gray-700 p-4 flex items-center gap-3">
                {/* 图标 */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </div>

                {/* 文字 */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-warm-800 dark:text-gray-100">
                        安装 NeuraSense
                    </p>
                    <p className="text-xs text-warm-500 dark:text-gray-400">
                        {isIOS
                            ? '点击 Safari 分享按钮，选择「添加到主屏幕」'
                            : '添加到桌面，随时打开，体验更流畅'}
                    </p>
                </div>

                {/* 按钮 */}
                {!isIOS && (
                    <button
                        onClick={handleInstall}
                        className="px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-xl hover:bg-primary-600 transition-colors cursor-pointer active:scale-95 flex-shrink-0"
                    >
                        安装
                    </button>
                )}

                {/* 关闭 */}
                <button
                    onClick={handleDismiss}
                    className="w-8 h-8 flex items-center justify-center text-warm-400 hover:text-warm-600 transition-colors cursor-pointer flex-shrink-0"
                    aria-label="关闭"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
