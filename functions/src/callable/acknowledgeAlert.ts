/**
 * acknowledgeAlert — Marks a clinician alert as acknowledged.
 * Only the linked clinician can acknowledge an alert.
 */

import * as functions from 'firebase-functions';
import { AlertDoc } from '../models/types';
import { db } from '../utils/firestore';

export const acknowledgeAlert = functions.https.onCall(
  async (data: { alertId: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const { alertId } = data;

    const alertSnap = await db().collection('alerts').doc(alertId).get();
    if (!alertSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Alert not found.');
    }

    const alert = alertSnap.data() as AlertDoc;
    if (alert.clinicianId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Only the linked clinician can acknowledge this alert.');
    }

    await db().collection('alerts').doc(alertId).update({ acknowledged: true });

    return { ok: true };
  }
);
