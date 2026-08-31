import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useAlertStore, SEVERITY_ORDER } from '../../src/store/alertStore';
import { WatchdogAlert } from '../../src/types/contract';
import { colors, spacing, radius, typography } from '../../src/theme/theme';
import { FadeInUpView, PressableScale } from '../../src/components/ui/anim';

const SEVERITY_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: 'rgba(239,68,68,0.15)', text: colors.alertDanger, border: colors.alertDanger, label: 'CRITICAL' },
  high: { bg: 'rgba(249,115,22,0.15)', text: colors.riskHigh, border: colors.riskHigh, label: 'HIGH' },
  moderate: { bg: 'rgba(245,158,11,0.15)', text: colors.riskModerate, border: colors.riskModerate, label: 'MODERATE' },
  low: { bg: 'rgba(16,185,129,0.15)', text: colors.riskLow, border: colors.riskLow, label: 'LOW' },
};

const alertKey = (a: WatchdogAlert) => `${a.alert_type}_${a.triggered_at}`;

export default function AlertsScreen() {
  const {
    alerts,
    unreadCount,
    subscription,
    vesselId,
    vesselLabel,
    isPolling,
    lastPolledAt,
    subscribeVessel,
    refreshAlerts,
    dismissAlert,
    clearAlerts,
    markAllRead,
    setVesselLabel,
  } = useAlertStore();

  useEffect(() => {
    if (!vesselId) return;
    refreshAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegister = () => {
    subscribeVessel(vesselLabel.trim() || 'Sea Hawk-01', 16.9891, 82.2475);
  };

  const sorted = [...alerts].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );

  return (
    <View style={styles.container}>
      {/* Subscription card */}
      <View style={styles.subCard}>
        <View style={styles.subHeader}>
          <Text style={styles.subTitle}>⚓ Vessel Watch</Text>
          {isPolling && <Text style={styles.liveDot}>● LIVE</Text>}
        </View>

        {vesselId ? (
          <>
            <Text style={styles.subLine}>
              <Text style={styles.subStrong}>{vesselLabel}</Text> · {vesselId.slice(0, 8)}… — active watchdog subscription
            </Text>
            <Text style={styles.subMeta}>
              Polling every ~20s{lastPolledAt ? ` · last ${new Date(lastPolledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </Text>
            <View style={styles.subActions}>
              <TouchableOpacity onPress={refreshAlerts} hitSlop={10}>
                <Text style={styles.subAction}>↻ Re-poll</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => useAlertStore.getState().startPolling()}
                hitSlop={10}
              >
                <Text style={styles.subAction}>▶ Ensure polling</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.subLine}>Register this vessel for proactive IMBL & severe-weather warnings.</Text>
            <View style={styles.registerRow}>
              <TextInput
                style={styles.input}
                value={vesselLabel}
                onChangeText={setVesselLabel}
                placeholder="Vessel label, e.g. Sea Hawk-01"
                placeholderTextColor={colors.textFaint}
              />
              <PressableScale style={styles.registerBtn} onPress={handleRegister}>
                <Text style={styles.registerBtnText}>Register</Text>
              </PressableScale>
            </View>
          </>
        )}
      </View>

      {!subscription && (
        <Text style={styles.note}>
          ℹ️ Demo: registering opens the simulation with an IMBL proximity warning shortly.
        </Text>
      )}

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>
          Active Watchdog Alerts{unreadCount > 0 ? ` (${unreadCount} new)` : ''}
        </Text>
        {alerts.length > 0 && (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={markAllRead} hitSlop={8}>
              <Text style={styles.clearText}>Mark read</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearAlerts} hitSlop={8}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {sorted.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛡️</Text>
          <Text style={styles.emptyTitle}>All Clear</Text>
          <Text style={styles.emptySubtitle}>
            No proximity or weather hazards. The watchdog is watching the ocean so you don't have to.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => `${item.vessel_id}_${alertKey(item)}`}
          contentContainerStyle={styles.list}
          windowSize={7}
          renderItem={({ item, index }) => {
            const sev = SEVERITY_STYLE[item.severity] || SEVERITY_STYLE.moderate;
            return (
              <FadeInUpView delay={index * 50}>
                <View style={[styles.alertCard, { borderColor: sev.border + '66' }]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.alertType}>{item.alert_type.replace(/_/g, ' ')}</Text>
                    <View style={[styles.severityBadge, { backgroundColor: sev.bg, borderColor: sev.border }]}>
                      <Text style={[styles.severityText, { color: sev.text }]}>{sev.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.message}>{item.message}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.timestamp}>
                      {new Date(item.triggered_at).toLocaleString()}
                    </Text>
                    <TouchableOpacity onPress={() => dismissAlert(alertKey(item))} hitSlop={10}>
                      <Text style={styles.dismissText}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </FadeInUpView>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
  },
  subCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  subTitle: {
    ...typography.section,
    color: colors.text,
  },
  liveDot: {
    color: colors.riskLow,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subLine: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  subStrong: {
    color: colors.accent,
    fontWeight: '800',
  },
  subMeta: {
    color: colors.textFaint,
    fontSize: 11,
    marginTop: 4,
  },
  subActions: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  subAction: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  registerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 14,
  },
  registerBtn: {
    backgroundColor: colors.accentDeep,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  registerBtnText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 13,
  },
  note: {
    color: colors.textFaint,
    fontSize: 11,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  headerTitle: {
    ...typography.section,
    color: colors.text,
    flexShrink: 1,
  },
  clearText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.title,
    color: colors.riskLow,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  alertCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  alertType: {
    ...typography.bodyStrong,
    color: colors.text,
    textTransform: 'capitalize',
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  message: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 11,
    color: colors.textFaint,
  },
  dismissText: {
    color: colors.aqua,
    fontSize: 12,
    fontWeight: '700',
  },
});