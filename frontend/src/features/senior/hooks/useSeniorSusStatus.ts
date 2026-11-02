import { useEffect, useState } from 'react';
import { fetchMySusStatus } from '../../../components/Assessment/susShared';
import { onStudyEvent } from '../../../lib/studyEvents';

// One lookup per account per page load, shared by the navigation and the home card.
let cache: { token: string; value: Promise<boolean | null> } | null = null;
function lookup(token: string) {
  if (!cache || cache.token !== token) {
    cache = { token, value: fetchMySusStatus(token).then((s) => (s ? s.companion : null)) };
  }
  return cache.value;
}

/**
 * Has this account already filled in the companion-mode questionnaire?
 * null while unknown (not signed in, offline, still loading): callers then show nothing extra.
 */
export function useSeniorSusStatus(): boolean | null {
  const [done, setDone] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    const token = localStorage.getItem('token');
    if (token) lookup(token).then((value) => { if (alive && value !== null) setDone(value); });
    const off = onStudyEvent((name, detail) => {
      if (name === 'sus-submitted' && detail.mode === 'companion') {
        if (token) cache = { token, value: Promise.resolve(true) };
        setDone(true);
      }
    });
    return () => { alive = false; off(); };
  }, []);

  return done;
}
