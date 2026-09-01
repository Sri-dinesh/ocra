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
import { colors, spacing, radius, typography } from '../../theme/theme';
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
    backgroundColor: 'rgba(3, 10, 24, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '96%',
    maxWidth: 480,
    height: Math.min(SCREEN_HEIGHT * 0.82, 640),
    backgroundColor: '#0F172A',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 24,
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
    borderBottomColor: 'rgba(51, 65, 85, 0.8)',
    backgroundColor: '#0B132B',
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
    ...typography.section,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    color: colors.aqua,
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  closeBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0D1B2A',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.6)',
    gap: 6,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  tabItemActive: {
    backgroundColor: 'rgba(14, 116, 144, 0.45)',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  tabItemText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tabItemTextActive: {
    color: colors.text,
    fontWeight: '800',
  },
  scrollContent: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollInner: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  cardSection: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.7)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionBadge: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: colors.aqua,
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  sectionHeading: {
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  sectionBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginTop: 2,
  },
  stepsContainer: {
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  stepNumBubble: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.accentDeep,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.text,
  },
  stepText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  featuresList: {
    gap: spacing.sm,
  },
  featureCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.7)',
  },
  featureHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  featureIcon: {
    fontSize: 18,
  },
  featureTitle: {
    ...typography.bodyStrong,
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  featureDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  legendGrid: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    minWidth: 80,
    alignItems: 'center',
  },
  legendBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  legendLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.8)',
    backgroundColor: '#0B132B',
  },
  gotItBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  gotItBtnText: {
    color: '#031024',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
