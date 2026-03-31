// ─── Shared TypeScript interfaces for CareMind AI Cloud Functions ────────────
// Mirrors mobile/src/types/index.ts — keep in sync.

export type DifficultyTier = 1 | 2 | 3;

export type QuestionCategory =
  | 'orientation'
  | 'short_term_recall'
  | 'attention_memory'
  | 'language_naming';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type AlertType = 'sudden_drop' | 'sustained_decline' | 'gradual_decline';

export type UserRole = 'patient' | 'clinician';

export interface UserDoc {
  uid: string;
  role: UserRole;
  name: string;
  email: string;
  linkedClinicianId?: string;
  baselineScore?: number;
  last5Results?: Array<{ correct: boolean; responseTimeMs: number }>;
  nextSessionQueue?: QuestionDoc[]; // pre-generated questions for the patient's next session
  fcmToken?: string;          // FCM device token for push notifications
  createdAt: number;
}

export interface SessionDoc {
  sessionId: string;
  userId: string;
  startedAt: number;
  completedAt?: number;
  sessionScore?: number;
  totalQuestions: number;
  correctAnswers: number;
  difficultyLevel: DifficultyTier;
  rollingAverage?: number;
  answeredQuestionIds: string[];
  questionQueue?: QuestionDoc[]; // V2: pre-generated questions filled at session start
}

export interface QuestionResultDoc {
  resultId: string;
  sessionId: string;
  userId: string;
  questionId: string;
  correct: boolean;
  responseTimeMs: number;
  difficultyLevel: DifficultyTier;
  answeredAt: number;
  difficultyExplanation: string;
}

export interface QuestionDoc {
  questionId: string;
  text: string;
  options: [string, string, string, string];
  correctAnswer: string;
  difficultyTier: DifficultyTier;
  category: QuestionCategory;
  source?: 'ai_generated' | 'static_bank'; // V2: tracks whether Claude generated this
  generatedAt?: number; // Unix ms — set for ai_generated questions only
}

export interface AlertDoc {
  alertId: string;
  userId: string;
  clinicianId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  explanation: string;
  triggeredAt: number;
  acknowledged: boolean;
  suppressed?: boolean;
  suppressReason?: string;
}

// Analytics engine output
export interface AlertCandidate {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  explanation: string;
}

// Rate limiter output
export interface RateLimitResult {
  allowed: boolean;
  suppressReason?: string;
}
