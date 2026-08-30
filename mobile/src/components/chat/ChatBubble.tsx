import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChatMessage } from '../../store/chatStore';
import { RiskBadge } from '../common/RiskBadge';
import { EvidenceCard } from './EvidenceCard';
import { ttsService } from '../../voice/tts';
import { useSettingsStore } from '../../store/settingsStore';
import { colors, spacing, radius, typography, brand } from '../../theme/theme';
import { FadeInUpView } from '../ui/anim';

interface Props {
  message: ChatMessage;
  onPressEvidence?: (queryId: string) => void;
}

export const ChatBubble: React.FC<Props> = ({ message, onPressEvidence }) => {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const language = useSettingsStore((s) => s.language);

  const isUser = message.role === 'user';
  const payload = message.responsePayload;
  const isOutbound = message.kind === 'offline' || message.kind === 'error' || message.kind === 'clarification';

  const handleSpeak = async () => {
    if (speaking) {
      ttsService.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    await ttsService.speak(message.text, language);
    setSpeaking(false);
  };

  return (
    <FadeInUpView delay={60}>
      <View style={[styles.container, isUser ? styles.userContainer : styles.orcaContainer]}>
        {isUser ? (
          <View style={styles.userColumn}>
            {message.locationHint?.name && (
              <Text style={styles.contextChip}>📍 {message.locationHint.name}</Text>
            )}
            <View style={styles.userBubble}>
              <Text style={styles.userText}>{message.text}</Text>
            </View>
            <Text style={styles.timestamp}>{message.timestamp}</Text>
          </View>
        ) : (
          <View style={styles.orcaRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{brand.waveMark}</Text>
            </View>
            <View style={styles.orcaColumn}>
              <View style={styles.orcaBubble}>
                {payload?.risk_band && (
                  <View style={styles.badgeRow}>
                    <RiskBadge band={payload.risk_band} score={payload.risk_score} />
                  </View>
                )}

                {message.kind === 'offline' && <Text style={styles.offlineTag}>OFFLINE · cached</Text>}
                {(message.kind === 'error' || isOutbound) && <Text style={styles.errorTag}>⚠ {message.kind}</Text>}

                <Text style={styles.orcaText}>{message.text}</Text>

                {payload?.caveats && payload.caveats.length > 0 && (
                  <Text style={styles.caveatText}>ℹ️ {payload.caveats.join(' ')}</Text>
                )}

                {payload && (
                  <View style={styles.actionRow}>
                    {payload.evidence && payload.evidence.length > 0 ? (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityState={{ expanded: evidenceOpen }}
                        onPress={() => setEvidenceOpen((v) => !v)}
                        style={styles.inlineToggle}
                      >
                        <Text style={styles.inlineToggleText}>
                          Show the Science (Going Deep) {evidenceOpen ? '▲' : '▼'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.inlineToggle} />
                    )}
                    <TouchableOpacity onPress={handleSpeak} style={styles.speakerBtn} hitSlop={8}>
                      <Text style={styles.speakerIcon}>{speaking ? '🔊' : '🔈'}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {payload?.query_id && (
                  <TouchableOpacity onPress={() => onPressEvidence?.(payload.query_id!)} style={styles.auditRow}>
                    <Text style={styles.auditRowText}>Full audit trail →</Text>
                  </TouchableOpacity>
                )}
              </View>

              {evidenceOpen && payload?.evidence && <EvidenceCard evidence={payload.evidence} />}

              <Text style={styles.timestamp}>{message.timestamp}</Text>
            </View>
          </View>
        )}
      </View>
    </FadeInUpView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 5,
    paddingHorizontal: spacing.md,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  orcaContainer: {
    alignItems: 'flex-start',
  },
  userColumn: {
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  contextChip: {
    backgroundColor: colors.card,
    color: colors.textMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    overflow: 'hidden',
  },
  userBubble: {
    backgroundColor: colors.userBubble,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderBottomRightRadius: 4,
    maxWidth: '100%',
  },
  userText: {
    color: colors.userBubbleText,
    ...typography.body,
  },
  timestamp: {
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 4,
  },
  orcaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    maxWidth: '92%',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.accentDeep,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  avatarText: {
    color: '#06283D',
    fontSize: 13,
    fontWeight: '900',
  },
  orcaColumn: {
    flex: 1,
  },
  orcaBubble: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeRow: {
    marginBottom: spacing.sm,
  },
  orcaText: {
    color: colors.textSecondary,
    ...typography.body,
  },
  offlineTag: {
    color: colors.offlineWarnText,
    backgroundColor: colors.offlineWarn,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  errorTag: {
    color: colors.alertDangerText,
    backgroundColor: colors.alertDanger,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 6,
    overflow: 'hidden',
    textTransform: 'capitalize',
  },
  caveatText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontStyle: 'italic',
    lineHeight: 15,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inlineToggle: {
    flex: 1,
  },
  inlineToggleText: {
    color: colors.aqua,
    fontSize: 13,
    fontWeight: '700',
  },
  speakerBtn: {
    paddingLeft: spacing.lg,
  },
  speakerIcon: {
    fontSize: 16,
  },
  auditRow: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  auditRowText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
});