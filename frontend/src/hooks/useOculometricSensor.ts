/**
 * OculometricEngine - Digital Phenotyping via Eye Tracking
 * 
 * Advanced vision perception module using MediaPipe Face Mesh
 * for real-time fatigue detection via Eye Aspect Ratio (EAR).
 * 
 * Features:
 * - Non-contact blink detection using EAR algorithm
 * - Hysteresis thresholding state machine
 * - PERCLOS-based drowsiness index
 * - Real-time blink rate monitoring
 * 
 * @see https://google.github.io/mediapipe/solutions/face_mesh
 */

import { useRef, useState, useEffect, useCallback } from 'react';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

/**
 * Eye state enumeration for the blink detection state machine
 */
export enum EyeState {
    OPEN = 'OPEN',
    BLINKING = 'BLINKING',
    CLOSED = 'CLOSED',
}

/**
 * Fatigue level classification
 */
export enum FatigueLevel {
    NORMAL = 'NORMAL',         // Normal alertness
    MILD = 'MILD',             // Slight fatigue
    MODERATE = 'MODERATE',     // Noticeable fatigue
    SEVERE = 'SEVERE',         // High fatigue risk
}

/**
 * Bio-signal metrics interface
 * Contains all oculometric measurements for fatigue inference
 */
export interface BioSignalMetrics {
    // Current frame metrics
    leftEAR: number;           // Left eye aspect ratio (0-0.5)
    rightEAR: number;          // Right eye aspect ratio (0-0.5)
    avgEAR: number;            // Average EAR of both eyes

    // Eye state
    eyeState: EyeState;        // Current eye state

    // Blink statistics
    blinkCount: number;        // Total blink count since start
    blinkRate: number;         // Blinks per minute (BPM)
    isBlinkRateAbnormal: boolean; // True if BPM < 10 or BPM > 30

    // Fatigue inference
    drowsinessIndex: number;   // PERCLOS: % of time eyes closed (0-100)
    fatigueLevel: FatigueLevel; // Classified fatigue level

    // Timestamps
    sessionDuration: number;   // Session duration in seconds
    lastBlinkTimestamp: number | null; // Last blink timestamp

    // Status
    isTracking: boolean;       // True if face is being tracked
    fps: number;               // Current processing FPS
}

/**
 * Configuration options for the oculometric sensor
 */
export interface OculometricConfig {
    // EAR thresholds
    earThreshold: number;      // Threshold for closed eye (default: 0.25)
    earOpenThreshold: number;  // Threshold for open eye (default: 0.30)

    // Detection parameters
    minBlinkFrames: number;    // Minimum consecutive frames for blink (default: 3)
    windowSize: number;        // Sliding window size in frames (default: 1800 = 60s @ 30fps)

    // Camera settings
    videoWidth: number;        // Video width (default: 640)
    videoHeight: number;       // Video height (default: 480)

    // Performance
    uiUpdateInterval: number;  // UI update interval in ms (default: 1000)
}

/**
 * Landmark point structure
 */
interface Point3D {
    x: number;
    y: number;
    z: number;
}

// =====================================================
// MEDIAPIPE FACE MESH LANDMARK INDICES
// =====================================================

/**
 * MediaPipe Face Mesh landmark indices for EAR calculation
 * Based on the 468-point face mesh topology
 * 
 * Eye landmarks mapping (per the EAR formula):
 * p1 (outer corner), p2 (upper lid 1), p3 (upper lid 2),
 * p4 (inner corner), p5 (lower lid 2), p6 (lower lid 1)
 */
const LEFT_EYE_INDICES = {
    p1: 263,  // Outer corner (lateral canthus)
    p2: 387,  // Upper eyelid reference point 1
    p3: 385,  // Upper eyelid reference point 2
    p4: 362,  // Inner corner (medial canthus)
    p5: 380,  // Lower eyelid reference point 2
    p6: 373,  // Lower eyelid reference point 1
};

