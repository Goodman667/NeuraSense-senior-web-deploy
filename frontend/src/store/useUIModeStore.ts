import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UIMode = 'standard' | 'senior';

interface UIModeState {
    mode: UIMode;
    setMode: (mode: UIMode) => void;
    toggleMode: () => void;
    hydrateFromProfile: (profileMode?: string | null) => void;
}

export const useUIModeStore = create<UIModeState>()(
    persist(
        (set, get) => ({
            mode: 'standard',
            setMode: (mode) => set({ mode }),
            toggleMode: () => set({ mode: get().mode === 'standard' ? 'senior' : 'standard' }),
            hydrateFromProfile: (profileMode) => {
                if (profileMode === 'senior' || profileMode === 'standard') {
                    set({ mode: profileMode });
                }
            },
        }),
        {
            name: 'psy-ui-mode',
            partialize: (state) => ({ mode: state.mode }),
        },
    ),
);
