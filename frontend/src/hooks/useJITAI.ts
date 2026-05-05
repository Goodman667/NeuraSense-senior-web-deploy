/**
 * useJITAI Hook - Just-in-Time Adaptive Interventions
 * 
 * Manages JITAI state, API calls, and intervention triggers
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { API_BASE } from '../config/api';

export type RiskLevel = 'low' | 'medium' | 'high';
export type InterventionType = 'breathing' | 'cbt' | 'gratitude' | 'community';

export interface Intervention {
    type: InterventionType;
    title: string;
    description: string;
    duration_seconds: number;
    action_data?: Record<string, any>;
}

export interface JITAIState {
    vulnerabilityScore: number;
    riskLevel: RiskLevel;
    triggerIntervention: boolean;
    intervention: Intervention | null;
    interventionId: string | null;
    contributingFactors: string[];
    lastCheck: Date | null;
    isLoading: boolean;
    error: string | null;
}

export interface EMAInput {
    mood: number;
    stress_sources: string[];
    activity?: string;
}

export interface BioSignalsInput {
    fatigue_index: number;
    blink_rate?: number;
    voice_stress?: number;
}

export interface JITAICheckInput {
    userId: string;
    ema?: EMAInput;
    bioSignals?: BioSignalsInput;
    journalEmotion?: string;
    scaleTrend?: number;
    hour?: number;
}

const initialState: JITAIState = {
    vulnerabilityScore: 0,
    riskLevel: 'low',
    triggerIntervention: false,
    intervention: null,
    interventionId: null,
    contributingFactors: [],
    lastCheck: null,
    isLoading: false,
    error: null,
};

export const useJITAI = (
    userId: string,
    autoCheck: boolean = true,
    intervalMs: number = 300000,
    autoShowIntervention: boolean = false,
) => {
    const [state, setState] = useState<JITAIState>(initialState);
    const [showIntervention, setShowIntervention] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Check vulnerability with JITAI engine
    const checkVulnerability = useCallback(async (input?: Partial<JITAICheckInput>) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const now = new Date();
            const payload = {
                user_id: userId,
                ema: input?.ema,
                bio_signals: input?.bioSignals,
                journal_emotion: input?.journalEmotion,
                scale_trend: input?.scaleTrend,
                context: {
                    hour: input?.hour ?? now.getHours(),
                    day_of_week: now.getDay(),
                },
            };

            const response = await fetch(`${API_BASE}/jitai/engine`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('JITAI check failed');
            }

            const data = await response.json();

            setState({
                vulnerabilityScore: data.vulnerability_score,
                riskLevel: data.risk_level as RiskLevel,
                triggerIntervention: data.trigger_intervention,
                intervention: data.intervention,
                interventionId: data.intervention_id,
                contributingFactors: data.contributing_factors || [],
                lastCheck: now,
                isLoading: false,
                error: null,
            });

            // Auto-show intervention if triggered
            if (autoShowIntervention && data.trigger_intervention && data.intervention) {
                setShowIntervention(true);
            }

            return data;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: errorMsg,
            }));
            return null;
        }
    }, [userId, autoShowIntervention]);

    // Submit feedback for an intervention
    const submitFeedback = useCallback(async (
        interventionId: string,
        accepted: boolean,
        postMood?: number
    ) => {
        try {
            const response = await fetch(`${API_BASE}/jitai/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    intervention_id: interventionId,
                    accepted,
                    post_mood: postMood,
                }),
            });

            return response.ok;
        } catch {
            return false;
        }
    }, []);

    // Dismiss intervention
    const dismissIntervention = useCallback((accepted: boolean = false) => {
        if (state.interventionId) {
            submitFeedback(state.interventionId, accepted);
        }
        setShowIntervention(false);
        setState(prev => ({
            ...prev,
            triggerIntervention: false,
            intervention: null,
        }));
    }, [state.interventionId, submitFeedback]);

    // Complete intervention with mood feedback
    const completeIntervention = useCallback((postMood: number) => {
        if (state.interventionId) {
            submitFeedback(state.interventionId, true, postMood);
        }
        setShowIntervention(false);
        setState(prev => ({
            ...prev,
            triggerIntervention: false,
            intervention: null,
        }));
    }, [state.interventionId, submitFeedback]);

    // Auto-check interval
    useEffect(() => {
        if (autoCheck && userId) {
            // Initial check
            checkVulnerability();

            // Set up interval
            intervalRef.current = setInterval(() => {
                checkVulnerability();
            }, intervalMs);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }
    }, [autoCheck, userId, intervalMs, checkVulnerability]);

    return {
        ...state,
        showIntervention,
        checkVulnerability,
        dismissIntervention,
        completeIntervention,
        submitFeedback,
    };
};

export default useJITAI;
