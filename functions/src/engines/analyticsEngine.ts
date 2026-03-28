/**
 * analyticsEngine.ts
 *
 * Pure function — no Firestore side effects.
 *
 * Implements longitudinal decline detection using:
 *   1. Sudden drop detection (instantaneous change-point, Basseville & Nikiforov 1993)
 *   2. Sustained decline detection (N-consecutive threshold breach)
 *   3. Gradual decline detection (linear regression slope over sliding window)
 *
 * All comparisons are made against a locked baseline (mean of first 5 sessions).
 * No alerts are generated until the baseline is established (< 5 sessions).
 *
 * Alert severity:
 *   HIGH   — sudden drop OR 3+ consecutive sessions below low threshold
 *   MEDIUM — 2 consecutive sessions below low threshold
 *   LOW    — negative trend slope (gradual decline)
 *
 * Only the highest severity alert is emitted per evaluation.
 * Every alert includes a human-readable `explanation` field with actual numeric values.
 */

import { AlertCandidate, SessionDoc } from '../models/types';

// Thresholds
const BASELINE_SESSION_COUNT = 5;
const SUDDEN_DROP_FACTOR = 0.70;      // score < baseline × 0.70 → HIGH (sudden drop)
const LOW_THRESHOLD_FACTOR = 0.85;    // score < baseline × 0.85 → sustained decline
const GRADUAL_SLOPE_THRESHOLD = -0.02; // slope per session < this → gradual decline (LOW)
const GRADUAL_WINDOW = 7;             // sessions used for slope calculation

/**
 * Evaluates completed sessions for a patient and returns an alert candidate
 * if a clinically meaningful decline pattern is detected.
 *
 * @param sessions - All sessions for this patient, ordered by startedAt ASCENDING.
 *                   Only sessions with a valid sessionScore are considered.
 * @param baselineScore - The pre-computed baseline (mean of first 5 sessions).
 *                        If undefined, the function computes and returns it if possible.
 * @returns { alert: AlertCandidate | null, computedBaseline: number | null }
 */
