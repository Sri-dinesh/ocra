import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WifiOff } from 'lucide-react-native';

interface Props {
  onRetry?: () => void;
  onOffline?: () => void;
  title?: string;
  message?: string;
  retryLabel?: string;
}

export const ErrorState: React.FC<Props> = ({
  onRetry,
  onOffline,
  title = 'Lost at Sea',
  message = 'Unable to reach the Sagaradristi marine decision service. Please try again.',
  retryLabel = 'Retry',
}) => {
  return (
    <View style={styles.container}>
      <WifiOff size={48} color="#64748B" strokeWidth={1.7} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={onRetry}
          accessibilityRole="button"
          activeOpacity={0.85}
        >
          <Text style={styles.retryText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
      {onOffline && (
        <TouchableOpacity onPress={onOffline} accessibilityRole="button" style={styles.offlineBtn}>
          <Text style={styles.offlineText}>Try offline mode</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A192F',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 12,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 20,
    backgroundColor: '#0EA5E9',
    minHeight: 44,
    justifyContent: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  offlineBtn: {
    marginTop: 16,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  offlineText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
});