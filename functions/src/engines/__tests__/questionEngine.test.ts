/**
 * questionEngine.test.ts
 *
 * Unit tests for the adaptive difficulty algorithm.
 * These tests validate the ITS-inspired rolling-accuracy mechanism
 * and constitute the "Testing" evidence for thesis Objective O2.
 *
 * Test cases map directly to the thesis validation plan:
 *   - Section 4: Algorithm validation
 *   - Metric: Adaptation Responsiveness ≤ 3 sessions (≤ 5 answers within 1 session)
 */

import { computeNextDifficulty } from '../questionEngine';

// Helpers
const correct = { correct: true };
const wrong = { correct: false };

// Build a window of 5 results
const all5Correct = [correct, correct, correct, correct, correct];   // 100%
const four5Correct = [correct, correct, correct, correct, wrong];    // 80%
const three5Correct = [correct, correct, correct, wrong, wrong];     // 60%
const two5Correct = [correct, correct, wrong, wrong, wrong];         // 40% (boundary)
const one5Correct = [correct, wrong, wrong, wrong, wrong];           // 20%
const none5Correct = [wrong, wrong, wrong, wrong, wrong];            // 0%

describe('computeNextDifficulty', () => {
  // ── Insufficient data ────────────────────────────────────────────────────
  test('returns no change with fewer than 5 answers', () => {
    const result = computeNextDifficulty([correct, correct, correct], 1);
    expect(result.newDifficulty).toBe(1);
    expect(result.rollingAccuracy).toBeNull();
    expect(result.explanation).toContain('Insufficient data');
  });

  test('returns no change with empty array', () => {
    const result = computeNextDifficulty([], 2);
    expect(result.newDifficulty).toBe(2);
    expect(result.rollingAccuracy).toBeNull();
  });

  // ── Difficulty increase (accuracy > 75%) ─────────────────────────────────
  test('increases difficulty from Tier 1 to Tier 2 when 5/5 correct', () => {
    const result = computeNextDifficulty(all5Correct, 1);
    expect(result.newDifficulty).toBe(2);
    expect(result.rollingAccuracy).toBeCloseTo(1.0);
    expect(result.explanation).toContain('advancing difficulty');
    expect(result.explanation).toContain('Tier 1 to Tier 2');
  });

  test('increases difficulty from Tier 2 to Tier 3 when 4/5 correct (80%)', () => {
    const result = computeNextDifficulty(four5Correct, 2);
    expect(result.newDifficulty).toBe(3);
    expect(result.rollingAccuracy).toBeCloseTo(0.8);
    expect(result.explanation).toContain('advancing difficulty');
  });

  test('clamps at Tier 3 — no increase when already at max', () => {
    const result = computeNextDifficulty(all5Correct, 3);
    expect(result.newDifficulty).toBe(3);
    expect(result.explanation).toContain('already at maximum Tier 3');
  });

  // ── Difficulty decrease (accuracy < 40%) ─────────────────────────────────
  test('decreases difficulty from Tier 2 to Tier 1 when 1/5 correct (20%)', () => {
    const result = computeNextDifficulty(one5Correct, 2);
    expect(result.newDifficulty).toBe(1);
    expect(result.rollingAccuracy).toBeCloseTo(0.2);
    expect(result.explanation).toContain('stepping difficulty down');
    expect(result.explanation).toContain('Tier 2 to Tier 1');
  });

  test('decreases difficulty from Tier 3 to Tier 2 when 0/5 correct', () => {
    const result = computeNextDifficulty(none5Correct, 3);
    expect(result.newDifficulty).toBe(2);
    expect(result.rollingAccuracy).toBeCloseTo(0.0);
    expect(result.explanation).toContain('stepping difficulty down');
  });

  test('clamps at Tier 1 — no decrease when already at minimum', () => {
    const result = computeNextDifficulty(none5Correct, 1);
    expect(result.newDifficulty).toBe(1);
    expect(result.explanation).toContain('already at minimum Tier 1');
  });

  // ── Stable band (40% ≤ accuracy ≤ 75%) ───────────────────────────────────
  test('maintains difficulty when accuracy is 60% (stable band)', () => {
    const result = computeNextDifficulty(three5Correct, 2);
    expect(result.newDifficulty).toBe(2);
    expect(result.rollingAccuracy).toBeCloseTo(0.6);
    expect(result.explanation).toContain('stable band');
  });

  test('maintains difficulty at exactly 40% accuracy (lower boundary — stable band)', () => {
    // 2/5 = 40%, which is NOT < 0.40, so no decrease
    const result = computeNextDifficulty(two5Correct, 2);
    expect(result.newDifficulty).toBe(2);
    expect(result.rollingAccuracy).toBeCloseTo(0.4);
    expect(result.explanation).toContain('stable band');
  });

  // ── Rolling window uses only last 5 ─────────────────────────────────────
  test('uses only the last 5 results from a longer array', () => {
    // First 10 are all wrong; last 5 are all correct → should increase
    const longArray = [...Array(10).fill(wrong), ...all5Correct];
    const result = computeNextDifficulty(longArray, 1);
    expect(result.newDifficulty).toBe(2);
  });

  // ── Explanation strings contain numeric values ───────────────────────────
  test('explanation contains the rolling accuracy percentage', () => {
    const result = computeNextDifficulty(all5Correct, 1);
    expect(result.explanation).toContain('100%');
  });

  test('explanation references threshold values', () => {
    const result = computeNextDifficulty(none5Correct, 2);
    expect(result.explanation).toMatch(/\d+%.*threshold/);
  });
});
