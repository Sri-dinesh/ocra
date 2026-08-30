import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { WatchdogAlert } from '../../types/contract';
import { useAlertStore } from '../../store/alertStore';
import { useSettingsStore } from '../../store/settingsStore';
import { ttsService } from '../../voice/tts';
import { colors, spacing, radius, typography, shadow, brand } from '../../theme/theme';
import { PressableScale } from '../ui/anim';

const alertKey = (a: WatchdogAlert) => `${a.alert_type}_${a.triggered_at}`;

/**
 * Proactive critical warning overlay (Task A7.2).
 * Fires the moment a `critical` alert arrives — auto-spoken, full-screen.
 */
export const AlertOverlay: React.FC = () => {
  const router = useRouter();
  const alerts = useAlertStore((s) => s.alerts);
  const dismissAlert = useAlertStore((s) => s.dismissAlert);
  const markAllRead = useAlertStore((s) => s.markAllRead);
  const language = useSettingsStore((s) => s.language);

  const [current, setCurrent] = useState<WatchdogAlert | null>(null);
  const shownRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const critical = alerts.find((a) => a.severity === 'critical');
    if (!critical) return;
    const key = alertKey(critical);
    if (shownRef.current.has(key)) return;
    shownRef.current.add(key);
    markAllRead();
    setCurrent(critical);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    ttsService.speak(`Warning. Warning. ${critical.message}`, language).catch(() => undefined);
  }, [alerts, language, markAllRead]);

  if (!current) return null;

  const handleDismiss = () => {
    ttsService.stop();
    if (dismissAlert) dismissAlert(alertKey(current));
    setCurrent(null);
  };

  const handleViewOnMap = () => {
    ttsService.stop();
    setCurrent(null);
    router.push('/(tabs)/map');
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleDismiss}>
      <Animated.View entering={ZoomIn.duration(160)} exiting={ZoomOut.duration(140)} style={styles.backdrop}>
        <Animated.View entering={ZoomIn.springify().damping(14).stiffness(160)} style={styles.card}>
          <View style={styles.pulseDot} />
          <Text style={styles.kicker}>⚠ CRITICAL WARNING · WATCHDOG</Text>
          <Text style={styles.type}>{current.alert_type.replace(/_/g, ' ')}</Text>
          <Text style={styles.message}>{current.message}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.meta}>Vessel: {current.vessel_id}</Text>
            <Text style={styles.meta}>
              {new Date(current.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          <PressableScale style={styles.mapBtn} onPress={handleViewOnMap}>
            <Text style={styles.mapBtnText}>🗺 View on Map</Text>
          </PressableScale>
          <TouchableOpacity onPress={handleDismiss} style={styles.dismissBtn} hitSlop={10}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(127, 29, 29, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.alertDangerBg,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.alertDanger,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.card,
  },
  pulseDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.alertDanger,
    marginBottom: spacing.md,
  },
  kicker: {
    color: colors.alertDangerText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: spacing.sm,
  },
  type: {
    color: '#FFFFFF',
    ...typography.title,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    color: colors.alertDangerText,
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.xl,
  },
  meta: {
    color: 'rgba(254,226,226,0.7)',
    fontSize: 11,
    fontWeight: '600',
  },
  mapBtn: {
    width: '100%',
    backgroundColor: colors.alertDanger,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  mapBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  dismissBtn: {
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  dismissText: {
    color: 'rgba(254,226,226,0.8)',
    fontSize: 13,
    fontWeight: '600',
  },
});