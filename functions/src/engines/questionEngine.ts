/**
 * questionEngine.ts
 *
 * Pure function — no Firestore side effects.
 *
 * Implements the rolling-accuracy adaptive difficulty algorithm from the
 * CareMind AI architecture specification. Inspired by mastery-based
 * progression in Intelligent Tutoring Systems (Corbett & Anderson, 1994;
 * VanLehn, 2011).
 *
 * Algorithm:
 *   - Rolling window = last 5 answers (cross-session)
 *   - accuracy > 0.75 → difficulty += 1 (capped at Tier 3)
 *   - accuracy < 0.40 → difficulty -= 1 (floored at Tier 1)
 *   - otherwise       → no change
 *
 * Every decision produces an explanation string stored on QuestionResultDoc.
 * This satisfies the explainability requirement: clinicians can audit every
 * difficulty transition with its triggering accuracy value.
 */

import { DifficultyTier } from '../models/types';

export interface DifficultyDecision {
  newDifficulty: DifficultyTier;
  rollingAccuracy: number | null; // null = insufficient data
  explanation: string;
}

const WINDOW_SIZE = 5;
const UPPER_THRESHOLD = 0.75; // accuracy above this → increase difficulty
const LOWER_THRESHOLD = 0.40; // accuracy below this → decrease difficulty

/**
 * Computes the next difficulty tier based on the rolling accuracy of recent answers.
 *
 * @param recentResults - Ordered array of recent answer results (oldest first).
 *                        Only the last WINDOW_SIZE entries are used.
 * @param currentDifficulty - The patient's current difficulty tier.
 * @returns A DifficultyDecision with the new tier and a human-readable explanation.
 */
export function computeNextDifficulty(
  recentResults: Array<{ correct: boolean }>,
  currentDifficulty: DifficultyTier
): DifficultyDecision {
  const window = recentResults.slice(-WINDOW_SIZE);

  if (window.length < WINDOW_SIZE) {
    return {
      newDifficulty: currentDifficulty,
      rollingAccuracy: null,
      explanation: `Insufficient data (${window.length}/${WINDOW_SIZE} answers in window); maintaining Tier ${currentDifficulty}.`,
    };
  }

  const correctCount = window.filter((r) => r.correct).length;
  const rollingAccuracy = correctCount / WINDOW_SIZE;
  const pct = Math.round(rollingAccuracy * 100);

  if (rollingAccuracy > UPPER_THRESHOLD) {
    const next = Math.min(currentDifficulty + 1, 3) as DifficultyTier;
    if (next === currentDifficulty) {
      return {
        newDifficulty: currentDifficulty,
        rollingAccuracy,
        explanation: `Rolling accuracy ${pct}% > ${Math.round(UPPER_THRESHOLD * 100)}% threshold; already at maximum Tier 3, no change.`,
      };
    }
    return {
      newDifficulty: next,
      rollingAccuracy,
      explanation: `Rolling accuracy ${pct}% > ${Math.round(UPPER_THRESHOLD * 100)}% threshold; advancing difficulty from Tier ${currentDifficulty} to Tier ${next}.`,
    };
  }

  if (rollingAccuracy < LOWER_THRESHOLD) {
    const next = Math.max(currentDifficulty - 1, 1) as DifficultyTier;
    if (next === currentDifficulty) {
      return {
        newDifficulty: currentDifficulty,
        rollingAccuracy,
        explanation: `Rolling accuracy ${pct}% < ${Math.round(LOWER_THRESHOLD * 100)}% threshold; already at minimum Tier 1, no change.`,
      };
    }
    return {
      newDifficulty: next,
      rollingAccuracy,
      explanation: `Rolling accuracy ${pct}% < ${Math.round(LOWER_THRESHOLD * 100)}% threshold; stepping difficulty down from Tier ${currentDifficulty} to Tier ${next}.`,
    };
  }

  return {
    newDifficulty: currentDifficulty,
    rollingAccuracy,
    explanation: `Rolling accuracy ${pct}% within stable band [${Math.round(LOWER_THRESHOLD * 100)}%–${Math.round(UPPER_THRESHOLD * 100)}%]; maintaining Tier ${currentDifficulty}.`,
  };
}
