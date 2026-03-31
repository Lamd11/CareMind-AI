/**
 * QuestionScreen.tsx — The core patient-facing exercise screen.
 *
 * Design decisions for accessibility and dementia-appropriate UX:
 *   - Minimum 22pt font for question text (WHO dementia accessibility guidance)
 *   - No countdown timer (reduces anxiety; timed tasks are inappropriate for dementia)
 *   - 800ms reveal delay after answer: patient sees feedback before auto-advancing
 *   - Large touch targets (min 64px height) for motor accessibility
 *   - Difficulty label shows current tier (Easy/Medium/Hard) for clinician demos
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useSessionStore } from '../store/sessionStore';
import { OptionButton } from '../components/OptionButton';
import { ProgressBar } from '../components/ProgressBar';
import { DifficultyLabel } from '../components/DifficultyLabel';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type OptionState = 'default' | 'correct' | 'incorrect' | 'disabled';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Question'>;
  route: { params: { userId: string; userName: string } };
};

export function QuestionScreen({ navigation, route }: Props) {
  const {
    currentQuestion,
    currentDifficulty,
    questionNumber,
    totalQuestions,
    status,
    error,
    submitAnswer,
    sessionResult,
  } = useSessionStore();

  const [optionStates, setOptionStates] = useState<Record<string, OptionState>>({});
  const [answered, setAnswered] = useState(false);

  // Navigate to result screen when session completes
  React.useEffect(() => {
    if (status === 'complete' && sessionResult) {
      navigation.replace('Result', route.params);
    }
  }, [status, sessionResult, navigation, route.params]);

  // Reset option states when question changes
  React.useEffect(() => {
    setOptionStates({});
    setAnswered(false);
  }, [currentQuestion?.questionId]);

  const handleOptionPress = async (option: string) => {
    if (answered || !currentQuestion) return;
    setAnswered(true);

    const isCorrect = option === currentQuestion.correctAnswer;

    // Show feedback immediately
    const newStates: Record<string, OptionState> = {};
    currentQuestion.options.forEach((opt) => {
      if (opt === option) {
        newStates[opt] = isCorrect ? 'correct' : 'incorrect';
      } else if (opt === currentQuestion.correctAnswer && !isCorrect) {
        newStates[opt] = 'correct'; // reveal correct answer if wrong
      } else {
        newStates[opt] = 'disabled';
      }
    });
    setOptionStates(newStates);

    // Wait 800ms for patient to see feedback, then auto-advance
    await new Promise((resolve) => setTimeout(resolve, 800));
    await submitAnswer(option);
  };

  if (status === 'loading' || status === 'submitting') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1D4ED8" />
          <Text style={styles.loadingText}>Loading next question...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Something went wrong.</Text>
          <Text style={styles.errorDetail}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentQuestion) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top bar: progress + difficulty */}
        <View style={styles.topBar}>
          <ProgressBar current={questionNumber} total={totalQuestions} />
          <DifficultyLabel tier={currentDifficulty} />
        </View>

        {/* Category + source row */}
        <View style={styles.categoryRow}>
          <Text style={styles.categoryChip}>
            {categoryLabel(currentQuestion.category)}
          </Text>
          {currentQuestion.source && (
            <View style={[
              styles.sourceBadge,
              currentQuestion.source === 'ai_generated' ? styles.sourceBadgeAI : styles.sourceBadgeStatic,
            ]}>
              <Text style={[
                styles.sourceBadgeText,
                currentQuestion.source === 'ai_generated' ? styles.sourceBadgeTextAI : styles.sourceBadgeTextStatic,
              ]}>
                {currentQuestion.source === 'ai_generated' ? 'AI Generated' : 'Static Bank'}
              </Text>
            </View>
          )}
        </View>

        {/* Question text — large accessible font */}
        <Text style={styles.questionText} accessible accessibilityRole="text">
          {currentQuestion.text}
        </Text>

        {/* Answer options */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option) => (
            <OptionButton
              key={option}
              label={option}
              state={optionStates[option] ?? 'default'}
              onPress={() => handleOptionPress(option)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    orientation: 'Orientation',
    short_term_recall: 'Short-Term Recall',
    attention_memory: 'Attention & Memory',
    language_naming: 'Language & Naming',
  };
  return labels[category] ?? category;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryChip: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  sourceBadgeAI: {
    backgroundColor: '#EDE9FE',
  },
  sourceBadgeStatic: {
    backgroundColor: '#F3F4F6',
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sourceBadgeTextAI: {
    color: '#7C3AED',
  },
  sourceBadgeTextStatic: {
    color: '#6B7280',
  },
  questionText: {
    fontSize: 22, // minimum 22pt for dementia accessibility
    fontWeight: '600',
    color: '#111827',
    lineHeight: 32,
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
  },
  errorDetail: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
