/**
 * Checkin Store — 每日签到状态管理
 *
 * 缓存今日签到数据、7天历史、推荐结果
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE } from '../config/api';

export interface CheckinData {
    id?: string;
    mood: number;
    stress: number;
    energy: number;
    sleep_quality: number;
    note?: string;
    created_at?: string;
}

export interface Recommendation {
    id: string;
    reason: string;
}

export interface SubmitCheckinResult {
    ok: boolean;
    mode: 'guest' | 'cloud' | null;
    message: string;
}

interface CheckinState {
    /** 今日是否已签到 */
    hasCheckedIn: boolean;
    /** 今日签到数据 */
    todayCheckin: CheckinData | null;
    /** 近7天历史 */
    history: CheckinData[];
    /** 今日推荐工具 */
    recommendations: Recommendation[];
    /** 加载状态 */
    isLoading: boolean;

    /** 提交签到 */
    submitCheckin: (data: CheckinData) => Promise<SubmitCheckinResult>;
    /** 加载历史 */
    loadHistory: (range?: string) => Promise<void>;
    /** 加载推荐 */
    loadRecommendations: () => Promise<void>;
    /** 重置（登出时） */
    reset: () => void;
}

function getToken(): string | null {
    return localStorage.getItem('token');
}

function toLocalDayKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getRecordDayKey(record?: CheckinData | null) {
    if (!record?.created_at) return null;
    const parsed = new Date(record.created_at);
    if (!Number.isNaN(parsed.getTime())) return toLocalDayKey(parsed);
    return record.created_at.slice(0, 10) || null;
}

function isTodayRecord(record?: CheckinData | null) {
    if (!record) return false;
    return getRecordDayKey(record) === toLocalDayKey(new Date());
}

