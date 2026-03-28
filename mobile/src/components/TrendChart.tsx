/**
 * TrendChart.tsx — Line chart showing session scores over time.
 *
 * Features:
 *   - Session score (0–100%) plotted against session number
 *   - Dashed horizontal baseline reference line
 *   - Color-coded data points: green (≥ baseline), amber (85–100% of baseline), red (< 85% of baseline)
 *
 * This is the primary thesis screenshot component.
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SessionDoc } from '../types';

interface Props {
  sessions: SessionDoc[];
  baselineScore?: number;
}

const screenWidth = Dimensions.get('window').width;

export function TrendChart({ sessions, baselineScore }: Props) {
  if (sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No sessions completed yet.</Text>
      </View>
    );
  }

  const scores = sessions.map((s) => Math.round((s.sessionScore ?? 0) * 100));
  const labels = sessions.map((_, i) => (i + 1) % 3 === 0 ? `${i + 1}` : '');

  const baselinePct = baselineScore !== undefined ? Math.round(baselineScore * 100) : null;

  // Determine dot colors
  const dotColors = scores.map((score) => {
    if (baselinePct === null) return '#3B82F6';
    if (score >= baselinePct) return '#22C55E';
    if (score >= baselinePct * 0.85) return '#F59E0B';
    return '#EF4444';
  });

  return (
    <View style={styles.container}>
      <LineChart
        data={{
          labels,
          datasets: [
            {
              data: scores.length > 0 ? scores : [0],
              color: (_opacity = 1) => '#3B82F6',
              strokeWidth: 2,
            },
          ],
        }}
        width={screenWidth - 32}
        height={220}
        yAxisSuffix="%"
        yAxisInterval={1}
        fromZero
        chartConfig={{
          backgroundColor: '#FFFFFF',
          backgroundGradientFrom: '#FFFFFF',
          backgroundGradientTo: '#FFFFFF',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          style: { borderRadius: 16 },
          propsForDots: {
            r: '5',
          },
          propsForBackgroundLines: {
            stroke: '#F3F4F6',
          },
        }}
        getDotColor={(dataPoint, index) => dotColors[index] ?? '#3B82F6'}
        bezier
        style={styles.chart}
      />

      {baselinePct !== null && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.legendText}>At or above baseline ({baselinePct}%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Slightly below baseline</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>Below low threshold</Text>
          </View>
        </View>
      )}

      {sessions.length < 5 && (
        <Text style={styles.baselineNote}>
          Baseline established after {5 - sessions.length} more session{sessions.length === 4 ? '' : 's'}.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  chart: {
    borderRadius: 16,
  },
  legend: {
    marginTop: 12,
    paddingHorizontal: 4,
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  empty: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  baselineNote: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
