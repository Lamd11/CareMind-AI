// ─── Shared TypeScript interfaces for CareMind AI ───────────────────────────
// These types are the single source of truth for both mobile and Cloud Functions.
// Any change here must be reflected in functions/src/models/types.ts

export type DifficultyTier = 1 | 2 | 3;

export type QuestionCategory =
  | 'orientation'
  | 'short_term_recall'
  | 'attention_memory'
  | 'language_naming';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type AlertType = 'sudden_drop' | 'sustained_decline' | 'gradual_decline';

export type UserRole = 'patient' | 'clinician';

// ─── Firestore document shapes ───────────────────────────────────────────────

export interface UserDoc {
  uid: string;
  role: UserRole;
  name: string;
  email: string;
  linkedClinicianId?: string; // set on patient documents
  baselineScore?: number;     // mean of first 5 sessions; set once
  last5Results?: boolean[];   // denormalized rolling window (last 5 answers)
  createdAt: number;          // Unix ms
}

export interface SessionDoc {
  sessionId: string;
  userId: string;
  startedAt: number;           // Unix ms
  completedAt?: number;        // Unix ms — set by endSession
  sessionScore?: number;       // 0.0–1.0 — computed on completion
  totalQuestions: number;
  correctAnswers: number;
  difficultyLevel: DifficultyTier;
  rollingAverage?: number;     // accuracy at session end
  answeredQuestionIds: string[]; // prevents repeat questions within session
}

export interface QuestionResultDoc {
  resultId: string;
  sessionId: string;
  userId: string;
  questionId: string;
  correct: boolean;
  responseTimeMs: number;
  difficultyLevel: DifficultyTier;
  answeredAt: number;          // Unix ms
  difficultyExplanation: string; // e.g. "Rolling accuracy 80% > 75%; advancing to Tier 2."
}

export interface QuestionDoc {
  questionId: string;
  text: string;
  options: [string, string, string, string]; // always exactly 4
  correctAnswer: string;       // must be one of options
  difficultyTier: DifficultyTier;
  category: QuestionCategory;
}

export interface AlertDoc {
  alertId: string;
  userId: string;
  clinicianId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;             // short summary for notification
  explanation: string;         // full explanation with actual numbers
  triggeredAt: number;         // Unix ms
  acknowledged: boolean;
  suppressed?: boolean;        // true if rate-limited (logged but not pushed)
  suppressReason?: string;
}

// ─── API payloads (Cloud Function callable inputs/outputs) ───────────────────

export interface StartSessionInput {
  userId: string;
}
export interface StartSessionOutput {
  sessionId: string;
}

export interface GetNextQuestionInput {
  userId: string;
  sessionId: string;
}
export interface GetNextQuestionOutput {
  question: QuestionDoc;
  difficultyLevel: DifficultyTier;
  difficultyExplanation: string;
  questionNumber: number;     // 1-indexed
  totalQuestions: number;     // always 10
}

export interface SubmitAnswerInput {
  sessionId: string;
  userId: string;
  questionId: string;
  correct: boolean;
  responseTimeMs: number;
  difficultyLevel: DifficultyTier;
  difficultyExplanation: string;
}
export interface SubmitAnswerOutput {
  ok: boolean;
}

export interface EndSessionInput {
  sessionId: string;
  userId: string;
}
export interface EndSessionOutput {
  sessionScore: number;
  totalQuestions: number;
  correctAnswers: number;
  difficultyLevel: DifficultyTier;
  message: string; // encouragement text
}

export interface GetPatientTrendsInput {
  userId: string;
  limit?: number; // default 30
}
export interface GetPatientTrendsOutput {
  sessions: SessionDoc[];
  alerts: AlertDoc[];
  baselineScore?: number;
  patientName: string;
}

export interface AcknowledgeAlertInput {
  alertId: string;
}
export interface AcknowledgeAlertOutput {
  ok: boolean;
}

// ─── Local app state (Zustand store) ────────────────────────────────────────

export type SessionStatus = 'idle' | 'loading' | 'question' | 'submitting' | 'complete' | 'error';

export interface SessionResult {
  sessionScore: number;
  totalQuestions: number;
  correctAnswers: number;
  difficultyLevel: DifficultyTier;
  message: string;
}
