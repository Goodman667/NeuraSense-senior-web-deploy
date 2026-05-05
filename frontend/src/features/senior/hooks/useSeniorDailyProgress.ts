import { useCallback, useEffect, useMemo, useState } from 'react';

export type SeniorProgressKey = 'companion' | 'chat' | 'summary' | 'relax' | 'help';

export interface SeniorDailyProgress {
  userId: string;
  date: string;
  companion: boolean;
  chat: boolean;
  summary: boolean;
  relax: boolean;
  help: boolean;
  updatedAt: string;
}

const EVENT_NAME = 'neurasense-senior-progress';
const STORAGE_PREFIX = 'neurasense-senior-progress:';

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function emptyProgress(userId: string): SeniorDailyProgress {
  return {
    userId,
    date: todayKey(),
    companion: false,
    chat: false,
    summary: false,
    relax: false,
    help: false,
    updatedAt: new Date().toISOString(),
  };
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}:${todayKey()}`;
}

export function readSeniorProgress(userId: string): SeniorDailyProgress {
  if (typeof window === 'undefined') return emptyProgress(userId);
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return emptyProgress(userId);
    const parsed = JSON.parse(raw) as Partial<SeniorDailyProgress>;
    if (parsed.date !== todayKey()) return emptyProgress(userId);
    return { ...emptyProgress(userId), ...parsed, userId, date: todayKey() };
  } catch {
    return emptyProgress(userId);
  }
}

function writeSeniorProgress(progress: SeniorDailyProgress) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(progress.userId), JSON.stringify(progress));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: progress }));
}

export function markSeniorProgress(userId: string, key: SeniorProgressKey) {
  const next = { ...readSeniorProgress(userId), [key]: true, updatedAt: new Date().toISOString() };
  writeSeniorProgress(next);
  return next;
}

export function useSeniorDailyProgress(userId: string) {
  const [progress, setProgress] = useState<SeniorDailyProgress>(() => readSeniorProgress(userId));

  const refresh = useCallback(() => setProgress(readSeniorProgress(userId)), [userId]);

  useEffect(() => {
    refresh();
    const onProgress = () => refresh();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith(`${STORAGE_PREFIX}${userId}:`)) refresh();
    };
    window.addEventListener(EVENT_NAME, onProgress);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, onProgress);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh, userId]);

  const mark = useCallback((key: SeniorProgressKey) => {
    const next = markSeniorProgress(userId, key);
    setProgress(next);
  }, [userId]);

  const doneCount = useMemo(() => {
    return [progress.companion, progress.summary, progress.relax].filter(Boolean).length;
  }, [progress.companion, progress.relax, progress.summary]);

  return { progress, doneCount, mark, refresh };
}
