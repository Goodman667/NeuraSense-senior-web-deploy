/**
 * VirtualAvatar Component Types
 * 
 * Type definitions for the Live2D virtual avatar component.
 */

/**
 * Emotion types supported by the virtual avatar.
 * Used to trigger corresponding motion animations.
 */
export type EmotionType = 'happy' | 'sad' | 'neutral' | 'surprised' | 'angry' | 'anxious' | 'confused' | 'calm';

/**
 * Motion group names available in the Live2D model.
 */
export type MotionGroup = 'Idle' | 'TapBody' | 'Flick' | 'Pinch';

/**
 * Methods exposed by the VirtualAvatar component ref.
 */
export interface VirtualAvatarRef {
    /**
     * Make the avatar speak with TTS and emotion-based animation.
     * @param text - Text to speak in Chinese
     * @param emotion - Emotion to express during speech
     */
    speak: (text: string, emotion?: EmotionType) => Promise<void>;

    /**
     * Trigger a specific motion animation.
     * @param group - Motion group name
     * @param index - Motion index within the group
     */
    triggerMotion: (group: MotionGroup, index?: number) => void;

    /**
     * Set the avatar's expression.
     * @param expression - Expression name
     */
    setExpression: (expression: string) => void;

    /**
     * Start lip sync with current audio context.
     */
    startLipSync: () => void;

    /**
     * Stop lip sync.
     */
    stopLipSync: () => void;

    /**
     * Stop any ongoing speech audio and lip sync immediately.
     */
    stopSpeaking: () => void;
}

/**
 * Props for the VirtualAvatar component.
 */
export interface VirtualAvatarProps {
    /**
     * Path to the Live2D model JSON file.
     * @default '/models/kei/kei_basic_free.model3.json'
     */
    modelPath?: string;

    /**
     * Scale factor for the model.
     * @default 0.12
     */
    scale?: number;

    /**
     * Whether to enable eye tracking (follow mouse).
     * @default true
     */
    enableEyeTracking?: boolean;

    /**
     * Whether to enable lip sync during TTS.
     * @default true
     */
    enableLipSync?: boolean;

    /**
     * Callback when model is loaded.
     */
    onModelLoaded?: () => void;

    /**
     * Callback when model fails to load.
     */
    onModelError?: (error: Error) => void;

    /**
     * Callback when speech starts.
     */
    onSpeechStart?: () => void;

    /**
     * Callback when speech ends.
     */
    onSpeechEnd?: () => void;
}

/**
 * Lip sync state for the useLipSync hook.
 */
export interface LipSyncState {
    isActive: boolean;
    volume: number;
    mouthOpenY: number;
}

/**
 * Eye tracking state for the useEyeTracking hook.
 */
export interface EyeTrackingState {
    angleX: number;
    angleY: number;
    isTracking: boolean;
}
