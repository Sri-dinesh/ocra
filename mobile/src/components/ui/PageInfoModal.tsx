import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { PressableScale } from './anim';

export interface InfoFeatureItem {
  icon: string;
  title: string;
  description: string;
}

export interface InfoLegendItem {
  badge: string;
  badgeBg: string;
  badgeColor: string;
  label: string;
}

export interface PageInfoModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  icon: string;
  subtitle: string;
  whatIsIt: string;
  howToUse: string[];
  features: InfoFeatureItem[];
  legends?: InfoLegendItem[];
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const PageInfoModal: React.FC<PageInfoModalProps> = ({
  visible,
  onClose,
  title,
  icon,
  subtitle,
  whatIsIt,
  howToUse,
  features,
  legends,
}) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'features' | 'legend'>('guide');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <Text style={styles.headerIcon}>{icon}</Text>
                  <View style={styles.titleTextContainer}>
                    <Text style={styles.title} numberOfLines={1}>
                      {title}
                    </Text>
                    <Text style={styles.subtitle} numberOfLines={1}>
                      {subtitle}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityLabel="Close help modal"
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Segmented Navigation Tabs */}
              <View style={styles.tabBar}>
                <TouchableOpacity
                  style={[styles.tabItem, activeTab === 'guide' && styles.tabItemActive]}
                  onPress={() => setActiveTab('guide')}
                >
                  <Text style={[styles.tabItemText, activeTab === 'guide' && styles.tabItemTextActive]}>
                    📖 Guide & Usage
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabItem, activeTab === 'features' && styles.tabItemActive]}
                  onPress={() => setActiveTab('features')}
                >
                  <Text style={[styles.tabItemText, activeTab === 'features' && styles.tabItemTextActive]}>
                    ✨ Features ({features.length})
                  </Text>
                </TouchableOpacity>

                {legends && legends.length > 0 && (
                  <TouchableOpacity
                    style={[styles.tabItem, activeTab === 'legend' && styles.tabItemActive]}
                    onPress={() => setActiveTab('legend')}
                  >
                    <Text style={[styles.tabItemText, activeTab === 'legend' && styles.tabItemTextActive]}>
                      🎨 Legend
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Scrollable Content Body */}
              <ScrollView
                style={styles.scrollContent}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.scrollInner}
              >
                {activeTab === 'guide' && (
                  <>
                    {/* What is this page */}
                    <View style={styles.cardSection}>
                      <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionBadge}>OVERVIEW</Text>
                        <Text style={styles.sectionHeading}>What is this page?</Text>
                      </View>
                      <Text style={styles.sectionBody}>{whatIsIt}</Text>
                    </View>

                    {/* How to use */}
                    <View style={styles.cardSection}>
                      <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionBadge}>STEP-BY-STEP</Text>
                        <Text style={styles.sectionHeading}>How to use it</Text>
                      </View>
                      <View style={styles.stepsContainer}>
                        {howToUse.map((step, idx) => (
                          <View key={idx} style={styles.stepRow}>
                            <View style={styles.stepNumBubble}>
                              <Text style={styles.stepNumText}>{idx + 1}</Text>
                            </View>
                            <Text style={styles.stepText}>{step}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </>
                )}

                {activeTab === 'features' && (
                  <View style={styles.featuresList}>
                    {features.map((feat, idx) => (
                      <View key={idx} style={styles.featureCard}>
                        <View style={styles.featureHeaderRow}>
                          <Text style={styles.featureIcon}>{feat.icon}</Text>
                          <Text style={styles.featureTitle}>{feat.title}</Text>
                        </View>
                        <Text style={styles.featureDesc}>{feat.description}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {activeTab === 'legend' && legends && (
                  <View style={styles.cardSection}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionBadge}>MAP & DATA ICONS</Text>
                      <Text style={styles.sectionHeading}>Visual Indicators</Text>
                    </View>
                    <View style={styles.legendGrid}>
                      {legends.map((leg, idx) => (
                        <View key={idx} style={styles.legendItem}>
                          <View
                            style={[
                              styles.legendBadge,
                              { backgroundColor: leg.badgeBg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.legendBadgeText,
                                { color: leg.badgeColor },
                              ]}
                            >
                              {leg.badge}
                            </Text>
                          </View>
                          <Text style={styles.legendLabel}>{leg.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Bottom Action */}
              <View style={styles.footer}>
                <PressableScale style={styles.gotItBtn} onPress={onClose}>
                  <Text style={styles.gotItBtnText}>Got it, let's explore! 🚀</Text>
                </PressableScale>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '96%',
    maxWidth: 480,
    height: Math.min(SCREEN_HEIGHT * 0.82, 640),
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
    ...shadow.float,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
    gap: spacing.sm,
  },
  headerIcon: {
    fontSize: 26,
  },
  titleTextContainer: {
    flex: 1,
  },
  title: {
    ...typography.title,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    color: colors.aqua,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  tabItemActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textFaint,
  },
  tabItemTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollInner: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  cardSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.aqua,
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  sectionHeading: {
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 15,
  },
  sectionBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginTop: 4,
  },
  stepsContainer: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  stepNumBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.accent,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  featuresList: {
    gap: spacing.md,
  },
  featureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  featureHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 6,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureTitle: {
    ...typography.bodyStrong,
    color: colors.accent,
    fontSize: 15,
  },
  featureDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  legendGrid: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  legendBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    minWidth: 90,
    alignItems: 'center',
  },
  legendBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  legendLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  gotItBtn: {
    backgroundColor: colors.accentDeep,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },
  gotItBtnText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
