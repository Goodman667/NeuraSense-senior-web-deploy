/**
 * Spotlight tour for the usability study.
 *
 * A dark mask covers the page except the one thing the participant should use next (a "hole").
 * Clicks inside the hole reach the page; clicks on the mask do nothing. A floating panel says
 * which step this is (n/6), what to do, and ticks finished steps. In the companion version the
 * instruction is also read aloud. After step 6 the participant fills in the SUS for this version.
 *
 * Anything marked `data-tour-pause` (crisis and risk dialogs) hides the tour while it is open,
 * and anything marked `data-tour-always` (the crisis button) stays clickable.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { onStudyEvent } from '../../lib/studyEvents';
import { isEnglish, translateText } from '../../i18n/autoTranslate';
import { useSeniorTTS } from '../senior/hooks/useSeniorTTS';
import { useSeniorAudioStore } from '../senior/store/useSeniorAudioStore';
import { MODE_LABEL, TOUR_STEPS, type TourMode, type TourSub } from './tourSteps';
import { useStudyTourStore } from './useStudyTourStore';
import { sendTourCommand } from './tourBus';

type Rect = { top: number; left: number; width: number; height: number };
type Layout = { hole: Rect | null; always: Rect[]; paused: boolean; vw: number; vh: number };

const Z_MASK = 9980;
const Z_PANEL = 9990;
const Z_MODAL = 9995;

function targetSelector(spec: string) {
    return spec.startsWith('page:') ? `[data-tour-page="${spec.slice(5)}"]` : `[data-tour="${spec}"]`;
}

function isShown(el: HTMLElement) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const cs = window.getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity || '1') > 0.05;
}

function findTarget(spec: string | string[]): HTMLElement | null {
    for (const s of Array.isArray(spec) ? spec : [spec]) {
        const el = Array.from(document.querySelectorAll<HTMLElement>(targetSelector(s))).find(isShown);
        if (el) return el;
    }
    return null;
}

function isPageTarget(spec: string | string[]) {
    return (Array.isArray(spec) ? spec : [spec]).some((s) => s.startsWith('page:'));
}

/** Visible part of the target, keeping a sticky header / bottom tab bar masked unless the target is in them. */
function holeFor(el: HTMLElement, pageArea: boolean): Rect | null {
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = pageArea ? 0 : 6;
    let top = r.top - pad;
    let left = r.left - pad;
    let right = r.right + pad;
    let bottom = r.bottom + pad;
    for (const header of Array.from(document.querySelectorAll<HTMLElement>('[data-tour-shell-header]'))) {
        if (header.contains(el)) continue;
        const h = header.getBoundingClientRect();
        if (h.height > 0 && h.top <= 1 && h.bottom > top) top = Math.max(top, h.bottom);
    }
    for (const bar of Array.from(document.querySelectorAll<HTMLElement>('[data-tour-tabbar]'))) {
        if (bar.contains(el) || !isShown(bar)) continue;
        const b = bar.getBoundingClientRect();
        if (b.top < bottom && b.bottom >= vh - 1) bottom = Math.min(bottom, b.top);
    }
    top = Math.max(0, top);
    left = Math.max(0, left);
    right = Math.min(vw, right);
    bottom = Math.min(vh, bottom);
    if (bottom - top < 4 || right - left < 4) return null;
    return { top, left, width: right - left, height: bottom - top };
}

function roundedRect({ left: x, top: y, width: w, height: h }: Rect, radius: number) {
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));
    return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

const sameRect = (a: Rect | null, b: Rect | null) =>
    a === b || (!!a && !!b && Math.abs(a.top - b.top) < 1 && Math.abs(a.left - b.left) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1);

function intersects(a: Rect, b: Rect, margin = 12) {
    return a.left < b.left + b.width + margin && a.left + a.width + margin > b.left && a.top < b.top + b.height + margin && a.top + a.height + margin > b.top;
}