const RIGHT_EYE_INDICES = {
    p1: 33,   // Outer corner (lateral canthus)
    p2: 160,  // Upper eyelid reference point 1
    p3: 158,  // Upper eyelid reference point 2
    p4: 133,  // Inner corner (medial canthus)
    p5: 153,  // Lower eyelid reference point 2
    p6: 144,  // Lower eyelid reference point 1
};

// =====================================================
// PURE UTILITY FUNCTIONS
// =====================================================

/**
 * Calculate Euclidean distance between two 3D points
 */
const euclideanDistance = (p1: Point3D, p2: Point3D): number => {
    return Math.sqrt(
        Math.pow(p1.x - p2.x, 2) +
        Math.pow(p1.y - p2.y, 2) +
        Math.pow(p1.z - p2.z, 2)
    );
};

/**
 * Calculate Eye Aspect Ratio (EAR)
 * 
 * EAR Formula:
 *   EAR = (||p2 - p6|| + ||p3 - p5||) / (2 × ||p1 - p4||)
 * 
 * The numerator calculates vertical eyelid distance (average of two pairs)
 * The denominator calculates horizontal eye corner distance
 * This provides scale-invariant measurement regardless of camera distance
 * 
 * @param landmarks - Array of 468 face mesh landmarks
 * @param eyeIndices - Object containing p1-p6 landmark indices
 * @returns EAR value (typically 0.1-0.4 for open eyes)
 */
const calculateEAR = (
    landmarks: Point3D[],
    eyeIndices: typeof LEFT_EYE_INDICES
): number => {
    // Extract landmark points
    const p1 = landmarks[eyeIndices.p1];
    const p2 = landmarks[eyeIndices.p2];
    const p3 = landmarks[eyeIndices.p3];
    const p4 = landmarks[eyeIndices.p4];
    const p5 = landmarks[eyeIndices.p5];
    const p6 = landmarks[eyeIndices.p6];

    // Validate landmarks exist
    if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) {
        return 0;
    }

    // Calculate vertical distances (eyelid opening)
    const verticalDist1 = euclideanDistance(p2, p6);
    const verticalDist2 = euclideanDistance(p3, p5);

    // Calculate horizontal distance (eye width)
    const horizontalDist = euclideanDistance(p1, p4);

    // Prevent division by zero
    if (horizontalDist === 0) {
        return 0;
    }

    // Apply EAR formula
    const ear = (verticalDist1 + verticalDist2) / (2 * horizontalDist);

    return ear;
};

/**
 * Classify fatigue level based on PERCLOS
 */
const classifyFatigueLevel = (perclos: number): FatigueLevel => {
    if (perclos < 15) return FatigueLevel.NORMAL;
    if (perclos < 30) return FatigueLevel.MILD;
    if (perclos < 50) return FatigueLevel.MODERATE;
    return FatigueLevel.SEVERE;
};

// =====================================================
// DEFAULT CONFIGURATION
// =====================================================

const DEFAULT_CONFIG: OculometricConfig = {
    earThreshold: 0.25,
    earOpenThreshold: 0.30,
    minBlinkFrames: 3,
    windowSize: 1800, // 60 seconds @ 30fps
    videoWidth: 640,
    videoHeight: 480,
    uiUpdateInterval: 1000,
};

// =====================================================
// MAIN HOOK: useOculometricSensor
// =====================================================

/**
 * React Hook for MediaPipe-based oculometric sensing
 * 
 * Encapsulates all MediaPipe Face Mesh logic and provides
 * real-time fatigue metrics via a clean React interface.
 * 
 * Uses useRef for high-frequency data storage to avoid
 * React re-render performance issues.
 * 
 * @param config - Optional configuration overrides
 * @returns Object containing metrics, start/stop controls, and video ref
 */
