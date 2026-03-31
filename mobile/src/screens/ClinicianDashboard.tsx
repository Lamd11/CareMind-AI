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
import { getPatientTrendsFn, acknowledgeAlertFn, getQuestionBankFn, getSessionResultsFn, refreshQuestionPoolFn } from '../services/functions';
import { TrendChart } from '../components/TrendChart';
import { AlertBadge } from '../components/AlertBadge';
import { AlertDoc, SessionDoc, QuestionCategory, DifficultyTier, QuestionDoc, SessionResultDetail, DomainAccuracy } from '../types';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'ClinicianDashboard'>;
  route: { params: { clinicianId: string; patientId: string } };
};

type Tab = 'trends' | 'alerts' | 'questions';

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
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [patientUserId, setPatientUserId] = useState<string | null>(null);

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
      setPatientUserId(userId);

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
        <TouchableOpacity
          style={[styles.tab, activeTab === 'questions' && styles.tabActive]}
          onPress={() => setActiveTab('questions')}
        >
          <Text style={[styles.tabText, activeTab === 'questions' && styles.tabTextActive]}>
            Questions
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
          {selectedSessionId && patientUserId ? (
            <SessionAttemptView
              userId={patientUserId}
              sessionId={selectedSessionId}
              onBack={() => setSelectedSessionId(null)}
            />
          ) : activeTab === 'trends' ? (
            <TrendsTab
              sessions={sessions}
              baselineScore={baselineScore}
              alerts={alerts}
              onViewSession={(id) => setSelectedSessionId(id)}
            />
          ) : activeTab === 'alerts' ? (
            <AlertsTab
              alerts={alerts}
              expandedAlertId={expandedAlertId}
              onToggleExpand={(id) => setExpandedAlertId(expandedAlertId === id ? null : id)}
              onAcknowledge={handleAcknowledge}
            />
          ) : (
            <QuestionsTab />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TrendsTab({
  sessions,
  baselineScore,
  alerts,
  onViewSession,
}: {
  sessions: SessionDoc[];
  baselineScore?: number;
  alerts: AlertDoc[];
  onViewSession: (sessionId: string) => void;
}) {
  // Most recent non-suppressed alert for the explanation panel
  const latestAlert = [...alerts]
    .filter((a) => !a.suppressed)
    .sort((a, b) => b.triggeredAt - a.triggeredAt)[0];

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

      <AnalyticsExplanationPanel
        sessions={sessions}
        baselineScore={baselineScore}
        latestAlert={latestAlert}
      />

      {/* Session history list — tap to view attempt */}
      {sessions.length > 0 && (
        <View style={styles.sessionListSection}>
          <Text style={styles.sectionTitle}>Session History</Text>
          <Text style={styles.sectionSubtitle}>Tap a session to view per-question results</Text>
          {[...sessions].reverse().map((s) => (
            <TouchableOpacity
              key={s.sessionId}
              style={styles.sessionRow}
              onPress={() => onViewSession(s.sessionId)}
            >
              <View style={styles.sessionRowLeft}>
                <Text style={styles.sessionRowDate}>
                  {new Date(s.completedAt ?? s.startedAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </Text>
                <Text style={styles.sessionRowMeta}>
                  Tier {s.difficultyLevel} · {s.correctAnswers}/{s.totalQuestions} correct
                </Text>
              </View>
              <View style={styles.sessionRowRight}>
                <Text style={[
                  styles.sessionRowScore,
                  (s.sessionScore ?? 0) >= (baselineScore ?? 0) * 0.85
                    ? styles.sessionRowScoreOk
                    : styles.sessionRowScoreLow,
                ]}>
                  {Math.round((s.sessionScore ?? 0) * 100)}%
                </Text>
                <Text style={styles.sessionRowChevron}>›</Text>
              </View>
            </TouchableOpacity>
          ))}
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

/**
 * AnalyticsExplanationPanel — makes the decline-detection algorithm visible.
 *
 * Thesis objective O5: "interpretable trend summaries" that show clinicians
 * the exact numeric reasoning behind any alert or current performance status.
 * Satisfies Rudin (2019) explainability requirement: no black-box outputs.
 */
function AnalyticsExplanationPanel({
  sessions,
  baselineScore,
  latestAlert,
}: {
  sessions: SessionDoc[];
  baselineScore?: number;
  latestAlert?: AlertDoc;
}) {
  if (sessions.length === 0) return null;

  const latest = sessions[sessions.length - 1];
  const latestPct = Math.round((latest.sessionScore ?? 0) * 100);
  const baselinePct = baselineScore !== undefined ? Math.round(baselineScore * 100) : null;
  const lowThresholdPct = baselinePct !== null ? Math.round(baselinePct * 0.85) : null;
  const dropThresholdPct = baselinePct !== null ? Math.round(baselinePct * 0.70) : null;

  const deviation =
    baselinePct !== null
      ? latestPct >= baselinePct
        ? `+${latestPct - baselinePct}% above baseline`
        : `${latestPct - baselinePct}% below baseline`
      : null;

  const last3 = sessions.slice(-3).map((s) => `${Math.round((s.sessionScore ?? 0) * 100)}%`).join(', ');

  return (
    <View style={styles.explanationPanel}>
      <Text style={styles.explanationPanelTitle}>Analytics Engine Reasoning</Text>
      <Text style={styles.explanationPanelSubtitle}>
        How the algorithm interprets this patient&apos;s current performance
      </Text>

      <View style={styles.reasoningRow}>
        <Text style={styles.reasoningLabel}>Latest session</Text>
        <Text style={styles.reasoningValue}>{latestPct}%</Text>
      </View>

      {baselinePct !== null && (
        <>
          <View style={styles.reasoningRow}>
            <Text style={styles.reasoningLabel}>Baseline (locked after session 5)</Text>
            <Text style={styles.reasoningValue}>{baselinePct}%</Text>
          </View>
          <View style={styles.reasoningRow}>
            <Text style={styles.reasoningLabel}>Low threshold (85% of baseline)</Text>
            <Text style={styles.reasoningValue}>{lowThresholdPct}%</Text>
          </View>
          <View style={styles.reasoningRow}>
            <Text style={styles.reasoningLabel}>Sudden-drop threshold (70% of baseline)</Text>
            <Text style={styles.reasoningValue}>{dropThresholdPct}%</Text>
          </View>
          <View style={styles.reasoningRow}>
            <Text style={styles.reasoningLabel}>Deviation from baseline</Text>
            <Text
              style={[
                styles.reasoningValue,
                latestPct < (lowThresholdPct ?? 0) ? styles.reasoningValueWarn : styles.reasoningValueOk,
              ]}
            >
              {deviation}
            </Text>
          </View>
        </>
      )}

      {sessions.length >= 3 && (
        <View style={styles.reasoningRow}>
          <Text style={styles.reasoningLabel}>Last 3 sessions</Text>
          <Text style={styles.reasoningValue}>{last3}</Text>
        </View>
      )}

      {latestAlert && (
        <View style={styles.alertExplanationBox}>
          <Text style={styles.alertExplanationLabel}>
            Most recent alert ({latestAlert.severity} · {latestAlert.type.replace('_', ' ')})
          </Text>
          <Text style={styles.alertExplanationText}>{latestAlert.explanation}</Text>
        </View>
      )}

      {!latestAlert && baselinePct !== null && (
        <View style={[styles.alertExplanationBox, styles.alertExplanationBoxOk]}>
          <Text style={styles.alertExplanationText}>
            No active alerts. Latest score ({latestPct}%) is within acceptable range
            (threshold: {lowThresholdPct}%).
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Questions Tab — Question Bank Browser ─────────────────────────────────

const DOMAIN_FILTERS: { key: QuestionCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'orientation', label: 'Orientation' },
  { key: 'short_term_recall', label: 'Recall' },
  { key: 'attention_memory', label: 'Attention' },
  { key: 'language_naming', label: 'Language' },
];

const TIER_FILTERS: { key: DifficultyTier | 0; label: string }[] = [
  { key: 0, label: 'All' },
  { key: 1, label: 'Tier 1 · Easy' },
  { key: 2, label: 'Tier 2 · Medium' },
  { key: 3, label: 'Tier 3 · Hard' },
];

const SOURCE_FILTERS: { key: 'all' | 'ai_generated' | 'static_bank'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ai_generated', label: 'AI Generated' },
  { key: 'static_bank', label: 'Static Bank' },
];

function QuestionsTab() {
  const [domain, setDomain] = useState<QuestionCategory | 'all'>('all');
  const [tier, setTier] = useState<DifficultyTier | 0>(0);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'ai_generated' | 'static_bank'>('all');
  const [allQuestions, setAllQuestions] = useState<QuestionDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadQuestions = async (d: QuestionCategory | 'all', t: DifficultyTier | 0) => {
    setLoading(true);
    try {
      const res = await getQuestionBankFn({
        ...(d !== 'all' ? { category: d } : {}),
        ...(t !== 0 ? { difficultyTier: t } : {}),
      });
      return res.data.questions;
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const qs = await loadQuestions('all', 0);
      setAllQuestions(qs);
      // Auto-generate AI questions if none exist yet
      if (qs.filter((q) => q.source === 'ai_generated').length === 0) {
        setGenerating(true);
        try {
          await refreshQuestionPoolFn({});
          const fresh = await loadQuestions('all', 0);
          setAllQuestions(fresh);
        } catch {
          // silently fail — static bank still usable
        } finally {
          setGenerating(false);
        }
      }
    })();
  }, []);

  const applyDomain = async (d: QuestionCategory | 'all') => {
    setDomain(d);
    const qs = await loadQuestions(d, tier);
    setAllQuestions(qs);
  };
  const applyTier = async (t: DifficultyTier | 0) => {
    setTier(t);
    const qs = await loadQuestions(domain, t);
    setAllQuestions(qs);
  };

  const questions = sourceFilter === 'all'
    ? allQuestions
    : allQuestions.filter((q) => q.source === sourceFilter);

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Question Bank</Text>
        <Text style={styles.sectionSubtitle}>{questions.length} questions · tap to expand</Text>
      </View>

      {generating && (
        <View style={styles.generatingBanner}>
          <ActivityIndicator size="small" color="#7C3AED" />
          <Text style={styles.generatingText}>Generating AI questions across all tiers…</Text>
        </View>
      )}

      {/* Source filter */}
      <Text style={styles.selectorLabel}>Source</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} nestedScrollEnabled>
        <View style={styles.selectorRow}>
          {SOURCE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.selectorChip,
                sourceFilter === f.key && styles.selectorChipActive,
                f.key === 'ai_generated' && sourceFilter === f.key && styles.selectorChipAi,
              ]}
              onPress={() => setSourceFilter(f.key)}
            >
              <Text style={[styles.selectorChipText, sourceFilter === f.key && styles.selectorChipTextActive]}>
                {f.key === 'ai_generated' ? '✦ ' : ''}{f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Domain filter */}
      <Text style={styles.selectorLabel}>Domain</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} nestedScrollEnabled>
        <View style={styles.selectorRow}>
          {DOMAIN_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.selectorChip, domain === f.key && styles.selectorChipActive]}
              onPress={() => applyDomain(f.key as QuestionCategory | 'all')}
            >
              <Text style={[styles.selectorChipText, domain === f.key && styles.selectorChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Tier filter */}
      <Text style={styles.selectorLabel}>Difficulty</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} nestedScrollEnabled>
        <View style={styles.selectorRow}>
          {TIER_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.selectorChip, tier === f.key && styles.selectorChipActive]}
              onPress={() => applyTier(f.key as DifficultyTier | 0)}
            >
              <Text style={[styles.selectorChipText, tier === f.key && styles.selectorChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color="#1D4ED8" />
      ) : questions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No questions found for the selected filters.</Text>
        </View>
      ) : (
        questions.map((q) => (
          <TouchableOpacity
            key={q.questionId}
            style={styles.qbCard}
            onPress={() => setExpandedId(expandedId === q.questionId ? null : q.questionId)}
          >
            <View style={styles.qbCardHeader}>
              <View style={styles.qbBadgeRow}>
                <View style={[styles.qbTierBadge, { backgroundColor: tierColor(q.difficultyTier) + '22' }]}>
                  <Text style={[styles.qbTierBadgeText, { color: tierColor(q.difficultyTier) }]}>
                    Tier {q.difficultyTier}
                  </Text>
                </View>
                <View style={styles.qbDomainBadge}>
                  <Text style={styles.qbDomainBadgeText}>{domainShort(q.category)}</Text>
                </View>
                {q.source === 'ai_generated' && (
                  <View style={styles.qbAiBadge}>
                    <Text style={styles.qbAiBadgeText}>AI</Text>
                  </View>
                )}
              </View>
              <Text style={styles.qbChevron}>{expandedId === q.questionId ? '▲' : '▼'}</Text>
            </View>
            <Text style={styles.qbQuestionText} numberOfLines={expandedId === q.questionId ? undefined : 2}>
              {q.text}
            </Text>
            {expandedId === q.questionId && (
              <View style={styles.qbOptions}>
                {q.options.map((opt, i) => (
                  <View
                    key={i}
                    style={[styles.qbOption, opt === q.correctAnswer && styles.qbOptionCorrect]}
                  >
                    <Text style={[styles.qbOptionText, opt === q.correctAnswer && styles.qbOptionTextCorrect]}>
                      {String.fromCharCode(65 + i)}. {opt}{opt === q.correctAnswer ? ' ✓' : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

function tierColor(tier: number): string {
  return tier === 1 ? '#22C55E' : tier === 2 ? '#F59E0B' : '#EF4444';
}

function domainShort(cat: QuestionCategory): string {
  const m: Record<QuestionCategory, string> = {
    orientation: 'Orientation', short_term_recall: 'Recall',
    attention_memory: 'Attention', language_naming: 'Language',
  };
  return m[cat] ?? cat;
}

// ── Session Attempt View ───────────────────────────────────────────────────

function SessionAttemptView({
  userId,
  sessionId,
  onBack,
}: {
  userId: string;
  sessionId: string;
  onBack: () => void;
}) {
  const [results, setResults] = useState<SessionResultDetail[]>([]);
  const [domainAccuracy, setDomainAccuracy] = useState<Partial<Record<QuestionCategory, DomainAccuracy>>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    getSessionResultsFn({ userId, sessionId })
      .then((res) => {
        setResults(res.data.results);
        setDomainAccuracy(res.data.domainAccuracy);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, sessionId]);

  const correct = results.filter((r) => r.correct).length;

  return (
    <View>
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backBtnText}>‹ Back to Trends</Text>
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Session Attempt</Text>
        <Text style={styles.sectionSubtitle}>
          {loading ? 'Loading...' : `${correct}/${results.length} correct`}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color="#1D4ED8" />
      ) : (
        <>
          {/* Domain accuracy summary */}
          {Object.keys(domainAccuracy).length > 0 && (
            <View style={styles.domainSummary}>
              {(Object.entries(domainAccuracy) as [QuestionCategory, DomainAccuracy][]).map(([cat, acc]) => (
                <View key={cat} style={styles.domainSummaryRow}>
                  <Text style={styles.domainSummaryLabel}>{domainShort(cat)}</Text>
                  <View style={styles.domainSummaryBar}>
                    <View style={[
                      styles.domainSummaryFill,
                      { width: `${acc.pct}%` as unknown as number, backgroundColor: acc.pct >= 70 ? '#22C55E' : acc.pct >= 50 ? '#F59E0B' : '#EF4444' },
                    ]} />
                  </View>
                  <Text style={styles.domainSummaryPct}>{acc.correct}/{acc.total}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Per-question results */}
          {results.map((r, i) => (
            <TouchableOpacity
              key={r.resultId}
              style={[styles.attemptRow, r.correct ? styles.attemptRowCorrect : styles.attemptRowWrong]}
              onPress={() => setExpandedId(expandedId === r.resultId ? null : r.resultId)}
            >
              <View style={styles.attemptRowHeader}>
                <Text style={[styles.attemptIcon, { color: r.correct ? '#22C55E' : '#EF4444' }]}>
                  {r.correct ? '✓' : '✗'}
                </Text>
                <View style={styles.attemptRowContent}>
                  <Text style={styles.attemptQNum}>Q{i + 1} · {domainShort(r.category)} · Tier {r.difficultyTier}</Text>
                  <Text style={styles.attemptQText} numberOfLines={expandedId === r.resultId ? undefined : 1}>
                    {r.questionText}
                  </Text>
                </View>
                <Text style={styles.attemptTime}>{(r.responseTimeMs / 1000).toFixed(1)}s</Text>
              </View>
              {expandedId === r.resultId && (
                <View style={styles.attemptExpanded}>
                  <Text style={styles.attemptAnswerLabel}>Correct answer</Text>
                  <Text style={styles.attemptAnswer}>{r.correctAnswer}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}

          {results.length === 0 && (
            <Text style={styles.emptyAlertsText}>No question results recorded for this session.</Text>
          )}
        </>
      )}
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
  explanationPanel: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  explanationPanelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  explanationPanelSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 14,
  },
  reasoningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  reasoningLabel: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
    paddingRight: 12,
  },
  reasoningValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  reasoningValueWarn: {
    color: '#EF4444',
  },
  reasoningValueOk: {
    color: '#22C55E',
  },
  alertExplanationBox: {
    marginTop: 14,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  alertExplanationBoxOk: {
    backgroundColor: '#F0FDF4',
    borderLeftColor: '#22C55E',
  },
  alertExplanationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  alertExplanationText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },

  // ── Session list in Trends tab ─────────────────────────────────────────────
  sessionListSection: {
    marginTop: 20,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sessionRowLeft: { flex: 1 },
  sessionRowDate: { fontSize: 14, fontWeight: '600', color: '#111827' },
  sessionRowMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  sessionRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sessionRowScore: { fontSize: 16, fontWeight: '700' },
  sessionRowScoreOk: { color: '#22C55E' },
  sessionRowScoreLow: { color: '#EF4444' },
  sessionRowChevron: { fontSize: 20, color: '#9CA3AF' },

  // ── Question bank browser ──────────────────────────────────────────────────
  filterScroll: { marginBottom: 4 },

  // ── Questions Tab (shared selectors) ──────────────────────────────────────
  selectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectorChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#1D4ED8',
  },
  selectorChipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectorChipTextActive: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  selectorChipAi: {
    backgroundColor: '#F5F3FF',
    borderColor: '#7C3AED',
  },
  generatingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F3FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  generatingText: {
    fontSize: 13,
    color: '#7C3AED',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  generateBtn: {
    marginTop: 20,
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  generateBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  previewError: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  previewErrorText: {
    color: '#EF4444',
    fontSize: 13,
  },
  previewCard: {
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  previewCardAI: {
    backgroundColor: '#FAF5FF',
    borderColor: '#DDD6FE',
  },
  previewCardStatic: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  previewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sourcePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sourcePillAI: {
    backgroundColor: '#EDE9FE',
  },
  sourcePillStatic: {
    backgroundColor: '#F3F4F6',
  },
  sourcePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sourcePillTextAI: {
    color: '#7C3AED',
  },
  sourcePillTextStatic: {
    color: '#6B7280',
  },
  generationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  previewQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 24,
    marginBottom: 14,
  },
  previewOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewOptionCorrect: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  previewOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  previewOptionTextCorrect: {
    color: '#15803D',
    fontWeight: '600',
  },
  previewMeta: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  previewMetaText: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'capitalize',
  },
  rationaleBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F5F3FF',
    borderRadius: 8,
  },
  rationaleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  rationaleText: {
    fontSize: 13,
    color: '#4C1D95',
    lineHeight: 18,
  },
  compareToggle: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  compareToggleText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },

  // ── Question bank cards ────────────────────────────────────────────────────
  qbCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  qbCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  qbBadgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  qbTierBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  qbTierBadgeText: { fontSize: 11, fontWeight: '700' },
  qbDomainBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  qbDomainBadgeText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  qbAiBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    backgroundColor: '#EDE9FE',
  },
  qbAiBadgeText: { fontSize: 11, color: '#7C3AED', fontWeight: '700' },
  qbChevron: { fontSize: 12, color: '#9CA3AF' },
  qbQuestionText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  qbOptions: { marginTop: 10, gap: 4 },
  qbOption: {
    padding: 8, borderRadius: 6, backgroundColor: '#F9FAFB',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  qbOptionCorrect: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  qbOptionText: { fontSize: 13, color: '#374151' },
  qbOptionTextCorrect: { color: '#15803D', fontWeight: '600' },

  // ── Session attempt view ───────────────────────────────────────────────────
  backBtn: { paddingVertical: 10, paddingBottom: 4 },
  backBtnText: { fontSize: 15, color: '#1D4ED8', fontWeight: '500' },
  domainSummary: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB',
  },
  domainSummaryRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
  },
  domainSummaryLabel: { fontSize: 13, color: '#374151', width: 80 },
  domainSummaryBar: {
    flex: 1, height: 8, backgroundColor: '#F3F4F6',
    borderRadius: 4, marginHorizontal: 10, overflow: 'hidden',
  },
  domainSummaryFill: { height: '100%', borderRadius: 4 },
  domainSummaryPct: { fontSize: 12, color: '#6B7280', width: 32, textAlign: 'right' },
  attemptRow: {
    borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1,
  },
  attemptRowCorrect: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  attemptRowWrong: { backgroundColor: '#FFF5F5', borderColor: '#FCA5A5' },
  attemptRowHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  attemptIcon: { fontSize: 18, fontWeight: '700', marginTop: 1 },
  attemptRowContent: { flex: 1 },
  attemptQNum: { fontSize: 11, color: '#6B7280', fontWeight: '600', marginBottom: 2 },
  attemptQText: { fontSize: 13, color: '#374151', lineHeight: 18 },
  attemptTime: { fontSize: 12, color: '#9CA3AF' },
  attemptExpanded: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  attemptAnswerLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600', marginBottom: 4 },
  attemptAnswer: { fontSize: 13, color: '#15803D', fontWeight: '600' },
});
