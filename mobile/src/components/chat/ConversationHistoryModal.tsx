import React, { useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { useChatStore } from '../../store/chatStore';
import { ConversationSummary } from '../../types/contract';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { PressableScale, FadeInView, FadeInDownView } from '../ui/anim';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function getTimeGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays <= 7) return 'Previous 7 Days';
  return 'Older';
}

export function ConversationHistoryModal({ visible, onClose }: Props) {
  const {
    conversations,
    currentConversationId,
    fetchConversations,
    loadConversation,
    createNewChat,
    deleteConversation,
    isLoadingHistory,
  } = useChatStore();

  useEffect(() => {
    if (visible) {
      fetchConversations();
    }
  }, [visible, fetchConversations]);

  const handleSelectConversation = async (conv: ConversationSummary) => {
    if (conv.id === currentConversationId) {
      onClose();
      return;
    }
    await loadConversation(conv.id);
    onClose();
  };

  const handleNewChat = () => {
    createNewChat();
    onClose();
  };

  const handleDelete = (conv: ConversationSummary) => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${conv.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteConversation(conv.id),
        },
      ]
    );
  };

  const renderItem = ({ item, index }: { item: ConversationSummary; index: number }) => {
    const isSelected = item.id === currentConversationId;
    const timeGroup = getTimeGroup(item.updated_at);
    const dateFormatted = new Date(item.updated_at).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    });

    const riskColor =
      item.last_risk_band === 'extreme'
        ? colors.riskExtreme
        : item.last_risk_band === 'high'
        ? colors.riskHigh
        : item.last_risk_band === 'moderate'
        ? colors.riskModerate
        : colors.riskLow;

    return (
      <FadeInDownView delay={index * 40} style={styles.itemWrapper}>
        <PressableScale
          style={[styles.convCard, isSelected && styles.convCardActive]}
          onPress={() => handleSelectConversation(item)}
          accessibilityRole="button"
        >
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              <Text style={styles.chatIcon}>{isSelected ? '💬' : '🗨️'}</Text>
              <Text style={styles.convTitle} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>

          {item.last_query_preview ? (
            <Text style={styles.previewText} numberOfLines={1}>
              {item.last_query_preview}
            </Text>
          ) : null}

          <View style={styles.cardFooter}>
            <View style={styles.metaRow}>
              <Text style={styles.dateText}>{dateFormatted}</Text>
              <Text style={styles.dot}>•</Text>
              <View style={styles.msgBadge}>
                <Text style={styles.msgBadgeText}>{item.message_count} msgs</Text>
              </View>
            </View>

            {item.last_risk_band ? (
              <View style={[styles.riskPill, { borderColor: riskColor }]}>
                <View style={[styles.riskDot, { backgroundColor: riskColor }]} />
                <Text style={[styles.riskPillText, { color: riskColor }]}>
                  {item.last_risk_band.toUpperCase()}
                  {item.last_risk_score !== undefined && item.last_risk_score !== null
                    ? ` ${Math.round(item.last_risk_score)}`
                    : ''}
                </Text>
              </View>
            ) : null}
          </View>
        </PressableScale>
      </FadeInDownView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerGlyph}>🧭</Text>
              <Text style={styles.headerTitle}>Past Conversations</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* New Chat Button */}
          <PressableScale style={styles.newChatButton} onPress={handleNewChat}>
            <Text style={styles.newChatPlus}>＋</Text>
            <Text style={styles.newChatText}>Start New Conversation</Text>
          </PressableScale>

          {/* Conversation List */}
          {conversations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🌊</Text>
              <Text style={styles.emptyTitle}>No past conversations</Text>
              <Text style={styles.emptySubtitle}>
                Your marine intelligence questions and audit traces will appear here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 12, 24, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: '75%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadow.float,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerGlyph: {
    fontSize: 20,
  },
  headerTitle: {
    ...typography.section,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentDeep,
    paddingVertical: 12,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
    gap: spacing.xs,
    ...shadow.float,
  },
  newChatPlus: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  newChatText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  itemWrapper: {
    marginBottom: spacing.sm,
  },
  convCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  convCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.cardSelected,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  chatIcon: {
    fontSize: 15,
  },
  convTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  deleteBtn: {
    padding: 4,
  },
  deleteBtnText: {
    fontSize: 14,
    opacity: 0.7,
  },
  previewText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    fontSize: 12,
    color: colors.textFaint,
  },
  dot: {
    fontSize: 12,
    color: colors.textFaint,
  },
  msgBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  msgBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  riskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    gap: 4,
  },
  riskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  riskPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.section,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
