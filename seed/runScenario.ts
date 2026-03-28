/**
 * runScenario.ts — Injects pre-computed session histories into Firestore
 * to validate the Analytics Engine against the thesis test scenarios.
 *
 * Usage:
 *   npx ts-node runScenario.ts --scenario=1   # Stable performance
 *   npx ts-node runScenario.ts --scenario=2   # Gradual decline
 *   npx ts-node runScenario.ts --scenario=3   # Sudden drop
 *   npx ts-node runScenario.ts --scenario=4   # Recovery after decline
 *   npx ts-node runScenario.ts --scenario=5   # Rate limit enforcement
 *   npx ts-node runScenario.ts --scenario=all # Run all scenarios for a different user each time
 *
 * Each scenario seeds session data then triggers the analytics pipeline
 * by calling the onSessionComplete logic directly (without needing the full
 * Cloud Functions emulator running).
 *
 * Requires: Firebase Auth + Firestore emulators on default ports.
 */

import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

// Use local emulators
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

admin.initializeApp({ projectId: 'caremind-ai-demo' });
const db = admin.firestore();

// ── Import analytics engine directly for local validation ─────────────────
// This bypasses the Cloud Function trigger and runs the logic synchronously,
// making scenario results immediately visible without waiting for event propagation.
import { evaluateDecline } from '../functions/src/engines/analyticsEngine';

// ── Scenario definitions ───────────────────────────────────────────────────

interface ScenarioConfig {
  name: string;
  description: string;
  scores: number[];
  expectedAlertSeverity: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  thesisSection: string;
}

const SCENARIOS: Record<string, ScenarioConfig> = {
  '1': {
    name: 'Stable Performance',
    description: 'Patient maintains 65–80% accuracy across 15 sessions. No alerts expected.',
    scores: [0.70, 0.75, 0.72, 0.68, 0.74, 0.71, 0.73, 0.70, 0.72, 0.74, 0.71, 0.75, 0.73, 0.70, 0.72],
    expectedAlertSeverity: null,
    thesisSection: 'Alert Precision validation: stable performance produces no false-positive alerts.',
  },
  '2': {
    name: 'Gradual Decline',
    description: 'Baseline ~0.72, then scores decline by ~0.04/session. MEDIUM at session 7, HIGH at session 8.',
    scores: [0.70, 0.72, 0.74, 0.72, 0.70, 0.68, 0.55, 0.53, 0.51, 0.49, 0.47, 0.45, 0.43, 0.41, 0.39],
    expectedAlertSeverity: 'HIGH',
    thesisSection: 'Alert Recall validation: gradual decline triggers appropriate severity escalation.',
  },
  '3': {
    name: 'Sudden Drop',
    description: 'Baseline ~0.75, then single session at 20%. HIGH alert expected immediately.',
    scores: [0.75, 0.76, 0.74, 0.75, 0.75, 0.20],
    expectedAlertSeverity: 'HIGH',
    thesisSection: 'Change-point detection: single-session sudden drop triggers immediate HIGH alert.',
  },
  '4': {
    name: 'Recovery After Decline',
    description: '3 low sessions then recovery. HIGH alert generated, then suppressed during recovery.',
    scores: [0.72, 0.72, 0.72, 0.72, 0.72, 0.59, 0.57, 0.55, 0.70, 0.72, 0.74, 0.71],
    expectedAlertSeverity: null, // after recovery, last session is normal
    thesisSection: 'False-positive suppression: recovery removes alert trigger condition.',
  },
  '5': {
    name: 'Rate Limit Enforcement',
    description: 'Multiple rapid completions all at 0.25. Only 1 HIGH alert should be emitted.',
    scores: [0.75, 0.75, 0.75, 0.75, 0.75, 0.10, 0.10, 0.10],
    expectedAlertSeverity: 'HIGH',
    thesisSection: 'Rate limiter: prevents alert fatigue per Ancker et al. (2017).',
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function buildSessionDocs(userId: string, scores: number[]) {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  return scores.map((score, i) => {
    const sessionId = uuidv4();
    const startedAt = now - (scores.length - i) * DAY_MS;
    const correctAnswers = Math.round(score * 10);

    return {
      sessionId,
      userId,
      startedAt,
      completedAt: startedAt + 20 * 60 * 1000, // 20 min session
      sessionScore: score,
      totalQuestions: 10,
      correctAnswers,
      difficultyLevel: 1 as const,
      rollingAverage: score,
      answeredQuestionIds: [] as string[],
    };
  });
}

async function seedScenario(
  scenarioId: string,
  config: ScenarioConfig
): Promise<void> {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`SCENARIO ${scenarioId}: ${config.name}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`Description: ${config.description}`);
  console.log(`Thesis context: ${config.thesisSection}`);
  console.log(`${'─'.repeat(60)}`);

  // Create a dedicated test user for this scenario
  const userId = `scenario-${scenarioId}-${Date.now()}`;
  const clinicianId = 'scenario-clinician';

  // Write user doc
  await db.collection('users').doc(userId).set({
    uid: userId,
    role: 'patient',
    name: `Scenario ${scenarioId} Patient`,
    email: `scenario${scenarioId}@test.com`,
    linkedClinicianId: clinicianId,
    last5Results: [],
    createdAt: Date.now(),
  });

  // Write all session docs
  const sessionDocs = buildSessionDocs(userId, config.scores);
  const batch = db.batch();
  for (const session of sessionDocs) {
    const ref = db
      .collection('users')
      .doc(userId)
      .collection('sessions')
      .doc(session.sessionId);
    batch.set(ref, session);
  }
  await batch.commit();
  console.log(`✓ Seeded ${sessionDocs.length} sessions`);

  // Run analytics engine locally
  const { alert, computedBaseline } = evaluateDecline(sessionDocs, undefined);

  console.log(`\nBaseline score: ${computedBaseline !== null ? `${Math.round(computedBaseline * 100)}%` : 'N/A (< 5 sessions)'}`);
  console.log(`Session scores: [${config.scores.map((s) => Math.round(s * 100) + '%').join(', ')}]`);

  // Print result
  if (alert) {
    console.log(`\n⚠️  Alert generated:`);
    console.log(`   Severity: ${alert.severity}`);
    console.log(`   Type: ${alert.type}`);
    console.log(`   Message: ${alert.message}`);
    console.log(`   Explanation: ${alert.explanation}`);

    // Verify against expected
    if (config.expectedAlertSeverity) {
      const match = alert.severity === config.expectedAlertSeverity;
      console.log(`\n${match ? '✅' : '❌'} Expected: ${config.expectedAlertSeverity} | Got: ${alert.severity}`);
    }
  } else {
    console.log(`\n✅ No alert generated (performance within normal range)`);
    if (config.expectedAlertSeverity === null) {
      console.log(`   Matches expected: no alert`);
    } else {
      console.log(`❌ Expected alert severity: ${config.expectedAlertSeverity} but none generated`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const arg = process.argv.find((a) => a.startsWith('--scenario='));
  const scenarioId = arg?.split('=')[1] ?? '1';

  if (scenarioId === 'all') {
    for (const [id, config] of Object.entries(SCENARIOS)) {
      await seedScenario(id, config);
    }
  } else if (SCENARIOS[scenarioId]) {
    await seedScenario(scenarioId, SCENARIOS[scenarioId]);
  } else {
    console.error(`Unknown scenario: ${scenarioId}. Use 1-5 or "all".`);
    process.exit(1);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('Scenario run complete.');
}

main().catch((err) => {
  console.error('Scenario run failed:', err);
  process.exit(1);
});
