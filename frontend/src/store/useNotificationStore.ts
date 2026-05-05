/**
 * Notification Store
 *
 * 管理站内通知列表、未读数、轮询刷新
 */

import { create } from 'zustand';
import { API_BASE } from '../config/api';

export interface Notification {
    id: string;
    user_id: string;
    type: string;       // system | jitai | achievement | community | reminder | tool | program
    title: string;
    content: string;
    read: boolean;
    meta: Record<string, unknown>;
    created_at: string;
}

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;

    loadNotifications: (token: string, unreadOnly?: boolean) => Promise<void>;
    loadUnreadCount: (token: string) => Promise<void>;
    markRead: (token: string, id: string) => Promise<void>;
    markAllRead: (token: string) => Promise<void>;
    reset: () => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,

    loadNotifications: async (token: string, unreadOnly = false) => {
        set({ isLoading: true });
        try {
            const url = `${API_BASE}/notifications?token=${token}&unread_only=${unreadOnly}&limit=50`;
            const res = await fetch(url);
            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    set({ notifications: json.notifications });
                }
            }
        } catch {
            // 静默
        }
        set({ isLoading: false });
    },

    loadUnreadCount: async (token: string) => {
        try {
            const res = await fetch(`${API_BASE}/notifications/unread-count?token=${token}`);
            if (res.ok) {
                const json = await res.json();
                if (json.success) {
                    set({ unreadCount: json.count });
                }
            }
        } catch {
            // 静默
        }
    },

    markRead: async (token: string, id: string) => {
        try {
            await fetch(`${API_BASE}/notifications/${id}/read?token=${token}`, { method: 'POST' });
            // 本地更新
            const { notifications, unreadCount } = get();
            set({
                notifications: notifications.map(n => n.id === id ? { ...n, read: true } : n),
                unreadCount: Math.max(0, unreadCount - 1),
            });
        } catch {
            // 静默
        }
    },

    markAllRead: async (token: string) => {
        try {
            await fetch(`${API_BASE}/notifications/read-all?token=${token}`, { method: 'POST' });
            const { notifications } = get();
            set({
                notifications: notifications.map(n => ({ ...n, read: true })),
                unreadCount: 0,
            });
        } catch {
            // 静默
        }
    },

    reset: () => {
        set({ notifications: [], unreadCount: 0, isLoading: false });
    },
}));
