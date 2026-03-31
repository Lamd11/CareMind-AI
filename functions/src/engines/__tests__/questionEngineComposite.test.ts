/**
 * questionEngineComposite.test.ts
 *
 * Unit tests for the composite three-signal adaptive difficulty algorithm.
 * This is the V2 enhancement that incorporates accuracy, response latency,
 * and completion consistency — the three cognitive performance signals
 * documented in the thesis methodology.
 *
 * Signal weights:
 *   Accuracy     60%  (most clinically meaningful)
 *   Latency      25%  (response time slowing is an early dementia marker)
 *   Consistency  15%  (erratic timing indicates working memory strain)
 *
 * Tests validate that the composite signal correctly drives difficulty
 * adjustments that pure accuracy-only scoring would miss.
 */

import { computeNextDifficultyComposite } from '../questionEngine';

// Helper: fast correct answer (5s response)
const fastCorrect = { correct: true, responseTimeMs: 5000 };
// Helper: slow correct answer (28s response)
const slowCorrect = { correct: true, responseTimeMs: 28000 };
// Helper: slow wrong answer
const slowWrong = { correct: false, responseTimeMs: 28000 };

// 5 fast correct answers → composite ~(0.60*1.0 + 0.25*1.0 + 0.15*1.0) = 1.0 → increase
const allFastCorrect = [fastCorrect, fastCorrect, fastCorrect, fastCorrect, fastCorrect];
// 5 slow correct answers → accuracy=1.0, latency≈0.08, consistency=1.0
// composite ≈ 0.60*1.0 + 0.25*0.08 + 0.15*1.0 = 0.60 + 0.02 + 0.15 = 0.77 → increase
const allSlowCorrect = [slowCorrect, slowCorrect, slowCorrect, slowCorrect, slowCorrect];
// 5 slow wrong answers → composite ≈ 0.60*0.0 + 0.25*0.08 + 0.15*1.0 = 0.0 + 0.02 + 0.15 = 0.17 → decrease
const allSlowWrong = [slowWrong, slowWrong, slowWrong, slowWrong, slowWrong];
describe('computeNextDifficultyComposite', () => {
  // ── Insufficient data ────────────────────────────────────────────────────
  test('returns no change with fewer than 5 answers', () => {
    const result = computeNextDifficultyComposite([fastCorrect, fastCorrect], 1);
    expect(result.newDifficulty).toBe(1);
    expect(result.compositeScore).toBeNull();
    expect(result.explanation).toContain('Insufficient data');
  });

  test('returns no change with empty array', () => {
    const result = computeNextDifficultyComposite([], 2);
    expect(result.newDifficulty).toBe(2);
    expect(result.compositeScore).toBeNull();
  });

  // ── Fast correct answers → increase ─────────────────────────────────────
  test('increases difficulty when 5 fast correct answers (composite > 0.75)', () => {
    const result = computeNextDifficultyComposite(allFastCorrect, 1);
    expect(result.newDifficulty).toBe(2);
    expect(result.compositeScore).toBeGreaterThan(0.75);
    expect(result.explanation).toContain('advancing difficulty');
  });

  // ── Slow correct answers — latency penalty keeps composite elevated but tests boundary
  test('slow correct answers still increase difficulty (accuracy dominant)', () => {
    const result = computeNextDifficultyComposite(allSlowCorrect, 1);
    // composite ≈ 0.77 which is > 0.75 → should still advance
    expect(result.newDifficulty).toBe(2);
    expect(result.compositeScore).toBeDefined();
  });

  // ── Accuracy alone insufficient: slow responses cancel partial accuracy
  test('mixed correct but very slow: latency pulls composite below increase threshold', () => {
    // 4/5 correct but all extremely slow (29000ms)
    const slowMostlyCorrect = [
      { correct: true, responseTimeMs: 29000 },
      { correct: true, responseTimeMs: 29000 },
      { correct: true, responseTimeMs: 29000 },
      { correct: true, responseTimeMs: 29000 },
      { correct: false, responseTimeMs: 29000 },
    ];
    const result = computeNextDifficultyComposite(slowMostlyCorrect, 2);
    // accuracy=0.80, latency≈0.04, consistency=1.0
    // composite ≈ 0.60*0.80 + 0.25*0.04 + 0.15*1.0 = 0.48 + 0.01 + 0.15 = 0.64 → stable band
    expect(result.newDifficulty).toBe(2);
    expect(result.explanation).toContain('stable band');
  });

  // ── Slow wrong answers → decrease ───────────────────────────────────────
  test('decreases difficulty when 5 slow wrong answers (composite < 0.40)', () => {
    const result = computeNextDifficultyComposite(allSlowWrong, 2);
    expect(result.newDifficulty).toBe(1);
    expect(result.compositeScore).toBeLessThan(0.40);
    expect(result.explanation).toContain('stepping difficulty down');
  });

  // ── Clamp at max/min tiers ───────────────────────────────────────────────
  test('clamps at Tier 3 — no increase when already at max', () => {
    const result = computeNextDifficultyComposite(allFastCorrect, 3);
    expect(result.newDifficulty).toBe(3);
    expect(result.explanation).toContain('already at maximum Tier 3');
  });

  test('clamps at Tier 1 — no decrease when already at minimum', () => {
    const result = computeNextDifficultyComposite(allSlowWrong, 1);
    expect(result.newDifficulty).toBe(1);
    expect(result.explanation).toContain('already at minimum Tier 1');
  });

  // ── Consistency signal ───────────────────────────────────────────────────
  test('erratic response times produce lower consistency score', () => {
    const erratic = [
      { correct: true, responseTimeMs: 2000 },
      { correct: true, responseTimeMs: 28000 },
      { correct: true, responseTimeMs: 3000 },
      { correct: true, responseTimeMs: 27000 },
      { correct: true, responseTimeMs: 2500 },
    ];
    const consistent = [
      { correct: true, responseTimeMs: 5000 },
      { correct: true, responseTimeMs: 5100 },
      { correct: true, responseTimeMs: 4900 },
      { correct: true, responseTimeMs: 5050 },
      { correct: true, responseTimeMs: 4950 },
    ];
    const erraticResult = computeNextDifficultyComposite(erratic, 1);
    const consistentResult = computeNextDifficultyComposite(consistent, 1);
    // Consistent timing should yield higher composite than erratic timing
    expect(consistentResult.compositeScore!).toBeGreaterThan(erraticResult.compositeScore!);
    expect(erraticResult.consistencyComponent).toBeLessThan(consistentResult.consistencyComponent!);
  });

  // ── Rolling window uses only last 5 ─────────────────────────────────────
  test('uses only the last 5 results from a longer array', () => {
    const longArray = [
      ...Array(10).fill(slowWrong),
      ...allFastCorrect,
    ];
    const result = computeNextDifficultyComposite(longArray, 1);
    expect(result.newDifficulty).toBe(2); // last 5 are fast correct → composite > 0.75
  });

  // ── Explanation content ──────────────────────────────────────────────────
  test('explanation contains all three signal component values', () => {
    const result = computeNextDifficultyComposite(allFastCorrect, 1);
    expect(result.explanation).toMatch(/Accuracy/i);
    expect(result.explanation).toMatch(/Latency/i);
    expect(result.explanation).toMatch(/Consistency/i);
    expect(result.explanation).toMatch(/Composite/i);
  });

  test('decision object exposes individual component scores', () => {
    const result = computeNextDifficultyComposite(allFastCorrect, 1);
    expect(typeof result.accuracyComponent).toBe('number');
    expect(typeof result.latencyComponent).toBe('number');
    expect(typeof result.consistencyComponent).toBe('number');
    expect(typeof result.compositeScore).toBe('number');
  });
});
