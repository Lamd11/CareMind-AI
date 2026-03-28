/**
 * index.ts — Registers all Cloud Functions for CareMind AI
 *
 * Callable functions (invoked by the mobile app):
 *   - startSession
 *   - getNextQuestion
 *   - submitAnswer
 *   - endSession
 *   - getPatientTrends
 *   - acknowledgeAlert
 *
 * Firestore triggers (reactive, event-driven):
 *   - onSessionComplete  → runs analytics + notification pipeline
 *   - onAlertCreated     → logs alert creation
 */

import * as admin from 'firebase-admin';

admin.initializeApp();

export { startSession } from './callable/startSession';
export { getNextQuestion } from './callable/getNextQuestion';
export { submitAnswer } from './callable/submitAnswer';
export { endSession } from './callable/endSession';
export { getPatientTrends } from './callable/getPatientTrends';
export { acknowledgeAlert } from './callable/acknowledgeAlert';

export { onSessionComplete } from './triggers/onSessionComplete';
export { onAlertCreated } from './triggers/onAlertCreated';
