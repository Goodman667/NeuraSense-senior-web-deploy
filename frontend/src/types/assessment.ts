/**
 * Assessment Types
 * 
 * Shared type definitions for psychological assessment data structures.
 * These types are used throughout the application for type-safe data handling.
 */

/**
 * DigitizerPoint - Represents a single point in a digitizer trace.
 * Used for recording pen strokes during Clock Drawing Test (画钟测验).
 */
export interface DigitizerPoint {
    /** X coordinate on the canvas (pixels) */
    x: number;
    /** Y coordinate on the canvas (pixels) */
    y: number;
    /** Pen pressure (0.0 - 1.0) */
    pressure: number;
    /** Timestamp in milliseconds since epoch */
    timestamp: number;
}

/**
 * Stroke - A collection of DigitizerPoints forming a continuous stroke.
 */
export interface Stroke {
    /** Unique identifier for the stroke */
    id: string;
    /** Array of points that make up the stroke */
    points: DigitizerPoint[];
    /** Color of the stroke (hex format) */
    color: string;
    /** Width of the stroke in pixels */
    width: number;
}

/**
 * ClockDrawingData - Complete data structure for a Clock Drawing Test session.
 */
export interface ClockDrawingData {
    /** All strokes drawn during the test */
    strokes: Stroke[];
    /** Total duration of the drawing session in milliseconds */
    duration: number;
    /** Canvas dimensions */
    canvasSize: {
        width: number;
        height: number;
    };
}

/**
 * AssessmentType - Types of psychological assessments available.
 */
export type AssessmentType = 'cdt' | 'phq9' | 'gad7' | 'mmse' | 'moca';

/**
 * AssessmentStatus - Status of an assessment session.
 */
export type AssessmentStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Assessment - Represents a psychological assessment session.
 */
export interface Assessment {
    /** Unique identifier */
    id: string;
    /** Assessment type */
    type: AssessmentType;
    /** Display name in Chinese */
    name: string;
    /** Display name in English */
    nameEn: string;
    /** Description of the assessment */
    description: string;
    /** Current status */
    status: AssessmentStatus;
    /** Calculated score (if completed) */
    score?: number;
    /** Timestamp when created */
    createdAt: string;
    /** Timestamp when completed */
    completedAt?: string;
}

/**
 * QuestionOption - Option for a multiple-choice question.
 */
export interface QuestionOption {
    /** Option value/score */
    value: number;
    /** Option label in Chinese */
    label: string;
}

/**
 * Question - A single question in a questionnaire-based assessment.
 */
export interface Question {
    /** Question ID */
    id: string;
    /** Question text in Chinese */
    text: string;
    /** Available options */
    options: QuestionOption[];
}

/**
 * QuestionnaireResponse - User's response to a questionnaire.
 */
export interface QuestionnaireResponse {
    /** Question ID */
    questionId: string;
    /** Selected option value */
    selectedValue: number;
    /** Timestamp when answered */
    answeredAt: string;
}
