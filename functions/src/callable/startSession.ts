/**
 * startSession — Creates a new session for the authenticated patient.
 * Inherits the difficulty tier from the patient's most recent session.
 */

import * as functions from 'firebase-functions';
import { v4 as uuidv4 } from 'uuid';
import { DifficultyTier, SessionDoc } from '../models/types';
import { db, getUser } from '../utils/firestore';
import { preGenerateNextSessionQueue } from '../engines/questionPreGenerator';

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

    // Check if a pre-generated queue is waiting from the previous session's completion
    const nextQueue = user.nextSessionQueue ?? null;

    const sessionWithQueue: SessionDoc & { questionQueue?: typeof nextQueue } = {
      ...sessionDoc,
      ...(nextQueue ? { questionQueue: nextQueue } : {}),
    };

    await db()
      .collection('users')
      .doc(userId)
      .collection('sessions')
      .doc(sessionId)
      .set(sessionWithQueue);

    if (nextQueue) {
      // Clear the consumed queue from the user doc
      await db().collection('users').doc(userId).update({ nextSessionQueue: null });
      functions.logger.info(`startSession: loaded pre-generated queue (${nextQueue.length} questions) for user ${userId}`);
    } else {
      // First session — await pre-generation so all 10 AI questions are ready before
      // the patient sees Q1. Parallel generation keeps this under ~5 seconds.
      functions.logger.info(`startSession: first session for user ${userId}, generating question queue now`);
      try {
        await preGenerateNextSessionQueue(userId, currentDifficulty);
        const userSnap = await db().collection('users').doc(userId).get();
        const freshQueue = userSnap.data()?.nextSessionQueue;
        if (freshQueue) {
          await db()
            .collection('users').doc(userId)
            .collection('sessions').doc(sessionId)
            .update({ questionQueue: freshQueue });
          await db().collection('users').doc(userId).update({ nextSessionQueue: null });
          functions.logger.info(`startSession: first-session queue ready (${freshQueue.length} questions)`);
        }
      } catch (err) {
        functions.logger.warn('startSession: first-session pre-generation failed, questions will be generated on-demand', err);
      }
    }

    return { sessionId };
  }
);
