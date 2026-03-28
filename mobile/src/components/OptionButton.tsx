import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';

type OptionState = 'default' | 'correct' | 'incorrect' | 'disabled';

interface Props {
  label: string;
  state: OptionState;
  onPress: () => void;
}

const STATE_STYLES: Record<OptionState, { bg: string; border: string; text: string }> = {
  default: { bg: '#FFFFFF', border: '#D1D5DB', text: '#111827' },
  correct: { bg: '#DCFCE7', border: '#22C55E', text: '#15803D' },
  incorrect: { bg: '#FEE2E2', border: '#EF4444', text: '#B91C1C' },
  disabled: { bg: '#F9FAFB', border: '#E5E7EB', text: '#9CA3AF' },
};

export function OptionButton({ label, state, onPress }: Props) {
  const colors = STATE_STYLES[state];
  const isDisabled = state === 'disabled' || state === 'correct' || state === 'incorrect';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      disabled={isDisabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
    >
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
  },
  text: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
  },
});
