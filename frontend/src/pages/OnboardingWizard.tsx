import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import {
  useOnboardingStore,
  type Goal,
  type Practice,
  type ReminderFreq,
} from "../store/useOnboardingStore";
import { useUIModeStore } from "../store/useUIModeStore";
import "./OnboardingWizard.css";

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_151414_1020688d-fcb3-4b2a-9bc2-cd1dae8853dd.mp4";
const STEPS = ["认识你", "你的心愿", "喜欢的方式", "此刻状态", "准备出发"];
const GOALS: { id: Goal; label: string; desc: string }[] = [
  { id: "stress", label: "减轻压力", desc: "给自己松一口气" },
  { id: "sleep", label: "改善睡眠", desc: "让夜晚轻一点" },
  { id: "anxiety", label: "缓解焦虑", desc: "少一点反复担心" },
  { id: "depression", label: "应对低落", desc: "从小小的行动开始" },
  { id: "focus", label: "提升专注", desc: "找回自己的节奏" },
  { id: "emotion", label: "情绪管理", desc: "更清楚地理解自己" },
];
const PRACTICES: { id: Practice; label: string }[] = [
  { id: "breathing", label: "呼吸练习" },
  { id: "meditation", label: "正念冥想" },
  { id: "cbt", label: "CBT 认知训练" },
  { id: "writing", label: "日记 / 写作" },
];
const FREQUENCIES: { id: ReminderFreq; label: string }[] = [
  { id: "none", label: "不提醒" },
  { id: "daily", label: "每天一次" },
  { id: "twice", label: "每天两次" },
  { id: "hourly", label: "每小时" },
];
const BASELINE = [
  { key: "sleep" as const, label: "最近一周的睡眠", low: "很差", high: "很好" },
  { key: "stress" as const, label: "当前的压力", low: "没压力", high: "很大" },
  { key: "mood" as const, label: "此刻的心情", low: "低落", high: "开心" },
  { key: "energy" as const, label: "今天的精力", low: "疲惫", high: "充沛" },
];
const STEP_COPY = [
  {
    title: "先从认识你开始",
    description: "告诉我们你的年龄，为你选择更顺手的初始界面。",
  },
  {
    title: "你想先照顾哪一部分？",
    description: "选择一个或几个心愿，让接下来的陪伴更贴近你。",
  },
  {
    title: "找到你喜欢的方式",
    description: "选择愿意尝试的练习，按自己的节奏慢慢来。",
  },
  {
    title: "此刻的你，感觉怎么样？",
    description: "不用精确，凭感觉就好。每一项都可以轻轻调整。",
  },
  {
    title: "属于你的旅程，准备好了",
    description: "从一件小事开始。之后也可以随时调整这些偏好。",
  },
];

function generateTodayPlan(
  goals: Goal[],
  practices: Practice[],
  stress: number | null,
  mood: number | null,
) {
  let tool = "呼吸放松";
  if (practices.includes("meditation")) tool = "5 分钟正念冥想";
  else if (practices.includes("cbt")) tool = "担忧拆分练习";
  else if (practices.includes("writing")) tool = "情绪记录";
  let task = "今晚提前 20 分钟放下屏幕";
  if ((stress ?? 5) >= 7) task = "找一个安静地方，做 3 分钟慢呼吸";
  else if ((mood ?? 5) <= 3) task = "给自己写下今天已经撑住的一件事";
  else if (goals.includes("focus")) task = "只安排一个 25 分钟专注块";
  return { tool, task };
}

interface OnboardingWizardProps {
  onComplete: () => void;
  onBack: () => void;
}

