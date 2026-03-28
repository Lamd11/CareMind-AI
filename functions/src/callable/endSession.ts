/**
 * endSession — Marks a session as complete and computes the session score.
 * Also returns an encouragement message based on score (rule-based, explainable).
 *
 * Writing completedAt triggers the onSessionComplete Firestore trigger,
 * which runs the Analytics Engine asynchronously.
 */

import * as functions from 'firebase-functions';
import { DifficultyTier } from '../models/types';
import { db, getSession } from '../utils/firestore';

function encouragementMessage(score: number): string {
  if (score >= 0.8) return "Excellent work! You're doing wonderfully.";
  if (score >= 0.6) return 'Good effort! Keep up the great work.';
  if (score >= 0.4) return 'Nice try! Every session helps your brain stay active.';
  return 'Keep practicing — you\'re doing great! Each session matters.';
}

export const endSession = functions.https.onCall(
  async (data: { sessionId: string; userId: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const { sessionId, userId } = data;

    const session = await getSession(userId, sessionId);
    if (!session) {
      throw new functions.https.HttpsError('not-found', 'Session not found.');
    }

    if (session.completedAt) {
      throw new functions.https.HttpsError('already-exists', 'Session already ended.');
    }

    const total = session.totalQuestions;
    const correct = session.correctAnswers;
    const sessionScore = total > 0 ? correct / total : 0;
    const now = Date.now();

    await db()
      .collection('users')
      .doc(userId)
      .collection('sessions')
      .doc(sessionId)
      .update({
        completedAt: now,
        sessionScore,
        rollingAverage: sessionScore,
      });

    return {
      sessionScore,
      totalQuestions: total,
      correctAnswers: correct,
      difficultyLevel: session.difficultyLevel as DifficultyTier,
      message: encouragementMessage(sessionScore),
    };
  }
);
