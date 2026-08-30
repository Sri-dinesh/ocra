import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, typography } from '../../theme/theme';

interface Props {
  band: 'low' | 'moderate' | 'high' | 'extreme' | string;
  score?: number;
}

const BAND_CONFIG: Record<string, { bg: string; fg: string; fill: string; label: string; rank: number }> = {
  low: { bg: 'rgba(16,185,129,0.14)', fg: colors.riskLow, fill: colors.riskLow, label: 'LOW RISK · Clear to Sail', rank: 1 },
  moderate: { bg: 'rgba(245,158,11,0.14)', fg: colors.riskModerate, fill: colors.riskModerate, label: 'MODERATE RISK · Caution', rank: 2 },
  high: { bg: 'rgba(249,115,22,0.14)', fg: colors.riskHigh, fill: colors.riskHigh, label: 'HIGH RISK · High Caution', rank: 3 },
  extreme: { bg: 'rgba(239,68,68,0.18)', fg: colors.riskExtreme, fill: colors.riskExtreme, label: 'EXTREME RISK · DO NOT VENTURE', rank: 4 },
};

const LEVELS = [1, 2, 3, 4];

export const RiskBadge: React.FC<Props> = ({ band, score }) => {
  const key = (band || '').toLowerCase();
  const cfg = BAND_CONFIG[key] || {
    bg: 'rgba(100,116,139,0.14)',
    fg: colors.textMuted,
    fill: colors.textFaint,
    label: 'RISK ASSESSMENT PENDING',
    rank: 0,
  };

  return (
    <View style={[styles.wrap, { backgroundColor: cfg.bg, borderColor: cfg.fill + '55' }]}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: cfg.fg }]}>{cfg.label}</Text>
        {score !== undefined && score !== null && (
          <Text style={[styles.score, { color: cfg.fg }]}>{Math.round(score)}/100</Text>
        )}
      </View>
      <View style={styles.meter}>
        {LEVELS.map((level) => (
          <View
            key={level}
            style={[
              styles.meterSeg,
              {
                backgroundColor: level <= cfg.rank ? cfg.fill : 'rgba(148,163,184,0.18)',
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 180,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  score: {
    ...typography.caption,
    fontWeight: '800',
    marginLeft: 8,
  },
  meter: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 5,
  },
  meterSeg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
});