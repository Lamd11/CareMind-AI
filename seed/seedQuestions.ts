/**
 * seedQuestions.ts
 *
 * Writes the full 120-question bank to Firestore (or the local emulator).
 *
 * Usage:
 *   npx ts-node seedQuestions.ts                  # uses emulator
 *   FIREBASE_USE_PROD=true npx ts-node seedQuestions.ts  # uses production (requires service account)
 */

import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

import { orientationQuestions } from './questions/orientation';
import { shortTermRecallQuestions } from './questions/shortTermRecall';
import { attentionMemoryQuestions } from './questions/attentionMemory';
import { languageNamingQuestions } from './questions/languageNaming';
import { QuestionDoc } from './types';

// ── Firebase init ──────────────────────────────────────────────────────────
if (!process.env.FIREBASE_USE_PROD) {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
}

admin.initializeApp({ projectId: 'caremind-ai-demo' });
const db = admin.firestore();

// ── Assemble all questions ─────────────────────────────────────────────────
const allQuestions: QuestionDoc[] = [
  ...orientationQuestions,
  ...shortTermRecallQuestions,
  ...attentionMemoryQuestions,
  ...languageNamingQuestions,
].map((q) => ({ ...q, questionId: uuidv4(), source: 'static_bank' as const }));

console.log(`Total questions to seed: ${allQuestions.length}`);

// ── Batch write (Firestore limit: 500 per batch) ───────────────────────────
async function seed(): Promise<void> {
  const BATCH_SIZE = 500;

  for (let i = 0; i < allQuestions.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = allQuestions.slice(i, i + BATCH_SIZE);

    for (const question of chunk) {
      const ref = db.collection('questions').doc(question.questionId);
      batch.set(ref, question);
    }

    await batch.commit();
    console.log(`✓ Batch committed: questions ${i + 1}–${i + chunk.length}`);
  }

  // Print summary by domain and tier
  const summary: Record<string, Record<number, number>> = {};
  for (const q of allQuestions) {
    if (!summary[q.category]) summary[q.category] = { 1: 0, 2: 0, 3: 0 };
    summary[q.category][q.difficultyTier]++;
  }

  console.log('\n── Question Bank Summary ──');
  for (const [category, tiers] of Object.entries(summary)) {
    console.log(`  ${category}: Tier1=${tiers[1]}  Tier2=${tiers[2]}  Tier3=${tiers[3]}`);
  }
  console.log(`\nTotal: ${allQuestions.length} questions seeded successfully.`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
