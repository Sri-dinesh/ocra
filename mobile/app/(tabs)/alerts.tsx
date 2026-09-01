import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
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
      <View style={styles.topHeader}>
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    ...typography.section,
    color: colors.text,
    fontSize: 16,
  },
  headerSubtitle: {
    fontSize: 11,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: 'rgba(15, 23, 42, 0.90)',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    ...shadow.md,
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
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  vesselMeta: {
    fontSize: 11,
    color: colors.textMuted,
  },
  editVesselBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editVesselBtnText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '700',
  },
  editVesselDrawer: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    color: colors.text,
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: colors.accentDeep,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  saveBtnText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 12,
  },
  hudGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: 4,
  },
  hudItem: {
    flex: 1,
    alignItems: 'center',
  },
  hudIcon: {
    fontSize: 16,
  },
  hudLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '700',
    marginTop: 2,
  },
  hudStatus: {
    fontSize: 10,
    color: colors.aqua,
    fontWeight: '800',
    marginTop: 1,
  },
  cockpitFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.4)',
  },
  pollMeta: {
    fontSize: 10,
    color: colors.textFaint,
  },
  rePollText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '700',
  },
  simCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  simHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  simBtnRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  simBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  simBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.section,
    color: colors.text,
    fontSize: 14,
  },
  bulkActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  bulkActionText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 4,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.accentDeep,
    borderColor: colors.accent,
  },
  filterChipText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: colors.text,
    fontWeight: '800',
  },
  emptyContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: radius.xl,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 42,
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...typography.title,
    color: colors.riskLow,
    fontSize: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  alertCardWrapper: {
    marginBottom: spacing.sm,
  },
  alertCard: {
    backgroundColor: '#0F172A',
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadow.md,
  },
  cardTopBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  cardBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardBannerIcon: {
    fontSize: 14,
  },
  cardBannerLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardTimestamp: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  cardBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  alertMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    fontWeight: '500',
  },
  actionBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.aqua,
  },
  actionBoxHeading: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.aqua,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  actionBoxText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 17,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  viewOnMapBtn: {
    backgroundColor: 'rgba(14, 116, 144, 0.35)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  viewOnMapBtnText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  dismissBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  dismissBtnText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
});