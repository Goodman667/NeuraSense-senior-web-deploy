/**
 * Per-account browser storage.
 *
 * Much of the app keeps data in localStorage under fixed names (chat sessions, programme
 * progress, check-ins, daily tasks, ...). On a shared device, a second account used to read
 * the first account's data. This module makes those names account-specific without touching
 * the code that uses them: reads and writes of the keys below are redirected to
 * `<key>::u:<user id>` (or `::u:guest` when nobody is logged in).
 *
 * Must be imported before any store is created (first import in main.tsx).
 * Device-level settings (token, user, language, theme, ...) are left as they are.
 */

const SCOPED_KEYS = new Set<string>([
    // AI chat
    'neurasense-chat-sessions-v2',
    // programmes
    'neurasense_program_progress',
    'neurasense_program_assessment_feedback',
    'neurasense_program_return_state',
    'neurasense_program_tool_done',
    // zustand stores
    'psy-checkin',
    'psy-gamification',
    'psy-onboarding',
    'psy-ui-mode',
    'psy-profile',
    // daily task ticks
    'psy-tool-completions-date',
    'psy-tool-completions-today',
    'psy-chat-completion-date',
    'psy-chat-completed-today',
    'psy-assessment-completion-date',
    'psy-assessment-completed-today',
    // other personal records
    'mood_journals',
    'ema_history',
    'crisis_safety_plan',
    'community_likes',
    'psy-senior-assessment-result',
    'has_seen_user_guide',
    // guided study tour
    'neurasense-study-tour',
]);
const SCOPED_PREFIXES = ['mood_'];
const MIGRATION_FLAG = 'neurasense-scoped-storage-v1';
export const ACCOUNT_CHANGED_EVENT = 'neurasense:account-changed';

const isScoped = (key: string) => SCOPED_KEYS.has(key) || SCOPED_PREFIXES.some((p) => key.startsWith(p) && !key.includes('::u:'));

let installed = false;
let rawGet: (key: string) => string | null = () => null;
let rawSet: (key: string, value: string) => void = () => undefined;
let rawRemove: (key: string) => void = () => undefined;
let cachedUserRaw: string | null | undefined;
let cachedUserId = 'guest';

/** Id of the logged-in account, or 'guest'. */
export function currentStorageUser(): string {
    const raw = rawGet('user');
    if (raw === cachedUserRaw) return cachedUserId;
    cachedUserRaw = raw;
    let id = 'guest';
    try {
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && (parsed.id || parsed.user_id)) id = String(parsed.id || parsed.user_id);
    } catch { /* keep guest */ }
    cachedUserId = id;
    return id;
}

const scopedName = (key: string, user = currentStorageUser()) => `${key}::u:${user}`;

function migrateLegacy(ls: Storage) {
    if (rawGet(MIGRATION_FLAG)) return;
    const owner = currentStorageUser();
    const legacy: string[] = [];
    for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (k && !k.includes('::u:') && isScoped(k)) legacy.push(k);
    }
    for (const k of legacy) {
        const value = rawGet(k);
        const target = scopedName(k, owner);
        if (value !== null && rawGet(target) === null) rawSet(target, value);
        rawRemove(k);
    }
    rawSet(MIGRATION_FLAG, '1');
}

export function installUserScopedStorage() {
    if (installed || typeof window === 'undefined') return;
    let ls: Storage;
    try {
        ls = window.localStorage;
        if (!ls) return;
    } catch {
        return;
    }
    installed = true;
    const proto = Storage.prototype;
    const origGet = proto.getItem;
    const origSet = proto.setItem;
    const origRemove = proto.removeItem;
    rawGet = (k) => origGet.call(ls, k);
    rawSet = (k, v) => origSet.call(ls, k, v);
    rawRemove = (k) => origRemove.call(ls, k);

    try {
        migrateLegacy(ls);
    } catch { /* storage may be full or blocked */ }

    let lastUser = currentStorageUser();
    const afterUserWrite = () => {
        const now = currentStorageUser();
        if (now !== lastUser) {
            lastUser = now;
            window.setTimeout(() => window.dispatchEvent(new CustomEvent(ACCOUNT_CHANGED_EVENT, { detail: { user: now } })), 0);
        }
    };

    proto.getItem = function (this: Storage, key: string) {
        return origGet.call(this, this === ls && isScoped(String(key)) ? scopedName(String(key)) : key);
    };
    proto.setItem = function (this: Storage, key: string, value: string) {
        const k = String(key);
        origSet.call(this, this === ls && isScoped(k) ? scopedName(k) : k, value);
        if (this === ls && k === 'user') afterUserWrite();
    };
    proto.removeItem = function (this: Storage, key: string) {
        const k = String(key);
        origRemove.call(this, this === ls && isScoped(k) ? scopedName(k) : k);
        if (this === ls && k === 'user') afterUserWrite();
    };
}

/** Whether the current account has saved data under this (scoped) key. */
export function hasScopedValue(key: string): boolean {
    return rawGet(scopedName(key)) !== null;
}

installUserScopedStorage();