export default function OnboardingWizard({
  onComplete,
  onBack,
}: OnboardingWizardProps) {
  const {
    step,
    nextStep,
    prevStep,
    setStep,
    profile,
    setAge,
    setGoals,
    setPractices,
    setReminderFreq,
    setReminderTime,
    setBaseline,
    completeOnboarding,
    syncToServer,
  } = useOnboardingStore();
  const { setMode } = useUIModeStore();
  const [motionEnabled, setMotionEnabled] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const menuRef = useRef<HTMLDialogElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const finishingRef = useRef(false);
  const previousStep = useRef(step);
  const validAge =
    profile.age !== null &&
    Number.isInteger(profile.age) &&
    profile.age >= 12 &&
    profile.age <= 100;
  const isSenior = validAge && profile.age! >= 60;
  const canProceed =
    step === 0
      ? validAge
      : step === 1
        ? profile.goals.length > 0
        : step === 2
          ? profile.practices.length > 0 &&
            (profile.reminder_freq === "none" ||
              /^\d{2}:\d{2}$/.test(profile.reminder_time))
          : step === 3
            ? profile.baseline_sleep !== null && profile.baseline_mood !== null
            : true;
  const plan = generateTodayPlan(
    profile.goals,
    profile.practices,
    profile.baseline_stress,
    profile.baseline_mood,
  );

  useEffect(() => {
    const title = document.title;
    document.title = "NeuraSense · 开始你的旅程";
    window.scrollTo({ top: 0, behavior: "instant" });
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionEnabled(!preference.matches);
    preference.addEventListener("change", update);
    return () => {
      document.title = title;
      clearTimeout(closeTimer.current);
      preference.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (step === 3)
      BASELINE.forEach(({ key }) => {
        if (profile[`baseline_${key}`] === null) setBaseline(key, 5);
      });
  }, [step, profile, setBaseline]);

  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    headingRef.current?.focus({ preventScroll: true });
    // On shorter phones, return to the question instead of the large introduction.
    if (window.scrollY > 0)
      headingRef.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
  }, [step]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    const sync = () => {
      if (!motionEnabled || document.hidden) {
        video.pause();
        return;
      }
      video.muted = true;
      void video
        .play()
        .then(() => {
          if (!cancelled) setVideoUnavailable(false);
        })
        .catch((error) => {
          if (!cancelled && error.name !== "AbortError")
            setVideoUnavailable(true);
        });
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      cancelled = true;
      video.pause();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [motionEnabled]);

  useEffect(() => {
    if (!menuOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [menuOpen]);

  const finish = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);
    setFinishError("");
    try {
      const initialMode =
        profile.age !== null && profile.age >= 60 ? "senior" : "standard";
      setMode(initialMode);
      completeOnboarding();
      const token = localStorage.getItem("token");
      if (token)
        await syncToServer(token, {
          ui_mode: initialMode,
          senior_mode_enabled: initialMode === "senior",
          preferred_input: initialMode === "senior" ? "voice" : "mixed",
          tts_enabled: initialMode === "senior",
        });
      window.scrollTo({ top: 0, behavior: "instant" });
      onComplete();
    } catch {
      setFinishError("暂时没有完成，请再试一次。");
    } finally {
      finishingRef.current = false;
      setFinishing(false);
    }
  }, [profile.age, setMode, completeOnboarding, syncToServer, onComplete]);

  const closeMenu = () => {
    setMenuOpen(false);
    closeTimer.current = setTimeout(
      () => {
        menuRef.current?.close();
        menuTrigger.current?.focus();
      },
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 400,
    );
  };
  const chooseStep = (index: number) => {
    if (index > step || finishing) return;
    setStep(index);
    if (menuRef.current?.open) closeMenu();
  };
  const toggleMotion = () => {
    if (videoUnavailable && motionEnabled) {
      const video = videoRef.current;
      video?.load();
      void video
        ?.play()
        .then(() => setVideoUnavailable(false))
        .catch(() => setVideoUnavailable(true));
    } else setMotionEnabled((value) => !value);
  };

  return (
    <main
      className={`ns-onboarding font-geist ${isSenior ? "ns-ob-large" : ""}`}
    >
      <div className="ns-ob-background" aria-hidden="true">
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          poster="/onboarding/cloud-door.webp"
          autoPlay={motionEnabled}
          muted
          loop
          playsInline
          preload={motionEnabled ? "auto" : "none"}
          onError={() => setVideoUnavailable(true)}
        />
      </div>
      <div className="ns-ob-gradient" aria-hidden="true" />
      <header className="ns-ob-header">
        <button
          type="button"
          className="ns-ob-brand"
          onClick={onBack}
          aria-label="NeuraSense 返回首页"
        >
          NeuraSense
        </button>
        <nav className="ns-ob-nav" aria-label="填写步骤">
          {STEPS.map((label, index) => (
            <button
              type="button"
              key={label}
              onClick={() => chooseStep(index)}
              disabled={index > step || finishing}
              aria-current={step === index ? "step" : undefined}
            >
              {label}
            </button>
          ))}
        </nav>
        <button type="button" className="ns-ob-home" onClick={onBack}>
          返回首页 <span aria-hidden="true">↗</span>
        </button>
        <button
          type="button"
          ref={menuTrigger}
          className="ns-ob-menu-button"
          aria-label="打开填写步骤菜单"
          aria-controls="ns-ob-menu"
          aria-expanded={menuOpen}
          onClick={() => {
            clearTimeout(closeTimer.current);
            menuRef.current?.showModal();
            requestAnimationFrame(() => setMenuOpen(true));
          }}
        >
          <Menu size={24} />
        </button>
      </header>

      <div className="ns-ob-content">
        <div className="ns-ob-intro">
          <p className="ns-ob-eyebrow">A LITTLE SPACE, JUST FOR YOU</p>
          <h1>
            从这一刻，
            <br />
            好好照顾自己。
          </h1>
        </div>
        <div className="ns-ob-bottom">
          <form
            className="ns-ob-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (canProceed && !finishing) {
                if (step < 4) nextStep();
                else void finish();
              }
            }}
          >
            <div className="ns-ob-step-top">
              <span>
                0{step + 1}
                <span className="ns-ob-step-total"> / 05</span>
                <span className="ns-ob-step-label">{STEPS[step]}</span>
              </span>
              <div
                className="ns-ob-progress"
                role="progressbar"
                aria-label="填写进度"
                aria-valuemin={1}
                aria-valuemax={5}
                aria-valuenow={step + 1}
              >
                {STEPS.map((label, index) => (
                  <i
                    key={label}
                    className={index <= step ? "is-complete" : ""}
                  />
                ))}
              </div>
            </div>
            <div className="ns-ob-question" key={step}>
              <h2 ref={headingRef} tabIndex={-1}>
                {STEP_COPY[step].title}
              </h2>
              <p className="ns-ob-description">{STEP_COPY[step].description}</p>

              {step === 0 && (
                <div className="ns-ob-age-section">
                  <div className="ns-ob-age-row">
                    <label htmlFor="ns-ob-age">你的年龄</label>
                    <div>
                      <input
                        id="ns-ob-age"
                        type="number"
                        inputMode="numeric"
                        min={12}
                        max={100}
                        step={1}
                        value={profile.age ?? ""}
                        onChange={(event) =>
                          setAge(
                            event.target.value === ""
                              ? null
                              : Number(event.target.value),
                          )
                        }
                        placeholder="例如 25"
                        aria-describedby="ns-ob-age-help"
                        aria-invalid={profile.age !== null && !validAge}
                      />
                      <span>岁</span>
                    </div>
                  </div>
                  <div className="ns-ob-quick-ages" aria-label="快捷年龄">
                    {[18, 25, 35, 50, 65, 75].map((age) => (
                      <button
                        key={age}
                        type="button"
                        aria-pressed={age === profile.age}
                        onClick={() => setAge(age)}
                      >
                        {age} 岁
                      </button>
                    ))}
                  </div>
                  <p id="ns-ob-age-help" className="ns-ob-field-help">
                    {profile.age !== null && !validAge
                      ? "请输入 12 至 100 之间的整数年龄。"
                      : "60 岁及以上默认使用大字、语音引导的陪伴版。"}
                  </p>
                </div>
              )}

              {step === 1 && (
                <fieldset className="ns-ob-choices ns-ob-goals">
                  <legend className="sr-only">
                    你希望获得哪些支持？可多选
                  </legend>
                  {GOALS.map((goal) => (
                    <button
                      type="button"
                      key={goal.id}
                      aria-pressed={profile.goals.includes(goal.id)}
                      onClick={() =>
                        setGoals(
                          profile.goals.includes(goal.id)
                            ? profile.goals.filter((item) => item !== goal.id)
                            : [...profile.goals, goal.id],
                        )
                      }
                    >
                      <span className="ns-ob-choice-title">
                        {goal.label}
                        <span className="ns-ob-check" aria-hidden="true">
                          {profile.goals.includes(goal.id) ? "✓" : "+"}
                        </span>
                      </span>
                      <span className="ns-ob-choice-desc">{goal.desc}</span>
                    </button>
                  ))}
                </fieldset>
              )}

              {step === 2 && (
                <div className="ns-ob-preferences">
                  <fieldset className="ns-ob-choices ns-ob-practices">
                    <legend className="sr-only">练习偏好，可多选</legend>
                    {PRACTICES.map((practice) => (
                      <button
                        type="button"
                        key={practice.id}
                        aria-pressed={profile.practices.includes(practice.id)}
                        onClick={() =>
                          setPractices(
                            profile.practices.includes(practice.id)
                              ? profile.practices.filter(
                                  (item) => item !== practice.id,
                                )
                              : [...profile.practices, practice.id],
                          )
                        }
                      >
                        {practice.label}
                        <span className="ns-ob-check" aria-hidden="true">
                          {profile.practices.includes(practice.id) ? "✓" : "+"}
                        </span>
                      </button>
                    ))}
                  </fieldset>
                  <div className="ns-ob-reminders">
                    <fieldset>
                      <legend>提醒频率</legend>
                      <div className="ns-ob-frequency">
                        {FREQUENCIES.map((option) => (
                          <label key={option.id}>
                            <input
                              type="radio"
                              name="reminder"
                              value={option.id}
                              checked={profile.reminder_freq === option.id}
                              onChange={() => setReminderFreq(option.id)}
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    {profile.reminder_freq !== "none" && (
                      <label className="ns-ob-time">
                        首次提醒时间
                        <input
                          type="time"
                          required
                          value={profile.reminder_time}
                          onChange={(event) =>
                            setReminderTime(event.target.value)
                          }
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="ns-ob-baselines">
                  {BASELINE.map((item) => (
                    <div className="ns-ob-range" key={item.key}>
                      <div>
                        <label htmlFor={`ns-ob-${item.key}`}>
                          {item.label}
                        </label>
                        <output htmlFor={`ns-ob-${item.key}`}>
                          {profile[`baseline_${item.key}`] ?? 5}
                          <small> / 10</small>
                        </output>
                      </div>
                      <input
                        id={`ns-ob-${item.key}`}
                        type="range"
                        min={0}
                        max={10}
                        step={1}
                        value={profile[`baseline_${item.key}`] ?? 5}
                        onChange={(event) =>
                          setBaseline(item.key, Number(event.target.value))
                        }
                        aria-valuetext={`${profile[`baseline_${item.key}`] ?? 5} 分，0 表示${item.low}，10 表示${item.high}`}
                      />
                      <p>
                        <span>{item.low}</span>
                        <span>{item.high}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {step === 4 && (
                <div className="ns-ob-summary">
                  <div className="ns-ob-summary-mode">
                    <p>你的初始界面</p>
                    <h3>{isSenior ? "陪伴版" : "完整功能"}</h3>
                    <p>
                      {isSenior
                        ? "更大的文字、语音引导，一步一步来。"
                        : "聊天、评估、练习与趋势，按需探索。"}
                    </p>
                  </div>
                  <div className="ns-ob-summary-plan">
                    <div>
                      <span>推荐练习</span>
                      <strong>{plan.tool}</strong>
                    </div>
                    <div>
                      <span>今天先做</span>
                      <strong>{plan.task}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {finishError && (
              <p className="ns-ob-field-help" role="alert">
                {finishError}
              </p>
            )}
            <div className="ns-ob-actions">
              <button
                type="submit"
                className="ns-ob-primary"
                disabled={!canProceed || finishing}
              >
                {finishing
                  ? "正在准备…"
                  : step === 4
                    ? "进入 NeuraSense"
                    : "下一步"}
                <span aria-hidden="true">↗</span>
              </button>
              {step > 0 && (
                <button
                  type="button"
                  className="ns-ob-previous"
                  onClick={prevStep}
                  disabled={finishing}
                >
                  上一步
                </button>
              )}
              <span className="ns-ob-action-note">
                {step === 0
                  ? "按你的节奏，慢慢来"
                  : step === 4
                    ? "从一件小事开始"
                    : "你的选择，之后也可以修改"}
              </span>
            </div>
          </form>
          <div className="ns-ob-reassurance">
            <span className="ns-ob-reassurance-mark" aria-hidden="true">
              ✳
            </span>
            <p>
              <strong>
                {validAge
                  ? `为你推荐${isSenior ? "陪伴版" : "完整功能"}`
                  : "每一段旅程，都从你开始。"}
              </strong>
              <span>
                {validAge
                  ? "进入后仍可在设置中切换，找到适合自己的方式。"
                  : "几个简单的选择，让陪伴更懂你。"}
              </span>
            </p>
          </div>
        </div>
      </div>
      <button
        type="button"
        className="ns-ob-motion"
        onClick={toggleMotion}
        aria-pressed={motionEnabled && !videoUnavailable}
      >
        {videoUnavailable
          ? "重试背景视频"
          : motionEnabled
            ? "暂停背景"
            : "播放背景"}
        <span aria-hidden="true">
          {motionEnabled && !videoUnavailable ? "Ⅱ" : "▷"}
        </span>
      </button>

      <dialog
        ref={menuRef}
        id="ns-ob-menu"
        className={`ns-ob-menu ${menuOpen ? "is-open" : ""}`}
        aria-label="填写步骤导航"
        onCancel={(event) => {
          event.preventDefault();
          closeMenu();
        }}
        onClose={() => setMenuOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu();
        }}
      >
        <div className="ns-ob-menu-panel">
          <button
            className="ns-ob-menu-close"
            onClick={closeMenu}
            aria-label="关闭菜单"
          >
            <X size={24} />
          </button>
          <p className="ns-ob-menu-brand">NeuraSense</p>
          <nav aria-label="移动端填写步骤">
            {STEPS.map((label, index) => (
              <button
                key={label}
                disabled={index > step || finishing}
                onClick={() => chooseStep(index)}
                aria-current={index === step ? "step" : undefined}
                style={{
                  transitionDelay: menuOpen ? `${(index + 1) * 60}ms` : "0ms",
                }}
              >
                <span>0{index + 1}</span>
                {label}
              </button>
            ))}
          </nav>
          <button className="ns-ob-menu-home" onClick={onBack}>
            返回首页 <span aria-hidden="true">↗</span>
          </button>
        </div>
      </dialog>
    </main>
  );
}
