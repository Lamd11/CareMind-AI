import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertSeverity } from '../types';

interface Props {
  severity: AlertSeverity;
}

const SEVERITY_CONFIG = {
  HIGH: { label: 'HIGH', bg: '#FEE2E2', text: '#B91C1C', border: '#EF4444' },
  MEDIUM: { label: 'MEDIUM', bg: '#FEF9C3', text: '#A16207', border: '#EAB308' },
  LOW: { label: 'LOW', bg: '#DCFCE7', text: '#15803D', border: '#22C55E' },
};

export function AlertBadge({ severity }: Props) {
  const config = SEVERITY_CONFIG[severity];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
