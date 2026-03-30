/**
 * submitAnswer — Records a patient's answer for a question.
 *
 * Also updates:
 *   - session.totalQuestions (atomic increment)
 *   - session.correctAnswers (atomic increment if correct)
 *   - session.answeredQuestionIds (append)
 *   - user.last5Results (denormalized rolling window — max 5 entries)
 */

import * as functions from 'firebase-functions';
import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';
import { DifficultyTier, QuestionResultDoc } from '../models/types';
import { db, getUser } from '../utils/firestore';

export const submitAnswer = functions.https.onCall(
  async (
    data: {
      sessionId: string;
      userId: string;
      questionId: string;
      correct: boolean;
      responseTimeMs: number;
      difficultyLevel: DifficultyTier;
      difficultyExplanation: string;
    },
    context
  ) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const { sessionId, userId, questionId, correct, responseTimeMs, difficultyLevel, difficultyExplanation } = data;

    const resultId = uuidv4();
    const now = Date.now();

    const resultDoc: QuestionResultDoc = {
      resultId,
      sessionId,
      userId,
      questionId,
      correct,
      responseTimeMs,
      difficultyLevel,
      answeredAt: now,
      difficultyExplanation,
    };

    const batch = db().batch();

    // Write question result
    const resultRef = db()
      .collection('users')
      .doc(userId)
      .collection('sessions')
      .doc(sessionId)
      .collection('questionResults')
      .doc(resultId);
    batch.set(resultRef, resultDoc);

    // Atomically update session counters and answeredQuestionIds
    const sessionRef = db()
      .collection('users')
      .doc(userId)
      .collection('sessions')
      .doc(sessionId);

    batch.update(sessionRef, {
      totalQuestions: FieldValue.increment(1),
      ...(correct ? { correctAnswers: FieldValue.increment(1) } : {}),
      answeredQuestionIds: FieldValue.arrayUnion(questionId),
    });

    // Update denormalized last5Results on user doc
    const user = await getUser(userId);
    const currentLast5 = user?.last5Results ?? [];
    const newLast5 = [...currentLast5, correct].slice(-5); // keep only last 5

    const userRef = db().collection('users').doc(userId);
    batch.update(userRef, { last5Results: newLast5 });

    await batch.commit();

    return { ok: true };
  }
);
