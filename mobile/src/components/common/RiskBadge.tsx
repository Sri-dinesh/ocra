import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  band: 'low' | 'moderate' | 'high' | 'extreme' | string;
  score?: number;
}

export const RiskBadge: React.FC<Props> = ({ band, score }) => {
  const getBadgeStyle = () => {
    switch (band?.toLowerCase()) {
      case 'low':
        return { bg: '#065F46', text: '#6EE7B7', label: 'LOW RISK' };
      case 'moderate':
        return { bg: '#854D0E', text: '#FDE047', label: 'MODERATE RISK' };
      case 'high':
        return { bg: '#9A3412', text: '#FDBA74', label: 'HIGH RISK' };
      case 'extreme':
        return { bg: '#991B1B', text: '#FCA5A5', label: 'EXTREME RISK' };
      default:
        return { bg: '#334155', text: '#94A3B8', label: 'UNKNOWN RISK' };
    }
  };

  const styleConfig = getBadgeStyle();

  return (
    <View style={[styles.badge, { backgroundColor: styleConfig.bg }]}>
      <Text style={[styles.label, { color: styleConfig.text }]}>
        {styleConfig.label} {score !== undefined ? `(${Math.round(score)}/100)` : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
