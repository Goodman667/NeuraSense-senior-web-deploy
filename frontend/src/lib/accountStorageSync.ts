/**
 * When the logged-in account changes (login, logout, switching accounts without reloading),
 * reload every persisted store from the new account's storage, so nothing from the previous
 * account stays in memory. See userScopedStorage.ts.
 */
import { ACCOUNT_CHANGED_EVENT, hasScopedValue } from './userScopedStorage';
import { useCheckinStore } from '../store/useCheckinStore';
import { useGamificationStore } from '../store/useGamificationStore';
import { useProfileStore } from '../store/useProfileStore';
import { useStudyTourStore } from '../features/studyTour/useStudyTourStore';

type PersistedStore = {
    getInitialState?: () => unknown;
    setState: (state: never, replace?: boolean) => void;
    persist: { getOptions: () => { name?: string }; rehydrate: () => Promise<void> | void };
};

// The onboarding store binds itself to the account (bindToUser), and the UI mode follows the
// account's profile, so both are left to App.
const STORES = [useCheckinStore, useGamificationStore, useProfileStore, useStudyTourStore] as unknown as PersistedStore[];

let started = false;
export function startAccountStorageSync() {
    if (started || typeof window === 'undefined') return;
    started = true;
    window.addEventListener(ACCOUNT_CHANGED_EVENT, () => {
        for (const store of STORES) {
            try {
                const name = store.persist.getOptions().name;
                if (name && hasScopedValue(name)) {
                    void store.persist.rehydrate();
                } else if (store.getInitialState) {
                    store.setState(store.getInitialState() as never, true);
                }
            } catch (err) {
                console.warn('[storage] could not reload store for the new account', err);
            }
        }
    });
}
