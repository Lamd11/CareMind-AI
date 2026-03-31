/**
 * PatientListScreen.tsx — Clinician patient selector.
 *
 * After login, clinicians land here instead of jumping straight into a
 * hardcoded patient dashboard. Lists all patients where
 * `linkedClinicianId === clinicianId`, showing each patient's last session
 * date, score, and unacknowledged alert count.
 *
 * Tap any row to open ClinicianDashboard for that patient.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, firestore } from '../services/firebase';
import { UserDoc, SessionDoc, AlertDoc } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'PatientList'>;
  route: { params: { clinicianId: string } };
};

interface PatientSummary {
  userId: string;
  name: string;
  lastSessionScore: number | null;
  lastSessionDate: number | null;
  unacknowledgedAlerts: number;
}

export function PatientListScreen({ navigation, route }: Props) {
  const clinicianIdFromRoute = route.params?.clinicianId;
  const clinicianId = clinicianIdFromRoute ?? auth.currentUser?.uid ?? '';
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPatients = async () => {
    try {
      setError(null);
      const authUid = auth.currentUser?.uid ?? '(not signed in)';
      console.log(
        `[PatientList] Loading patients for clinicianId=${clinicianId} (route=${clinicianIdFromRoute ?? 'none'}, auth=${authUid})`
      );
      
      // Query only patient docs linked to this clinician.
      const usersSnap = await getDocs(
        query(
          collection(firestore, 'users'),
          where('role', '==', 'patient'),
          where('linkedClinicianId', '==', clinicianId)
        )
      );

      console.log(`[PatientList] Found ${usersSnap.size} users linked to this clinician`);
      const patientDocs = usersSnap.docs;
      
      console.log(`[PatientList] ${patientDocs.length} are patients`);
      
      if (patientDocs.length === 0) {
        console.warn(`[PatientList] ⚠️ No patients found for clinicianId=${clinicianId}`);
      }

      const summaries: PatientSummary[] = await Promise.all(
        patientDocs.map(async (doc) => {
          const user = doc.data() as UserDoc;
          console.log(`[PatientList] Processing patient: ${user.name}`);

          try {
            // Last completed session
            const sessionSnap = await getDocs(
              query(
                collection(firestore, 'users', user.uid, 'sessions'),
                where('completedAt', '!=', null),
                orderBy('completedAt', 'desc'),
                limit(1)
              )
            );
            const lastSession = sessionSnap.empty
              ? null
              : (sessionSnap.docs[0].data() as SessionDoc);

            // Unacknowledged non-suppressed alerts
            const alertSnap = await getDocs(
              query(
                collection(firestore, 'alerts'),
                where('userId', '==', user.uid),
                where('acknowledged', '==', false),
                where('suppressed', '==', false)
              )
            );

            console.log(`[PatientList] ✓ ${user.name}: score=${lastSession?.sessionScore ?? 'none'}, alerts=${alertSnap.size}`);

            return {
              userId: user.uid,
              name: user.name,
              lastSessionScore: lastSession?.sessionScore ?? null,
              lastSessionDate: lastSession?.completedAt ?? null,
              unacknowledgedAlerts: alertSnap.size,
            };
          } catch (err) {
            console.error(`[PatientList ERROR] Failed to load data for ${user.name}:`, err);
            throw err;
          }
        })
      );

      setPatients(summaries);
    } catch (err) {
      console.error('[PatientList FATAL ERROR]', err);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : 'Failed to load patients (unknown error)';
      setError(message);
      setPatients([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadPatients(); }, []);

  const handleRefresh = () => { setRefreshing(true); loadPatients(); };

  const handleSignOut = async () => {
    await signOut(auth);
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Patients</Text>
          <Text style={styles.subtitle}>{patients.length} linked patient{patients.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1D4ED8" />
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Couldn’t load patients</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <Text style={[styles.emptyText, { marginTop: 10 }]}>
            Debug: route clinicianId={clinicianIdFromRoute ?? '(none)'} · auth uid={auth.currentUser?.uid ?? '(none)'}
          </Text>
        </View>
      ) : patients.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No patients linked</Text>
          <Text style={styles.emptyText}>
            Patients are linked to your account via the seed script.
            Run the seed with your clinician UID to add demo patients.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {patients.map((p) => (
            <TouchableOpacity
              key={p.userId}
              style={styles.patientRow}
              onPress={() =>
                navigation.navigate('ClinicianDashboard', {
                  clinicianId,
                  patientId: p.userId,
                })
              }
            >
              <View style={styles.patientRowLeft}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{p.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.patientName}>{p.name}</Text>
                  <Text style={styles.patientMeta}>
                    {p.lastSessionDate
                      ? `Last session: ${new Date(p.lastSessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      : 'No sessions yet'}
                  </Text>
                </View>
              </View>

              <View style={styles.patientRowRight}>
                {p.lastSessionScore !== null && (
                  <Text style={[
                    styles.patientScore,
                    { color: p.lastSessionScore >= 0.7 ? '#22C55E' : p.lastSessionScore >= 0.5 ? '#F59E0B' : '#EF4444' },
                  ]}>
                    {Math.round(p.lastSessionScore * 100)}%
                  </Text>
                )}
                {p.unacknowledgedAlerts > 0 && (
                  <View style={styles.alertBubble}>
                    <Text style={styles.alertBubbleText}>{p.unacknowledgedAlerts}</Text>
                  </View>
                )}
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  signOutBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  signOutText: { fontSize: 14, color: '#6B7280' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  list: { flex: 1 },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  patientRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#1D4ED8' },
  patientName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  patientMeta: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  patientRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  patientScore: { fontSize: 18, fontWeight: '700' },
  alertBubble: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  alertBubbleText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  chevron: { fontSize: 20, color: '#9CA3AF' },
});
