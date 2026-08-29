import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  isOffline: boolean;
  syncedAt?: string;
}

export const OfflineBanner: React.FC<Props> = ({ isOffline, syncedAt = '06:00 IST' }) => {
  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        ⚠️ OFFLINE — using data synced at {syncedAt}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#B45309',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FEF3C7',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
