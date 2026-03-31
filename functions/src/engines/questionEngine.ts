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

export interface CompositeDecision {
  newDifficulty: DifficultyTier;
  compositeScore: number | null;     // null = insufficient data
  accuracyComponent: number | null;
  latencyComponent: number | null;
  consistencyComponent: number | null;
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

// ─── Composite three-signal adaptation (V2) ───────────────────────────────────
//
// Extends the rolling-accuracy algorithm with response latency and completion
// consistency — three cognitive performance signals described in the thesis
// methodology (Section 4.2). Weights are empirically grounded:
//   Accuracy 60%  — primary clinical indicator
//   Latency  25%  — response time slowing is an early dementia marker
//                   (Howieson et al., 2008; Taler & Phillips, 2008)
//   Consistency 15% — erratic timing indicates working memory strain
//                     (Baddeley, 1992)
//
// The algorithm adapts WITHIN a session (per-question), not only at session end.

const FAST_THRESHOLD_MS = 5000;  // responses ≤ 5s are maximally fast
const SLOW_THRESHOLD_MS = 30000; // responses ≥ 30s are maximally slow

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Normalises a single response time to a 0–1 latency score.
 * Faster responses score higher (cognitively more fluent).
 */
function latencyScore(responseTimeMs: number): number {
  return clamp(
    (SLOW_THRESHOLD_MS - responseTimeMs) / (SLOW_THRESHOLD_MS - FAST_THRESHOLD_MS),
    0,
    1
  );
}

/**
 * Computes the composite difficulty decision using three weighted signals.
 *
 * @param recentResults - Last N answer records (oldest first); must include responseTimeMs.
 * @param currentDifficulty - The patient's current difficulty tier.
 */
export function computeNextDifficultyComposite(
  recentResults: Array<{ correct: boolean; responseTimeMs: number }>,
  currentDifficulty: DifficultyTier
): CompositeDecision {
  const window = recentResults.slice(-WINDOW_SIZE);

  const nullDecision: CompositeDecision = {
    newDifficulty: currentDifficulty,
    compositeScore: null,
    accuracyComponent: null,
    latencyComponent: null,
    consistencyComponent: null,
    explanation: `Insufficient data (${window.length}/${WINDOW_SIZE} answers in window); maintaining Tier ${currentDifficulty}.`,
  };

  if (window.length < WINDOW_SIZE) return nullDecision;

  // Signal 1: Accuracy (0–1)
  const accuracyComponent = window.filter((r) => r.correct).length / WINDOW_SIZE;

  // Signal 2: Latency (0–1 per answer, averaged over window)
  const latencyScores = window.map((r) => latencyScore(r.responseTimeMs));
  const latencyComponent = latencyScores.reduce((sum, s) => sum + s, 0) / WINDOW_SIZE;

  // Signal 3: Consistency (1 − normalised standard deviation of response times)
  const times = window.map((r) => r.responseTimeMs);
  const meanTime = times.reduce((sum, t) => sum + t, 0) / WINDOW_SIZE;
  const variance = times.reduce((sum, t) => sum + Math.pow(t - meanTime, 2), 0) / WINDOW_SIZE;
  const stddev = Math.sqrt(variance);
  const consistencyComponent = clamp(1 - stddev / SLOW_THRESHOLD_MS, 0, 1);

  // Weighted composite
  const compositeScore =
    0.60 * accuracyComponent +
    0.25 * latencyComponent +
    0.15 * consistencyComponent;

  const accPct = Math.round(accuracyComponent * 100);
  const latPct = Math.round(latencyComponent * 100);
  const conPct = Math.round(consistencyComponent * 100);
  const compPct = Math.round(compositeScore * 100);

  const signalSummary = `Accuracy: ${accPct}%, Latency: ${latPct}%, Consistency: ${conPct}% → Composite: ${compPct}%`;

  if (compositeScore > UPPER_THRESHOLD) {
    const next = Math.min(currentDifficulty + 1, 3) as DifficultyTier;
    if (next === currentDifficulty) {
      return {
        newDifficulty: currentDifficulty,
        compositeScore, accuracyComponent, latencyComponent, consistencyComponent,
        explanation: `${signalSummary} > ${Math.round(UPPER_THRESHOLD * 100)}% threshold; advancing difficulty: already at maximum Tier 3, no change.`,
      };
    }
    return {
      newDifficulty: next,
      compositeScore, accuracyComponent, latencyComponent, consistencyComponent,
      explanation: `${signalSummary} > ${Math.round(UPPER_THRESHOLD * 100)}% threshold; advancing difficulty from Tier ${currentDifficulty} to Tier ${next}.`,
    };
  }

  if (compositeScore < LOWER_THRESHOLD) {
    const next = Math.max(currentDifficulty - 1, 1) as DifficultyTier;
    if (next === currentDifficulty) {
      return {
        newDifficulty: currentDifficulty,
        compositeScore, accuracyComponent, latencyComponent, consistencyComponent,
        explanation: `${signalSummary} < ${Math.round(LOWER_THRESHOLD * 100)}% threshold; stepping difficulty down: already at minimum Tier 1, no change.`,
      };
    }
    return {
      newDifficulty: next,
      compositeScore, accuracyComponent, latencyComponent, consistencyComponent,
      explanation: `${signalSummary} < ${Math.round(LOWER_THRESHOLD * 100)}% threshold; stepping difficulty down from Tier ${currentDifficulty} to Tier ${next}.`,
    };
  }

  return {
    newDifficulty: currentDifficulty,
    compositeScore, accuracyComponent, latencyComponent, consistencyComponent,
    explanation: `${signalSummary} within stable band [${Math.round(LOWER_THRESHOLD * 100)}%–${Math.round(UPPER_THRESHOLD * 100)}%]; maintaining Tier ${currentDifficulty}.`,
  };
}
