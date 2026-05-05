/**
 * useEyeTracking Hook
 * 
 * Tracks mouse position and maps it to Live2D eye/head parameters.
 * Creates natural eye-following behavior for the avatar.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { EyeTrackingState } from './types';

interface UseEyeTrackingOptions {
    /**
     * Maximum angle for horizontal eye movement (degrees).
     * @default 30
     */
    maxAngleX?: number;

    /**
     * Maximum angle for vertical eye movement (degrees).
     * @default 30
     */
    maxAngleY?: number;

    /**
     * Smoothing factor for eye movement (0-1).
     * Higher values = smoother but slower response.
     * @default 0.1
     */
    smoothing?: number;

    /**
     * Whether to enable tracking.
     * @default true
     */
    enabled?: boolean;

    /**
     * Reference element for calculating relative mouse position.
     * If not provided, uses window dimensions.
     */
    containerRef?: React.RefObject<HTMLElement>;
}

interface UseEyeTrackingReturn {
    /** Current eye tracking state */
    state: EyeTrackingState;

    /** Start tracking mouse position */
    startTracking: () => void;

    /** Stop tracking mouse position */
    stopTracking: () => void;

    /** Manually set eye angles */
    setAngles: (angleX: number, angleY: number) => void;
}

/**
 * Hook for eye tracking functionality.
 * Maps mouse position to ParamAngleX/ParamAngleY for Live2D models.
 */
export function useEyeTracking(
    options: UseEyeTrackingOptions = {}
): UseEyeTrackingReturn {
    const {
        maxAngleX = 30,
        maxAngleY = 30,
        smoothing = 0.1,
        enabled = true,
        containerRef,
    } = options;

    const [state, setState] = useState<EyeTrackingState>({
        angleX: 0,
        angleY: 0,
        isTracking: false,
    });

    const targetAnglesRef = useRef({ x: 0, y: 0 });
    const currentAnglesRef = useRef({ x: 0, y: 0 });
    const animationFrameRef = useRef<number | null>(null);
    const isTrackingRef = useRef(false);

    /**
     * Calculate angles based on mouse position.
     */
    const calculateAngles = useCallback(
        (mouseX: number, mouseY: number) => {
            let centerX: number;
            let centerY: number;
            let width: number;
            let height: number;

            if (containerRef?.current) {
                const rect = containerRef.current.getBoundingClientRect();
                centerX = rect.left + rect.width / 2;
                centerY = rect.top + rect.height / 2;
                width = rect.width;
                height = rect.height;
            } else {
                centerX = window.innerWidth / 2;
                centerY = window.innerHeight / 2;
                width = window.innerWidth;
                height = window.innerHeight;
            }

            // Calculate relative position (-1 to 1)
            const relativeX = (mouseX - centerX) / (width / 2);
            const relativeY = (mouseY - centerY) / (height / 2);

            // Clamp values
            const clampedX = Math.max(-1, Math.min(1, relativeX));
            const clampedY = Math.max(-1, Math.min(1, relativeY));

            // Map to angle range
            targetAnglesRef.current = {
                x: clampedX * maxAngleX,
                y: -clampedY * maxAngleY, // Invert Y for natural look direction
            };
        },
        [containerRef, maxAngleX, maxAngleY]
    );

    /**
     * Animation loop for smooth eye movement.
     */
    const updateAngles = useCallback(() => {
        if (!isTrackingRef.current) return;

        // Apply smoothing (lerp)
        currentAnglesRef.current.x +=
            (targetAnglesRef.current.x - currentAnglesRef.current.x) * (1 - smoothing);
        currentAnglesRef.current.y +=
            (targetAnglesRef.current.y - currentAnglesRef.current.y) * (1 - smoothing);

        setState({
            angleX: currentAnglesRef.current.x,
            angleY: currentAnglesRef.current.y,
            isTracking: true,
        });

        animationFrameRef.current = requestAnimationFrame(updateAngles);
    }, [smoothing]);

    /**
     * Handle mouse move event.
     */
    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
            if (!isTrackingRef.current) return;
            calculateAngles(event.clientX, event.clientY);
        },
        [calculateAngles]
    );

    /**
     * Start tracking.
     */
    const startTracking = useCallback(() => {
        if (isTrackingRef.current) return;

        isTrackingRef.current = true;
        window.addEventListener('mousemove', handleMouseMove);
        updateAngles();

        setState((prev) => ({ ...prev, isTracking: true }));
    }, [handleMouseMove, updateAngles]);

    /**
     * Stop tracking.
     */
    const stopTracking = useCallback(() => {
        isTrackingRef.current = false;
        window.removeEventListener('mousemove', handleMouseMove);

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        // Reset to center
        currentAnglesRef.current = { x: 0, y: 0 };
        targetAnglesRef.current = { x: 0, y: 0 };

        setState({
            angleX: 0,
            angleY: 0,
            isTracking: false,
        });
    }, [handleMouseMove]);

    /**
     * Manually set angles.
     */
    const setAngles = useCallback((angleX: number, angleY: number) => {
        targetAnglesRef.current = { x: angleX, y: angleY };
    }, []);

    // Auto-start tracking if enabled
    useEffect(() => {
        if (enabled) {
            startTracking();
        } else {
            stopTracking();
        }

        return () => {
            stopTracking();
        };
    }, [enabled, startTracking, stopTracking]);

    return {
        state,
        startTracking,
        stopTracking,
        setAngles,
    };
}