/** The largest strip of `a` that lies outside `b` (null when `a` is inside `b`). */
function outside(a: Rect, b: Rect): Rect | null {
    const aRight = a.left + a.width;
    const aBottom = a.top + a.height;
    const bRight = b.left + b.width;
    const bBottom = b.top + b.height;
    const strips: Rect[] = [
        { left: a.left, top: a.top, width: a.width, height: Math.min(aBottom, b.top) - a.top },
        { left: a.left, top: Math.max(a.top, bBottom), width: a.width, height: aBottom - Math.max(a.top, bBottom) },
        { left: a.left, top: a.top, width: Math.min(aRight, b.left) - a.left, height: a.height },
        { left: Math.max(a.left, bRight), top: a.top, width: aRight - Math.max(a.left, bRight), height: a.height },
    ].filter((r) => r.width >= 8 && r.height >= 8);
    if (!strips.length) return null;
    return strips.sort((x, y) => y.width * y.height - x.width * x.height)[0];
}

function CheckIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            <path d="m5 13 4 4L19 7" />
        </svg>
    );
}

export function StudyTourOverlay({ uiMode }: { uiMode: TourMode }) {
    const tour = useStudyTourStore();
    const { speak } = useSeniorTTS();
    const running = tour.active && tour.mode === uiMode;
    const steps = TOUR_STEPS[tour.mode];
    const step = steps[tour.stepIndex];
    const sub: TourSub | undefined = step?.subs[tour.subIndex];
    const companion = tour.mode === 'companion';

    const [layout, setLayout] = useState<Layout>({ hole: null, always: [], paused: false, vw: window.innerWidth, vh: window.innerHeight });
    const [collapsed, setCollapsed] = useState(false);
    const [nudge, setNudge] = useState(0);
    const [slowTarget, setSlowTarget] = useState(false);
    const missingSince = useRef<number | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const [panelSize, setPanelSize] = useState({ w: 380, h: 220 });

    // What the current state highlights.
    const alreadyDone = sub?.kind === 'task' && sub.alreadyDone?.when() ? sub.alreadyDone : null;
    const target: string | string[] | null = !running
        ? null
        : tour.phase === 'steps' && sub
            ? sub.target
            : tour.phase === 'sus'
                ? (companion ? 'page:sus' : 'page:scale')
                : null;
    const blockHole = tour.phase === 'steps' && sub?.kind === 'view' && !sub.interactive;
    const instruction = tour.phase === 'steps' && sub
        ? (alreadyDone ? alreadyDone.text : sub.text)
        : tour.phase === 'sus'
            ? (companion
                ? '最后一步：填一份 10 道题的使用感受问卷，大约 3 分钟。先看说明，同意的话勾选方框，再点继续。'
                : '最后一步：填一份 10 道题的使用感受问卷（SUS），约 3 分钟。先看说明，勾选同意后开始作答。')
            : '';

    // Read aloud after whatever is playing now (e.g. the AI's spoken reply) has finished.
    const speakWhenQuiet = useCallback((text: string) => {
        const busy = () => {
            const a = useSeniorAudioStore.getState();
            return a.isPlaying || a.isLoading;
        };
        if (!busy()) {
            speak(text, { voice: 'xiaoyi', emotion: 'friendly' });
            return () => {};
        }
        let finished = false;
        let later = 0;
        const unsubscribe = useSeniorAudioStore.subscribe(() => {
            if (finished || busy()) return;
            finished = true;
            unsubscribe();
            later = window.setTimeout(() => speak(text, { voice: 'xiaoyi', emotion: 'friendly' }), 500);
        });
        const cap = window.setTimeout(() => { finished = true; unsubscribe(); }, 90000);
        return () => {
            finished = true;
            unsubscribe();
            window.clearTimeout(cap);
            window.clearTimeout(later);
        };
    }, [speak]);

    // Read the instruction aloud in the companion version.
    const spoken = useRef('');
    useEffect(() => {
        if (!running || !companion) return;
        let text = '';
        if (tour.phase === 'intro') text = '欢迎体验陪伴版。接下来我带您把主要功能用一遍，一共 6 步。每一步页面上会有一处亮起来，您点那里就好。最后还有一份 10 道题的小问卷。准备好了，请点“开始”。';
        else if (tour.phase === 'steps' && step) {
            text = isEnglish()
                ? `Step ${tour.stepIndex + 1}. ${translateText(step.label)}. ${translateText(instruction)}`
                : `第 ${tour.stepIndex + 1} 步，${step.label}。${instruction}`;
        }
        else if (tour.phase === 'sus') text = instruction;
        else if (tour.phase === 'done') text = tour.susSubmitted ? '陪伴版体验完成了，谢谢您！' : '引导结束了，谢谢您！';
        if (!text || spoken.current === text) return;
        let stopWaiting: () => void = () => {};
        const timer = window.setTimeout(() => {
            spoken.current = text;
            stopWaiting = speakWhenQuiet(text);
        }, 450);
        return () => {
            window.clearTimeout(timer);
            stopWaiting();
        };
    }, [running, companion, tour.phase, tour.stepIndex, tour.subIndex, instruction, step, speakWhenQuiet, tour.susSubmitted]);

    // Bring the target into view when a sub-step starts.
    const scrolledFor = useRef('');
    useEffect(() => {
        setSlowTarget(false);
        missingSince.current = null;
        setCollapsed(false);
    }, [tour.phase, tour.stepIndex, tour.subIndex]);

    // Go back to the last button that is on screen (the participant left the page, or it never loaded).
    const rewind = useCallback(() => {
        const s = useStudyTourStore.getState();
        const st = TOUR_STEPS[s.mode][s.stepIndex];
        if (!st || s.phase !== 'steps') return;
        for (let j = s.subIndex - 1; j >= 0; j -= 1) {
            const candidate = st.subs[j];
            if (candidate.kind === 'click' && findTarget(candidate.target)) {
                s.setSub(j);
                return;
            }
        }
        if (s.subIndex !== 0) s.setSub(0);
    }, []);

    // Track the target's position.
    useEffect(() => {
        if (!running || !target) {
            setLayout((prev) => (prev.hole || prev.always.length ? { ...prev, hole: null, always: [] } : prev));
            return;
        }
        const pageArea = isPageTarget(target);
        const key = `${tour.phase}-${tour.stepIndex}-${tour.subIndex}`;
        const grace = tour.phase === 'steps' && sub?.kind === 'click' ? 6000 : 1500;
        const tick = () => {
            const paused = !!document.querySelector('[data-tour-pause]');
            const el = findTarget(target);
            const now = Date.now();
            let hole: Rect | null = null;
            if (el) {
                missingSince.current = null;
                if (scrolledFor.current !== key) {
                    scrolledFor.current = key;
                    const r = el.getBoundingClientRect();
                    const fully = r.top >= 70 && r.bottom <= window.innerHeight - 70;
                    if (!pageArea && !fully) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    if (pageArea && (r.top > window.innerHeight * 0.6 || r.bottom < 120)) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
                }
                hole = holeFor(el, pageArea);
                setSlowTarget(false);
            } else {
                if (missingSince.current === null) missingSince.current = now;
                const missingFor = now - missingSince.current;
                if (missingFor > 2500) setSlowTarget(true);
                if (tour.phase === 'steps' && missingFor > grace && !paused) {
                    missingSince.current = null;
                    rewind();
                }
            }
            // Always-clickable spots (the crisis / help button). Where one overlaps the main hole only
            // the part outside it is cut out, because overlapping holes cancel each other in the mask.
            const always: Rect[] = [];
            for (const a of Array.from(document.querySelectorAll<HTMLElement>('[data-tour-always]')).filter(isShown)) {
                const r = holeFor(a, false);
                if (!r) continue;
                const rest = hole && intersects(r, hole, 0) ? outside(r, hole) : r;
                if (rest) always.push(rest);
            }
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            setLayout((prev) => {
                if (prev.paused === paused && prev.vw === vw && prev.vh === vh && sameRect(prev.hole, hole) && prev.always.length === always.length && prev.always.every((r, i) => sameRect(r, always[i]))) return prev;
                return { hole, always, paused, vw, vh };
            });
        };
        tick();
        const timer = window.setInterval(tick, 120);
        window.addEventListener('scroll', tick, true);
        window.addEventListener('resize', tick);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener('scroll', tick, true);
            window.removeEventListener('resize', tick);
        };
    }, [running, target, tour.phase, tour.stepIndex, tour.subIndex, sub, rewind]);

    // Click sub-steps: move on when the highlighted button is clicked.
    useEffect(() => {
        if (!running || tour.phase !== 'steps' || sub?.kind !== 'click') return;
        const handler = (e: MouseEvent) => {
            const el = findTarget(sub.target);
            if (el && e.target instanceof Node && el.contains(e.target)) {
                window.setTimeout(() => useStudyTourStore.getState().nextSub(), 30);
            }
        };
        document.addEventListener('click', handler, true);
        return () => document.removeEventListener('click', handler, true);
    }, [running, tour.phase, sub]);

    // Task sub-steps and the SUS: move on when the page reports the event.
    useEffect(() => {
        if (!running) return;
        return onStudyEvent((name) => {
            const s = useStudyTourStore.getState();
            if (!s.active) return;
            if (s.phase === 'sus' && name === 'sus-submitted') {
                s.finishSus(true);
                return;
            }
            const cur = TOUR_STEPS[s.mode][s.stepIndex]?.subs[s.subIndex];
            if (s.phase === 'steps' && cur?.kind === 'task' && cur.event === name) s.nextSub();
        });
    }, [running]);

    // Open the questionnaire when the six steps are done.
    useEffect(() => {
        if (!running || tour.phase !== 'sus') return;
        const timer = window.setTimeout(() => {
            if (companion) sendTourCommand({ type: 'senior-navigate', page: 'sus' });
            else sendTourCommand({ type: 'navigate', tab: 'today', sub: 'scale' });
        }, 300);
        return () => window.clearTimeout(timer);
    }, [running, tour.phase, companion]);

    useEffect(() => {
        if (!panelRef.current) return;
        const r = panelRef.current.getBoundingClientRect();
        if (Math.abs(r.width - panelSize.w) > 2 || Math.abs(r.height - panelSize.h) > 2) setPanelSize({ w: r.width, h: r.height });
    });

    const panelStyle = useMemo(() => {
        const { vw, vh, hole, always } = layout;
        const h = panelSize.h;
        const preferTop = tour.phase === 'sus' || (sub && sub.kind !== 'click' && sub.panel === 'top');
        // Never cover the always-clickable help buttons.
        const clear = (r: Rect) => always.every((o) => !intersects(r, o, 8));
        if (vw < 640) {
            const holeLow = hole ? hole.top + hole.height / 2 > vh * 0.5 : false;
            if (preferTop || holeLow) {
                const below = always.filter((o) => o.top < h + 16).reduce((m, o) => Math.max(m, o.top + o.height + 8), 8);
                return { left: 8, right: 8, top: below };
            }
            const above = always.filter((o) => o.top + o.height > vh - h - 16).reduce((m, o) => Math.max(m, vh - o.top + 8), 8);
            return { left: 8, right: 8, bottom: `calc(${above}px + env(safe-area-inset-bottom, 0px))` };
        }
        const w = Math.min(400, vw - 32);
        const spots: Array<{ style: Record<string, number>; rect: Rect }> = [
            { style: { right: 20, bottom: 20 }, rect: { left: vw - 20 - w, top: vh - 20 - h, width: w, height: h } },
            { style: { left: 20, bottom: 20 }, rect: { left: 20, top: vh - 20 - h, width: w, height: h } },
            { style: { right: 20, top: 12 }, rect: { left: vw - 20 - w, top: 12, width: w, height: h } },
            { style: { left: 20, top: 12 }, rect: { left: 20, top: 12, width: w, height: h } },
        ];
        if (preferTop) {
            const top = [spots[2], spots[3]].find((s) => clear(s.rect)) || spots[3];
            return { width: w, ...top.style };
        }
        const free = spots.find((s) => clear(s.rect) && (!hole || !intersects(s.rect, hole)));
        return { width: w, ...(free || spots.find((s) => clear(s.rect)) || spots[2]).style };
    }, [layout, panelSize.h, sub, tour.phase]);

    if (!running) return null;

    const exit = () => {
        if (window.confirm('确定要退出体验引导吗？之后可以在首页重新开始。')) tour.close();
    };

    const bigText = companion;
    const otherMode: TourMode = tour.mode === 'standard' ? 'companion' : 'standard';

    // ---------- Intro and end screens ----------
    if (tour.phase === 'intro' || tour.phase === 'done') {
        const done = tour.phase === 'done';
        const canContinue = done && !tour.finishedModes.includes(otherMode);
        return createPortal(
            <div className="fixed inset-0 flex items-center justify-center bg-slate-950/60 p-4" style={{ zIndex: Z_MODAL }} role="dialog" aria-modal="true" aria-label="体验引导" data-study-tour="modal">
                <div className={`w-full max-w-lg rounded-[28px] bg-white p-7 text-left shadow-2xl ${bigText ? 'text-[1.15rem]' : ''}`}>
                    {done ? (
                        <>
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white"><CheckIcon className="h-7 w-7" /></span>
                            <h2 className={`mt-5 font-semibold text-slate-950 ${bigText ? 'text-[2rem]' : 'text-2xl'}`}>{MODE_LABEL[tour.mode]}体验完成</h2>
                            <p className="mt-3 leading-relaxed text-slate-600">
                                {tour.susSubmitted ? '谢谢！6 个步骤都走完了，问卷也已经提交。' : '6 个步骤都走完了，引导到这里结束。谢谢！'}
                            </p>
                            {canContinue ? (
                                <p className="mt-2 leading-relaxed text-slate-600">
                                    {`如果还有时间，可以接着体验${MODE_LABEL[otherMode]}，同样是 6 步加一份问卷。不体验也完全没关系。`}
                                </p>
                            ) : null}
                            <div className="mt-7 flex flex-wrap gap-3">
                                {canContinue ? (
                                    <button
                                        onClick={() => {
                                            tour.close();
                                            useStudyTourStore.getState().requestAutoStart();
                                            sendTourCommand({ type: 'switch-mode', mode: otherMode });
                                        }}
                                        className={`rounded-full bg-slate-950 font-semibold text-white transition hover:bg-slate-800 ${bigText ? 'px-7 py-4 text-[1.2rem]' : 'px-6 py-3 text-sm'}`}
                                    >
                                        {`继续体验${MODE_LABEL[otherMode]}`}
                                    </button>
                                ) : null}
                                <button
                                    onClick={() => {
                                        tour.close();
                                        if (companion) sendTourCommand({ type: 'senior-navigate', page: 'home' });
                                        else sendTourCommand({ type: 'navigate', tab: 'today', sub: null });
                                    }}
                                    className={`rounded-full border border-slate-300 font-semibold text-slate-800 transition hover:border-slate-500 ${bigText ? 'px-7 py-4 text-[1.2rem]' : 'px-6 py-3 text-sm'}`}
                                >
                                    回到首页
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className={`font-semibold text-sky-700 ${bigText ? 'text-[1.1rem]' : 'text-sm'}`}>{`体验引导 · ${MODE_LABEL[tour.mode]}`}</p>
                            <h2 className={`mt-2 font-semibold text-slate-950 ${bigText ? 'text-[2rem] leading-tight' : 'text-2xl'}`}>跟着 6 步，把主要功能用一遍</h2>
                            <p className="mt-3 leading-relaxed text-slate-600">
                                {companion
                                    ? '接下来我带您把陪伴版的主要功能都用一遍：问候、看建议、聊天、放松、小测和找帮助。每一步，页面上会有一处亮起来，您点那里就好。旁边的小窗会告诉您现在做什么，也会读给您听。最后请您填一份 10 道题的小问卷，说说用起来的感受。'
                                    : '接下来带你把标准版的主要功能都用一遍：签到、心理自评、AI 陪伴、放松练习、课程和个人中心。每一步页面上会有一处亮起来，按小窗里的提示操作就行，完成一步打一个勾。最后有一份 10 道题的使用感受问卷。'}
                            </p>
                            <ol className="mt-5 grid grid-cols-2 gap-2">
                                {steps.map((s, i) => (
                                    <li key={s.key} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-slate-700">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">{i + 1}</span>
                                        <span className={bigText ? 'text-[1.05rem]' : 'text-sm'}>{s.label}</span>
                                    </li>
                                ))}
                            </ol>
                            <p className={`mt-4 text-slate-500 ${bigText ? 'text-[1rem]' : 'text-xs'}`}>大约需要 20–30 分钟。中途可以随时停下，下次登录会接着上次的进度。</p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <button
                                    onClick={() => tour.begin()}
                                    className={`rounded-full bg-slate-950 font-semibold text-white transition hover:bg-slate-800 ${bigText ? 'px-8 py-4 text-[1.25rem]' : 'px-7 py-3 text-sm'}`}
                                    data-study-tour="begin"
                                >
                                    开始
                                </button>
                                <button
                                    onClick={() => tour.close()}
                                    className={`rounded-full border border-slate-300 font-semibold text-slate-700 transition hover:border-slate-500 ${bigText ? 'px-7 py-4 text-[1.2rem]' : 'px-6 py-3 text-sm'}`}
                                >
                                    以后再说
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>,
            document.body,
        );
    }

    // ---------- Running: mask, highlight ring, panel ----------
    const { hole, always, paused, vw, vh } = layout;
    const susLeft = tour.phase === 'sus' && !hole && slowTarget;
    const showMask = !paused && !susLeft;
    const radius = hole && hole.width > vw * 0.6 ? 18 : 14;
    // Only small targets pulse; animating a page-sized shadow costs too much on tablets.
    const pulse = tour.phase === 'steps' && sub?.kind === 'click';
    const maskPath = `M0 0H${vw}V${vh}H0Z${hole ? roundedRect(hole, radius) : ''}${always.map((r) => roundedRect(r, 14)).join('')}`;
    const stepNo = tour.stepIndex + 1;

    const primaryAction = tour.phase === 'steps' && sub
        ? (sub.kind === 'view'
            ? { label: sub.button || '下一步', run: () => tour.nextSub() }
            : alreadyDone
                ? { label: '下一步', run: () => tour.nextSub() }
                : null)
        : null;

    return createPortal(
        <>
            {showMask ? (
                <svg
                    className="fixed inset-0"
                    width={vw}
                    height={vh}
                    style={{ zIndex: Z_MASK, pointerEvents: 'none' }}
                    aria-hidden="true"
                    data-study-tour="mask"
                >
                    <path d={maskPath} fillRule="evenodd" fill="rgba(15, 23, 42, 0.62)" style={{ pointerEvents: 'auto' }} onClick={() => setNudge(Date.now())} />
                </svg>
            ) : null}
            {showMask && hole ? (
                <div
                    key={nudge}
                    className={`${pulse ? 'study-tour-ring' : 'study-tour-ring-static'} pointer-events-none fixed`}
                    style={{ zIndex: Z_MASK + 1, top: hole.top, left: hole.left, width: hole.width, height: hole.height, borderRadius: radius }}
                    aria-hidden="true"
                />
            ) : null}
            {showMask && hole && blockHole ? (
                <div className="fixed" style={{ zIndex: Z_MASK + 2, top: hole.top, left: hole.left, width: hole.width, height: hole.height }} onClick={() => setNudge(Date.now())} aria-hidden="true" />
            ) : null}

            {paused ? null : (
                <div
                    ref={panelRef}
                    className={`fixed rounded-[22px] border border-slate-200 bg-white text-left shadow-[0_24px_80px_-24px_rgba(15,23,42,0.55)] ${bigText ? 'text-[1.1rem]' : 'text-sm'}`}
                    style={{ zIndex: Z_PANEL, ...panelStyle }}
                    role="dialog"
                    aria-label="体验引导"
                    data-study-tour="panel"
                >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
                        <span className={`min-w-0 font-semibold leading-snug text-slate-900 ${bigText ? 'text-[1rem]' : 'text-[13px]'}`}>
                            {tour.phase === 'sus' ? '最后一步 · 问卷' : `体验引导 · 第 ${stepNo} / ${steps.length} 步`}
                        </span>
                        <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
                            <button onClick={() => setCollapsed((c) => !c)} className="rounded-full px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                                {collapsed ? '展开' : '收起'}
                            </button>
                            <button onClick={exit} className="rounded-full px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700">退出引导</button>
                        </span>
                    </div>
                    {collapsed ? null : (
                        <div className="px-4 pb-4 pt-3">
                            {tour.phase === 'steps' && step ? (
                                <p className={`font-semibold text-sky-700 ${bigText ? 'text-[1.15rem]' : 'text-[15px]'}`}>{step.label}</p>
                            ) : null}
                            <p className={`mt-1 leading-relaxed text-slate-800 ${bigText ? 'text-[1.2rem] leading-8' : 'text-[15px]'}`} data-study-tour="instruction">
                                {susLeft ? '问卷页面已经关上了。想填写的话点下面的按钮；不填也可以直接结束。' : instruction}
                            </p>
                            {slowTarget && tour.phase === 'steps' ? (
                                <p className="mt-2 text-xs text-slate-400">页面加载中…</p>
                            ) : null}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                {primaryAction ? (
                                    <button
                                        onClick={primaryAction.run}
                                        className={`rounded-full bg-slate-950 font-semibold text-white transition hover:bg-slate-800 ${bigText ? 'px-6 py-3 text-[1.1rem]' : 'px-5 py-2 text-sm'}`}
                                        data-study-tour="next"
                                    >
                                        {primaryAction.label}
                                    </button>
                                ) : null}
                                {susLeft ? (
                                    <button
                                        onClick={() => {
                                            setSlowTarget(false);
                                            if (companion) sendTourCommand({ type: 'senior-navigate', page: 'sus' });
                                            else sendTourCommand({ type: 'navigate', tab: 'today', sub: 'scale' });
                                        }}
                                        className={`rounded-full bg-slate-950 font-semibold text-white ${bigText ? 'px-6 py-3 text-[1.1rem]' : 'px-5 py-2 text-sm'}`}
                                    >
                                        去填写问卷
                                    </button>
                                ) : null}
                                {tour.phase === 'sus' ? (
                                    <button onClick={() => tour.finishSus(false)} className="rounded-full px-3 py-2 text-xs text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline">
                                        不填问卷，结束引导
                                    </button>
                                ) : null}
                                {companion ? (
                                    <button onClick={() => speak(instruction, { voice: 'xiaoyi', emotion: 'friendly' })} className="rounded-full border border-slate-200 px-4 py-2 text-[1rem] text-slate-700 hover:border-slate-400">
                                        再听一遍
                                    </button>
                                ) : null}
                            </div>
                            <ol className="mt-4 grid grid-cols-6 gap-1.5" aria-label="步骤进度">
                                {steps.map((s, i) => {
                                    const done = tour.completed.includes(i) || tour.phase === 'sus';
                                    const current = tour.phase === 'steps' && i === tour.stepIndex;
                                    return (
                                        <li key={s.key} className="flex flex-col items-center gap-1" title={s.label}>
                                            <span
                                                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                                                    done ? 'bg-emerald-500 text-white' : current ? 'bg-sky-600 text-white ring-4 ring-sky-100' : 'bg-slate-100 text-slate-500'
                                                }`}
                                            >
                                                {done ? <CheckIcon /> : i + 1}
                                            </span>
                                            <span className={`w-full truncate text-center ${bigText ? 'text-[0.8rem]' : 'text-[10px]'} ${current ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</span>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    )}
                </div>
            )}
            {paused ? (
                <div className="pointer-events-none fixed left-1/2 top-3 -translate-x-1/2 rounded-full bg-slate-900/80 px-4 py-1.5 text-xs text-white" style={{ zIndex: Z_PANEL }}>
                    引导已暂停，关闭弹窗后继续
                </div>
            ) : null}
        </>,
        document.body,
    );
}
