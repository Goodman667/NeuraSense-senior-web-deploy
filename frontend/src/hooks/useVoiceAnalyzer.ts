/**
 * useVoiceAnalyzer - React Hook for Voice Feature Analysis
 * 
 * Integrates with AudioWorklet for real-time voice prosody analysis.
 * Extracts Jitter, Shimmer, and Pitch from microphone input.
 * 
 * Features:
 * - Non-blocking audio processing via AudioWorklet
 * - Automatic silence detection
 * - Real-time feature extraction at 10Hz
 * - Microphone permission handling
 */

import { useRef, useState, useEffect, useCallback } from 'react';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

/**
 * Voice prosody features extracted from audio
 */
export interface VoiceFeatures {
    // Fundamental frequency (Hz)
    pitch: number | null;

    // Jitter: Period-to-period variation (samples)
    jitter: number | null;

    // Shimmer: Amplitude-to-amplitude variation
    shimmer: number | null;

    // Whether the input is silent
    isSilent: boolean;

    // RMS level in dB
    rmsDb: number;

    // Period in samples
    period?: number;

    // Peak amplitude
    amplitude?: number;

    // Whether pitch detection failed on this frame
    pitchDetectionFailed?: boolean;
}

/**
 * Derived metrics from voice features
 */
export interface VoiceMetrics {
    // Current features
    features: VoiceFeatures | null;

    // Average pitch over recent samples (Hz)
    avgPitch: number;

    // Jitter percentage (normalized)
    jitterPercent: number;

    // Shimmer percentage (normalized)
    shimmerPercent: number;

    // Speaking rate indicator (based on pitch variation)
    speechActivityLevel: number;

    // Is currently speaking
    isSpeaking: boolean;

    // Session statistics
    speakingDuration: number;
    silenceDuration: number;

    // Timestamps
    lastUpdateTime: number;
}

/**
 * Configuration for voice analyzer
 */
export interface VoiceAnalyzerConfig {
    // Path to AudioWorklet processor script
    workletPath: string;

    // Silence threshold in dB
    silenceThresholdDb: number;

    // Minimum speech duration to count as speaking (ms)
    minSpeechDuration: number;
}

// =====================================================
// DEFAULT CONFIGURATION
// =====================================================

const DEFAULT_CONFIG: VoiceAnalyzerConfig = {
    workletPath: '/audio/voice-feature-processor.js',
    silenceThresholdDb: -50,
    minSpeechDuration: 100,
};

// =====================================================
// MAIN HOOK: useVoiceAnalyzer
// =====================================================

/**
 * React Hook for voice feature analysis
 * 
 * @param config - Configuration options
 * @returns Object containing metrics, controls, and status
 */
