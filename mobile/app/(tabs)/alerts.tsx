import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAlertStore, SEVERITY_ORDER, Severity } from '../../src/store/alertStore';
import { useChatStore } from '../../src/store/chatStore';
import { WatchdogAlert } from '../../src/types/contract';
import { colors, spacing, radius, typography, shadow } from '../../src/theme/theme';
import { FadeInUpView, PressableScale } from '../../src/components/ui/anim';
import { PageInfoModal } from '../../src/components/ui/PageInfoModal';

const SEVERITY_STYLE: Record<string, { bg: string; text: string; border: string; label: string; icon: string }> = {
  critical: { bg: 'rgba(239,68,68,0.18)', text: colors.alertDanger, border: colors.alertDanger, label: 'CRITICAL HAZARD', icon: '🚨' },
  high: { bg: 'rgba(249,115,22,0.18)', text: colors.riskHigh, border: colors.riskHigh, label: 'HIGH RISK ADVISORY', icon: '⚠️' },
  moderate: { bg: 'rgba(245,158,11,0.18)', text: colors.riskModerate, border: colors.riskModerate, label: 'MODERATE CAUTION', icon: '⚡' },
  low: { bg: 'rgba(16,185,129,0.18)', text: colors.riskLow, border: colors.riskLow, label: 'SYSTEM INFO', icon: 'ℹ️' },
};

const alertKey = (a: WatchdogAlert) => `${a.alert_type}_${a.triggered_at}`;

