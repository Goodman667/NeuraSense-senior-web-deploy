/**
 * Profile & Settings Store
 *
 * 管理用户画像数据、统计信息和本地设置 (dark mode / language)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE } from '../config/api';

// ---- 类型 ----

export interface UserProfile {
    user_id: string;
    onboarding_completed: boolean;
    goals: string[];
    reminder_freq: string;  // 'none' | 'daily' | 'twice' | 'hourly'
    practices: string[];
    reminder_time: string;  // 'HH:MM'
    baseline_sleep: number | null;
    baseline_stress: number | null;
    baseline_mood: number | null;
    baseline_energy: number | null;
    ui_mode?: 'standard' | 'senior';
    preferred_input?: 'voice' | 'text' | 'mixed';
    tts_enabled?: boolean;
    high_contrast?: boolean;
    font_scale?: number;
    senior_mode_enabled?: boolean;
}

export interface UserStats {
    checkin_total: number;
    tool_completions_total: number;
    tool_completions_7d: number;
    assessments_total: number;
    exercises_total: number;
}

interface ProfileState {
    // 画像数据
    profile: UserProfile | null;
    stats: UserStats | null;
    isLoading: boolean;

    // 本地设置
    darkMode: boolean;
    language: 'zh' | 'en';

    // Actions
    loadProfile: (token: string) => Promise<void>;
    loadStats: (token: string) => Promise<void>;
    updateProfile: (token: string, data: Partial<UserProfile>) => Promise<void>;
    setDarkMode: (dark: boolean) => void;
    setLanguage: (lang: 'zh' | 'en') => void;
    reset: () => void;
}

export const useProfileStore = create<ProfileState>()(
    persist(
        (set) => ({
            profile: null,
            stats: null,
            isLoading: false,
            darkMode: false,
            language: 'zh',

            loadProfile: async (token: string) => {
                try {
                    const res = await fetch(`${API_BASE}/profile?token=${token}`);
                    if (res.ok) {
                        const json = await res.json();
                        if (json.success) set({ profile: json.profile });
                    }
                } catch {
                    // 静默失败，保留上次缓存
                }
            },

            loadStats: async (token: string) => {
                set({ isLoading: true });
                try {
                    const res = await fetch(`${API_BASE}/profile/stats?token=${token}`);
                    if (res.ok) {
                        const json = await res.json();
                        if (json.success) set({ stats: json.stats });
                    }
                } catch {
                    // 静默失败
                }
                set({ isLoading: false });
            },

            updateProfile: async (token: string, data: Partial<UserProfile>) => {
                try {
                    const res = await fetch(`${API_BASE}/profile?token=${token}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    });
                    if (res.ok) {
                        const json = await res.json();
                        if (json.success) set({ profile: json.profile });
                    }
                } catch {
                    // 静默失败
                }
            },

            setDarkMode: (dark: boolean) => {
                set({ darkMode: dark });
                if (dark) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
                localStorage.setItem('darkMode', String(dark));
            },

            setLanguage: (lang: 'zh' | 'en') => {
                set({ language: lang });
                localStorage.setItem('language', lang);
            },

            reset: () => {
                set({ profile: null, stats: null, isLoading: false });
            },
        }),
        {
            name: 'psy-profile',
            partialize: (state) => ({
                darkMode: state.darkMode,
                language: state.language,
                profile: state.profile,
                stats: state.stats,
            }),
        }
    )
);
