/**
 * startSession — Creates a new session for the authenticated patient.
 * Inherits the difficulty tier from the patient's most recent session.
 */

import * as functions from 'firebase-functions';
import { v4 as uuidv4 } from 'uuid';
import { DifficultyTier, SessionDoc } from '../models/types';
import { db, getUser } from '../utils/firestore';

export const startSession = functions.https.onCall(
  async (data: { userId: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const { userId } = data;

    if (context.auth.uid !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Cannot create sessions for other users.');
    }

    const user = await getUser(userId);
    if (!user) {
      throw new functions.https.HttpsError('not-found', `User ${userId} not found.`);
    }

    // Inherit difficulty from most recent completed session (default tier 1)
    let currentDifficulty: DifficultyTier = 1;
    const recentSessions = await db()
      .collection('users')
      .doc(userId)
      .collection('sessions')
      .where('completedAt', '!=', null)
      .orderBy('completedAt', 'desc')
      .limit(1)
      .get();

    if (!recentSessions.empty) {
      const last = recentSessions.docs[0].data() as SessionDoc;
      currentDifficulty = last.difficultyLevel;
    }

    const sessionId = uuidv4();
    const sessionDoc: SessionDoc = {
      sessionId,
      userId,
      startedAt: Date.now(),
      totalQuestions: 0,
      correctAnswers: 0,
      difficultyLevel: currentDifficulty,
      answeredQuestionIds: [],
    };

    await db()
      .collection('users')
      .doc(userId)
      .collection('sessions')
      .doc(sessionId)
      .set(sessionDoc);

    return { sessionId };
  }
);
