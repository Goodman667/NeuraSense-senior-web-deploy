/**
 * Onboarding Store
 *
 * 管理 onboarding wizard 状态 + 用户画像缓存
 * 使用 persist 中间件存到 localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE } from '../config/api';

export type Goal = 'stress' | 'sleep' | 'anxiety' | 'depression' | 'focus' | 'emotion';
export type Practice = 'breathing' | 'meditation' | 'cbt' | 'writing';
export type ReminderFreq = 'none' | 'daily' | 'twice' | 'hourly';

export interface UserProfile {
    onboarding_completed: boolean;
    age: number | null;
    goals: Goal[];
    reminder_freq: ReminderFreq;
    practices: Practice[];
    reminder_time: string;
    baseline_sleep: number | null;
    baseline_stress: number | null;
    baseline_mood: number | null;
    baseline_energy: number | null;
}

interface OnboardingState {
    // 当前 onboarding 状态绑定的用户，避免换账号复用上一个人的本地缓存
    activeUserId: string | null;

    // Wizard 进度
    step: number;               // 0-4 (5 步)
    profile: UserProfile;

    // 是否已完成 onboarding (持久化)
    hasCompletedOnboarding: boolean;

    // Actions
    setStep: (step: number) => void;
    nextStep: () => void;
    prevStep: () => void;

    setGoals: (goals: Goal[]) => void;
    setReminderFreq: (freq: ReminderFreq) => void;
    setPractices: (practices: Practice[]) => void;
    setReminderTime: (time: string) => void;
    setAge: (age: number | null) => void;
    setBaseline: (key: 'sleep' | 'stress' | 'mood' | 'energy', value: number) => void;

    completeOnboarding: () => void;
    resetOnboarding: () => void;
    bindToUser: (userId: string | null) => void;

    // 与后端同步
    syncToServer: (token: string, extra?: Record<string, unknown>) => Promise<void>;
    loadFromServer: (token: string, userId?: string | null) => Promise<void>;
}

const DEFAULT_PROFILE: UserProfile = {
    onboarding_completed: false,
    age: null,
    goals: [],
    reminder_freq: 'daily',
    practices: [],
    reminder_time: '09:00',
    baseline_sleep: null,
    baseline_stress: null,
    baseline_mood: null,
    baseline_energy: null,
};

const createEmptyOnboardingState = (activeUserId: string | null) => ({
    activeUserId,
    step: 0,
    profile: { ...DEFAULT_PROFILE },
    hasCompletedOnboarding: false,
});

export const useOnboardingStore = create<OnboardingState>()(
    persist(
        (set, get) => ({
            ...createEmptyOnboardingState(null),

            setStep: (step) => set({ step }),
            nextStep: () => set((s) => ({ step: Math.min(s.step + 1, 4) })),
            prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 0) })),

            setGoals: (goals) =>
                set((s) => ({ profile: { ...s.profile, goals } })),

            setReminderFreq: (freq) =>
                set((s) => ({ profile: { ...s.profile, reminder_freq: freq } })),

            setPractices: (practices) =>
                set((s) => ({ profile: { ...s.profile, practices } })),

            setReminderTime: (time) =>
                set((s) => ({ profile: { ...s.profile, reminder_time: time } })),

            setAge: (age) =>
                set((s) => ({ profile: { ...s.profile, age } })),

            setBaseline: (key, value) =>
                set((s) => ({
                    profile: { ...s.profile, [`baseline_${key}`]: value },
                })),

            completeOnboarding: () =>
                set((s) => ({
                    step: 0,
                    hasCompletedOnboarding: true,
                    profile: { ...s.profile, onboarding_completed: true },
                })),

            resetOnboarding: () =>
                set((s) => createEmptyOnboardingState(s.activeUserId)),

            bindToUser: (userId) =>
                set((s) => {
                    if (s.activeUserId === userId) return { activeUserId: userId };
                    return createEmptyOnboardingState(userId);
                }),

            syncToServer: async (token: string, extra: Record<string, unknown> = {}) => {
                const { profile } = get();
                const { age, ...serverProfile } = profile;
                void age;
                try {
                    await fetch(`${API_BASE}/profile?token=${token}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...serverProfile, ...extra }),
                    });
                } catch (err) {
                    console.error('Failed to sync profile:', err);
                }
            },

            loadFromServer: async (token: string, userId?: string | null) => {
                const requestedUserId = userId ?? get().activeUserId;
                try {
                    const res = await fetch(`${API_BASE}/profile?token=${token}`);
                    if (!res.ok) return;
                    const data = await res.json();
                    if (requestedUserId !== get().activeUserId) return;
                    if (data.success && data.profile) {
                        const p = data.profile;
                        set({
                            step: !!p.onboarding_completed ? 0 : get().step,
                            hasCompletedOnboarding: !!p.onboarding_completed,
                            profile: {
                                onboarding_completed: !!p.onboarding_completed,
                                age: get().profile.age,
                                goals: p.goals || [],
                                reminder_freq: p.reminder_freq || 'daily',
                                practices: p.practices || [],
                                reminder_time: p.reminder_time || '09:00',
                                baseline_sleep: p.baseline_sleep ?? null,
                                baseline_stress: p.baseline_stress ?? null,
                                baseline_mood: p.baseline_mood ?? null,
                                baseline_energy: p.baseline_energy ?? null,
                            },
                        });
                    }
                } catch (err) {
                    console.error('Failed to load profile:', err);
                }
            },
        }),
        {
            name: 'psy-onboarding',
        }
    )
);
