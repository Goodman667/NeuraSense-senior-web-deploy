/**
 * useLipSync Hook
 * 
 * Monitors browser audio stream and maps volume amplitude to Live2D mouth parameters.
 * Used for lip-sync during TTS speech synthesis.
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import type { LipSyncState } from './types';

interface UseLipSyncOptions {
    /**
     * Sensitivity multiplier for volume to mouth mapping.
     * Higher values = more responsive mouth movement.
     * @default 1.5
     */
    sensitivity?: number;

    /**
     * Smoothing factor for mouth movement (0-1).
     * Higher values = smoother but slower response.
     * @default 0.5
     */
    smoothing?: number;

    /**
     * Minimum volume threshold to trigger mouth movement.
     * @default 0.01
     */
    threshold?: number;
}

interface UseLipSyncReturn {
    /** Current lip sync state */
    state: LipSyncState;

    /** Start monitoring audio for lip sync */
    startLipSync: () => Promise<void>;

    /** Stop monitoring audio */
    stopLipSync: () => void;

    /** Connect to a specific audio source */
    connectToAudio: (audioElement: HTMLAudioElement) => void;

    /** Connect to TTS utterance */
    connectToUtterance: (utterance: SpeechSynthesisUtterance) => void;
}

/**
 * Hook for lip-sync functionality using Web Audio API.
 * Maps audio volume to ParamMouthOpenY for Live2D models.
 */
export function useLipSync(options: UseLipSyncOptions = {}): UseLipSyncReturn {
    const {
        sensitivity = 1.5,
        smoothing = 0.5,
        threshold = 0.01,
    } = options;

    const [state, setState] = useState<LipSyncState>({
        isActive: false,
        volume: 0,
        mouthOpenY: 0,
    });

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const previousMouthOpenRef = useRef<number>(0);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    /**
     * Analyze audio data and calculate mouth opening.
     */
    const analyzeAudio = useCallback(() => {
        if (!analyserRef.current) return;

        const analyser = analyserRef.current;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // Calculate RMS (Root Mean Square) volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += (dataArray[i] / 255) ** 2;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        // Apply threshold
        const volume = rms > threshold ? rms : 0;

        // Calculate mouth opening with sensitivity
        const targetMouthOpen = Math.min(1, volume * sensitivity);

        // Apply smoothing for natural movement
        const smoothedMouthOpen =
            previousMouthOpenRef.current * smoothing +
            targetMouthOpen * (1 - smoothing);

        previousMouthOpenRef.current = smoothedMouthOpen;

        setState({
            isActive: true,
            volume,
            mouthOpenY: smoothedMouthOpen,
        });

        // Continue animation loop
        animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    }, [sensitivity, smoothing, threshold]);

    /**
     * Start lip sync by capturing system audio.
     */
    const startLipSync = useCallback(async () => {
        try {
            // Create audio context if not exists
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }

            const audioContext = audioContextRef.current;

            // Resume audio context if suspended
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            // Create analyser node
            analyserRef.current = audioContext.createAnalyser();
            analyserRef.current.fftSize = 256;
            analyserRef.current.smoothingTimeConstant = 0.8;

            // Start analysis loop
            analyzeAudio();
        } catch (error) {
            console.error('Failed to start lip sync:', error);
        }
    }, [analyzeAudio]);

    /**
     * Stop lip sync monitoring.
     */
    const stopLipSync = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }

        previousMouthOpenRef.current = 0;

        setState({
            isActive: false,
            volume: 0,
            mouthOpenY: 0,
        });
    }, []);

    /**
     * Connect to an HTML audio element.
     */
    const connectToAudio = useCallback(
        (audioElement: HTMLAudioElement) => {
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }

            const audioContext = audioContextRef.current;

            // Create analyser if not exists
            if (!analyserRef.current) {
                analyserRef.current = audioContext.createAnalyser();
                analyserRef.current.fftSize = 256;
            }

            // Create media element source and connect
            const source = audioContext.createMediaElementSource(audioElement);
            source.connect(analyserRef.current);
            analyserRef.current.connect(audioContext.destination);

            // Start analysis
            analyzeAudio();
        },
        [analyzeAudio]
    );

    /**
     * Connect to a TTS utterance for lip sync.
     * Note: Web Speech API doesn't provide direct audio access,
     * so we simulate lip sync based on speech timing.
     */
    const connectToUtterance = useCallback(
        (utterance: SpeechSynthesisUtterance) => {
            let intervalId: number | null = null;

            utterance.onstart = () => {
                setState((prev) => ({ ...prev, isActive: true }));

                // Simulate lip sync with random mouth movements
                // This is a workaround since TTS audio isn't directly accessible
                intervalId = window.setInterval(() => {
                    const randomVolume = 0.3 + Math.random() * 0.5;
                    const smoothedMouthOpen =
                        previousMouthOpenRef.current * smoothing +
                        randomVolume * (1 - smoothing);

                    previousMouthOpenRef.current = smoothedMouthOpen;

                    setState({
                        isActive: true,
                        volume: randomVolume,
                        mouthOpenY: smoothedMouthOpen,
                    });
                }, 50);
            };

            utterance.onend = () => {
                if (intervalId) {
                    clearInterval(intervalId);
                }
                stopLipSync();
            };

            utterance.onerror = () => {
                if (intervalId) {
                    clearInterval(intervalId);
                }
                stopLipSync();
            };
        },
        [smoothing, stopLipSync]
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopLipSync();
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [stopLipSync]);

    return {
        state,
        startLipSync,
        stopLipSync,
        connectToAudio,
        connectToUtterance,
    };
}
