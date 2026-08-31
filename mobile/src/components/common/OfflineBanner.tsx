import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { SlideInDown, SlideOutUp, Layout } from 'react-native-reanimated';
import { useOnline } from '../../offline/connectivity';
import { sqliteCache } from '../../offline/sqliteCache';
import { colors, spacing, typography } from '../../theme/theme';

function formatSyncTime(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

interface Props {
  /** Optional forced override; falls back to real connectivity when undefined. */
  isOffline?: boolean;
}

export const OfflineBanner: React.FC<Props> = ({ isOffline }) => {
  const liveOnline = useOnline();
  const offline = isOffline ?? !liveOnline;
  const [syncedAt, setSyncedAt] = useState('06:00');

  useEffect(() => {
    if (offline) {
      sqliteCache.getNearestPayload(16.9891, 82.2475).then((p) => {
        if (p) setSyncedAt(formatSyncTime(p.t));
      });
    }
  }, [offline]);

  if (!offline) return null;

  return (
    <Animated.View
      entering={SlideInDown.duration(240)}
      exiting={SlideOutUp.duration(200)}
      layout={Layout.duration(200)}
      style={styles.banner}
    >
      <Text style={styles.text}>✈️ OFFLINE — operating on data synced at {syncedAt}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.offlineWarn,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.offlineWarnText,
    ...typography.caption,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});