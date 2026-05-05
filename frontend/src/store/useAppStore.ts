/**
 * Zustand Store - Application State Management
 * 
 * Centralized state management for the PsyAntigravity platform.
 */

import { create } from 'zustand';
import type { Assessment, DigitizerPoint, Stroke } from '../types/assessment';

/**
 * User state interface
 */
interface UserState {
    id: string | null;
    name: string | null;
    role: 'patient' | 'clinician' | null;
    isAuthenticated: boolean;
}

/**
 * Drawing state for Clock Drawing Test
 */
interface DrawingState {
    strokes: Stroke[];
    currentStroke: DigitizerPoint[];
    isDrawing: boolean;
}

/**
 * Application state interface
 */
interface AppState {
    // User state
    user: UserState;

    // Assessment state
    currentAssessment: Assessment | null;
    assessmentHistory: Assessment[];

    // Drawing state (for Clock Drawing Test)
    drawing: DrawingState;

    // UI state
    isLoading: boolean;
    error: string | null;

    // Actions
    setUser: (user: Partial<UserState>) => void;
    clearUser: () => void;

    setCurrentAssessment: (assessment: Assessment | null) => void;
    addAssessmentToHistory: (assessment: Assessment) => void;

    startDrawing: () => void;
    addPoint: (point: DigitizerPoint) => void;
    endStroke: (strokeId: string, color: string, width: number) => void;
    clearDrawing: () => void;

    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
}

/**
 * Main application store
 */
export const useAppStore = create<AppState>((set) => ({
    // Initial user state
    user: {
        id: null,
        name: null,
        role: null,
        isAuthenticated: false,
    },

    // Initial assessment state
    currentAssessment: null,
    assessmentHistory: [],

    // Initial drawing state
    drawing: {
        strokes: [],
        currentStroke: [],
        isDrawing: false,
    },

    // Initial UI state
    isLoading: false,
    error: null,

    // User actions
    setUser: (userData) =>
        set((state) => ({
            user: { ...state.user, ...userData, isAuthenticated: true },
        })),

    clearUser: () =>
        set({
            user: {
                id: null,
                name: null,
                role: null,
                isAuthenticated: false,
            },
        }),

    // Assessment actions
    setCurrentAssessment: (assessment) =>
        set({ currentAssessment: assessment }),

    addAssessmentToHistory: (assessment) =>
        set((state) => ({
            assessmentHistory: [...state.assessmentHistory, assessment],
        })),

    // Drawing actions for Clock Drawing Test
    startDrawing: () =>
        set((state) => ({
            drawing: { ...state.drawing, isDrawing: true, currentStroke: [] },
        })),

    addPoint: (point) =>
        set((state) => ({
            drawing: {
                ...state.drawing,
                currentStroke: [...state.drawing.currentStroke, point],
            },
        })),

    endStroke: (strokeId, color, width) =>
        set((state) => {
            if (state.drawing.currentStroke.length === 0) {
                return { drawing: { ...state.drawing, isDrawing: false } };
            }

            const newStroke: Stroke = {
                id: strokeId,
                points: state.drawing.currentStroke,
                color,
                width,
            };

            return {
                drawing: {
                    strokes: [...state.drawing.strokes, newStroke],
                    currentStroke: [],
                    isDrawing: false,
                },
            };
        }),

    clearDrawing: () =>
        set({
            drawing: {
                strokes: [],
                currentStroke: [],
                isDrawing: false,
            },
        }),

    // UI actions
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
}));
