/**
 * functions.ts — Typed wrappers for Firebase Cloud Function callable calls.
 *
 * Each function is typed using the shared interfaces from types/index.ts.
 * This ensures the mobile app and Cloud Functions agree on the same payloads.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import {
  StartSessionInput,
  StartSessionOutput,
  GetNextQuestionInput,
  GetNextQuestionOutput,
  SubmitAnswerInput,
  SubmitAnswerOutput,
  EndSessionInput,
  EndSessionOutput,
  GetPatientTrendsInput,
  GetPatientTrendsOutput,
  AcknowledgeAlertInput,
  AcknowledgeAlertOutput,
} from '../types';

export const startSessionFn = httpsCallable<StartSessionInput, StartSessionOutput>(
  functions,
  'startSession'
);

export const getNextQuestionFn = httpsCallable<GetNextQuestionInput, GetNextQuestionOutput>(
  functions,
  'getNextQuestion'
);

export const submitAnswerFn = httpsCallable<SubmitAnswerInput, SubmitAnswerOutput>(
  functions,
  'submitAnswer'
);

export const endSessionFn = httpsCallable<EndSessionInput, EndSessionOutput>(
  functions,
  'endSession'
);

export const getPatientTrendsFn = httpsCallable<GetPatientTrendsInput, GetPatientTrendsOutput>(
  functions,
  'getPatientTrends'
);

export const acknowledgeAlertFn = httpsCallable<AcknowledgeAlertInput, AcknowledgeAlertOutput>(
  functions,
  'acknowledgeAlert'
);
