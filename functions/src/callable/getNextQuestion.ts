/**
 * getNextQuestion — Returns the next adaptive question for the patient.
 *
 * Algorithm:
 *   1. Fetch the last 5 results from the denormalized `last5Results` field on user doc
 *   2. Run computeNextDifficulty() to get the new tier + explanation
 *   3. Update session difficultyLevel in Firestore
 *   4. Query questions by new tier, excluding already-answered in this session
 *   5. Return a randomly selected question
 */

import * as functions from 'firebase-functions';
import { db, getQuestionsByTier, getSession, getUser } from '../utils/firestore';
import { computeNextDifficulty } from '../engines/questionEngine';

const TOTAL_QUESTIONS_PER_SESSION = 10;

export const getNextQuestion = functions.https.onCall(
  async (data: { userId: string; sessionId: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const { userId, sessionId } = data;

    const [user, session] = await Promise.all([
      getUser(userId),
      getSession(userId, sessionId),
    ]);

    if (!user) throw new functions.https.HttpsError('not-found', 'User not found.');
    if (!session) throw new functions.https.HttpsError('not-found', 'Session not found.');

    // Use denormalized last5Results from user doc (avoids collection group query)
    const last5 = (user.last5Results ?? []).map((correct) => ({ correct }));

    // Run adaptive algorithm
    const { newDifficulty, explanation } = computeNextDifficulty(
      last5,
      session.difficultyLevel
    );

    // Update session difficulty in Firestore
    await db()
      .collection('users')
      .doc(userId)
      .collection('sessions')
      .doc(sessionId)
      .update({ difficultyLevel: newDifficulty });

    // Fetch questions for this tier, excluding already answered in this session
    const available = await getQuestionsByTier(newDifficulty, session.answeredQuestionIds);

    if (available.length === 0) {
      // Fallback: try other tiers if this tier is exhausted
      const fallback = await getQuestionsByTier(
        newDifficulty === 1 ? 2 : 1,
        session.answeredQuestionIds
      );
      if (fallback.length === 0) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'No more available questions. Please end the session.'
        );
      }
      const picked = fallback[Math.floor(Math.random() * fallback.length)];
      return {
        question: picked,
        difficultyLevel: picked.difficultyTier,
        difficultyExplanation: explanation,
        questionNumber: session.totalQuestions + 1,
        totalQuestions: TOTAL_QUESTIONS_PER_SESSION,
      };
    }

    // Pick randomly from available questions
    const question = available[Math.floor(Math.random() * available.length)];

    return {
      question,
      difficultyLevel: newDifficulty,
      difficultyExplanation: explanation,
      questionNumber: session.totalQuestions + 1,
      totalQuestions: TOTAL_QUESTIONS_PER_SESSION,
    };
  }
);
