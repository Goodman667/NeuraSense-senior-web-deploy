import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ArrowRight, ArrowDown, ChevronUp, Info, X } from "lucide-react";
import { useVideoScrub } from "../hooks/useVideoScrub";
import "./LandingPage.css";

// Original footage from the second user-supplied MotionSites reference.
const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260821_114821_a8ca298f-be2c-4613-a4dd-51b69e16bbde.mp4";
const navigation = [
  { label: "NEURASENSE", progress: 0 },
  { label: "了解自己", progress: 0.43 },
  { label: "AI 陪伴", progress: 0.77 },
  { label: "日常练习", progress: 0.9 },
  { label: "开启旅程 ↗", progress: null },
];

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}
function Stagger({
  visible,
  delay = 0,
  children,
  className = "",
}: {
  visible: boolean;
  delay?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`ns-cloud-stagger ${visible ? "is-visible" : ""} ${className}`}
      style={{ "--delay": `${visible ? delay : 0}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

export default function LandingPage({
  onGetStarted,
  onLogin,
}: LandingPageProps) {
  const {
    containerRef,
    videoRef,
    canvasRef,
    progress: p,
    canvasLive,
    mediaError,
    scrollToProgress,
  } = useVideoScrub(VIDEO_SRC);
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuTrigger = useRef<HTMLButtonElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const light = p > 0.55;
  const s1 = p < 0.2 ? 1 : Math.max(0, 1 - (p - 0.2) / 0.08);
  const s2 =
    p < 0.32
      ? 0
      : p < 0.4
        ? (p - 0.32) / 0.08
        : p < 0.55
          ? 1
          : Math.max(0, 1 - (p - 0.55) / 0.08);
  const s3 = p < 0.67 ? 0 : p < 0.75 ? (p - 0.67) / 0.08 : 1;
  const activeNav = p < 0.32 ? 0 : p < 0.67 ? 1 : p < 0.87 ? 2 : 3;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "NeuraSense · 让心境，慢慢开阔";
    document.documentElement.classList.add("ns-cinematic-active");
    return () => {
      document.title = previousTitle;
      document.documentElement.classList.remove("ns-cinematic-active");
      clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  const openMenu = (trigger: HTMLButtonElement) => {
    clearTimeout(closeTimer.current);
    menuTrigger.current = trigger;
    dialogRef.current?.showModal();
    // Give the dialog an initial rendered state before its entrance transition.
    requestAnimationFrame(() => setMenuOpen(true));
  };
  const closeMenu = () => {
    setMenuOpen(false);
    closeTimer.current = setTimeout(
      () => {
        dialogRef.current?.close();
        menuTrigger.current?.focus();
      },
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 400,
    );
  };
  const startJourney = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    onGetStarted();
  };
  const navigate = (target: number | null) => {
    if (dialogRef.current?.open) {
      clearTimeout(closeTimer.current);
      dialogRef.current.close();
      setMenuOpen(false);
      menuTrigger.current?.focus();
    }
    if (target === null) startJourney();
    else scrollToProgress(target);
  };

  return (
    <main
      ref={containerRef}
      className={`ns-cloud-track ${mediaError ? "has-media-error" : ""}`}
    >
      <div className="ns-cloud-stage">
        <video
          ref={videoRef}
          className="ns-cloud-media"
          src={VIDEO_SRC}
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className={`ns-cloud-media ns-cloud-canvas ${canvasLive ? "is-live" : ""}`}
          aria-hidden="true"
        />
        <div className="ns-cloud-overlay">
          <header className={`ns-cloud-header ${light ? "is-light" : ""}`}>
            <button
              className="ns-cloud-hamburger"
              aria-label="打开导航菜单"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-controls="ns-cloud-menu"
              onClick={(event) => openMenu(event.currentTarget)}
            >
              <span />
              <span />
              <span />
            </button>
            <nav className="ns-cloud-nav" aria-label="主导航">
              {navigation.map((item, index) => (
                <button
                  key={item.label}
                  className={index === activeNav ? "is-active" : ""}
                  aria-current={index === activeNav ? "location" : undefined}
                  onClick={() => navigate(item.progress)}
                  style={
                    { "--nav-delay": `${index * 80 + 300}ms` } as CSSProperties
                  }
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="ns-cloud-nav-right">
              <button onClick={onLogin}>
                登录{" "}
                <span className="ns-cloud-info">
                  <Info size={10} />
                </span>
              </button>
              <button
                onClick={(event) => openMenu(event.currentTarget)}
                aria-haspopup="dialog"
                aria-expanded={menuOpen}
                aria-controls="ns-cloud-menu"
              >
                菜单
              </button>
            </div>
            <button className="ns-cloud-mobile-login" onClick={onLogin}>
              登录 <ArrowRight size={14} />
            </button>
          </header>

          <section
            className="ns-cloud-section ns-cloud-first"
            style={{ opacity: s1 }}
            aria-hidden={s1 <= 0.3}
            inert={s1 <= 0.3}
          >
            <div className="ns-cloud-first-copy">
              <Stagger visible={s1 > 0.3}>
                <h1>
                  让心境，
                  <br />
                  慢慢开阔。
                </h1>
              </Stagger>
              <Stagger visible={s1 > 0.3} delay={150}>
                <p className="ns-cloud-subtitle">从了解自己，到被温柔陪伴</p>
              </Stagger>
            </div>
            <Stagger
              visible={s1 > 0.3}
              delay={300}
              className="ns-cloud-first-next"
            >
              <button
                className="ns-cloud-circle"
                onClick={() => scrollToProgress(0.43)}
                aria-label="探索心理健康支持"
              >
                <ArrowRight size={18} />
              </button>
            </Stagger>
          </section>

          <section
            className="ns-cloud-section ns-cloud-second"
            style={{ opacity: s2 }}
            aria-hidden={s2 <= 0.3}
            inert={s2 <= 0.3}
          >
            <Stagger visible={s2 > 0.3}>
              <h2>
                看见每一种情绪，
                <br />
                <span>听懂每一次倾诉，</span>
                <br />
                <span>陪你找到自己的节奏。</span>
              </h2>
            </Stagger>
            <div className="ns-cloud-section-controls">
              <Stagger visible={s2 > 0.3} delay={200}>
                <button
                  className="ns-cloud-circle"
                  onClick={() => scrollToProgress(0.8)}
                  aria-label="继续探索陪伴"
                >
                  <ArrowDown size={18} />
                </button>
              </Stagger>
              <Stagger visible={s2 > 0.3} delay={350}>
                <div className="ns-cloud-dots" aria-label="当前为第二幕">
                  <i />
                  <i className="is-active" />
                  <i />
                </div>
              </Stagger>
              <Stagger visible={s2 > 0.3} delay={500}>
                <button
                  className="ns-cloud-circle ns-cloud-circle-small"
                  onClick={() => scrollToProgress(0)}
                  aria-label="回到第一幕"
                >
                  <ChevronUp size={16} />
                </button>
              </Stagger>
            </div>
          </section>

          <section
            className="ns-cloud-section ns-cloud-third"
            style={{ opacity: s3 }}
            aria-hidden={s3 <= 0.3}
            inert={s3 <= 0.3}
          >
            <div className="ns-cloud-third-copy">
              <Stagger visible={s3 > 0.3}>
                <p className="ns-cloud-eyebrow">NeuraSense | 与你同行</p>
              </Stagger>
              <Stagger visible={s3 > 0.3} delay={150}>
                <h2>
                  让每一个今天，
                  <br />
                  多一点从容。
                </h2>
              </Stagger>
              <Stagger visible={s3 > 0.3} delay={300}>
                <button className="ns-cloud-journey" onClick={startJourney}>
                  <span>开启你的旅程</span>
                  <span className="ns-cloud-journey-arrow">
                    <ArrowRight size={16} />
                  </span>
                </button>
              </Stagger>
            </div>
          </section>
        </div>
        {mediaError && (
          <div className="ns-cloud-error" role="status">
            风景暂时未能加载。
            <button onClick={() => videoRef.current?.load()}>重新加载</button>
          </div>
        )}
      </div>
      <dialog
        ref={dialogRef}
        id="ns-cloud-menu"
        className={`ns-cloud-menu ${menuOpen ? "is-open" : ""}`}
        aria-label="NeuraSense 导航菜单"
        onCancel={(event) => {
          event.preventDefault();
          closeMenu();
        }}
        onClose={() => setMenuOpen(false)}
      >
        <div className="ns-cloud-menu-inner">
          <button
            className="ns-cloud-close"
            onClick={closeMenu}
            aria-label="关闭菜单"
          >
            <X size={18} />
          </button>
          <nav aria-label="完整导航">
            {navigation.map((item, index) => (
              <button
                key={item.label}
                className={index === activeNav ? "is-active" : ""}
                onClick={() => navigate(item.progress)}
                style={{ "--menu-delay": `${index * 60}ms` } as CSSProperties}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="ns-cloud-menu-footer">
            <button
              onClick={() => {
                dialogRef.current?.close();
                setMenuOpen(false);
                onLogin();
              }}
            >
              登录账号
            </button>
            <button onClick={() => navigate(null)}>
              开始使用 <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </dialog>
    </main>
  );
}
