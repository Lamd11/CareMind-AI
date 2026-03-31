/**
 * onSessionComplete — Firestore trigger that fires when a session's completedAt field is set.
 *
 * This trigger is the entry point for the Analytics Engine pipeline:
 *   1. Detects that completedAt was just written (session completed)
 *   2. Fetches all completed sessions for this patient
 *   3. Delegates to notificationEngine for decline evaluation and alerting
 *
 * Event-driven design (not polling) ensures immediate analysis after every session
 * without additional infrastructure cost.
 */

import * as functions from 'firebase-functions';
import { SessionDoc } from '../models/types';
import { db } from '../utils/firestore';
import { runNotificationPipeline } from '../engines/notificationEngine';
import { preGenerateNextSessionQueue } from '../engines/questionPreGenerator';

export const onSessionComplete = functions.firestore
  .document('users/{userId}/sessions/{sessionId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() as SessionDoc;
    const after = change.after.data() as SessionDoc;

    // Only run when completedAt is newly set (was null, now has a value)
    if (before.completedAt || !after.completedAt) {
      return null;
    }

    const { userId } = context.params;
    console.log(`Session completed: ${context.params.sessionId} for user ${userId}`);

    // Fetch all completed sessions for this user (for decline analysis)
    const sessionsSnap = await db()
      .collection('users')
      .doc(userId)
      .collection('sessions')
      .where('completedAt', '!=', null)
      .orderBy('completedAt', 'asc')
      .limit(50) // more than enough for baseline + all analysis windows
      .get();

    const sessions = sessionsSnap.docs.map((d) => d.data() as SessionDoc);

    await runNotificationPipeline(userId, sessions);

    // Pre-generate questions for the patient's NEXT session in background.
    // Collects all question IDs used across all sessions so new sessions get fresh questions.
    const allUsedIds: string[] = sessions.flatMap((s) =>
      (s.answeredQuestionIds ?? [])
    );

    const nextTier = after.difficultyLevel ?? 1;

    preGenerateNextSessionQueue(userId, nextTier, allUsedIds).catch((err) =>
      functions.logger.warn(`onSessionComplete: pre-generation failed for user ${userId}`, err)
    );

    return null;
  });
