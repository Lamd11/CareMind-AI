/**
 * onAlertCreated — Firestore trigger that sends FCM push notifications to clinicians.
 *
 * This trigger fires when a new alert document is created (by the notificationEngine).
 * If the alert is not suppressed, it retrieves the clinician's FCM token and sends
 * a smart push notification with:
 * - Alert severity (HIGH/MEDIUM)
 * - Patient name
 * - Decline pattern (sudden drop, sustained decline, gradual slope)
 * - Actionable summary with baseline and recent scores
 *
 * Rate limiting is already handled by the alert creation (alerts with suppressed=true
 * are stored but don't trigger FCM).
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { AlertDoc, UserDoc } from '../models/types';

export const onAlertCreated = functions.firestore
  .document('alerts/{alertId}')
  .onCreate(async (snap, context) => {
    const alert = snap.data() as AlertDoc;

    // If suppressed by rate limiter, just log and return (no FCM)
    if (alert.suppressed) {
      console.log(
        `[SUPPRESSED] Alert ${context.params.alertId} — ` +
        `${alert.severity} for patient ${alert.userId}: ${alert.suppressReason}`
      );
      return null;
    }

    console.log(
      `[ALERT] ${alert.severity} alert ${context.params.alertId} ` +
      `for patient ${alert.userId} → clinician ${alert.clinicianId}`
    );

    // Fetch clinician and patient info for personalized notification
    try {
      const clinicianSnap = await admin.firestore()
        .collection('users')
        .doc(alert.clinicianId)
        .get();

      if (!clinicianSnap.exists) {
        console.log(`[FCM] Clinician ${alert.clinicianId} not found`);
        return null;
      }

      const clinician = clinicianSnap.data() as UserDoc;
      if (!clinician.fcmToken) {
        console.log(`[FCM] No FCM token for clinician ${alert.clinicianId}`);
        return null;
      }

      const patientSnap = await admin.firestore()
        .collection('users')
        .doc(alert.userId)
        .get();

      const patient = patientSnap.data() as UserDoc;
      const patientName = patient?.name || 'Unknown Patient';

      // Build smart notification title and body based on alert type and severity
      const { title, body } = buildNotificationMessage(alert, patientName);

      const message = {
        notification: {
          title,
          body,
        },
        data: {
          alertId: context.params.alertId,
          patientId: alert.userId,
          alertType: alert.type,
          severity: alert.severity,
          action: 'open_patient_dashboard',
        },
        token: clinician.fcmToken,
      };

      const response = await admin.messaging().send(message as any);
      console.log(
        `[FCM] ✓ Notification sent to clinician ${alert.clinicianId} (message ID: ${response}). ` +
        `Alert: ${alert.type} (${alert.severity}) for ${patientName}`
      );
    } catch (err) {
      console.error(
        `[FCM] Error sending notification for alert ${context.params.alertId}:`,
        err instanceof Error ? err.message : err
      );
    }

    return null;
  });

/**
 * Build human-readable notification title and body.
 * Conveys the decline pattern and why the clinician should act.
 */
function buildNotificationMessage(alert: AlertDoc, patientName: string): { title: string; body: string } {
  const severity = alert.severity === 'HIGH' ? '🔴' : '🟡';

  switch (alert.type) {
    case 'sudden_drop':
      return {
        title: `${severity} ${patientName}: Sudden Cognitive Drop`,
        body: alert.message.includes('%')
          ? alert.message
          : `${patientName}'s last session score dropped significantly. Check the dashboard for details.`,
      };

    case 'sustained_decline':
      return {
        title: `${severity} ${patientName}: Sustained Performance Decline`,
        body: alert.message.includes('below')
          ? alert.message
          : `${patientName} has shown consistent decline over recent sessions. Review trends on dashboard.`,
      };

    case 'gradual_decline':
      return {
        title: `${severity} ${patientName}: Gradual Cognitive Trend Decline`,
        body: alert.message.includes('slope')
          ? alert.message
          : `${patientName}'s performance shows a negative trend. Check session history for pattern.`,
      };

    default:
      return {
        title: `${severity} ${patientName}: Cognitive Assessment Alert`,
        body: alert.message,
      };
  }
}
