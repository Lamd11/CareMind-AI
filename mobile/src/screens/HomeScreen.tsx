/**
 * HomeScreen.tsx — Patient home screen.
 *
 * Shows:
 *   - Patient name and greeting
 *   - Last session score (fetched once on mount)
 *   - Start Session button
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, firestore } from '../services/firebase';
import { useSessionStore } from '../store/sessionStore';
import { SessionDoc } from '../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
  route: { params: { userId: string; userName: string } };
};

export function HomeScreen({ navigation, route }: Props) {
  const { userId, userName } = route.params;
  const [lastSession, setLastSession] = useState<SessionDoc | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const { startNewSession, status, reset } = useSessionStore();

  useEffect(() => {
    fetchLastSession();
  }, []);

  const fetchLastSession = async () => {
    try {
      const q = query(
        collection(firestore, 'users', userId, 'sessions'),
        where('completedAt', '!=', null),
        orderBy('completedAt', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setLastSession(snap.docs[0].data() as SessionDoc);
      }
    } catch {
      // ignore — not critical
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleStartSession = async () => {
    reset();
    await startNewSession();
    navigation.navigate('Question');
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigation.replace('Login');
  };

  const firstName = userName.split(' ')[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {firstName}</Text>
          <Text style={styles.subgreeting}>Ready for your daily exercises?</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Last session card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Last Session</Text>
        {loadingHistory ? (
          <ActivityIndicator color="#3B82F6" />
        ) : lastSession ? (
          <View>
            <Text style={styles.scoreText}>
              {Math.round((lastSession.sessionScore ?? 0) * 100)}%
            </Text>
            <Text style={styles.scoreDetail}>
              {lastSession.correctAnswers} / {lastSession.totalQuestions} correct
            </Text>
            <Text style={styles.scoreDate}>
              {new Date(lastSession.completedAt!).toLocaleDateString()}
            </Text>
          </View>
        ) : (
          <Text style={styles.noSession}>No sessions yet — start your first one!</Text>
        )}
      </View>

      {/* Start button */}
      <TouchableOpacity
        style={[styles.startButton, status === 'loading' && styles.startButtonDisabled]}
        onPress={handleStartSession}
        disabled={status === 'loading'}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Start a new cognitive exercise session"
      >
        {status === 'loading' ? (
          <ActivityIndicator color="#FFFFFF" size="large" />
        ) : (
          <>
            <Text style={styles.startButtonText}>Start Session</Text>
            <Text style={styles.startButtonSub}>10 questions · ~5 minutes</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Info card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>About your exercises</Text>
        <Text style={styles.infoText}>
          Your exercises adapt to your performance. Questions get easier or harder based on
          how you do, keeping each session at just the right challenge level.
        </Text>
        <Text style={styles.infoText}>
          Your progress is shared with your care team, who will reach out if they have any concerns.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    marginTop: 8,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  subgreeting: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 2,
  },
  signOutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  signOutText: {
    fontSize: 14,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  scoreText: {
    fontSize: 52,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  scoreDetail: {
    fontSize: 16,
    color: '#374151',
    marginTop: 4,
  },
  scoreDate: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  noSession: {
    fontSize: 15,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  startButton: {
    backgroundColor: '#1D4ED8',
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  startButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  startButtonSub: {
    fontSize: 14,
    color: '#BFDBFE',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D4ED8',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
});
