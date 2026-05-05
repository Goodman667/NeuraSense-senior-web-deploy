/**
 * Shared Components Export
 * 
 * Barrel file for all shared components.
 */

export { VirtualAvatar } from './VirtualAvatar';
export type { VirtualAvatarRef, VirtualAvatarProps, EmotionType } from './VirtualAvatar';

export { DrawingCanvas } from './DrawingCanvas';
export type { DrawingCanvasRef, DrawingCanvasProps } from './DrawingCanvas';

export { ResultModal } from './ResultModal';
export type { ResultModalProps, AssessmentResult } from './ResultModal';

export { OculometricMonitor } from './OculometricMonitor';
export type { OculometricMonitorProps } from './OculometricMonitor';

export { VoiceAnalyzerMonitor } from './VoiceAnalyzerMonitor';
export type { VoiceAnalyzerMonitorProps } from './VoiceAnalyzerMonitor';

export { EmbodiedAvatar } from './EmbodiedAvatar';
export type { EmbodiedAvatarProps, EmbodiedAvatarRef } from './EmbodiedAvatar';

// Assessment scales
export { PHQ9Scale, type PHQ9Result, GAD7Scale, type GAD7Result, ScaleSelector } from './Assessment';

// Auth components
export { AuthModal, UserAvatar, type UserInfo } from './Auth';

// History components
export { AssessmentHistory } from './History';

// Dashboard
export { Dashboard, WelcomeGreeting, DailyTasksPanel } from './Dashboard';

// Journal
export { MoodJournal } from './Journal';

// Bio-signal AI components
export { EmotionDetector } from './EmotionDetector';
export { CognitiveTestPanel } from './CognitiveTest';
export { BioSignalAIPanel } from './BioSignalPanel';

// Crisis Support
export { CrisisPanel } from './Crisis';

// Gamification
export { AchievementCenter } from './Gamification';

// EMA Check-in
export { EMACheckIn } from './EMA';

// Community
export { CommunityFeed, CommunityLeaderboard, PrivateMessage } from './Community';

// Chat
export { PsyChat } from './Chat';

// JITAI
export { GuardianCard, InterventionModal } from './JITAI';

// Phenotyping
export { PhysiologicalInsights } from './Phenotyping';

// Immersive Biofeedback
// Immersive Biofeedback
export { BiofeedbackScene, ImmersiveCard } from './Immersive';

// User Guide
export { UserGuide } from './Guide/UserGuide';

// Temporarily disabled due to recharts/three.js compatibility
// export { StroopTest } from './CognitiveGame';
// export { EmotionRadarChart, VoiceSpectrogram, PredictionTrendChart, type EmotionData } from './Visualization';
// export { DualModalityReport, type SubjectiveData, type ObjectiveData } from './Report';
// export { BreathingBall3D } from './3D';
// export { QuestionStepper, type StepperQuestion, type StepperOption } from './Assessment/QuestionStepper';
