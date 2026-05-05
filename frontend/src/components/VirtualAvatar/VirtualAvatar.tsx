/**
 * VirtualAvatar Component
 * 
 * Live2D virtual avatar with lip-sync, eye tracking, and emotion-based interactions.
 * Uses pixi-live2d-display for rendering the Live2D model.
 */

import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useCallback,
    useState,
} from 'react';
import type { VirtualAvatarProps, VirtualAvatarRef, EmotionType, MotionGroup } from './types';
import { API_BASE } from '../../config/api';

/**
 * Map emotion types to motion groups.
 */
const EMOTION_MOTION_MAP: Record<EmotionType, { group: string; index?: number }> = {
    neutral: { group: 'Idle', index: 0 },
    happy: { group: 'TapBody', index: 0 },
    sad: { group: 'Idle', index: 1 },
    surprised: { group: 'TapBody', index: 1 },
    angry: { group: 'TapBody', index: 2 },
    anxious: { group: 'Idle', index: 1 },
    confused: { group: 'TapBody', index: 1 },
    calm: { group: 'Idle', index: 0 },
};

const sanitizeSpeechText = (value: string) => {
    if (!value) return '';
    return value
        .replace(/```[\w-]*\n?/g, '\n')
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/https?:\/\/\S+|www\.\S+/g, ' ')
        .replace(/^\s{0,3}#{1,6}\s*/gm, '')
        .replace(/^\s{0,3}>\s*/gm, '')
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*\d+[.)、]\s+/gm, '')
        .replace(/[*_`~]+/g, '')
        .replace(/\|/g, '，')
        .replace(/[-—]{3,}/g, '。')
        .replace(/[<>#]+/g, '')
        .replace(/[ \t\f\v]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s*\n\s*/g, '。')
        .replace(/。{2,}/g, '。')
        .trim();
};

/**
 * VirtualAvatar Component
 * 
 * Renders a Live2D model with interactive features including:
 * - Lip sync during TTS speech
 * - Eye tracking following mouse cursor
 * - Emotion-based motion animations
 */
export const VirtualAvatar = forwardRef<VirtualAvatarRef, VirtualAvatarProps>(
    (
        {
            modelPath = '/models/kei/kei_basic_free.model3.json',
            scale = 0.12,
            enableEyeTracking = true,
            enableLipSync = true,
            onModelLoaded,
            onModelError,
            onSpeechStart,
            onSpeechEnd,
        },
        ref
    ) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const appRef = useRef<any>(null);
        const modelRef = useRef<any>(null);
        const [isModelLoaded, setIsModelLoaded] = useState(false);
        const [isSpeaking, setIsSpeaking] = useState(false);
        const [loadError, setLoadError] = useState<string | null>(null);
        const [loadingStatus, setLoadingStatus] = useState('正在初始化...');
        const onModelLoadedRef = useRef(onModelLoaded);
        const onModelErrorRef = useRef(onModelError);
        const onSpeechStartRef = useRef(onSpeechStart);
        const onSpeechEndRef = useRef(onSpeechEnd);
        const resizeHandlerRef = useRef<(() => void) | null>(null);
        const speechAudioRef = useRef<HTMLAudioElement | null>(null);

        // Eye tracking state
        const [eyeAngles, setEyeAngles] = useState({ x: 0, y: 0 });

        // Lip sync state
        const [mouthOpen, setMouthOpen] = useState(0);
        const lipSyncIntervalRef = useRef<number | null>(null);

        useEffect(() => {
            onModelLoadedRef.current = onModelLoaded;
        }, [onModelLoaded]);

        useEffect(() => {
            onModelErrorRef.current = onModelError;
        }, [onModelError]);

        useEffect(() => {
            onSpeechStartRef.current = onSpeechStart;
        }, [onSpeechStart]);

        useEffect(() => {
            onSpeechEndRef.current = onSpeechEnd;
        }, [onSpeechEnd]);

        /**
         * Initialize Live2D and load model
         */
        useEffect(() => {
            if (!containerRef.current) return;

            let isDestroyed = false;
            let app: any = null;

            const init = async () => {
                try {
                    setLoadingStatus('加载 PIXI.js...');

                    // Import PIXI
                    const PIXI = await import('pixi.js');

                    // Set PIXI on window (required by pixi-live2d-display)
                    (window as any).PIXI = PIXI;

                    if (isDestroyed) return;

                    setLoadingStatus('加载 Live2D 库...');

                    // Import Live2D display - explicitly use cubism4 module
                    // This requires the Cubism 4 SDK to be loaded in index.html
                    const { Live2DModel } = await import('pixi-live2d-display/cubism4');

                    // Register the PIXI Ticker for animation updates
                    Live2DModel.registerTicker(PIXI.Ticker);

                    if (isDestroyed) return;

                    setLoadingStatus('创建渲染器...');

                    // Create PIXI application
                    app = new PIXI.Application({
                        backgroundAlpha: 0,
                        resizeTo: window,
                        antialias: true,
                    });

                    if (isDestroyed) return;

                    // Add canvas to container
                    containerRef.current?.appendChild(app.view as HTMLCanvasElement);
                    appRef.current = app;

                    setLoadingStatus('加载模型文件...');

                    // Load Live2D model
                    const model = await Live2DModel.from(modelPath, {
                        autoInteract: false,
                    });

                    if (isDestroyed) {
                        model.destroy();
                        return;
                    }

                    modelRef.current = model;

                    // Configure model - use larger scale for visibility
                    const actualScale = Math.max(scale, 0.18);
                    model.scale.set(actualScale);
                    model.anchor.set(0.5, 1); // Anchor at feet for full body view

                    // Position at bottom-right - show full body
                    const updatePosition = () => {
                        if (!model || !app) return;
                        model.x = app.screen.width - model.width / 2 - 30;
                        model.y = app.screen.height - 20; // Feet near bottom
                    };

                    updatePosition();
                    resizeHandlerRef.current = updatePosition;
                    window.addEventListener('resize', updatePosition);

                    // Add to stage
                    app.stage.addChild(model);

                    setIsModelLoaded(true);
                    setLoadError(null);
                    setLoadingStatus('');
                    onModelLoadedRef.current?.();

                    console.log('✅ Live2D model loaded successfully');

                } catch (error: any) {
                    console.error('Failed to load Live2D:', error);
                    const errorMsg = error?.message || String(error);

                    // Provide more helpful error messages
                    if (errorMsg.includes('Cubism') || errorMsg.includes('cubism')) {
                        setLoadError('Cubism SDK 加载失败，请检查 index.html');
                    } else if (errorMsg.includes('404') || errorMsg.includes('not found')) {
                        setLoadError('模型文件未找到');
                    } else {
                        setLoadError(`${errorMsg.substring(0, 80)}`);
                    }
                    onModelErrorRef.current?.(error);
                }
            };

            init();

            // Cleanup
            return () => {
                isDestroyed = true;
                if (resizeHandlerRef.current) {
                    window.removeEventListener('resize', resizeHandlerRef.current);
                    resizeHandlerRef.current = null;
                }
                if (lipSyncIntervalRef.current) {
                    clearInterval(lipSyncIntervalRef.current);
                    lipSyncIntervalRef.current = null;
                }
                if (modelRef.current) {
                    try {
                        modelRef.current.destroy();
                    } catch { }
                    modelRef.current = null;
                }
                if (appRef.current) {
                    try {
                        appRef.current.destroy(true);
                    } catch { }
                    appRef.current = null;
                }
                setIsModelLoaded(false);
            };
        }, [modelPath, scale]);

        /**
         * Mouse tracking for eye movement.
         */
        useEffect(() => {
            if (!enableEyeTracking || !isModelLoaded) return;

            const handleMouseMove = (event: MouseEvent) => {
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;

                const relativeX = (event.clientX - centerX) / (window.innerWidth / 2);
                const relativeY = (event.clientY - centerY) / (window.innerHeight / 2);

                const angleX = Math.max(-30, Math.min(30, relativeX * 30));
                const angleY = Math.max(-30, Math.min(30, -relativeY * 30));

                setEyeAngles({ x: angleX, y: angleY });
            };

            window.addEventListener('mousemove', handleMouseMove);
            return () => window.removeEventListener('mousemove', handleMouseMove);
        }, [enableEyeTracking, isModelLoaded]);

        /**
         * Apply eye angles to model.
         */
        useEffect(() => {
            if (!modelRef.current) return;

            const model = modelRef.current;
            const coreModel = model.internalModel?.coreModel;

            if (coreModel) {
                try {
                    coreModel.setParameterValueById?.('ParamAngleX', eyeAngles.x);
                    coreModel.setParameterValueById?.('ParamAngleY', eyeAngles.y);
                    coreModel.setParameterValueById?.('ParamEyeBallX', eyeAngles.x / 30);
                    coreModel.setParameterValueById?.('ParamEyeBallY', eyeAngles.y / 30);
                } catch {
                    // Silently fail
                }
            }
        }, [eyeAngles]);

        /**
         * Apply mouth open to model.
         */
        useEffect(() => {
            if (!modelRef.current || !enableLipSync) return;

            const model = modelRef.current;
            const coreModel = model.internalModel?.coreModel;

            if (coreModel) {
                try {
                    coreModel.setParameterValueById?.('ParamMouthOpenY', mouthOpen);
                } catch {
                    // Silently fail
                }
            }
        }, [mouthOpen, enableLipSync]);

        /**
         * Trigger a motion animation.
         */
        const triggerMotion = useCallback((group: MotionGroup, index?: number) => {
            if (!modelRef.current) return;

            try {
                modelRef.current.motion(group, index);
            } catch (error) {
                console.warn(`Failed to trigger motion ${group}:`, error);
            }
        }, []);

        // Emotion state validation
        const [currentEmotion, setCurrentEmotion] = useState<EmotionType>('neutral');

        // Parameter definition for emotions
        const EMOTION_PARAMS: Record<EmotionType, Record<string, number>> = {
            neutral: {
                'ParamMouthForm': 0,
                'ParamBrowLY': 0,
                'ParamBrowRY': 0,
                'ParamBrowLAngle': 0,
                'ParamBrowRAngle': 0,
            },
            happy: {
                'ParamMouthForm': 1,
                'ParamCheek': 1,
                'ParamEyeLOpen': 1, // Ensure eyes are open/happy
                'ParamEyeROpen': 1,
                'ParamBrowLY': 0.2,
                'ParamBrowRY': 0.2
            },
            sad: {
                'ParamMouthForm': -1,
                'ParamBrowLY': -0.4,
                'ParamBrowRY': -0.4,
                'ParamBrowLAngle': 0.1,
                'ParamBrowRAngle': 0.1,
                'ParamEyeLOpen': 0.8,
                'ParamEyeROpen': 0.8,
            },
            angry: {
                'ParamMouthForm': -0.5,
                'ParamBrowLAngle': 0.6,
                'ParamBrowRAngle': 0.6,
                'ParamEyeLOpen': 0.8,
                'ParamEyeROpen': 0.8,
            },
            surprised: {
                'ParamMouthForm': 0,
                'ParamEyeLOpen': 1.2,
                'ParamEyeROpen': 1.2,
                'ParamBrowLY': 0.5,
                'ParamBrowRY': 0.5,
            },
            anxious: {
                'ParamBrowLY': -0.4,
                'ParamBrowRY': -0.4,
                'ParamMouthForm': -0.5
            },
            confused: {
                'ParamBrowLY': 0.2,
                'ParamBrowRY': -0.2,
            },
            calm: {
                'ParamMouthForm': 0,
            }
        };

        // Enforce expression parameters every frame
        useEffect(() => {
            if (!modelRef.current || !appRef.current) return;

            const enforceExpression = () => {
                const model = modelRef.current;
                if (!model || !model.internalModel || !model.internalModel.coreModel) return;

                const core = model.internalModel.coreModel;
                const params = EMOTION_PARAMS[currentEmotion] || EMOTION_PARAMS.neutral;

                // Apply all defined parameters for the current emotion
                Object.entries(params).forEach(([id, value]) => {
                    // Start checking if setParameterValueById exists
                    if (core.setParameterValueById) {
                        core.setParameterValueById(id, value);
                    }
                });
            };

            // Add to ticker
            appRef.current.ticker.add(enforceExpression);

            return () => {
                if (appRef.current && appRef.current.ticker) {
                    appRef.current.ticker.remove(enforceExpression);
                }
            };
        }, [currentEmotion, isModelLoaded]);

        /**
         * Set expression.
         */
        const setExpression = useCallback((expression: string) => {
            // Map string expression to EmotionType if valid
            if (Object.keys(EMOTION_PARAMS).includes(expression)) {
                setCurrentEmotion(expression as EmotionType);
            }
        }, []);

        /**
         * Speak with TTS and emotion.
         */
        const speak = useCallback(
            async (text: string, emotion: EmotionType = 'neutral'): Promise<void> => {
                const speechText = sanitizeSpeechText(text) || '我在这里。';

                // Stop previous audio before starting a new reply. Without this,
                // switching tabs or sending a new message can leave old TTS playing.
                if (speechAudioRef.current) {
                    speechAudioRef.current.pause();
                    speechAudioRef.current.currentTime = 0;
                    speechAudioRef.current = null;
                }
                window.speechSynthesis?.cancel();

                // Update current emotion state
                setCurrentEmotion(emotion);

                // 将情绪映射到 TTS 情感
                const emotionMap: Record<string, string> = {
                    neutral: 'gentle',
                    happy: 'cheerful',
                    sad: 'sad',
                    anxious: 'calm',
                    calm: 'calm',
                    confused: 'gentle',
                };
                const ttsEmotion = emotionMap[emotion] || 'friendly';

                // Trigger emotion motion (body movement)
                if (modelRef.current) {
                    const motionConfig = EMOTION_MOTION_MAP[emotion] || EMOTION_MOTION_MAP.neutral;
                    triggerMotion(motionConfig.group as MotionGroup, motionConfig.index);
                }

                try {
                    // 调用后端 TTS API 获取自然语音
                    const response = await fetch(`${API_BASE}/tts`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: speechText,
                            // Xiaoyi is a brighter, livelier Mandarin female voice.
                            // It feels less mechanical than the previous default Xiaoxiao.
                            voice: 'xiaoyi',
                            emotion: emotion === 'sad' ? 'empathetic' : ttsEmotion,
                        }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.audio) {
                            // 播放 base64 MP3 音频
                            const audioData = `data:audio/mp3;base64,${data.audio}`;
                            const audio = new Audio(audioData);
                            speechAudioRef.current = audio;

                            audio.onplay = () => {
                                setIsSpeaking(true);
                                onSpeechStartRef.current?.();

                                // Start lip sync simulation
                                if (enableLipSync) {
                                    lipSyncIntervalRef.current = window.setInterval(() => {
                                        setMouthOpen(0.3 + Math.random() * 0.5);
                                    }, 100);
                                }
                            };

                            audio.onended = () => {
                                setIsSpeaking(false);
                                setMouthOpen(0);
                                speechAudioRef.current = null;
                                // Optional: Reset emotion after speaking?
                                // setCurrentEmotion('neutral'); // Uncomment if desired
                                if (lipSyncIntervalRef.current) {
                                    clearInterval(lipSyncIntervalRef.current);
                                    lipSyncIntervalRef.current = null;
                                }
                                onSpeechEndRef.current?.();
                            };

                            audio.onerror = () => {
                                console.error('Audio playback error');
                                setIsSpeaking(false);
                                setMouthOpen(0);
                                speechAudioRef.current = null;
                                if (lipSyncIntervalRef.current) {
                                    clearInterval(lipSyncIntervalRef.current);
                                    lipSyncIntervalRef.current = null;
                                }
                            };

                            await audio.play();
                            return;
                        }
                    }
                } catch (error) {
                    console.warn('Edge TTS failed, falling back to browser speech:', error);
                }

                // 降级到浏览器语音合成
                if (!window.speechSynthesis) {
                    console.error('Speech synthesis not supported');
                    return;
                }

                return new Promise<void>((resolve, reject) => {
                    window.speechSynthesis.cancel();
                    const utterance = new SpeechSynthesisUtterance(speechText);
                    utterance.lang = 'zh-CN';
                    utterance.rate = 0.95;
                    utterance.pitch = 1.1;
                    utterance.volume = 0.9;

                    const voices = window.speechSynthesis.getVoices();
                    const chineseVoice = voices.find(v => v.lang.includes('zh') || v.lang.includes('CN'));
                    if (chineseVoice) utterance.voice = chineseVoice;

                    utterance.onstart = () => {
                        setIsSpeaking(true);
                        onSpeechStartRef.current?.();
                        if (enableLipSync) {
                            lipSyncIntervalRef.current = window.setInterval(() => {
                                setMouthOpen(0.3 + Math.random() * 0.5);
                            }, 100);
                        }
                    };

                    utterance.onend = () => {
                        setIsSpeaking(false);
                        setMouthOpen(0);
                        if (lipSyncIntervalRef.current) {
                            clearInterval(lipSyncIntervalRef.current);
                            lipSyncIntervalRef.current = null;
                        }
                        onSpeechEndRef.current?.();
                        resolve();
                    };

                    utterance.onerror = (event) => {
                        setIsSpeaking(false);
                        setMouthOpen(0);
                        if (lipSyncIntervalRef.current) {
                            clearInterval(lipSyncIntervalRef.current);
                            lipSyncIntervalRef.current = null;
                        }
                        reject(new Error(`Speech error: ${event.error}`));
                    };

                    window.speechSynthesis.speak(utterance);
                });
            },
            [enableLipSync, triggerMotion]
        );

        /**
         * Start lip sync manually.
         */
        const startLipSync = useCallback(() => {
            if (lipSyncIntervalRef.current) return;
            lipSyncIntervalRef.current = window.setInterval(() => {
                setMouthOpen(0.3 + Math.random() * 0.5);
            }, 100);
        }, []);

        /**
         * Stop lip sync manually.
         */
        const stopLipSync = useCallback(() => {
            setMouthOpen(0);
            if (lipSyncIntervalRef.current) {
                clearInterval(lipSyncIntervalRef.current);
                lipSyncIntervalRef.current = null;
            }
        }, []);

        const stopSpeaking = useCallback(() => {
            if (speechAudioRef.current) {
                speechAudioRef.current.pause();
                speechAudioRef.current.currentTime = 0;
                speechAudioRef.current = null;
            }
            window.speechSynthesis?.cancel();
            setIsSpeaking(false);
            stopLipSync();
            onSpeechEndRef.current?.();
        }, [stopLipSync]);

        // Expose methods via ref
        useImperativeHandle(
            ref,
            () => ({
                speak,
                triggerMotion,
                setExpression,
                startLipSync,
                stopLipSync,
                stopSpeaking,
            }),
            [speak, triggerMotion, setExpression, startLipSync, stopLipSync, stopSpeaking]
        );

        return (
            <div
                ref={containerRef}
                className="fixed inset-0 pointer-events-none z-40"
                style={{ overflow: 'hidden' }}
                aria-hidden="true"
            >
                {/* Loading indicator */}
                {!isModelLoaded && !loadError && loadingStatus && (
                    <div className="absolute bottom-4 right-4 text-gray-400 text-sm bg-white/80 px-3 py-2 rounded-lg shadow">
                        <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            <span>{loadingStatus}</span>
                        </div>
                    </div>
                )}

                {/* Error indicator */}
                {loadError && (
                    <div className="absolute bottom-4 right-4 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg shadow border border-red-200 max-w-xs">
                        <div className="flex items-start space-x-2">
                            <span className="flex-shrink-0">⚠️</span>
                            <span className="break-words">{loadError}</span>
                        </div>
                    </div>
                )}

                {/* Speaking indicator */}
                {isSpeaking && (
                    <div className="absolute bottom-4 right-4 flex items-center space-x-2 text-primary-500 bg-white/80 px-3 py-2 rounded-lg shadow">
                        <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                        <span className="text-sm">正在说话...</span>
                    </div>
                )}
            </div>
        );
    }
);

VirtualAvatar.displayName = 'VirtualAvatar';
