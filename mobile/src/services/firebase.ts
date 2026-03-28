/**
 * firebase.ts — Firebase initialization for the mobile app.
 *
 * Uses emulators in development (no live Firebase project required for building).
 * Switch to production by removing the connectXxxEmulator calls or using
 * an env flag.
 *
 * IMPORTANT: Replace the firebaseConfig object with your actual Firebase project
 * config before deploying. Get it from Firebase Console → Project Settings → Apps.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// TODO: Replace with your Firebase project config from Firebase Console
const firebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'caremind-ai-demo.firebaseapp.com',
  projectId: 'caremind-ai-demo',
  storageBucket: 'caremind-ai-demo.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef123456',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const functions = getFunctions(app);

// Connect to local emulators in development
// Set USE_EMULATOR=false in .env to use production Firebase
const USE_EMULATOR = true;

if (USE_EMULATOR) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(firestore, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
  console.log('[Firebase] Connected to local emulators');
}