export default function AlertsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'critical' | 'moderate'>('all');
  const [isEditingVessel, setIsEditingVessel] = useState(false);

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
    triggerDemoHazard,
  } = useAlertStore();

  const { lastLocationHint } = useChatStore();

  useEffect(() => {
    if (!vesselId) {
      subscribeVessel(vesselLabel || 'Sea Hawk-01', lastLocationHint?.lat || 16.9891, lastLocationHint?.lon || 82.2475);
    } else {
      refreshAlerts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegister = () => {
    subscribeVessel(vesselLabel.trim() || 'Sea Hawk-01', lastLocationHint?.lat || 16.9891, lastLocationHint?.lon || 82.2475);
    setIsEditingVessel(false);
  };

  const sorted = [...alerts].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity as Severity) - SEVERITY_ORDER.indexOf(b.severity as Severity),
  );

  const filteredAlerts = sorted.filter((a) => {
    if (selectedFilter === 'critical') return a.severity === 'critical' || a.severity === 'high';
    if (selectedFilter === 'moderate') return a.severity === 'moderate' || a.severity === 'low';
    return true;
  });

  const getActionRecommendation = (alertType: string): string => {
    switch (alertType) {
      case 'imbl_proximity':
        return 'Turn vessel heading 270° West immediately to maintain a 5.0 nm buffer from the International Boundary.';
      case 'cyclone_warning':
        return 'Seek immediate harbor shelter. Secure all loose deck cargo and tune VHF Channel 16 for IMD bulletins.';
      case 'wave_spike':
        return 'Reduce boat cruising speed to 6 knots. Steer bow into incoming swell to prevent vessel swamping.';
      default:
        return 'Check marine weather updates before resuming voyage operations.';
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top + spacing.sm, spacing.xl) }]}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerIcon}>🛡️</Text>
          <View>
            <Text style={styles.headerTitle}>Vessel Watchdog</Text>
            <Text style={styles.headerSubtitle}>
              {isPolling ? '● Live 24/7 Hazard Shield' : '○ Standby Mode'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <PressableScale
            style={styles.infoBtn}
            onPress={() => setIsInfoModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Watchdog Guide"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.infoBtnText}>ℹ️</Text>
          </PressableScale>
        </View>
      </View>

      <FlatList
        data={filteredAlerts}
        keyExtractor={(item) => `${item.vessel_id}_${alertKey(item)}`}
        contentContainerStyle={styles.scrollList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerComponent}>
            {/* Guardian Cockpit Status Card */}
            <View style={styles.cockpitCard}>
              <View style={styles.cockpitHeader}>
                <View style={styles.vesselInfoRow}>
                  <Text style={styles.vesselGlyph}>⚓</Text>
                  <View style={styles.vesselTextContainer}>
                    <Text style={styles.vesselName}>{vesselLabel}</Text>
                    <Text style={styles.vesselMeta}>
                      ID: {vesselId ? vesselId.slice(0, 14) : 'demo-vessel-01'} · 📍 {lastLocationHint?.name || 'Kakinada'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.editVesselBtn}
                  onPress={() => setIsEditingVessel((v) => !v)}
                >
                  <Text style={styles.editVesselBtnText}>
                    {isEditingVessel ? 'Cancel' : 'Edit Vessel'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Vessel Registration Input Drawer */}
              {isEditingVessel && (
                <FadeInUpView style={styles.editVesselDrawer}>
                  <Text style={styles.inputLabel}>Vessel Name / Radio Call-sign:</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={vesselLabel}
                      onChangeText={setVesselLabel}
                      placeholder="e.g. Sea Hawk-01"
                      placeholderTextColor={colors.textFaint}
                    />
                    <PressableScale style={styles.saveBtn} onPress={handleRegister}>
                      <Text style={styles.saveBtnText}>Save</Text>
                    </PressableScale>
                  </View>
                </FadeInUpView>
              )}

              {/* 4 Active Safety Monitors HUD */}
              <View style={styles.hudGrid}>
                <View style={styles.hudItem}>
                  <Text style={styles.hudIcon}>⚡</Text>
                  <Text style={styles.hudLabel}>IMBL Buffer</Text>
                  <Text style={styles.hudStatus}>Armed (5nm)</Text>
                </View>
                <View style={styles.hudItem}>
                  <Text style={styles.hudIcon}>🌀</Text>
                  <Text style={styles.hudLabel}>Cyclone Radar</Text>
                  <Text style={styles.hudStatus}>Scanning</Text>
                </View>
                <View style={styles.hudItem}>
                  <Text style={styles.hudIcon}>🌊</Text>
                  <Text style={styles.hudLabel}>Wave Sentry</Text>
                  <Text style={styles.hudStatus}>1.4m Swell</Text>
                </View>
                <View style={styles.hudItem}>
                  <Text style={styles.hudIcon}>🦺</Text>
                  <Text style={styles.hudLabel}>MPA Sanctuary</Text>
                  <Text style={styles.hudStatus}>Protected</Text>
                </View>
              </View>

              {/* Cockpit Footer */}
              <View style={styles.cockpitFooter}>
                <Text style={styles.pollMeta}>
                  Scanned: {lastPolledAt ? new Date(lastPolledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'} (20s interval)
                </Text>
                <TouchableOpacity onPress={refreshAlerts} hitSlop={8}>
                  <Text style={styles.rePollText}>↻ Refresh Telemetry</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Demo Simulator Buttons */}
            <View style={styles.simCard}>
              <Text style={styles.simHeading}>🧪 Test Emergency Simulation</Text>
              <View style={styles.simBtnRow}>
                <PressableScale
                  style={[styles.simBtn, { borderColor: colors.alertDanger }]}
                  onPress={() => triggerDemoHazard('imbl')}
                >
                  <Text style={[styles.simBtnText, { color: colors.alertDanger }]}>
                    🚨 IMBL Breach
                  </Text>
                </PressableScale>

                <PressableScale
                  style={[styles.simBtn, { borderColor: colors.riskHigh }]}
                  onPress={() => triggerDemoHazard('cyclone')}
                >
                  <Text style={[styles.simBtnText, { color: colors.riskHigh }]}>
                    🌀 Cyclone BOB
                  </Text>
                </PressableScale>

                <PressableScale
                  style={[styles.simBtn, { borderColor: colors.riskModerate }]}
                  onPress={() => triggerDemoHazard('wave')}
                >
                  <Text style={[styles.simBtnText, { color: colors.riskModerate }]}>
                    🌊 3.2m Swell
                  </Text>
                </PressableScale>
              </View>
            </View>

            {/* Section Header & Filters */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>
                  Active Warnings {unreadCount > 0 ? `(${unreadCount} new)` : ''}
                </Text>
              </View>
              {alerts.length > 0 && (
                <View style={styles.bulkActions}>
                  <TouchableOpacity onPress={markAllRead} hitSlop={8}>
                    <Text style={styles.bulkActionText}>Mark read</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={clearAlerts} hitSlop={8}>
                    <Text style={styles.bulkActionText}>Clear all</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Filter Pills */}
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('all')}
              >
                <Text style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}>
                  All ({alerts.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, selectedFilter === 'critical' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('critical')}
              >
                <Text style={[styles.filterChipText, selectedFilter === 'critical' && styles.filterChipTextActive]}>
                  🚨 Critical / High ({alerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterChip, selectedFilter === 'moderate' && styles.filterChipActive]}
                onPress={() => setSelectedFilter('moderate')}
              >
                <Text style={[styles.filterChipText, selectedFilter === 'moderate' && styles.filterChipTextActive]}>
                  ⚠️ Caution ({alerts.filter((a) => a.severity === 'moderate' || a.severity === 'low').length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyTitle}>All Clear — Safe Waters</Text>
            <Text style={styles.emptySubtitle}>
              No international boundary breaches, rogue swells, or cyclone warnings detected around your harbor.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const sev = SEVERITY_STYLE[item.severity] || SEVERITY_STYLE.moderate;
          return (
            <FadeInUpView delay={index * 40} style={styles.alertCardWrapper}>
              <View style={[styles.alertCard, { borderColor: sev.border }]}>
                {/* Severity Banner */}
                <View style={[styles.cardTopBanner, { backgroundColor: sev.bg }]}>
                  <View style={styles.cardBannerLeft}>
                    <Text style={styles.cardBannerIcon}>{sev.icon}</Text>
                    <Text style={[styles.cardBannerLabel, { color: sev.text }]}>
                      {sev.label}
                    </Text>
                  </View>
                  <Text style={styles.cardTimestamp}>
                    {new Date(item.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {/* Body Content */}
                <View style={styles.cardBody}>
                  <Text style={styles.alertMessage}>{item.message}</Text>

                  {/* Actionable Guidance Callout */}
                  <View style={styles.actionBox}>
                    <Text style={styles.actionBoxHeading}>🧭 RECOMMENDED ACTION</Text>
                    <Text style={styles.actionBoxText}>
                      {getActionRecommendation(item.alert_type)}
                    </Text>
                  </View>

                  {/* Touch Buttons */}
                  <View style={styles.cardActions}>
                    <PressableScale
                      style={styles.viewOnMapBtn}
                      onPress={() => router.push('/map')}
                    >
                      <Text style={styles.viewOnMapBtnText}>🗺️ View on Map</Text>
                    </PressableScale>

                    <TouchableOpacity
                      style={styles.dismissBtn}
                      onPress={() => dismissAlert(alertKey(item))}
                      hitSlop={8}
                    >
                      <Text style={styles.dismissBtnText}>✓ Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </FadeInUpView>
          );
        }}
      />

      {/* Watchdog Help Guide Modal */}
      <PageInfoModal
        visible={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        icon="🛡️"
        title="Vessel Watchdog & Hazard Shield"
        subtitle="Autonomous Marine Safety Monitoring"
        whatIsIt="A continuous background guardian that tracks your vessel's GPS position against international borders (IMBL), shallow reefs, marine protected sanctuaries, and sudden storm spikes."
        howToUse={[
          'Verify your vessel name (e.g. Sea Hawk-01) in the cockpit card at the top.',
          'The watchdog autonomously checks your distance to the International Maritime Boundary Line every 20 seconds.',
          'When an alert triggers, review the clear "RECOMMENDED ACTION" box specifying course adjustments or safety procedures.',
          'Tap "🗺️ View on Map" to immediately inspect the danger polygon and safe detour route on the interactive GIS map.',
          'Tap the "🧪 Test Emergency Simulation" buttons anytime to see how live alerts behave!',
        ]}
        features={[
          {
            icon: '⚡',
            title: 'IMBL 5nm Buffer Proximity',
            description: 'Automated audible and visual alarms warning you before entering Sri Lankan or international territorial waters.',
          },
          {
            icon: '🌀',
            title: 'IMD Storm & Cyclone Bulletin Radar',
            description: 'Live alerts for deep depressions, severe cyclonic storms, and gale-force wind bursts.',
          },
          {
            icon: '🌊',
            title: 'Non-Linear Swell & Rogue Waves',
            description: 'Monitors significant wave heights from INCOIS ocean buoys with vessel-class risk modifiers.',
          },
        ]}
        legends={[
          { badge: 'CRITICAL', badgeBg: 'rgba(239,68,68,0.25)', badgeColor: '#EF4444', label: 'Imminent Danger · IMBL border breach or active cyclone' },
          { badge: 'HIGH', badgeBg: 'rgba(249,115,22,0.25)', badgeColor: '#F97316', label: 'High Risk · 5nm IMBL buffer warning, wave height > 3.0m' },
          { badge: 'MODERATE', badgeBg: 'rgba(245,158,11,0.25)', badgeColor: '#F59E0B', label: 'Caution · Squally weather or sanctuary proximity' },
          { badge: 'LOW', badgeBg: 'rgba(16,185,129,0.25)', badgeColor: '#10B981', label: 'System Normal · Proactive telemetry heartbeat' },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 48 : spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 18,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.aqua,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBtnText: {
    fontSize: 16,
  },
  scrollList: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerComponent: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  cockpitCard: {
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
    ...shadow.float,
  },
  cockpitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  vesselInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  vesselGlyph: {
    fontSize: 20,
  },
  vesselTextContainer: {
    flex: 1,
  },
  vesselName: {
    ...typography.title,
    color: colors.text,
    fontSize: 16,
  },
  vesselMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  editVesselBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  editVesselBtnText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '700',
  },
  editVesselDrawer: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: colors.accentDeep,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  saveBtnText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 13,
  },
  hudGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 6,
  },
  hudItem: {
    flex: 1,
    alignItems: 'center',
  },
  hudIcon: {
    fontSize: 18,
  },
  hudLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '800',
    marginTop: 4,
  },
  hudStatus: {
    fontSize: 11,
    color: colors.aqua,
    fontWeight: '800',
    marginTop: 2,
  },
  cockpitFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  pollMeta: {
    fontSize: 11,
    color: colors.textFaint,
  },
  rePollText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '700',
  },
  simCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  simHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  simBtnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  simBtn: {
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  simBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 16,
  },
  bulkActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  bulkActionText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 8,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  filterChipText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: colors.accent,
    fontWeight: '800',
  },
  emptyContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: radius.xl,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.title,
    color: colors.riskLow,
    fontSize: 18,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  alertCardWrapper: {
    marginBottom: spacing.md,
  },
  alertCard: {
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadow.float,
  },
  cardTopBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  cardBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardBannerIcon: {
    fontSize: 16,
  },
  cardBannerLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardTimestamp: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
  },
  cardBody: {
    padding: spacing.md,
    gap: spacing.md,
  },
  alertMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    fontWeight: '500',
  },
  actionBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.aqua,
  },
  actionBoxHeading: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.aqua,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  actionBoxText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  viewOnMapBtn: {
    backgroundColor: 'rgba(14, 116, 144, 0.2)',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  viewOnMapBtnText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  dismissBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  dismissBtnText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
});