export const useVoiceAnalyzer = (
    config: Partial<VoiceAnalyzerConfig> = {}
) => {
    // Merge config with defaults
    const cfg: VoiceAnalyzerConfig = { ...DEFAULT_CONFIG, ...config };

    // ---- State ----
    const [metrics, setMetrics] = useState<VoiceMetrics>({
        features: null,
        avgPitch: 0,
        jitterPercent: 0,
        shimmerPercent: 0,
        speechActivityLevel: 0,
        isSpeaking: false,
        speakingDuration: 0,
        silenceDuration: 0,
        lastUpdateTime: 0,
    });

    const [isRunning, setIsRunning] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');

    // ---- Refs ----
    const audioContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);

    // Feature history for averaging
    const pitchHistoryRef = useRef<number[]>([]);
    const jitterHistoryRef = useRef<number[]>([]);
    const shimmerHistoryRef = useRef<number[]>([]);
    const periodHistoryRef = useRef<number[]>([]);
    const amplitudeHistoryRef = useRef<number[]>([]);

    // Timing refs
    const speakingStartRef = useRef<number | null>(null);
    const silenceStartRef = useRef<number | null>(null);
    const speakingDurationRef = useRef(0);
    const silenceDurationRef = useRef(0);

    // ---- Message Handler ----
    const handleWorkletMessage = useCallback((event: MessageEvent) => {
        const features = event.data as VoiceFeatures;
        const now = Date.now();

        // Update history arrays (keep last 50 samples)
        if (features.pitch !== null) {
            pitchHistoryRef.current.push(features.pitch);
            if (pitchHistoryRef.current.length > 50) {
                pitchHistoryRef.current.shift();
            }
        }

        if (features.jitter !== null) {
            jitterHistoryRef.current.push(features.jitter);
            if (jitterHistoryRef.current.length > 50) {
                jitterHistoryRef.current.shift();
            }
        }

        if (features.shimmer !== null) {
            shimmerHistoryRef.current.push(features.shimmer);
            if (shimmerHistoryRef.current.length > 50) {
                shimmerHistoryRef.current.shift();
            }
        }

        // Track period and amplitude for relative normalization
        if (features.period !== undefined && features.period > 0) {
            periodHistoryRef.current.push(features.period);
            if (periodHistoryRef.current.length > 50) {
                periodHistoryRef.current.shift();
            }
        }

        if (features.amplitude !== undefined && features.amplitude > 0) {
            amplitudeHistoryRef.current.push(features.amplitude);
            if (amplitudeHistoryRef.current.length > 50) {
                amplitudeHistoryRef.current.shift();
            }
        }

        // Calculate averages
        const avgPitch = pitchHistoryRef.current.length > 0
            ? pitchHistoryRef.current.reduce((a, b) => a + b, 0) / pitchHistoryRef.current.length
            : 0;

        const avgJitter = jitterHistoryRef.current.length > 0
            ? jitterHistoryRef.current.reduce((a, b) => a + b, 0) / jitterHistoryRef.current.length
            : 0;

        const avgShimmer = shimmerHistoryRef.current.length > 0
            ? shimmerHistoryRef.current.reduce((a, b) => a + b, 0) / shimmerHistoryRef.current.length
            : 0;

        const avgPeriod = periodHistoryRef.current.length > 0
            ? periodHistoryRef.current.reduce((a, b) => a + b, 0) / periodHistoryRef.current.length
            : 0;

        const avgAmplitude = amplitudeHistoryRef.current.length > 0
            ? amplitudeHistoryRef.current.reduce((a, b) => a + b, 0) / amplitudeHistoryRef.current.length
            : 0;

        // Relative Jitter (%) = (mean absolute jitter) / (mean period) * 100
        // Clinical reference: normal < 1.04%, pathological > 1.04%
        const jitterPercent = avgPeriod > 0
            ? Math.min(100, (avgJitter / avgPeriod) * 100)
            : 0;

        // Relative Shimmer (%) = (mean absolute shimmer) / (mean amplitude) * 100
        // Clinical reference: normal < 3.81%, pathological > 3.81%
        const shimmerPercent = avgAmplitude > 0
            ? Math.min(100, (avgShimmer / avgAmplitude) * 100)
            : 0;

        // Speech activity based on pitch variance
        const pitchVariance = pitchHistoryRef.current.length > 1
            ? Math.sqrt(
                pitchHistoryRef.current.reduce((sum, p) =>
                    sum + Math.pow(p - avgPitch, 2), 0
                ) / pitchHistoryRef.current.length
            )
            : 0;
        const speechActivityLevel = Math.min(100, pitchVariance / 2);

        // Track speaking/silence duration
        const isSpeaking = !features.isSilent;

        if (isSpeaking) {
            if (speakingStartRef.current === null) {
                speakingStartRef.current = now;
            }
            if (silenceStartRef.current !== null) {
                silenceDurationRef.current += now - silenceStartRef.current;
                silenceStartRef.current = null;
            }
        } else {
            if (silenceStartRef.current === null) {
                silenceStartRef.current = now;
            }
            if (speakingStartRef.current !== null) {
                speakingDurationRef.current += now - speakingStartRef.current;
                speakingStartRef.current = null;
            }
        }

        // Update state
        setMetrics({
            features,
            avgPitch,
            jitterPercent,
            shimmerPercent,
            speechActivityLevel,
            isSpeaking,
            speakingDuration: speakingDurationRef.current / 1000,
            silenceDuration: silenceDurationRef.current / 1000,
            lastUpdateTime: now,
        });
    }, []);

    // ---- Start Analyzer ----
    const startAnalyzer = useCallback(async () => {
        setError(null);

        try {
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            setPermissionStatus('granted');
            streamRef.current = stream;

            // Create AudioContext
            const audioContext = new AudioContext();
            audioContextRef.current = audioContext;

            // Resume context if suspended (browser autoplay policy)
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            // Load AudioWorklet module
            await audioContext.audioWorklet.addModule(cfg.workletPath);

            // Create source from microphone stream
            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;

            // Create AudioWorkletNode
            const workletNode = new AudioWorkletNode(audioContext, 'voice-feature-processor');
            workletNodeRef.current = workletNode;

            // Subscribe to messages from worklet
            workletNode.port.onmessage = handleWorkletMessage;

            // Connect the nodes (source -> worklet)
            // Note: We don't connect to destination to avoid feedback
            source.connect(workletNode);

            // Reset tracking
            pitchHistoryRef.current = [];
            jitterHistoryRef.current = [];
            shimmerHistoryRef.current = [];
            periodHistoryRef.current = [];
            amplitudeHistoryRef.current = [];
            speakingStartRef.current = null;
            silenceStartRef.current = Date.now();
            speakingDurationRef.current = 0;
            silenceDurationRef.current = 0;

            setIsInitialized(true);
            setIsRunning(true);

        } catch (err: any) {
            console.error('Failed to start voice analyzer:', err);

            if (err.name === 'NotAllowedError') {
                setPermissionStatus('denied');
                setError('麦克风权限被拒绝，请在浏览器设置中允许访问麦克风');
            } else if (err.name === 'NotFoundError') {
                setError('未找到麦克风设备');
            } else {
                setError(err.message || '启动语音分析失败');
            }
        }
    }, [cfg.workletPath, handleWorkletMessage]);

    // ---- Stop Analyzer ----
    const stopAnalyzer = useCallback(() => {
        // Disconnect worklet node
        if (workletNodeRef.current) {
            workletNodeRef.current.disconnect();
            workletNodeRef.current.port.onmessage = null;
            workletNodeRef.current = null;
        }

        // Disconnect source
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }

        // Stop all tracks in stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        // Close audio context
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        setIsRunning(false);
        setIsInitialized(false);
    }, []);

    // ---- Cleanup on unmount ----
    useEffect(() => {
        return () => {
            stopAnalyzer();
        };
    }, [stopAnalyzer]);

    return {
        // Current metrics
        metrics,

        // Controls
        startAnalyzer,
        stopAnalyzer,

        // Status
        isRunning,
        isInitialized,
        error,
        permissionStatus,

        // Audio context info
        sampleRate: audioContextRef.current?.sampleRate ?? 48000,
    };
};

// =====================================================
// EXPORTS
// =====================================================

export default useVoiceAnalyzer;
