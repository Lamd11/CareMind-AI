/**
 * seedTestUsers.ts
 *
 * Creates two Firebase Auth users and their Firestore user documents:
 *   patient@demo.com   (role: patient)
 *   clinician@demo.com (role: clinician)
 *
 * Usage:
 *   npx ts-node seedTestUsers.ts
 * Requires Firebase Auth + Firestore emulators running on default ports.
 */

import * as admin from 'firebase-admin';

// Use local emulators
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

admin.initializeApp({ projectId: 'caremind-ai-demo' });
const db = admin.firestore();
const auth = admin.auth();

const PATIENT_EMAIL = 'patient@demo.com';
const PATIENT_PASSWORD = 'demo1234';
const PATIENT_NAME = 'Alex Johnson';

const CLINICIAN_EMAIL = 'clinician@demo.com';
const CLINICIAN_PASSWORD = 'demo1234';
const CLINICIAN_NAME = 'Dr. Sarah Chen';

async function createOrGetUser(email: string, password: string): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(email);
    console.log(`User already exists: ${email} (${existing.uid})`);
    return existing.uid;
  } catch {
    const user = await auth.createUser({ email, password, displayName: email });
    console.log(`Created user: ${email} (${user.uid})`);
    return user.uid;
  }
}

async function seed(): Promise<void> {
  const clinicianUid = await createOrGetUser(CLINICIAN_EMAIL, CLINICIAN_PASSWORD);
  const patientUid = await createOrGetUser(PATIENT_EMAIL, PATIENT_PASSWORD);

  // Write clinician document
  await db.collection('users').doc(clinicianUid).set({
    uid: clinicianUid,
    role: 'clinician',
    name: CLINICIAN_NAME,
    email: CLINICIAN_EMAIL,
    createdAt: Date.now(),
  }, { merge: true });
  console.log(`✓ Clinician doc written: ${clinicianUid}`);

  // Write patient document (linked to clinician)
  await db.collection('users').doc(patientUid).set({
    uid: patientUid,
    role: 'patient',
    name: PATIENT_NAME,
    email: PATIENT_EMAIL,
    linkedClinicianId: clinicianUid,
    last5Results: [],
    createdAt: Date.now(),
  }, { merge: true });
  console.log(`✓ Patient doc written: ${patientUid} → clinician: ${clinicianUid}`);

  console.log('\n── Demo Credentials ──');
  console.log(`  Patient:   ${PATIENT_EMAIL} / ${PATIENT_PASSWORD}`);
  console.log(`  Clinician: ${CLINICIAN_EMAIL} / ${CLINICIAN_PASSWORD}`);
  console.log('\nUsers seeded successfully.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
