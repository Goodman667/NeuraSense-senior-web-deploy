import { API_BASE } from '../../../config/api';
import type {
  SeniorChatApiResponse,
  SeniorCheckupAnalysisResponse,
  SeniorCheckupAnswer,
  SeniorCheckupQuestion,
  SeniorCheckupQuestionsResponse,
  SeniorPreference,
  SeniorQuestionAnswer,
  SeniorSummary,
  SeniorSupportContact,
  SeniorSupportResource,
} from '../types/senior';

type SeniorContactUpsert = Omit<SeniorSupportContact, 'user_id'> & { user_id?: string };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const seniorApi = {
  getProfile: (userId: string) => request<{ success: boolean; profile: SeniorPreference; contacts: SeniorSupportContact[] }>(`/senior/profile?user_id=${encodeURIComponent(userId)}`),
  updateProfile: (userId: string, payload: Partial<SeniorPreference>) => request<{ success: boolean; profile: SeniorPreference }>('/senior/profile', {
    method: 'PUT',
    body: JSON.stringify({ ...payload, user_id: userId }),
  }),
  saveContact: (userId: string, payload: SeniorContactUpsert) => request<{ success: boolean; contact: SeniorSupportContact }>('/senior/contacts', {
    method: 'POST',
    body: JSON.stringify({ ...payload, user_id: userId }),
  }),
  getContacts: (userId: string) => request<{ success: boolean; contacts: SeniorSupportContact[] }>(`/senior/contacts?user_id=${encodeURIComponent(userId)}`),
  createInterview: (userId: string, answers: SeniorQuestionAnswer[], inputMode = 'mixed') => request<{ success: boolean; interview: { id: string } }>('/senior/interviews', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, input_mode: inputMode, questions_answers: answers }),
  }),
  createSummary: (
    userId: string,
    answers: SeniorQuestionAnswer[],
    interviewId?: string,
    checkin?: Record<string, unknown>,
    recentContext?: Record<string, unknown>,
  ) => request<SeniorSummary>('/senior/summary', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, interview_id: interviewId, answers, checkin, recent_context: recentContext }),
  }),
  getDailySummary: (userId: string) => request<{ success: boolean; summary: SeniorSummary | null }>(`/senior/daily-summary?user_id=${encodeURIComponent(userId)}`),
  seniorChat: (userId: string, message: string, history: Array<{ role: string; content: string }>) => request<SeniorChatApiResponse>('/senior/chat', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, message, conversation_history: history }),
  }),
  getCheckupQuestions: (userId: string, mode = 'comprehensive') => request<SeniorCheckupQuestionsResponse>(`/senior/checkup/questions?user_id=${encodeURIComponent(userId)}&mode=${encodeURIComponent(mode)}`),
  analyzeCheckup: (
    userId: string,
    payload: {
      session_id?: string;
      mode?: string;
      questions: SeniorCheckupQuestion[];
      answers: SeniorCheckupAnswer[];
    },
  ) => request<SeniorCheckupAnalysisResponse>('/senior/checkup/analyze', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, mode: 'comprehensive', ...payload }),
  }),
  getSupportResources: (region = 'CN') => request<{ success: boolean; resources: SeniorSupportResource[] }>(`/senior/support-resources?region=${encodeURIComponent(region)}`),
  recordHelpEvent: (userId: string, eventType: string, metadata?: Record<string, unknown>, riskLevel?: string) => request<{ success: boolean }>('/senior/help-events', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, event_type: eventType, metadata, risk_level: riskLevel }),
  }),
};
