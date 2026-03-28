/**
 * rateLimiter.ts
 *
 * Implements alert rate-limiting to prevent clinician alert fatigue.
 * Based on: Ancker et al. (2017) — alert fatigue research demonstrating that
 * repeated alerts are ignored at increasing rates. Van der Sijs et al. (2006)
 * showed override rates of 49–96% when alert volume is not controlled.
 *
 * Rules:
 *   - MAX 1 HIGH alert per 12 hours per patient
 *   - MAX 1 MEDIUM alert per 24 hours per patient
 *   - LOW alerts are not rate-limited (low noise)
 *
 * The rateLimiter reads the alert history from Firestore.
 * Suppressed alerts are still written to Firestore with suppressed=true for audit.
 */

import * as admin from 'firebase-admin';
import { AlertSeverity, RateLimitResult } from '../models/types';

const HIGH_WINDOW_MS = 12 * 60 * 60 * 1000;  // 12 hours
const MEDIUM_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Checks whether an alert of the given severity should be suppressed for this patient.
 *
 * @param db - Firestore admin instance
 * @param userId - The patient's user ID
 * @param severity - The proposed alert severity
 * @returns RateLimitResult — allowed=true means the alert should proceed
 */
export async function checkRateLimit(
  db: admin.firestore.Firestore,
  userId: string,
  severity: AlertSeverity
): Promise<RateLimitResult> {
  // LOW alerts are never rate-limited
  if (severity === 'LOW') {
    return { allowed: true };
  }

  const windowMs = severity === 'HIGH' ? HIGH_WINDOW_MS : MEDIUM_WINDOW_MS;
  const windowLabel = severity === 'HIGH' ? '12 hours' : '24 hours';
  const cutoff = Date.now() - windowMs;

  const existingAlerts = await db
    .collection('alerts')
    .where('userId', '==', userId)
    .where('severity', '==', severity)
    .where('suppressed', '==', false)
    .where('triggeredAt', '>', cutoff)
    .limit(1)
    .get();

  if (!existingAlerts.empty) {
    const existing = existingAlerts.docs[0].data();
    const existingTime = new Date(existing.triggeredAt).toISOString();
    return {
      allowed: false,
      suppressReason:
        `A ${severity} alert was already sent at ${existingTime}. ` +
        `Rate limit: max 1 ${severity} alert per ${windowLabel}. ` +
        `This alert is suppressed to prevent alert fatigue (Ancker et al., 2017).`,
    };
  }

  return { allowed: true };
}