export function evaluateDecline(
  sessions: SessionDoc[],
  baselineScore: number | undefined
): { alert: AlertCandidate | null; computedBaseline: number | null } {
  // Only consider completed sessions with a score
  const completed = sessions.filter(
    (s): s is SessionDoc & { sessionScore: number } =>
      s.completedAt !== undefined && s.sessionScore !== undefined
  );

  // Need at least BASELINE_SESSION_COUNT sessions to establish baseline
  if (completed.length < BASELINE_SESSION_COUNT) {
    return { alert: null, computedBaseline: null };
  }

  // Compute baseline if not yet set (only from first 5 sessions)
  let baseline = baselineScore;
  if (baseline === undefined) {
    const baselineSessions = completed.slice(0, BASELINE_SESSION_COUNT);
    baseline = mean(baselineSessions.map((s) => s.sessionScore));
  }

  const latestScore = completed[completed.length - 1].sessionScore;
  const lowThreshold = baseline * LOW_THRESHOLD_FACTOR;
  const suddenDropThreshold = baseline * SUDDEN_DROP_FACTOR;

  // ── 1. Sudden drop (HIGH) ─────────────────────────────────────────────────
  if (latestScore < suddenDropThreshold) {
    const latestPct = pct(latestScore);
    const baselinePct = pct(baseline);
    const dropPct = pct(1 - latestScore / baseline);
    return {
      alert: {
        type: 'sudden_drop',
        severity: 'HIGH',
        message: 'Significant single-session decline detected. Immediate review recommended.',
        explanation:
          `Session score ${latestPct}% is ${dropPct}% below baseline ${baselinePct}% ` +
          `(threshold: scores below ${pct(SUDDEN_DROP_FACTOR)}% of baseline trigger HIGH alert). ` +
          `This may indicate acute cognitive change.`,
      },
      computedBaseline: baseline,
    };
  }

  // ── 2. Sustained decline — HIGH (3+ consecutive below lowThreshold) ────────
  const sustained = checkSustainedDecline(completed, lowThreshold);
  if (sustained.count >= 3) {
    const scores = sustained.scores.slice(-3).map(pct).join('%, ');
    return {
      alert: {
        type: 'sustained_decline',
        severity: 'HIGH',
        message: 'Sustained cognitive decline detected across 3+ sessions. Review recommended.',
        explanation:
          `Last ${sustained.count} session scores all below low threshold ${pct(lowThreshold)}% ` +
          `(${pct(LOW_THRESHOLD_FACTOR)}% of baseline ${pct(baseline)}%): ${scores}%. ` +
          `Sustained decline over 3+ sessions indicates a clinically significant trend.`,
      },
      computedBaseline: baseline,
    };
  }

  // ── 3. Sustained decline — MEDIUM (exactly 2 consecutive below lowThreshold) ─
  if (sustained.count === 2) {
    const scores = sustained.scores.slice(-2).map(pct).join('%, ');
    return {
      alert: {
        type: 'sustained_decline',
        severity: 'MEDIUM',
        message: 'Below-average performance in 2 consecutive sessions.',
        explanation:
          `Last 2 session scores below low threshold ${pct(lowThreshold)}% ` +
          `(${pct(LOW_THRESHOLD_FACTOR)}% of baseline ${pct(baseline)}%): ${scores}%. ` +
          `Two consecutive low sessions may indicate early decline — monitor closely.`,
      },
      computedBaseline: baseline,
    };
  }

  // ── 4. Gradual decline (LOW) — negative slope over sliding window ──────────
  if (completed.length >= GRADUAL_WINDOW) {
    const windowScores = completed.slice(-GRADUAL_WINDOW).map((s) => s.sessionScore);
    const slope = linearRegressionSlope(windowScores);

    if (slope < GRADUAL_SLOPE_THRESHOLD) {
      const slopePct = (slope * 100).toFixed(1);
      return {
        alert: {
          type: 'gradual_decline',
          severity: 'LOW',
          message: 'Gradual downward trend detected across recent sessions.',
          explanation:
            `Performance slope over the last ${GRADUAL_WINDOW} sessions: ${slopePct}% per session ` +
            `(threshold: < ${(GRADUAL_SLOPE_THRESHOLD * 100).toFixed(1)}% per session). ` +
            `Scores: [${windowScores.map(pct).join('%, ')}%]. Gradual decline may indicate slow progression.`,
        },
        computedBaseline: baseline,
      };
    }
  }

  // No alert
  return { alert: null, computedBaseline: baseline };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function pct(value: number): number {
  return Math.round(value * 100);
}

/**
 * Counts consecutive trailing sessions below the given threshold.
 * Returns count of consecutive low sessions and their scores.
 */
function checkSustainedDecline(
  sessions: Array<{ sessionScore: number }>,
  threshold: number
): { count: number; scores: number[] } {
  const scores = sessions.map((s) => s.sessionScore);
  let count = 0;

  for (let i = scores.length - 1; i >= 0; i--) {
    if (scores[i] < threshold) {
      count++;
    } else {
      break;
    }
  }

  return { count, scores };
}

/**
 * Computes the slope of a linear regression (ordinary least squares) for a
 * sequence of scores. A negative slope indicates declining performance over time.
 * Based on the statistical framework of Basseville & Nikiforov (1993).
 *
 * @param scores - Array of session scores in chronological order.
 * @returns Slope (change in score per session).
 */
export function linearRegressionSlope(scores: number[]): number {
  const n = scores.length;
  if (n < 2) return 0;

  const xs = scores.map((_, i) => i);
  const meanX = mean(xs);
  const meanY = mean(scores);

  const numerator = xs.reduce((acc, x, i) => acc + (x - meanX) * (scores[i] - meanY), 0);
  const denominator = xs.reduce((acc, x) => acc + Math.pow(x - meanX, 2), 0);

  return denominator === 0 ? 0 : numerator / denominator;
}
