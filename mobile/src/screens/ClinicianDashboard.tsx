/**
 * ClinicianDashboard.tsx — Clinician-facing monitoring interface.
 *
 * This is the primary thesis screenshot screen. It demonstrates:
 *   - Longitudinal trend visualization (TrendChart with baseline reference)
 *   - Alert inbox with severity badges and full explanations
 *   - Human-in-the-loop: clinician acknowledges alerts
 *   - Explainable AI: every alert shows numeric values, not black-box outputs
 *
 * Architecture references:
 *   - Kawamoto et al. (2005): event-driven alerts over passive dashboards
 *   - Ancker et al. (2017): rate-limited to prevent alert fatigue
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getPatientTrendsFn, acknowledgeAlertFn } from '../services/functions';
import { TrendChart } from '../components/TrendChart';
import { AlertBadge } from '../components/AlertBadge';
import { AlertDoc, SessionDoc } from '../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ClinicianDashboard'>;
  route: { params: { clinicianId: string; patientId: string } };
};

type Tab = 'trends' | 'alerts';

// Demo: use a hardcoded patient ID for the prototype
// In production this would come from a patient list screen
const DEMO_PATIENT_ID = 'auto-patient-uid'; // replaced at runtime from seed

export function ClinicianDashboard({ navigation, route }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('trends');
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [alerts, setAlerts] = useState<AlertDoc[]>([]);
  const [baselineScore, setBaselineScore] = useState<number | undefined>(undefined);
  const [patientName, setPatientName] = useState('Patient');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  const patientId = route.params.patientId || DEMO_PATIENT_ID;
  const clinicianId = route.params.clinicianId || auth.currentUser?.uid;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // For demo: get the current clinician's linked patient
      const userId = await getLinkedPatientId(clinicianId ?? '');
      if (!userId) {
        setLoading(false);
        return;
      }

      const result = await getPatientTrendsFn({ userId, limit: 30 });
      setSessions(result.data.sessions);
      setAlerts(result.data.alerts);
      setBaselineScore(result.data.baselineScore);
      setPatientName(result.data.patientName);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlertFn({ alertId });
      setAlerts((prev) =>
        prev.map((a) => (a.alertId === alertId ? { ...a, acknowledged: true } : a))
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to acknowledge';
      Alert.alert('Error', message);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigation.replace('Login');
  };

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged && !a.suppressed).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Clinician Dashboard</Text>
          <Text style={styles.headerSubtitle}>{patientName}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'trends' && styles.tabActive]}
          onPress={() => setActiveTab('trends')}
        >
          <Text style={[styles.tabText, activeTab === 'trends' && styles.tabTextActive]}>
            Trends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'alerts' && styles.tabActive]}
          onPress={() => setActiveTab('alerts')}
        >
          <Text style={[styles.tabText, activeTab === 'alerts' && styles.tabTextActive]}>
            Alerts
            {unacknowledgedCount > 0 && (
              <Text style={styles.badge}> {unacknowledgedCount}</Text>
            )}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1D4ED8" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {activeTab === 'trends' ? (
            <TrendsTab sessions={sessions} baselineScore={baselineScore} />
          ) : (
            <AlertsTab
              alerts={alerts}
              expandedAlertId={expandedAlertId}
              onToggleExpand={(id) => setExpandedAlertId(expandedAlertId === id ? null : id)}
              onAcknowledge={handleAcknowledge}
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TrendsTab({ sessions, baselineScore }: { sessions: SessionDoc[]; baselineScore?: number }) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Session Performance</Text>
        <Text style={styles.sectionSubtitle}>
          {sessions.length} sessions recorded
          {baselineScore !== undefined
            ? ` · Baseline: ${Math.round(baselineScore * 100)}%`
            : ' · Baseline pending (5 sessions needed)'}
        </Text>
      </View>

      <TrendChart sessions={sessions} baselineScore={baselineScore} />

      {sessions.length > 0 && (
        <View style={styles.statsRow}>
          <StatCard
            label="Latest"
            value={`${Math.round((sessions[sessions.length - 1].sessionScore ?? 0) * 100)}%`}
          />
          <StatCard
            label="Average"
            value={`${Math.round(
              (sessions.reduce((sum, s) => sum + (s.sessionScore ?? 0), 0) / sessions.length) * 100
            )}%`}
          />
          <StatCard
            label="Sessions"
            value={String(sessions.length)}
          />
        </View>
      )}
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function AlertsTab({
  alerts,
  expandedAlertId,
  onToggleExpand,
  onAcknowledge,
}: {
  alerts: AlertDoc[];
  expandedAlertId: string | null;
  onToggleExpand: (id: string) => void;
  onAcknowledge: (id: string) => void;
}) {
  const visible = alerts.filter((a) => !a.suppressed);

  if (visible.length === 0) {
    return (
      <View style={styles.emptyAlerts}>
        <Text style={styles.emptyAlertsText}>No alerts — patient performance is stable.</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Alert Inbox</Text>
        <Text style={styles.sectionSubtitle}>
          {visible.filter((a) => !a.acknowledged).length} unacknowledged
        </Text>
      </View>

      {visible.map((alert) => (
        <AlertRow
          key={alert.alertId}
          alert={alert}
          expanded={expandedAlertId === alert.alertId}
          onToggleExpand={() => onToggleExpand(alert.alertId)}
          onAcknowledge={() => onAcknowledge(alert.alertId)}
        />
      ))}
    </View>
  );
}

function AlertRow({
  alert,
  expanded,
  onToggleExpand,
  onAcknowledge,
}: {
  alert: AlertDoc;
  expanded: boolean;
  onToggleExpand: () => void;
  onAcknowledge: () => void;
}) {
  const isHighUnacked = alert.severity === 'HIGH' && !alert.acknowledged;

  return (
    <View style={[styles.alertCard, isHighUnacked && styles.alertCardHigh]}>
      <TouchableOpacity onPress={onToggleExpand} accessible accessibilityRole="button">
        <View style={styles.alertRow}>
          <AlertBadge severity={alert.severity} />
          <View style={styles.alertContent}>
            <Text style={styles.alertMessage}>{alert.message}</Text>
            <Text style={styles.alertTime}>
              {new Date(alert.triggeredAt).toLocaleString()}
            </Text>
          </View>
          <Text style={styles.expandChevron}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.alertExpanded}>
          <Text style={styles.explanationLabel}>Clinical explanation</Text>
          <Text style={styles.explanationText}>{alert.explanation}</Text>

          {!alert.acknowledged && (
            <TouchableOpacity
              style={styles.acknowledgeBtn}
              onPress={onAcknowledge}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Acknowledge alert"
            >
              <Text style={styles.acknowledgeBtnText}>Acknowledge</Text>
            </TouchableOpacity>
          )}
          {alert.acknowledged && (
            <Text style={styles.acknowledgedText}>✓ Acknowledged</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function getLinkedPatientId(clinicianId: string): Promise<string | null> {
  // For the demo prototype: query users where linkedClinicianId == clinicianId
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  const { firestore } = await import('../services/firebase');

  const q = query(
    collection(firestore, 'users'),
    where('linkedClinicianId', '==', clinicianId),
    where('role', '==', 'patient')
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data().uid as string;
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  signOutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  signOutText: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#1D4ED8',
  },
  tabText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  badge: {
    color: '#EF4444',
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  emptyAlerts: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyAlertsText: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#E5E7EB',
  },
  alertCardHigh: {
    borderLeftColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
  },
  alertTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  expandChevron: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  alertExpanded: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  explanationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
  acknowledgeBtn: {
    marginTop: 12,
    backgroundColor: '#1D4ED8',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  acknowledgeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  acknowledgedText: {
    marginTop: 10,
    fontSize: 13,
    color: '#22C55E',
    fontWeight: '600',
  },
});
