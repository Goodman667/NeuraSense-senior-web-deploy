export const DAILY_PROGRESS_EVENT = 'neurasense:daily-progress-updated';

export const DAILY_PROGRESS_KEYS = {
    tool: {
        dateKey: 'psy-tool-completions-date',
        valueKey: 'psy-tool-completions-today',
    },
    chat: {
        dateKey: 'psy-chat-completion-date',
        valueKey: 'psy-chat-completed-today',
    },
    assessment: {
        dateKey: 'psy-assessment-completion-date',
        valueKey: 'psy-assessment-completed-today',
    },
} as const;

function getStorage() {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
}

export function getLocalDayKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseNumberLike(raw: string | null) {
    if (!raw) return 0;

    const direct = Number(raw);
    if (Number.isFinite(direct)) return direct;

    try {
        const parsed = JSON.parse(raw);
        const parsedNumber = Number(parsed);
        return Number.isFinite(parsedNumber) ? parsedNumber : 0;
    } catch {
        return 0;
    }
}

function parseFlagLike(raw: string | null) {
    if (!raw) return false;

    const normalized = raw.trim().toLowerCase();
    if (normalized === 'true' || normalized === 'yes' || normalized === 'done') return true;

    const numeric = parseNumberLike(raw);
    return numeric > 0;
}

function emitProgressEvent() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(DAILY_PROGRESS_EVENT));
}

export function readDailyCounter(dateKey: string, valueKey: string) {
    const storage = getStorage();
    if (!storage) return 0;

    const today = getLocalDayKey();
    const savedDate = storage.getItem(dateKey);
    if (savedDate !== today) return 0;

    return Math.max(0, parseNumberLike(storage.getItem(valueKey)));
}

export function incrementDailyCounter(dateKey: string, valueKey: string) {
    const storage = getStorage();
    if (!storage) return;

    const today = getLocalDayKey();
    const savedDate = storage.getItem(dateKey);
    const currentCount = savedDate === today ? readDailyCounter(dateKey, valueKey) : 0;

    storage.setItem(dateKey, today);
    storage.setItem(valueKey, String(currentCount + 1));
    emitProgressEvent();
}

export function readDailyFlag(dateKey: string, valueKey: string) {
    const storage = getStorage();
    if (!storage) return false;

    const today = getLocalDayKey();
    const savedDate = storage.getItem(dateKey);
    if (savedDate !== today) return false;

    return parseFlagLike(storage.getItem(valueKey));
}

export function markDailyFlag(dateKey: string, valueKey: string, value = true) {
    const storage = getStorage();
    if (!storage) return;

    storage.setItem(dateKey, getLocalDayKey());
    storage.setItem(valueKey, value ? '1' : '0');
    emitProgressEvent();
}

export function readToolCompletionCount() {
    return readDailyCounter(
        DAILY_PROGRESS_KEYS.tool.dateKey,
        DAILY_PROGRESS_KEYS.tool.valueKey,
    );
}

export function incrementToolCompletionCount() {
    incrementDailyCounter(
        DAILY_PROGRESS_KEYS.tool.dateKey,
        DAILY_PROGRESS_KEYS.tool.valueKey,
    );
}

export function isDailyTaskCompleted(task: 'chat' | 'assessment') {
    return readDailyFlag(
        DAILY_PROGRESS_KEYS[task].dateKey,
        DAILY_PROGRESS_KEYS[task].valueKey,
    );
}

export function markDailyTaskCompleted(task: 'chat' | 'assessment') {
    markDailyFlag(
        DAILY_PROGRESS_KEYS[task].dateKey,
        DAILY_PROGRESS_KEYS[task].valueKey,
    );
}
