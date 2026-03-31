/**
 * getSessionResults — Returns the per-question breakdown for a specific session.
 *
 * Used by the clinician dashboard to see which questions a patient got
 * right or wrong, and per-domain accuracy for that session.
 */

import * as functions from 'firebase-functions';
import { QuestionResultDoc, QuestionDoc, QuestionCategory, UserDoc } from '../models/types';
import { db } from '../utils/firestore';

export interface SessionResultDetail {
  resultId: string;
  questionId: string;
  questionText: string;
  correctAnswer: string;
  selectedAnswer?: string; // not stored currently — future enhancement
  category: QuestionCategory;
  difficultyTier: number;
  correct: boolean;
  responseTimeMs: number;
  answeredAt: number;
}

export interface DomainAccuracy {
  correct: number;
  total: number;
  pct: number;
}

export const getSessionResults = functions.https.onCall(
  async (data: { userId: string; sessionId: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    // Verify clinician is linked to this patient
    const clinicianSnap = await db().collection('users').doc(context.auth.uid).get();
    const clinician = clinicianSnap.data() as UserDoc;
    if (clinician?.role !== 'clinician') {
      throw new functions.https.HttpsError('permission-denied', 'Only clinicians can access session results.');
    }

    const patientSnap = await db().collection('users').doc(data.userId).get();
    const patient = patientSnap.data() as UserDoc;
    if (patient?.linkedClinicianId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Patient not linked to this clinician.');
    }

    // Fetch all question results for this session
    const resultsSnap = await db()
      .collection('users')
      .doc(data.userId)
      .collection('sessions')
      .doc(data.sessionId)
      .collection('questionResults')
      .orderBy('answeredAt', 'asc')
      .get();

    const rawResults = resultsSnap.docs.map((d) => d.data() as QuestionResultDoc);

    if (rawResults.length === 0) {
      return { results: [], domainAccuracy: {} };
    }

    // Batch-fetch the question documents to get text + category
    const questionIds = [...new Set(rawResults.map((r) => r.questionId))];
    const questionDocs = new Map<string, QuestionDoc>();

    // Split into batches of 10 (Firestore 'in' query limit)
    for (let i = 0; i < questionIds.length; i += 10) {
      const batch = questionIds.slice(i, i + 10);
      const snap = await db()
        .collection('questions')
        .where('questionId', 'in', batch)
        .get();
      snap.docs.forEach((d) => {
        const q = d.data() as QuestionDoc;
        questionDocs.set(q.questionId, q);
      });
    }

    // Also check generatedQuestions collection for AI-generated ones
    for (const id of questionIds) {
      if (!questionDocs.has(id)) {
        // Try generatedQuestions collection (AI questions stored there)
        const genSnap = await db()
          .collection('generatedQuestions')
          .where('questionId', '==', id)
          .limit(1)
          .get();
        if (!genSnap.empty) {
          const q = genSnap.docs[0].data() as QuestionDoc;
          questionDocs.set(q.questionId, q);
        }
      }
    }

    // Build detailed results
    const results: SessionResultDetail[] = rawResults.map((r) => {
      const q = questionDocs.get(r.questionId);
      return {
        resultId: r.resultId,
        questionId: r.questionId,
        questionText: q?.text ?? '(question text unavailable)',
        correctAnswer: q?.correctAnswer ?? '',
        category: (q?.category ?? 'orientation') as QuestionCategory,
        difficultyTier: r.difficultyLevel,
        correct: r.correct,
        responseTimeMs: r.responseTimeMs,
        answeredAt: r.answeredAt,
      };
    });

    // Compute per-domain accuracy
    const domainAccuracy: Record<string, DomainAccuracy> = {};
    for (const r of results) {
      if (!domainAccuracy[r.category]) {
        domainAccuracy[r.category] = { correct: 0, total: 0, pct: 0 };
      }
      domainAccuracy[r.category].total++;
      if (r.correct) domainAccuracy[r.category].correct++;
    }
    for (const d of Object.values(domainAccuracy)) {
      d.pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
    }

    return { results, domainAccuracy };
  }
);
