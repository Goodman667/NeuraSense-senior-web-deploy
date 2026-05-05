/**
 * useKeystrokeDynamics Hook
 * 
 * Captures typing patterns for anxiety/stress detection via digital phenotyping.
 * Measures:
 * - Flight Time: Time between key releases and next key press
 * - Dwell Time: How long each key is held down
 * - Typing Speed: Characters per minute
 * - Error Rate: Backspace frequency
 */

import { useRef, useState, useCallback, useEffect } from 'react';

export interface KeystrokeMetrics {
    // Timing metrics (in milliseconds)
    avgFlightTime: number;      // Average time between keys
    avgDwellTime: number;       // Average key press duration
    flightTimeVariance: number; // Variance in flight time (higher = more anxiety)
    dwellTimeVariance: number;  // Variance in dwell time

    // Speed metrics
    typingSpeed: number;        // Characters per minute
    errorRate: number;          // Backspaces per 100 characters
    pauseFrequency: number;     // Number of pauses (>500ms) per minute

    // Derived metrics
    anxietyIndex: number;       // 0-100 anxiety indicator
    focusScore: number;         // 0-100 focus score

    // Session stats
    totalKeystrokes: number;
    sessionDuration: number;    // In seconds
    isTyping: boolean;
}

interface KeyEvent {
    key: string;
    timestamp: number;
    type: 'down' | 'up';
}

const DEFAULT_METRICS: KeystrokeMetrics = {
    avgFlightTime: 0,
    avgDwellTime: 0,
    flightTimeVariance: 0,
    dwellTimeVariance: 0,
    typingSpeed: 0,
    errorRate: 0,
    pauseFrequency: 0,
    anxietyIndex: 0,
    focusScore: 100,
    totalKeystrokes: 0,
    sessionDuration: 0,
    isTyping: false,
};

