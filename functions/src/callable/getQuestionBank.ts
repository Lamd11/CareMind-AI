/**
 * getQuestionBank — Returns questions from both the static bank and the
 * AI-generated questions collection, with optional filtering.
 *
 * Used by the clinician dashboard Questions tab to browse all questions.
 *
 * Collections queried:
 *   - `questions`          → static bank (seeded, source: 'static_bank')
 *   - `generatedQuestions` → AI-generated (written by questionPreGenerator, source: 'ai_generated')
 */

import * as functions from 'firebase-functions';
import { QuestionDoc, QuestionCategory, DifficultyTier } from '../models/types';
import { db } from '../utils/firestore';

export const getQuestionBank = functions.https.onCall(
  async (
    data: { category?: QuestionCategory; difficultyTier?: DifficultyTier },
    context
  ) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    // Build filtered queries for both collections in parallel
    const buildQuery = (collection: string): FirebaseFirestore.Query => {
      let q = db().collection(collection) as FirebaseFirestore.Query;
      if (data.category) q = q.where('category', '==', data.category);
      if (data.difficultyTier) q = q.where('difficultyTier', '==', data.difficultyTier);
      return q;
    };

    const [staticSnap, aiSnap] = await Promise.all([
      buildQuery('questions').get(),
      buildQuery('generatedQuestions').get(),
    ]);

    // Map docs, ensuring source field is always set
    const staticQuestions: QuestionDoc[] = staticSnap.docs.map((d) => {
      const q = d.data() as QuestionDoc;
      return { ...q, source: q.source ?? 'static_bank' };
    });

    const aiQuestions: QuestionDoc[] = aiSnap.docs.map((d) => {
      const q = d.data() as QuestionDoc;
      return { ...q, source: q.source ?? 'ai_generated' };
    });

    // Merge and deduplicate (a question could be in both collections if the cache
    // doc and a pre-generated doc share the same questionId — keep first occurrence)
    const seen = new Set<string>();
    const merged: QuestionDoc[] = [];
    for (const q of [...staticQuestions, ...aiQuestions]) {
      if (!seen.has(q.questionId)) {
        seen.add(q.questionId);
        merged.push(q);
      }
    }

    // Sort: AI-generated first (preferred), then static bank (fallback)
    // Within each group sort by tier then category
    merged.sort((a, b) => {
      const srcA = a.source === 'ai_generated' ? 0 : 1;
      const srcB = b.source === 'ai_generated' ? 0 : 1;
      if (srcA !== srcB) return srcA - srcB;
      if (a.difficultyTier !== b.difficultyTier) return a.difficultyTier - b.difficultyTier;
      return a.category.localeCompare(b.category);
    });

    return { questions: merged, total: merged.length };
  }
);