export const useOculometricSensor = (
    config: Partial<OculometricConfig> = {}
) => {
    // Merge config with defaults
    const cfg: OculometricConfig = { ...DEFAULT_CONFIG, ...config };

    // ---- State for UI (updated every second) ----
    const [metrics, setMetrics] = useState<BioSignalMetrics>({
        leftEAR: 0,
        rightEAR: 0,
        avgEAR: 0,
        eyeState: EyeState.OPEN,
        blinkCount: 0,
        blinkRate: 0,
        isBlinkRateAbnormal: false,
        drowsinessIndex: 0,
        fatigueLevel: FatigueLevel.NORMAL,
        sessionDuration: 0,
        lastBlinkTimestamp: null,
        isTracking: false,
        fps: 0,
    });

    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ---- Refs for high-frequency data (no re-renders) ----
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const faceMeshRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);
    const animationFrameRef = useRef<number | null>(null);
    const startInProgressRef = useRef(false);

    // State machine refs
    const eyeStateRef = useRef<EyeState>(EyeState.OPEN);
    const closedFrameCountRef = useRef(0);

    // Blink tracking refs
    const blinkCountRef = useRef(0);
    const blinkTimestampsRef = useRef<number[]>([]);

    // Timing refs
    const sessionStartRef = useRef<number>(0);
    const frameCountRef = useRef(0);
    const lastFpsTimeRef = useRef<number>(0);
    const fpsRef = useRef(0);

    // PERCLOS calculation refs
    const closedFramesInWindowRef = useRef(0);
    const frameHistoryRef = useRef<boolean[]>([]); // true = closed

    // UI update interval ref
    const updateIntervalRef = useRef<number | null>(null);

    const releaseVideoStream = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        const stream = video.srcObject;
        if (stream && typeof MediaStream !== 'undefined' && stream instanceof MediaStream) {
            stream.getTracks().forEach((track) => {
                try {
                    track.stop();
                } catch {
                    // Ignore track stop failures during cleanup.
                }
            });
        }

        try {
            video.pause();
        } catch {
            // Ignore pause failures during cleanup.
        }

        video.srcObject = null;
        video.removeAttribute('src');
    }, []);

    const cleanupTrackingResources = useCallback(() => {
        // Stop MediaPipe camera wrapper
        if (cameraRef.current) {
            try {
                cameraRef.current.stop();
            } catch {
                // Ignore camera stop failures during cleanup.
            }
            cameraRef.current = null;
        }

        // Release underlying MediaStream tracks from the video element.
        releaseVideoStream();

        // Close FaceMesh
        if (faceMeshRef.current) {
            try {
                faceMeshRef.current.close();
            } catch {
                // Ignore FaceMesh close failures during cleanup.
            }
            faceMeshRef.current = null;
        }

        // Cancel animation frame
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        // Clear update interval
        if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
            updateIntervalRef.current = null;
        }

        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }

        setIsRunning(false);
        setMetrics(prev => ({ ...prev, isTracking: false }));
    }, [releaseVideoStream]);

    // ---- Frame Processing Callback ----
    const onResults = useCallback((results: any) => {
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            return;
        }

        const landmarks = results.multiFaceLandmarks[0] as Point3D[];
        const now = Date.now();

        // Update FPS calculation
        frameCountRef.current++;
        if (now - lastFpsTimeRef.current >= 1000) {
            fpsRef.current = frameCountRef.current;
            frameCountRef.current = 0;
            lastFpsTimeRef.current = now;
        }

        // ---- EAR Calculation ----
        const leftEAR = calculateEAR(landmarks, LEFT_EYE_INDICES);
        const rightEAR = calculateEAR(landmarks, RIGHT_EYE_INDICES);
        const avgEAR = (leftEAR + rightEAR) / 2;

        // ---- Blink Detection State Machine (Hysteresis Thresholding) ----
        const isClosed = avgEAR < cfg.earThreshold;
        const isOpen = avgEAR >= cfg.earOpenThreshold;

        // Update frame history for PERCLOS
        frameHistoryRef.current.push(isClosed);
        if (frameHistoryRef.current.length > cfg.windowSize) {
            const removed = frameHistoryRef.current.shift();
            if (removed) closedFramesInWindowRef.current--;
        }
        if (isClosed) closedFramesInWindowRef.current++;

        // State machine logic
        switch (eyeStateRef.current) {
            case EyeState.OPEN:
                if (isClosed) {
                    closedFrameCountRef.current++;
                    if (closedFrameCountRef.current >= cfg.minBlinkFrames) {
                        eyeStateRef.current = EyeState.BLINKING;
                    }
                } else {
                    closedFrameCountRef.current = 0;
                }
                break;

            case EyeState.BLINKING:
                if (isOpen) {
                    // Blink completed
                    blinkCountRef.current++;
                    blinkTimestampsRef.current.push(now);

                    // Trim old timestamps (keep last minute)
                    const oneMinuteAgo = now - 60000;
                    blinkTimestampsRef.current = blinkTimestampsRef.current.filter(
                        ts => ts > oneMinuteAgo
                    );

                    eyeStateRef.current = EyeState.OPEN;
                    closedFrameCountRef.current = 0;
                } else if (!isClosed) {
                    // Momentary open during blink - stay in BLINKING
                    closedFrameCountRef.current = 0;
                }
                break;
        }

        // Draw to canvas if available (for debugging/visualization)
        if (canvasRef.current && results.image) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, cfg.videoWidth, cfg.videoHeight);
                ctx.drawImage(results.image, 0, 0, cfg.videoWidth, cfg.videoHeight);

                // Draw eye landmarks
                ctx.fillStyle = isClosed ? '#ef4444' : '#22c55e';
                Object.values(LEFT_EYE_INDICES).forEach(idx => {
                    const lm = landmarks[idx];
                    if (lm) {
                        ctx.beginPath();
                        ctx.arc(lm.x * cfg.videoWidth, lm.y * cfg.videoHeight, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                });
                Object.values(RIGHT_EYE_INDICES).forEach(idx => {
                    const lm = landmarks[idx];
                    if (lm) {
                        ctx.beginPath();
                        ctx.arc(lm.x * cfg.videoWidth, lm.y * cfg.videoHeight, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                });
            }
        }
    }, [cfg]);

    // ---- UI Update Function (called every second) ----
    const updateUI = useCallback(() => {
        const now = Date.now();
        const sessionDuration = (now - sessionStartRef.current) / 1000;

        // Calculate blink rate (BPM)
        const oneMinuteAgo = now - 60000;
        const recentBlinks = blinkTimestampsRef.current.filter(ts => ts > oneMinuteAgo);
        const blinkRate = recentBlinks.length;
        const isBlinkRateAbnormal = blinkRate < 10 || blinkRate > 30;

        // Calculate PERCLOS (% of time eyes closed in window)
        // Use cfg.windowSize as denominator to prevent overestimation when buffer not full
        const totalFrames = frameHistoryRef.current.length;
        const effectiveDenominator = Math.max(totalFrames, cfg.windowSize);
        const drowsinessIndex = totalFrames > 0
            ? (closedFramesInWindowRef.current / effectiveDenominator) * 100
            : 0;

        // Classify fatigue level
        const fatigueLevel = classifyFatigueLevel(drowsinessIndex);

        setMetrics({
            leftEAR: 0, // Will be updated on next frame
            rightEAR: 0,
            avgEAR: 0,
            eyeState: eyeStateRef.current,
            blinkCount: blinkCountRef.current,
            blinkRate,
            isBlinkRateAbnormal,
            drowsinessIndex,
            fatigueLevel,
            sessionDuration,
            lastBlinkTimestamp: blinkTimestampsRef.current[blinkTimestampsRef.current.length - 1] || null,
            isTracking: true,
            fps: fpsRef.current,
        });
    }, []);

    // ---- Start Tracking ----
    const startTracking = useCallback(async () => {
        if (isRunning || startInProgressRef.current) return;

        startInProgressRef.current = true;
        setError(null);

        // Defensive cleanup in case a previous session did not fully release the camera.
        cleanupTrackingResources();

        try {
            // Load MediaPipe from CDN instead of npm packages
            // This bypasses bundler issues entirely
            const loadScript = (src: string): Promise<void> => {
                return new Promise((resolve, reject) => {
                    if (document.querySelector(`script[src="${src}"]`)) {
                        resolve();
                        return;
                    }
                    const script = document.createElement('script');
                    script.src = src;
                    script.crossOrigin = 'anonymous';
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error(`Failed to load ${src}`));
                    document.head.appendChild(script);
                });
            };

            // Load MediaPipe scripts from CDN
            await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');
            await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');

            // Get constructors from global window object
            const FaceMesh = (window as any).FaceMesh;
            const Camera = (window as any).Camera;

            if (!FaceMesh || typeof FaceMesh !== 'function') {
                throw new Error('MediaPipe FaceMesh 模块加载失败，请刷新页面重试');
            }
            if (!Camera || typeof Camera !== 'function') {
                throw new Error('MediaPipe Camera 模块加载失败，请刷新页面重试');
            }

            // Initialize FaceMesh
            const faceMesh = new FaceMesh({
                locateFile: (file: string) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                },
            });

            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true, // High precision for iris and eyelid
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
            });

            faceMesh.onResults(onResults);
            faceMeshRef.current = faceMesh;

            // Get video element
            if (!videoRef.current) {
                throw new Error('Video element not found');
            }

            // Initialize camera
            const camera = new Camera(videoRef.current, {
                onFrame: async () => {
                    if (faceMeshRef.current && videoRef.current) {
                        await faceMeshRef.current.send({ image: videoRef.current });
                    }
                },
                width: cfg.videoWidth,
                height: cfg.videoHeight,
            });

            await camera.start();
            cameraRef.current = camera;

            // Reset all tracking state
            sessionStartRef.current = Date.now();
            blinkCountRef.current = 0;
            blinkTimestampsRef.current = [];
            closedFrameCountRef.current = 0;
            eyeStateRef.current = EyeState.OPEN;
            frameHistoryRef.current = [];
            closedFramesInWindowRef.current = 0;
            frameCountRef.current = 0;
            lastFpsTimeRef.current = Date.now();

            // Start UI update interval
            updateIntervalRef.current = window.setInterval(updateUI, cfg.uiUpdateInterval);

            setIsRunning(true);
        } catch (err: any) {
            console.error('Failed to start oculometric tracking:', err);
            cleanupTrackingResources();

            const message = err?.message || '';
            const errorName = err?.name || '';

            if (errorName === 'NotReadableError' || /Device in use/i.test(message)) {
                setError('摄像头当前正被占用。请先关闭系统相机、微信/QQ/腾讯会议，或关闭本页面后重试。');
            } else if (errorName === 'NotAllowedError') {
                setError('浏览器没有获得摄像头权限，请在地址栏里允许摄像头访问后重试。');
            } else {
                setError(message || 'Failed to initialize camera or MediaPipe');
            }
        } finally {
            startInProgressRef.current = false;
        }
    }, [cfg, cleanupTrackingResources, isRunning, onResults, updateUI]);

    // ---- Stop Tracking ----
    const stopTracking = useCallback(() => {
        cleanupTrackingResources();
    }, [cleanupTrackingResources]);

    // ---- Cleanup on unmount ----
    useEffect(() => {
        return () => {
            stopTracking();
        };
    }, [stopTracking]);

    return {
        // Metrics (updated every second)
        metrics,

        // Control functions
        startTracking,
        stopTracking,

        // Status
        isRunning,
        error,

        // Refs for DOM elements
        videoRef,
        canvasRef,

        // Configuration
        config: cfg,
    };
};

// =====================================================
// EXPORTS
// =====================================================

export default useOculometricSensor;
