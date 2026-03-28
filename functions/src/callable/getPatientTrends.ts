/**
 * getPatientTrends — Returns session history and alerts for the clinician dashboard.
 * Clinicians can only access data for patients linked to them.
 */

import * as functions from 'firebase-functions';
import { AlertDoc, SessionDoc, UserDoc } from '../models/types';
import { db } from '../utils/firestore';

export const getPatientTrends = functions.https.onCall(
  async (data: { userId: string; limit?: number }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const { userId, limit = 30 } = data;

    // Fetch clinician's own user doc to verify role
    const clinicianSnap = await db().collection('users').doc(context.auth.uid).get();
    if (!clinicianSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Clinician not found.');
    }
    const clinician = clinicianSnap.data() as UserDoc;
    if (clinician.role !== 'clinician') {
      throw new functions.https.HttpsError('permission-denied', 'Only clinicians can access patient trends.');
    }

    // Fetch the patient's user doc and verify they are linked to this clinician
    const patientSnap = await db().collection('users').doc(userId).get();
    if (!patientSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Patient not found.');
    }
    const patient = patientSnap.data() as UserDoc;
    if (patient.linkedClinicianId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Patient is not linked to this clinician.');
    }

    // Fetch completed sessions, ordered oldest first for chart display
    const sessionsSnap = await db()
      .collection('users')
      .doc(userId)
      .collection('sessions')
      .where('completedAt', '!=', null)
      .orderBy('completedAt', 'asc')
      .limit(limit)
      .get();
    const sessions = sessionsSnap.docs.map((d) => d.data() as SessionDoc);

    // Fetch alerts for this patient, newest first
    const alertsSnap = await db()
      .collection('alerts')
      .where('userId', '==', userId)
      .orderBy('triggeredAt', 'desc')
      .limit(20)
      .get();
    const alerts = alertsSnap.docs.map((d) => d.data() as AlertDoc);

    return {
      sessions,
      alerts,
      baselineScore: patient.baselineScore,
      patientName: patient.name,
    };
  }
);
