/**
 * Commands from the tour to the two app shells (they own the navigation state):
 *  - navigate:        standard version, open a tab / sub-page
 *  - senior-navigate: companion version, open a page
 *  - switch-mode:     move to the other version (used by "继续体验另一个版本")
 */
import type { TourMode } from './tourSteps';

export type TourCommand =
    | { type: 'navigate'; tab: string; sub?: string | null }
    | { type: 'senior-navigate'; page: string }
    | { type: 'switch-mode'; mode: TourMode };

const EVENT = 'neurasense:tour-command';

export function sendTourCommand(cmd: TourCommand) {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: cmd }));
}

export function onTourCommand(handler: (cmd: TourCommand) => void) {
    const listener = (e: Event) => handler((e as CustomEvent).detail as TourCommand);
    window.addEventListener(EVENT, listener);
    return () => window.removeEventListener(EVENT, listener);
}
