/**
 * notificationEngine.ts
 *
 * Orchestrates the full alert pipeline:
 *   1. Calls analyticsEngine to evaluate decline
 *   2. Locks the baseline score if this is the 5th completed session
 *   3. Calls rateLimiter to check if the alert should be suppressed
 *   4. Writes the alert document to Firestore
 *   5. Sends FCM push notification to the clinician
 *
 * All alerts are written to Firestore regardless of rate-limit suppression,
 * with suppressed=true for audit purposes. Only non-suppressed alerts trigger FCM.
 */

import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { AlertDoc, SessionDoc, UserDoc } from '../models/types';
import { evaluateDecline } from './analyticsEngine';
import { checkRateLimit } from '../utils/rateLimiter';
import { db } from '../utils/firestore';

export async function runNotificationPipeline(
  userId: string,
  sessions: SessionDoc[]
): Promise<void> {
  // Get user doc for clinician ID and baseline
  const userSnap = await db().collection('users').doc(userId).get();
  if (!userSnap.exists) return;
  const user = userSnap.data() as UserDoc;

  const clinicianId = user.linkedClinicianId;
  if (!clinicianId) {
    console.log(`User ${userId} has no linked clinician. Skipping notification.`);
    return;
  }

  // Evaluate decline
  const { alert: alertCandidate, computedBaseline } = evaluateDecline(
    sessions,
    user.baselineScore
  );

  // Lock baseline after 5th session (conditional write — never overwrite)
  if (computedBaseline !== null && user.baselineScore === undefined) {
    await db().collection('users').doc(userId).update({
      baselineScore: computedBaseline,
    });
    console.log(`Baseline score locked for ${userId}: ${(computedBaseline * 100).toFixed(1)}%`);
  }

  if (!alertCandidate) {
    console.log(`No alert generated for ${userId} — performance within normal range.`);
    return;
  }

  // Check rate limit
  const rateLimit = await checkRateLimit(db(), userId, alertCandidate.severity);

  const alertId = uuidv4();
  const alertDoc: AlertDoc = {
    alertId,
    userId,
    clinicianId,
    type: alertCandidate.type,
    severity: alertCandidate.severity,
    message: alertCandidate.message,
    explanation: alertCandidate.explanation,
    triggeredAt: Date.now(),
    acknowledged: false,
    suppressed: !rateLimit.allowed,
    ...(rateLimit.suppressReason ? { suppressReason: rateLimit.suppressReason } : {}),
  };

  await db().collection('alerts').doc(alertId).set(alertDoc);

  if (!rateLimit.allowed) {
    console.log(`Alert suppressed for ${userId} (${alertCandidate.severity}): ${rateLimit.suppressReason}`);
    return;
  }

  // Send FCM push notification to clinician
  await sendFCMAlert(clinicianId, alertDoc);
}

async function sendFCMAlert(clinicianId: string, alert: AlertDoc): Promise<void> {
  try {
    // Get clinician's FCM token (stored on their user doc under fcmToken field)
    const clinicianSnap = await db().collection('users').doc(clinicianId).get();
    const clinicianData = clinicianSnap.data() as UserDoc & { fcmToken?: string };

    if (!clinicianData?.fcmToken) {
      console.log(`Clinician ${clinicianId} has no FCM token — alert saved to Firestore only.`);
      return;
    }

    const severityEmoji = alert.severity === 'HIGH' ? '🔴' : alert.severity === 'MEDIUM' ? '🟡' : '🟢';

    await admin.messaging().send({
      token: clinicianData.fcmToken,
      notification: {
        title: `${severityEmoji} CareMind Alert — ${alert.severity}`,
        body: alert.message,
      },
      data: {
        alertId: alert.alertId,
        userId: alert.userId,
        severity: alert.severity,
        type: alert.type,
      },
    });

    console.log(`FCM notification sent to clinician ${clinicianId} for alert ${alert.alertId}`);
  } catch (err) {
    console.error('FCM send failed:', err);
    // Non-fatal — alert is still written to Firestore for in-app display
  }
}
