export type SeniorPage = 'home' | 'companion' | 'chat' | 'summary' | 'relax' | 'help' | 'settings';
export type SeniorRiskLevel = 'normal' | 'watch' | 'elevated' | 'urgent' | 'medical_emergency';
export type SeniorInputMode = 'voice' | 'text' | 'choice' | 'mixed';

export interface SeniorPreference {
  user_id: string;
  auto_enter_senior: boolean;
  font_scale: 'large' | 'larger' | 'largest';
  senior_voice_enabled: boolean;
  senior_voice_speed: number;
  senior_voice_name: string;
  text_fallback_enabled: boolean;
  caregiver_notify_enabled: boolean;
  preferred_region?: string;
}

export interface SeniorSupportContact {
  id?: string;
  user_id?: string;
  contact_name: string;
  contact_phone: string;
  relationship?: string;
  is_primary?: boolean;
  notify_on_elevated_risk?: boolean;
}

export interface SeniorQuestionAnswer {
  question_id: string;
  question_text: string;
  answer_text: string;
  input_mode: SeniorInputMode;
  confidence?: number;
}

export interface SeniorSummaryDimension {
  label: string;
  status: string;
  text: string;
}

export interface SeniorInsightCard {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  action?: string;
  tone?: 'normal' | 'watch' | 'elevated' | 'urgent' | 'medical_emergency';
  icon?: string;
  bullets?: string[];
  speak_text?: string;
}

export interface SeniorSafetyState {
  level: SeniorRiskLevel;
  title: string;
  message: string;
  steps: string[];
  should_contact_family: boolean;
  emergency_note?: string;
}

export interface SeniorRecommendedExercise {
  id: string;
  title: string;
  reason: string;
  duration_label: string;
  steps?: string[];
  play_prompt?: string;
  stop_rule?: string;
}

export interface SeniorMemorySnapshot {
  frequent_concerns: string[];
  preferred_support: string[];
  family_terms: string[];
  recent_patterns: Array<{
    date: string;
    signals: string[];
    action: string;
  }>;
  updated_at?: string;
}

export interface SeniorSummary {
  interview_id?: string;
  summary_title: string;
  plain_summary: string;
  dimensions: Record<'sleep' | 'mood' | 'stress' | 'social_support', SeniorSummaryDimension>;
  risk_level: SeniorRiskLevel;
  risk_explanation: string;
  recommendation: {
    type: 'relax' | 'chat' | 'help' | 'rest';
    title: string;
    reason: string;
    tool_id?: string;
  };
  next_action: {
    label: string;
    route: SeniorPage | string;
  };
  insight_cards?: SeniorInsightCard[];
  family_message?: string;
  safety?: SeniorSafetyState;
  recommended_exercise?: SeniorRecommendedExercise;
  memory_snapshot?: SeniorMemorySnapshot;
  tts_text: string;
  summary_generation_status: 'ai' | 'fallback';
  created_at: string;
}

export interface SeniorSupportResource {
  id: string;
  region: string;
  resource_type: string;
  name: string;
  phone?: string;
  url?: string;
  available_time?: string;
  description?: string;
  is_active: boolean;
}

export interface SeniorChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  riskLevel?: SeniorRiskLevel;
}
