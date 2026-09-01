import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useSettingsStore, ROLE_META, UserRole } from '../../src/store/settingsStore';
import { useAlertStore } from '../../src/store/alertStore';
import { useChatStore } from '../../src/store/chatStore';
import { colors, spacing, radius, typography, brand, shadow } from '../../src/theme/theme';
import { FadeInUpView, PressableScale } from '../../src/components/ui/anim';
import { PageInfoModal } from '../../src/components/ui/PageInfoModal';
import { PERSONA_PRESETS, PersonaPreset } from '../../src/constants/presets';

const LANGUAGES = [
  { code: 'en-IN', label: 'English (India)' },
  { code: 'ta-IN', label: 'தமிழ்' },
  { code: 'hi-IN', label: 'हिन्दी' },
  { code: 'te-IN', label: 'తెలుగు' },
];

const ROLES = (Object.keys(ROLE_META) as UserRole[]);

export default function ProfileScreen() {
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
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
  const { setLastLocationHint } = useChatStore();
  const vesselId = useAlertStore((s) => s.vesselId);
  const vesselLabel = useAlertStore((s) => s.vesselLabel);
  const subscription = useAlertStore((s) => s.subscription);

  const handleApplyPersonaPreset = (preset: PersonaPreset) => {
    setRole(preset.role);
    setLanguage(preset.language);
    setAutoVoicePlayback(preset.autoVoice);
    setLastLocationHint(preset.location);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <View style={{ width: 36 }} />
          <View style={styles.heroCenter}>
            <Text style={styles.heroGlyph}>{brand.waveMark}</Text>
            <Text style={styles.heroName}>{brand.name}</Text>
            <Text style={styles.heroDev}>{brand.nameDevanagari}</Text>
          </View>
          <PressableScale
            style={styles.infoBtn}
            onPress={() => setIsInfoModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Settings Guide"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.infoBtnText}>ℹ️</Text>
          </PressableScale>
        </View>
      </View>

      {/* Quick Setup Persona Presets Bar */}
      <FadeInUpView style={styles.presetSection}>
        <Text style={styles.sectionBadge}>⚡ ONE-TAP TESTING PRESETS</Text>
        <Text style={styles.sectionTitle}>Operational Crew Presets</Text>
        <Text style={styles.sectionDesc}>
          Instantly configures role, regional language, voice mode, and harbor for testing.
        </Text>
        <View style={styles.presetCardsGrid}>
          {PERSONA_PRESETS.map((preset) => {
            const isCurrent = role === preset.role && language === preset.language;
            return (
              <PressableScale
                key={preset.id}
                style={[styles.presetPersonaCard, isCurrent && styles.presetPersonaCardActive]}
                onPress={() => handleApplyPersonaPreset(preset)}
              >
                <View style={styles.presetPersonaHeader}>
                  <Text style={styles.presetPersonaIcon}>{preset.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.presetPersonaTitle, isCurrent && styles.presetPersonaTitleActive]}>
                      {preset.title}
                    </Text>
                    <Text style={styles.presetPersonaSubtitle}>{preset.subtitle}</Text>
                  </View>
                  {isCurrent && <Text style={styles.presetPersonaCheck}>✓ ACTIVE</Text>}
                </View>
              </PressableScale>
            );
          })}
        </View>
      </FadeInUpView>

      <FadeInUpView>
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Operational Persona</Text>
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

      {/* Settings Guide Modal */}
      <PageInfoModal
        visible={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        icon="⚙️"
        title="Settings & Persona Preferences"
        subtitle="Customizing Sagaradristi for Your Crew"
        whatIsIt="Configure your operational role, preferred regional language for voice readouts, tactile haptics, and vessel watchdog subscription."
        howToUse={[
          'Select your Operational Persona (Fisherman, Marine Researcher, Coast Guard, Policymaker) to customize advice depth and terminology.',
          'Choose your preferred regional language (English, தமிழ், हिन्दी, తెలుగు) for synthesized audio responses and recommendations.',
          'Toggle "Auto voice playback" to automatically speak every incoming advisory aloud through Text-to-Speech (TTS).',
          'Toggle "Haptics" for tactile vibration pulses on critical warning alerts and PTT recordings.',
        ]}
        features={[
          {
            icon: '🧑‍✈️',
            title: 'Adaptive Persona Tailoring',
            description: 'Customizes technical density — simple clearance advice for fishermen vs. depth contours, anomalies, and chlorophyll metrics for researchers.',
          },
          {
            icon: '🔊',
            title: 'Hands-Free Deck Voice',
            description: 'High-clarity regional speech synthesis tailored for loud maritime boat environments.',
          },
          {
            icon: '⚓',
            title: 'Vessel Hardware ID',
            description: 'Binds your unique vessel registration to real-time satellite telemetry and proactive hazard alerts.',
          },
        ]}
      />
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
    marginBottom: spacing.xl,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroCenter: {
    alignItems: 'center',
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
  presetSection: {
    marginBottom: spacing.md,
  },
  sectionBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.aqua,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  presetCardsGrid: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  presetPersonaCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.8)',
  },
  presetPersonaCardActive: {
    backgroundColor: 'rgba(14, 116, 144, 0.25)',
    borderColor: colors.aqua,
  },
  presetPersonaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  presetPersonaIcon: {
    fontSize: 22,
  },
  presetPersonaTitle: {
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  presetPersonaTitleActive: {
    color: colors.aqua,
  },
  presetPersonaSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  presetPersonaCheck: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.aqua,
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.pill,
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