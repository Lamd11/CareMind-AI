/**
 * ResultScreen.tsx — Session summary shown after completing all 10 questions.
 *
 * Encouragement messages are rule-based (deterministic), not ML-generated.
 * This satisfies the explainability requirement: the clinician can verify
 * exactly which score threshold triggered which message.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useSessionStore } from '../store/sessionStore';
import { DifficultyLabel } from '../components/DifficultyLabel';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Result'>;
  route: { params: { userId: string; userName: string } };
};

export function ResultScreen({ navigation, route }: Props) {
  const { sessionResult, reset } = useSessionStore();

  if (!sessionResult) {
    navigation.replace('Home', route.params);
    return null;
  }

  const { sessionScore, totalQuestions, correctAnswers, difficultyLevel, message } = sessionResult;
  const scorePct = Math.round(sessionScore * 100);

  const scoreColor = scorePct >= 80 ? '#22C55E' : scorePct >= 60 ? '#3B82F6' : '#EF4444';

  const handleDone = () => {
    reset();
    navigation.replace('Home', route.params);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Session Complete</Text>

        {/* Score ring */}
        <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
          <Text style={[styles.scoreNumber, { color: scoreColor }]}>{scorePct}%</Text>
          <Text style={styles.scoreLabel}>Score</Text>
        </View>

        {/* Detail row */}
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailValue}>{correctAnswers}</Text>
            <Text style={styles.detailLabel}>Correct</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailItem}>
            <Text style={styles.detailValue}>{totalQuestions - correctAnswers}</Text>
            <Text style={styles.detailLabel}>Incorrect</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailItem}>
            <DifficultyLabel tier={difficultyLevel} />
            <Text style={styles.detailLabel}>Final Tier</Text>
          </View>
        </View>

        {/* Encouragement message (rule-based) */}
        <View style={styles.messageCard}>
          <Text style={styles.messageText}>{message}</Text>
        </View>

        {/* Explanation for clinician transparency */}
        <View style={styles.explanationCard}>
          <Text style={styles.explanationTitle}>How this score is calculated</Text>
          <Text style={styles.explanationText}>
            Score = {correctAnswers} correct answers ÷ {totalQuestions} total questions = {scorePct}%.
            {'\n\n'}
            Difficulty adapts based on your last 5 answers. If accuracy exceeds 75%, questions get harder. If below 40%, they get easier.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleDone}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Return to home screen"
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 24,
    paddingBottom: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 32,
  },
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: -4,
  },
  detailRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailItem: {
    alignItems: 'center',
    gap: 6,
  },
  detailValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  detailLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  detailDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  messageCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  messageText: {
    fontSize: 18,
    color: '#1D4ED8',
    fontWeight: '600',
    lineHeight: 26,
    textAlign: 'center',
  },
  explanationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 32,
  },
  explanationTitle: {
    fontSize: 13,
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
  doneButton: {
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
