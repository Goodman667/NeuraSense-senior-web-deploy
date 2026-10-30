/**
 * Progress of the guided study tour. Saved per account (the key is in userScopedStorage's list),
 * so a refresh or a dropped connection picks up where the participant left off.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TOUR_STEPS, type TourMode } from './tourSteps';

export type TourPhase = 'intro' | 'steps' | 'sus' | 'done';

interface StudyTourState {
    active: boolean;
    mode: TourMode;
    phase: TourPhase;
    stepIndex: number;
    subIndex: number;
    /** step indices finished in the current run */
    completed: number[];
    /** versions whose tour (and SUS) the participant has finished */
    finishedModes: TourMode[];
    /** whether the SUS of the run that just ended was submitted */
    susSubmitted: boolean;
    /** start the tour the next time the main page of either version shows (after sign-up) */
    pendingAutoStart: boolean;

    start: (mode: TourMode, skipIntro?: boolean) => void;
    requestAutoStart: () => void;
    startIfPending: (mode: TourMode) => void;
    begin: () => void;
    setSub: (index: number) => void;
    nextSub: () => void;
    finishSus: (submitted: boolean) => void;
    /** stop showing the tour; progress is kept so it can be resumed */
    close: () => void;
    /** pick up an interrupted run at the start of the step it stopped in */
    resume: () => void;
}

const initial = {
    active: false,
    mode: 'standard' as TourMode,
    phase: 'intro' as TourPhase,
    stepIndex: 0,
    subIndex: 0,
    completed: [] as number[],
    finishedModes: [] as TourMode[],
    susSubmitted: false,
    pendingAutoStart: false,
};

export const useStudyTourStore = create<StudyTourState>()(
    persist(
        (set, get) => ({
            ...initial,

            start: (mode, skipIntro = false) =>
                set({
                    active: true,
                    mode,
                    phase: skipIntro ? 'steps' : 'intro',
                    stepIndex: 0,
                    subIndex: 0,
                    completed: [],
                    susSubmitted: false,
                    pendingAutoStart: false,
                }),

            requestAutoStart: () => set({ pendingAutoStart: true }),

            startIfPending: (mode) => {
                if (get().pendingAutoStart) get().start(mode);
            },

            begin: () => set({ phase: 'steps', stepIndex: 0, subIndex: 0, completed: [] }),

            setSub: (index) => set({ subIndex: Math.max(0, index) }),

            nextSub: () =>
                set((s) => {
                    const steps = TOUR_STEPS[s.mode];
                    const step = steps[s.stepIndex];
                    if (!step) return {};
                    if (s.subIndex + 1 < step.subs.length) return { subIndex: s.subIndex + 1 };
                    const completed = Array.from(new Set([...s.completed, s.stepIndex]));
                    if (s.stepIndex + 1 < steps.length) return { completed, stepIndex: s.stepIndex + 1, subIndex: 0 };
                    return { completed, phase: 'sus' as TourPhase };
                }),

            finishSus: (submitted) =>
                set((s) => ({
                    phase: 'done',
                    susSubmitted: submitted,
                    finishedModes: Array.from(new Set([...s.finishedModes, s.mode])),
                })),

            close: () => set({ active: false, subIndex: 0 }),

            resume: () => {
                const s = get();
                if (s.phase === 'steps' || s.phase === 'sus') set({ active: true, subIndex: 0 });
                else s.start(s.mode);
            },
        }),
        {
            name: 'neurasense-study-tour',
            partialize: (s) => ({
                active: s.active,
                mode: s.mode,
                phase: s.phase,
                stepIndex: s.stepIndex,
                subIndex: s.subIndex,
                completed: s.completed,
                finishedModes: s.finishedModes,
                susSubmitted: s.susSubmitted,
                pendingAutoStart: s.pendingAutoStart,
            }),
        },
    ),
);

/** True while the tour is running in the given version (used to pause pop-ups and carousels). */
export function useTourRunning(mode?: TourMode) {
    return useStudyTourStore((s) => s.active && (!mode || s.mode === mode));
}

/**
 * Companion version: while a task or view step is on screen, page changes from inside the
 * highlighted area (e.g. "go to relax" on a suggestion card) are held back so the participant
 * stays on the step. The help page is always allowed.
 */
export function tourAllowsSeniorPage(page: string): boolean {
    const s = useStudyTourStore.getState();
    if (!s.active || s.mode !== 'companion' || s.phase !== 'steps') return true;
    if (page === 'help') return true;
    const sub = TOUR_STEPS.companion[s.stepIndex]?.subs[s.subIndex];
    if (!sub || sub.kind === 'click') return true;
    const targets = Array.isArray(sub.target) ? sub.target : [sub.target];
    return targets.includes(`page:${page}`);
}