function normalizeHistory(history: CheckinData[]) {
    const deduped = new Map<string, CheckinData>();
    for (const item of history) {
        const key = item.id || `${item.created_at || ''}-${item.mood}-${item.stress}-${item.energy}-${item.sleep_quality}`;
        deduped.set(key, item);
    }
    return Array.from(deduped.values()).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

function mergeHistory(history: CheckinData[], record: CheckinData) {
    return normalizeHistory([record, ...history]).slice(0, 30);
}

function buildGuestRecommendations(checkin: CheckinData): Recommendation[] {
    const picks: Recommendation[] = [];

    if (checkin.stress >= 7) {
        picks.push({
            id: 'breathing_sighing',
            reason: '今天的压力偏高，先用 2 分钟生理叹气法快速把身体节律降下来。',
        });
    }

    if (checkin.sleep_quality <= 4) {
        picks.push({
            id: 'breathing_478',
            reason: '睡眠状态偏弱，4-7-8 呼吸更适合作为今天的轻量稳定练习。',
        });
    }

    if (checkin.mood <= 4) {
        picks.push({
            id: 'cbt_three_good',
            reason: '心情偏低时，先做一个低门槛的正向回顾，更容易把状态拉回稳定区间。',
        });
    }

    if (checkin.energy <= 4) {
        picks.push({
            id: 'breathing_diaphragm',
            reason: '精力偏低时，先用腹式呼吸把注意力收回来，再决定是否继续更长练习。',
        });
    }

    if (picks.length === 0) {
        picks.push({
            id: 'breathing_box',
            reason: '今天整体状态尚可，建议先做一个短练习，帮助你把节律稳定住。',
        });
    }

    return picks.slice(0, 2);
}

export const useCheckinStore = create<CheckinState>()(
    persist(
        (set, get) => ({
            hasCheckedIn: false,
            todayCheckin: null,
            history: [],
            recommendations: [],
            isLoading: false,

            submitCheckin: async (data) => {
                const token = getToken();
                if (!token) {
                    const guestRecord: CheckinData = {
                        ...data,
                        id: `guest-${Date.now()}`,
                        created_at: new Date().toISOString(),
                    };
                    set((state) => ({
                        hasCheckedIn: true,
                        todayCheckin: guestRecord,
                        history: mergeHistory(state.history, guestRecord),
                        recommendations: buildGuestRecommendations(guestRecord),
                    }));
                    return {
                        ok: true,
                        mode: 'guest',
                        message: '已保存到当前浏览器，登录后可同步到账号。',
                    };
                }

                try {
                    const res = await fetch(`${API_BASE}/checkins?token=${token}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    });

                    if (!res.ok) {
                        let message = '签到保存失败，请稍后重试。';
                        try {
                            const errorJson = await res.json();
                            message = errorJson.detail || errorJson.error || message;
                        } catch {
                            // ignore parse error
                        }
                        return { ok: false, mode: null, message };
                    }

                    const json = await res.json();
                    if (json.success) {
                        const record: CheckinData = json.record;
                        set((state) => ({
                            hasCheckedIn: true,
                            todayCheckin: record,
                            history: mergeHistory(state.history, record),
                        }));
                        // 签到后自动刷新推荐和历史
                        await Promise.allSettled([
                            get().loadRecommendations(),
                            get().loadHistory(),
                        ]);
                        return {
                            ok: true,
                            mode: 'cloud',
                            message: '签到已保存，今日推荐已更新。',
                        };
                    }
                    return {
                        ok: false,
                        mode: null,
                        message: json.error || '签到保存失败，请稍后重试。',
                    };
                } catch {
                    return {
                        ok: false,
                        mode: null,
                        message: '网络连接异常，请稍后重试。',
                    };
                }
            },

            loadHistory: async (range = '7d') => {
                const token = getToken();
                if (!token) {
                    const history = normalizeHistory(get().history);
                    const todayRecord = history.find((item) => isTodayRecord(item))
                        || (isTodayRecord(get().todayCheckin) ? get().todayCheckin : null);

                    set({
                        history,
                        hasCheckedIn: !!todayRecord,
                        todayCheckin: todayRecord || null,
                        recommendations: todayRecord ? buildGuestRecommendations(todayRecord) : [],
                        isLoading: false,
                    });
                    return;
                }

                set({ isLoading: true });
                try {
                    const res = await fetch(`${API_BASE}/checkins?token=${token}&range=${range}`);
                    if (!res.ok) return;
                    const json = await res.json();
                    if (json.success) {
                        const checkins: CheckinData[] = normalizeHistory(json.checkins || []);
                        const currentToday = isTodayRecord(get().todayCheckin) ? get().todayCheckin : null;
                        const todayRecord = checkins.find((c) => isTodayRecord(c)) || currentToday;
                        set({
                            history: checkins,
                            hasCheckedIn: !!todayRecord,
                            todayCheckin: todayRecord || null,
                        });
                    }
                } catch { /* offline ok */ } finally {
                    set({ isLoading: false });
                }
            },

            loadRecommendations: async () => {
                const token = getToken();
                if (!token) {
                    const currentToday = isTodayRecord(get().todayCheckin) ? get().todayCheckin : null;
                    set({
                        recommendations: currentToday ? buildGuestRecommendations(currentToday) : [],
                    });
                    return;
                }

                try {
                    const res = await fetch(`${API_BASE}/recommendations/today?token=${token}`);
                    if (!res.ok) return;
                    const json = await res.json();
                    if (json.success) {
                        set({
                            recommendations: json.recommendations || [],
                            hasCheckedIn: json.has_checkin ?? get().hasCheckedIn,
                            todayCheckin: json.checkin || get().todayCheckin,
                        });
                    }
                } catch { /* offline ok */ }
            },

            reset: () =>
                set({
                    hasCheckedIn: false,
                    todayCheckin: null,
                    history: [],
                    recommendations: [],
                }),
        }),
        {
            name: 'psy-checkin',
            partialize: (state) => ({
                hasCheckedIn: state.hasCheckedIn,
                todayCheckin: state.todayCheckin,
                history: state.history,
                recommendations: state.recommendations,
            }),
        }
    )
);
