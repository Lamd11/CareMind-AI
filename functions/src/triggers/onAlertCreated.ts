/**
 * onAlertCreated — Firestore trigger that fires when a new alert document is created.
 *
 * This is a fallback FCM sender. The primary FCM send happens inside notificationEngine.
 * This trigger handles edge cases where FCM was not sent in the main pipeline
 * (e.g., if the user registers a device after an alert was written).
 *
 * For the prototype, this trigger simply logs alert creation for debugging.
 */

import * as functions from 'firebase-functions';
import { AlertDoc } from '../models/types';

export const onAlertCreated = functions.firestore
  .document('alerts/{alertId}')
  .onCreate(async (snap, context) => {
    const alert = snap.data() as AlertDoc;

    if (alert.suppressed) {
      console.log(
        `[SUPPRESSED] Alert ${context.params.alertId} — ` +
        `${alert.severity} for user ${alert.userId}: ${alert.suppressReason}`
      );
    } else {
      console.log(
        `[ALERT CREATED] ${alert.severity} alert ${context.params.alertId} ` +
        `for user ${alert.userId} → clinician ${alert.clinicianId}: ${alert.message}`
      );
    }

    return null;
  });