export const useKeystrokeDynamics = () => {
    const [metrics, setMetrics] = useState<KeystrokeMetrics>(DEFAULT_METRICS);
    const [isActive, setIsActive] = useState(false);

    // Refs for tracking
    const keyEventsRef = useRef<KeyEvent[]>([]);
    const keyDownTimesRef = useRef<Map<string, number>>(new Map());
    const flightTimesRef = useRef<number[]>([]);
    const dwellTimesRef = useRef<number[]>([]);
    const lastKeyUpTimeRef = useRef<number>(0);
    const sessionStartRef = useRef<number>(0);
    const keystrokeCountRef = useRef(0);
    const backspaceCountRef = useRef(0);
    const pauseCountRef = useRef(0);
    const lastActivityRef = useRef<number>(0);
    const updateIntervalRef = useRef<number | null>(null);

    // Calculate variance
    const calculateVariance = (values: number[]): number => {
        if (values.length < 2) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    };

    // Calculate anxiety index based on keystroke patterns
    const calculateAnxietyIndex = (
        flightVariance: number,
        dwellVariance: number,
        errorRate: number,
        pauseFreq: number
    ): number => {
        // Higher variance and error rate indicate more anxiety
        // Normalized to 0-100 scale
        const varScore = Math.min(100, (flightVariance / 10000) * 30 + (dwellVariance / 5000) * 20);
        const errorScore = Math.min(100, errorRate * 5);
        const pauseScore = Math.min(100, pauseFreq * 10);

        return Math.round((varScore * 0.4 + errorScore * 0.3 + pauseScore * 0.3));
    };

    // Calculate focus score
    const calculateFocusScore = (
        avgFlightTime: number,
        flightVariance: number,
        typingSpeed: number
    ): number => {
        // Lower variance and consistent speed = better focus
        const consistencyScore = Math.max(0, 100 - (flightVariance / 5000) * 100);
        const speedScore = Math.min(100, (typingSpeed / 300) * 100);
        const rhythmScore = avgFlightTime > 0 && avgFlightTime < 300 ? 100 :
            avgFlightTime < 500 ? 70 : 40;

        return Math.round((consistencyScore * 0.4 + speedScore * 0.3 + rhythmScore * 0.3));
    };

    // Update metrics
    const updateMetrics = useCallback(() => {
        const now = Date.now();
        const sessionDuration = (now - sessionStartRef.current) / 1000;

        const flightTimes = flightTimesRef.current;
        const dwellTimes = dwellTimesRef.current;

        const avgFlightTime = flightTimes.length > 0
            ? flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length
            : 0;
        const avgDwellTime = dwellTimes.length > 0
            ? dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length
            : 0;

        const flightTimeVariance = calculateVariance(flightTimes);
        const dwellTimeVariance = calculateVariance(dwellTimes);

        const typingSpeed = sessionDuration > 0
            ? (keystrokeCountRef.current / sessionDuration) * 60
            : 0;

        const errorRate = keystrokeCountRef.current > 0
            ? (backspaceCountRef.current / keystrokeCountRef.current) * 100
            : 0;

        const pauseFrequency = sessionDuration > 0
            ? (pauseCountRef.current / (sessionDuration / 60))
            : 0;

        const isTyping = (now - lastActivityRef.current) < 1000;

        const anxietyIndex = calculateAnxietyIndex(
            flightTimeVariance,
            dwellTimeVariance,
            errorRate,
            pauseFrequency
        );

        const focusScore = calculateFocusScore(avgFlightTime, flightTimeVariance, typingSpeed);

        setMetrics({
            avgFlightTime: Math.round(avgFlightTime),
            avgDwellTime: Math.round(avgDwellTime),
            flightTimeVariance: Math.round(flightTimeVariance),
            dwellTimeVariance: Math.round(dwellTimeVariance),
            typingSpeed: Math.round(typingSpeed),
            errorRate: Math.round(errorRate * 10) / 10,
            pauseFrequency: Math.round(pauseFrequency * 10) / 10,
            anxietyIndex,
            focusScore,
            totalKeystrokes: keystrokeCountRef.current,
            sessionDuration: Math.round(sessionDuration),
            isTyping,
        });
    }, []);

    // Handle key down
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const now = Date.now();
        const key = e.key;

        // Ignore modifier keys alone
        if (['Shift', 'Control', 'Alt', 'Meta'].includes(key)) return;

        // Record key down time
        if (!keyDownTimesRef.current.has(key)) {
            keyDownTimesRef.current.set(key, now);
            keystrokeCountRef.current++;

            // Track backspaces
            if (key === 'Backspace') {
                backspaceCountRef.current++;
            }

            // Calculate flight time (time since last key up)
            if (lastKeyUpTimeRef.current > 0) {
                const flightTime = now - lastKeyUpTimeRef.current;
                if (flightTime < 2000) { // Ignore long pauses
                    flightTimesRef.current.push(flightTime);
                    // Keep only last 100 samples
                    if (flightTimesRef.current.length > 100) {
                        flightTimesRef.current.shift();
                    }
                } else {
                    pauseCountRef.current++;
                }
            }

            lastActivityRef.current = now;

            keyEventsRef.current.push({
                key,
                timestamp: now,
                type: 'down'
            });
        }
    }, []);

    // Handle key up
    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        const now = Date.now();
        const key = e.key;

        // Ignore modifier keys
        if (['Shift', 'Control', 'Alt', 'Meta'].includes(key)) return;

        // Calculate dwell time
        const downTime = keyDownTimesRef.current.get(key);
        if (downTime) {
            const dwellTime = now - downTime;
            if (dwellTime < 1000) { // Reasonable dwell time
                dwellTimesRef.current.push(dwellTime);
                // Keep only last 100 samples
                if (dwellTimesRef.current.length > 100) {
                    dwellTimesRef.current.shift();
                }
            }
            keyDownTimesRef.current.delete(key);
        }

        lastKeyUpTimeRef.current = now;
        lastActivityRef.current = now;

        keyEventsRef.current.push({
            key,
            timestamp: now,
            type: 'up'
        });
    }, []);

    // Start tracking
    const startTracking = useCallback(() => {
        // Reset all refs
        keyEventsRef.current = [];
        keyDownTimesRef.current.clear();
        flightTimesRef.current = [];
        dwellTimesRef.current = [];
        lastKeyUpTimeRef.current = 0;
        sessionStartRef.current = Date.now();
        keystrokeCountRef.current = 0;
        backspaceCountRef.current = 0;
        pauseCountRef.current = 0;
        lastActivityRef.current = Date.now();

        // Add event listeners
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Start update interval
        updateIntervalRef.current = window.setInterval(updateMetrics, 1000);

        setIsActive(true);
        setMetrics(DEFAULT_METRICS);
    }, [handleKeyDown, handleKeyUp, updateMetrics]);

    // Stop tracking
    const stopTracking = useCallback(() => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);

        if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
            updateIntervalRef.current = null;
        }

        setIsActive(false);
        updateMetrics(); // Final update
    }, [handleKeyDown, handleKeyUp, updateMetrics]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isActive) {
                stopTracking();
            }
        };
    }, [isActive, stopTracking]);

    // Get raw data for backend analysis
    const getRawData = useCallback(() => {
        return {
            flightTimes: [...flightTimesRef.current],
            dwellTimes: [...dwellTimesRef.current],
            keyEvents: [...keyEventsRef.current],
            sessionDuration: (Date.now() - sessionStartRef.current) / 1000,
        };
    }, []);

    return {
        metrics,
        isActive,
        startTracking,
        stopTracking,
        getRawData,
    };
};

export default useKeystrokeDynamics;
