/**
 * sessionStore.ts — Zustand store for managing the active session state.
 *
 * All adaptive logic lives in the Cloud Functions. This store is a thin
 * client-side state layer that tracks the current question flow.
 */

import { create } from 'zustand';
import { auth } from '../services/firebase';
import {
  startSessionFn,
  getNextQuestionFn,
  submitAnswerFn,
  endSessionFn,
} from '../services/functions';
import {
  QuestionDoc,
  DifficultyTier,
  SessionStatus,
  SessionResult,
} from '../types';

interface SessionState {
  sessionId: string | null;
  currentQuestion: QuestionDoc | null;
  currentDifficulty: DifficultyTier;
  difficultyExplanation: string;
  questionNumber: number;
  totalQuestions: number;
  correctCount: number;
  questionStartTime: number;
  sessionResult: SessionResult | null;
  status: SessionStatus;
  error: string | null;

  // Actions
  startNewSession: () => Promise<void>;
  submitAnswer: (selectedOption: string) => Promise<boolean>; // returns whether answer was correct
  fetchNextQuestion: () => Promise<void>;
  endSession: () => Promise<void>;
  reset: () => void;
}

const TOTAL_QUESTIONS = 10;

export const useSessionStore = create<SessionState>((set, get) => ({
  sessionId: null,
  currentQuestion: null,
  currentDifficulty: 1,
  difficultyExplanation: '',
  questionNumber: 0,
  totalQuestions: TOTAL_QUESTIONS,
  correctCount: 0,
  questionStartTime: 0,
  sessionResult: null,
  status: 'idle',
  error: null,

  startNewSession: async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      set({ status: 'error', error: 'Not authenticated' });
      return;
    }

    set({ status: 'loading', error: null });

    try {
      const result = await startSessionFn({ userId });
      const sessionId = result.data.sessionId;
      set({ sessionId, correctCount: 0, questionNumber: 0, sessionResult: null });
      await get().fetchNextQuestion();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start session';
      set({ status: 'error', error: message });
    }
  },

  fetchNextQuestion: async () => {
    const { sessionId } = get();
    const userId = auth.currentUser?.uid;
    if (!userId || !sessionId) return;

    set({ status: 'loading' });

    try {
      const result = await getNextQuestionFn({ userId, sessionId });
      const { question, difficultyLevel, difficultyExplanation, questionNumber } = result.data;

      set({
        currentQuestion: question,
        currentDifficulty: difficultyLevel as DifficultyTier,
        difficultyExplanation,
        questionNumber,
        questionStartTime: Date.now(),
        status: 'question',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load question';
      set({ status: 'error', error: message });
    }
  },

  submitAnswer: async (selectedOption: string): Promise<boolean> => {
    const { sessionId, currentQuestion, currentDifficulty, difficultyExplanation, questionStartTime, correctCount, questionNumber } = get();
    const userId = auth.currentUser?.uid;

    if (!userId || !sessionId || !currentQuestion) return false;

    set({ status: 'submitting' });

    const correct = selectedOption === currentQuestion.correctAnswer;
    const responseTimeMs = Date.now() - questionStartTime;

    try {
      await submitAnswerFn({
        sessionId,
        userId,
        questionId: currentQuestion.questionId,
        correct,
        responseTimeMs,
        difficultyLevel: currentDifficulty,
        difficultyExplanation,
      });

      const newCorrectCount = correct ? correctCount + 1 : correctCount;
      set({ correctCount: newCorrectCount });

      // Check if session is complete
      if (questionNumber >= TOTAL_QUESTIONS) {
        await get().endSession();
      } else {
        await get().fetchNextQuestion();
      }

      return correct;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit answer';
      set({ status: 'error', error: message });
      return false;
    }
  },

  endSession: async () => {
    const { sessionId } = get();
    const userId = auth.currentUser?.uid;
    if (!userId || !sessionId) return;

    set({ status: 'loading' });

    try {
      const result = await endSessionFn({ sessionId, userId });
      const { sessionScore, totalQuestions, correctAnswers, difficultyLevel, message } = result.data;

      set({
        sessionResult: {
          sessionScore,
          totalQuestions,
          correctAnswers,
          difficultyLevel: difficultyLevel as DifficultyTier,
          message,
        },
        status: 'complete',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to end session';
      set({ status: 'error', error: message });
    }
  },

  reset: () => {
    set({
      sessionId: null,
      currentQuestion: null,
      currentDifficulty: 1,
      difficultyExplanation: '',
      questionNumber: 0,
      correctCount: 0,
      questionStartTime: 0,
      sessionResult: null,
      status: 'idle',
      error: null,
    });
  },
}));
