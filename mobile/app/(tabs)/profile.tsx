import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useSettingsStore, ROLE_META, UserRole } from '../../src/store/settingsStore';
import { useAlertStore } from '../../src/store/alertStore';
import { colors, spacing, radius, typography, brand } from '../../src/theme/theme';
import { FadeInUpView, PressableScale } from '../../src/components/ui/anim';

const LANGUAGES = [
  { code: 'en-IN', label: 'English (India)' },
  { code: 'ta-IN', label: 'தமிழ்' },
  { code: 'hi-IN', label: 'हिन्दी' },
  { code: 'te-IN', label: 'తెలుగు' },
];

const ROLES = (Object.keys(ROLE_META) as UserRole[]);

export default function ProfileScreen() {
  const {
    role,
    language,
    autoVoicePlayback,
    hapticsEnabled,
    setRole,
    setLanguage,
    setAutoVoicePlayback,
    setHapticsEnabled,
  } = useSettingsStore();
  const vesselId = useAlertStore((s) => s.vesselId);
  const vesselLabel = useAlertStore((s) => s.vesselLabel);
  const subscription = useAlertStore((s) => s.subscription);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroGlyph}>{brand.waveMark}</Text>
        <Text style={styles.heroName}>{brand.name}</Text>
        <Text style={styles.heroDev}>{brand.nameDevanagari}</Text>
      </View>

      <FadeInUpView>
        <Text style={styles.sectionTitle}>Operational Persona</Text>
        <Text style={styles.sectionDesc}>
          Tailors advice density, map layers, and alerts to your role.
        </Text>
        {ROLES.map((r) => {
          const meta = ROLE_META[r];
          const isSelected = role === r;
          return (
            <PressableScale
              key={r}
              style={[styles.card, isSelected && styles.selectedCard]}
              onPress={() => setRole(r)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>{meta.icon}</Text>
                <Text style={[styles.cardTitle, isSelected && styles.selectedCardTitle]}>
                  {meta.title}
                </Text>
                {isSelected && <Text style={styles.checkIcon}>✓</Text>}
              </View>
              <Text style={styles.cardDesc}>{meta.desc}</Text>
            </PressableScale>
          );
        })}
      </FadeInUpView>

      <FadeInUpView>
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Voice & Language</Text>
        <View style={styles.langGrid}>
          {LANGUAGES.map((l) => {
            const isSelected = language === l.code;
            return (
              <PressableScale
                key={l.code}
                style={[styles.langChip, isSelected && styles.selectedLangChip]}
                onPress={() => setLanguage(l.code)}
              >
                <Text style={[styles.langText, isSelected && styles.selectedLangText]}>{l.label}</Text>
              </PressableScale>
            );
          })}
        </View>
      </FadeInUpView>

      <FadeInUpView>
        <View style={styles.toggles}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Auto voice playback</Text>
              <Text style={styles.toggleDesc}>Speak every Sagaradristi answer aloud</Text>
            </View>
            <Switch
              value={autoVoicePlayback}
              onValueChange={setAutoVoicePlayback}
              trackColor={{ false: colors.border, true: colors.accentDeep }}
              thumbColor={autoVoicePlayback ? colors.aqua : colors.textFaint}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Haptics</Text>
              <Text style={styles.toggleDesc}>Tactile feedback on voice & alerts</Text>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
              trackColor={{ false: colors.border, true: colors.accentDeep }}
              thumbColor={hapticsEnabled ? colors.aqua : colors.textFaint}
            />
          </View>
        </View>
      </FadeInUpView>

      <FadeInUpView>
        <View style={styles.watchCard}>
          <Text style={styles.sectionTitle}>Watchdog</Text>
          {vesselId ? (
            <Text style={styles.watchLine}>
              ✅ <Text style={styles.watchStrong}>{vesselLabel}</Text> registered · {vesselId.slice(0, 8)}…
            </Text>
          ) : (
            <Text style={styles.watchLine}>
              No active subscription. Open the <Text style={styles.watchStrong}>Alerts</Text> tab to register this vessel.
            </Text>
          )}
          {subscription && <Text style={styles.watchMeta}>{subscription.message}</Text>}
        </View>
      </FadeInUpView>

      <FadeInUpView>
        <View style={styles.about}>
          <TouchableOpacity onPress={() => undefined}>
            <Text style={styles.aboutText}>
              {brand.name} {brand.nameDevanagari} · Marine decision intelligence for safer seas.
            </Text>
          </TouchableOpacity>
        </View>
      </FadeInUpView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heroGlyph: {
    fontSize: 34,
    color: colors.aqua,
    fontWeight: '900',
  },
  heroName: {
    ...typography.title,
    color: colors.text,
    marginTop: 4,
  },
  heroDev: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.section,
    color: colors.text,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedCard: {
    borderColor: colors.accent,
    backgroundColor: colors.cardSelected,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  cardTitle: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
    flex: 1,
  },
  selectedCardTitle: {
    color: colors.accent,
  },
  checkIcon: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '800',
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  langChip: {
    backgroundColor: colors.card,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedLangChip: {
    backgroundColor: colors.accentDeep,
    borderColor: colors.accent,
  },
  langText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  selectedLangText: {
    color: colors.text,
  },
  toggles: {
    marginTop: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  toggleDesc: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  watchCard: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  watchLine: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  watchStrong: {
    color: colors.accent,
    fontWeight: '800',
  },
  watchMeta: {
    color: colors.textFaint,
    fontSize: 11,
    marginTop: 4,
  },
  about: {
    marginTop: spacing.xl,
    padding: spacing.md,
    alignItems: 'center',
  },
  aboutText: {
    color: colors.textFaint,
    fontSize: 12,
    textAlign: 'center',
  },
});