/**
 * firestore.ts — Typed Firestore helpers for Cloud Functions
 */

import * as admin from 'firebase-admin';
import { SessionDoc, UserDoc, AlertDoc, QuestionDoc } from '../models/types';

export const db = () => admin.firestore();

// ── Typed getters ─────────────────────────────────────────────────────────

export async function getUser(userId: string): Promise<UserDoc | null> {
  const snap = await db().collection('users').doc(userId).get();
  return snap.exists ? (snap.data() as UserDoc) : null;
}

export async function getSession(userId: string, sessionId: string): Promise<SessionDoc | null> {
  const snap = await db()
    .collection('users')
    .doc(userId)
    .collection('sessions')
    .doc(sessionId)
    .get();
  return snap.exists ? (snap.data() as SessionDoc) : null;
}

export async function getCompletedSessions(userId: string, limit = 30): Promise<SessionDoc[]> {
  const snap = await db()
    .collection('users')
    .doc(userId)
    .collection('sessions')
    .where('completedAt', '!=', null)
    .orderBy('completedAt', 'asc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as SessionDoc);
}

export async function getQuestionsByTier(
  tier: number,
  exclude: string[] = [],
  category?: string
): Promise<QuestionDoc[]> {
  let query = db()
    .collection('questions')
    .where('difficultyTier', '==', tier) as FirebaseFirestore.Query;

  if (category) {
    query = query.where('category', '==', category);
  }

  const snap = await query.get();
  const all = snap.docs.map((d) => d.data() as QuestionDoc);
  return all.filter((q) => !exclude.includes(q.questionId));
}

export async function getRecentAlerts(userId: string, severity: string, since: number): Promise<AlertDoc[]> {
  const snap = await db()
    .collection('alerts')
    .where('userId', '==', userId)
    .where('severity', '==', severity)
    .where('suppressed', '==', false)
    .where('triggeredAt', '>', since)
    .limit(5)
    .get();
  return snap.docs.map((d) => d.data() as AlertDoc);
}
