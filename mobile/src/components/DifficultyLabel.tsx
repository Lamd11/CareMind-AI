import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DifficultyTier } from '../types';

interface Props {
  tier: DifficultyTier;
}

const TIER_CONFIG = {
  1: { label: 'Easy', color: '#22C55E' },
  2: { label: 'Medium', color: '#F59E0B' },
  3: { label: 'Hard', color: '#EF4444' },
};

export function DifficultyLabel({ tier }: Props) {
  const config = TIER_CONFIG[tier];
  return (
    <View style={[styles.pill, { backgroundColor: config.color + '22', borderColor: config.color }]}>
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});
