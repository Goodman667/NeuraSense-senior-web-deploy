/**
 * Small event bus for "the participant finished something": the guided study tour listens to
 * these to tick its steps. Pages only announce what happened; they do not know about the tour.
 */
export type StudyEventName =
    | 'checkin-done'
    | 'assessment-done'
    | 'chat-replied'
    | 'tool-done'
    | 'program-day-done'
    | 'senior-greeting-done'
    | 'senior-chat-replied'
    | 'senior-relax-done'
    | 'senior-checkup-done'
    | 'sus-submitted';

export const STUDY_EVENT = 'neurasense:study-event';

export function emitStudyEvent(name: StudyEventName, detail: Record<string, unknown> = {}) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(STUDY_EVENT, { detail: { name, ...detail } }));
}

export function onStudyEvent(handler: (name: StudyEventName, detail: Record<string, unknown>) => void) {
    const listener = (e: Event) => {
        const d = (e as CustomEvent).detail || {};
        handler(d.name as StudyEventName, d);
    };
    window.addEventListener(STUDY_EVENT, listener);
    return () => window.removeEventListener(STUDY_EVENT, listener);
}
