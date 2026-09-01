import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useChatStore, ChatMessage } from '../../src/store/chatStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { queryApi } from '../../src/api/queryApi';
import { ChatBubble } from '../../src/components/chat/ChatBubble';
import { PushToTalkButton } from '../../src/components/chat/PushToTalkButton';
import { OfflineBanner } from '../../src/components/common/OfflineBanner';
import { ConversationHistoryModal } from '../../src/components/chat/ConversationHistoryModal';
import { LocationPickerModal } from '../../src/components/chat/LocationPickerModal';
import { PressableScale, ThinkingDots, FadeInDownView, FadeInView } from '../../src/components/ui/anim';
import { useOnline } from '../../src/offline/connectivity';
import { sqliteCache } from '../../src/offline/sqliteCache';
import { answerFromCache } from '../../src/offline/offlineAnswers';
import { sttService, speakReply } from '../../src/voice/speechBridge';
import { colors, spacing, radius, typography, brand, shadow } from '../../src/theme/theme';
import { LocationHint } from '../../src/types/contract';

const DEFAULT_LOCATION: LocationHint = { lat: 16.9891, lon: 82.2475, name: 'Kakinada' };

const EXAMPLES = [
  'Can I go fishing tomorrow morning near Kakinada?',
  'What are the wave height and wind speed at my location?',
  'Which fishing zones should be avoided due to geofencing restrictions?',
  'Why has fish productivity declined in this coastal region?',
  'Plot the safest route to the fishing grounds 25 nm east.',
];

export default function ChatScreen() {
  const router = useRouter();
  const online = useOnline();
  const [inputQuery, setInputQuery] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);

  const {
    messages,
    isLoading,
    currentConversationId,
    currentConversationTitle,
    conversations,
    addMessage,
    setLoading,
    lastLocationHint,
    setLastLocationHint,
    setCurrentConversation,
    setActiveAbortController,
    cancelCurrentResponse,
    createNewChat,
    fetchConversations,
  } = useChatStore();

  const { role, language } = useSettingsStore();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSend = useCallback(
    async (queryText?: string) => {
      const text = (queryText ?? inputQuery).trim();
      if (!text || isLoading) return;

      const hint: LocationHint =
        lastLocationHint ??
        (/\bnear ([\w\s]+)\??$/.test(text) ? lastLocationHint ?? DEFAULT_LOCATION : DEFAULT_LOCATION);

      const userMsg: ChatMessage = {
        id: `${Date.now()}`,
        role: 'user',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        locationHint: hint,
      };

      addMessage(userMsg);
      setInputQuery('');
      setLoading(true);

      const abortCtrl = new AbortController();
      setActiveAbortController(abortCtrl);

      try {
        if (!online) {
          // Edge offline mode: answer strictly from SQLite cache.
          await new Promise((r) => setTimeout(r, 450));
          const cached = await sqliteCache.getNearestPayload(hint.lat, hint.lon);
          if (cached) {
            const { text: answerText, cellUsed } = answerFromCache(text, cached);
            addMessage({
              id: `${Date.now() + 1}`,
              role: 'orca',
              text: `${answerText}${cellUsed && (cellUsed.lat !== hint.lat || cellUsed.lon !== hint.lon) ? ` (Nearest cached cell: ${cellUsed.lat.toFixed(2)}, ${cellUsed.lon.toFixed(2)}.)` : ''}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              kind: 'offline',
            });
          } else {
            addMessage({
              id: `${Date.now() + 1}`,
              role: 'orca',
              text: 'Offline mode: no cached data is available for any cell yet. Connect to the network once so Sagaradristi can prime its offline cache.',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              kind: 'offline',
            });
          }
        } else {
          const response = await queryApi.sendQuery(
            {
              text,
              conversation_id: currentConversationId || undefined,
              role,
              language,
              location_hint: hint,
            },
            abortCtrl.signal
          );

          if (response.conversation_id) {
            setCurrentConversation(response.conversation_id);
            fetchConversations();
          }

          addMessage({
            id: `${Date.now() + 1}`,
            role: 'orca',
            text: response.recommendation,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            responsePayload: response,
          });
          setLastLocationHint(hint);
          speakReply(response.recommendation).catch(() => undefined);
        }
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') {
          // Handled via cancelCurrentResponse
          return;
        }
        console.error('[sendQuery error]:', err?.message, 'URL:', err?.config?.url, 'Data:', err?.response?.data);
        addMessage({
          id: `${Date.now() + 1}`,
          role: 'orca',
          text: `Unable to reach the marine decision service (${err?.message || 'Error'}). Check connectivity and try again.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          kind: 'error',
        });
      } finally {
        setLoading(false);
        setActiveAbortController(null);
      }
    },
    [
      inputQuery,
      isLoading,
      online,
      currentConversationId,
      role,
      language,
      lastLocationHint,
      setLastLocationHint,
      setCurrentConversation,
      setActiveAbortController,
      fetchConversations,
    ],
  );

  const handlePushToTalk = useCallback(
    async (uri: string) => {
      const transcript = await sttService.transcribe(uri, useSettingsStore.getState().language);
      handleSend(transcript);
    },
    [handleSend],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <ChatBubble
        message={item}
        onPressEvidence={(queryId) => router.push(`/evidence/${queryId}`)}
      />
    ),
    [router],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerMark}>{brand.waveMark}</Text>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {currentConversationTitle || brand.name}
            </Text>

            {/* Clickable Location Selector Pill */}
            <PressableScale
              style={styles.locationPill}
              onPress={() => setIsLocationPickerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Change marine location"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.locationPillText} numberOfLines={1}>
                📍 {lastLocationHint?.name || 'Kakinada'} ▾
              </Text>
            </PressableScale>
          </View>
        </View>

        <View style={styles.headerActions}>
          {/* New Chat Button */}
          <PressableScale style={styles.headerActionBtn} onPress={createNewChat}>
            <Text style={styles.headerActionIcon}>＋</Text>
            <Text style={styles.headerActionLabel}>New</Text>
          </PressableScale>

          {/* History Button */}
          <PressableScale
            style={styles.headerActionBtn}
            onPress={() => setIsHistoryOpen(true)}
          >
            <Text style={styles.headerActionIcon}>🕒</Text>
            {conversations.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{conversations.length}</Text>
              </View>
            )}
          </PressableScale>
        </View>
      </View>

      <OfflineBanner />

      {messages.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          keyboardShouldPersistTaps="handled"
        >
          <FadeInView delay={40}>
            <View style={styles.emblem}>
              <Text style={styles.emblemGlyph}>{brand.waveMark}</Text>
            </View>
          </FadeInView>
          <FadeInDownView delay={140}>
            <Text style={styles.brandName}>{brand.name}</Text>
            <Text style={styles.brandDev}>{brand.nameDevanagari}</Text>
            <Text style={styles.tagline}>{brand.tagline}</Text>
          </FadeInDownView>

          <Text style={styles.hint}>Suggested Marine Queries</Text>
          {EXAMPLES.map((q, i) => (
            <FadeInDownView key={q} delay={220 + i * 70}>
              <PressableScale
                style={styles.exampleChip}
                onPress={() => handleSend(q)}
                accessibilityRole="button"
              >
                <Text style={styles.exampleText}>💡 {q}</Text>
              </PressableScale>
            </FadeInDownView>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          windowSize={7}
          maxToRenderPerBatch={12}
          updateCellsBatchingPeriod={40}
          initialNumToRender={12}
        />
      )}

      {/* Loading banner with Cancel Response Option */}
      {isLoading && (
        <View style={styles.loadingRow}>
          <ThinkingDots />
          <Text style={styles.loadingText}>Scanning the oceans…</Text>
          <PressableScale
            style={styles.cancelButton}
            onPress={cancelCurrentResponse}
            accessibilityRole="button"
            accessibilityLabel="Cancel response"
          >
            <Text style={styles.cancelButtonText}>✕ Cancel</Text>
          </PressableScale>
        </View>
      )}

      {/* Clean Single Input Bar with integrated Push-To-Talk Mic and Send */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Ask a marine question…"
          placeholderTextColor={colors.textFaint}
          value={inputQuery}
          onChangeText={setInputQuery}
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
        />

        {/* Compact Push-to-Talk Mic button sitting directly next to Send */}
        <PushToTalkButton
          compact
          isProcessing={isLoading}
          onRecordingComplete={handlePushToTalk}
        />

        <PressableScale
          style={[styles.sendButton, !inputQuery.trim() && styles.sendButtonDisabled]}
          disabled={!inputQuery.trim() || isLoading}
          onPress={() => handleSend()}
          accessibilityRole="button"
          accessibilityLabel="Send marine question"
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </PressableScale>
      </View>

      {/* Conversation History Modal */}
      <ConversationHistoryModal
        visible={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Location Picker Modal (Ports Search & Map Pin Selection) */}
      <LocationPickerModal
        visible={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
      />
    </KeyboardAvoidingView>
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
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 44 : spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  headerMark: {
    fontSize: 24,
    color: colors.aqua,
    fontWeight: '900',
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.30)',
  },
  locationPillText: {
    fontSize: 11,
    color: colors.aqua,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 4,
  },
  headerActionIcon: {
    fontSize: 13,
    color: colors.accent,
  },
  headerActionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  badge: {
    backgroundColor: colors.accentDeep,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.text,
  },
  listContent: {
    paddingVertical: spacing.md,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  emblem: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadow.float,
  },
  emblemGlyph: {
    fontSize: 40,
    color: colors.aqua,
    fontWeight: '900',
  },
  brandName: {
    ...typography.hero,
    color: colors.text,
    textAlign: 'center',
  },
  brandDev: {
    fontSize: 15,
    color: colors.aqua,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  tagline: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xxl,
  },
  hint: {
    ...typography.caption,
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  exampleChip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    marginBottom: spacing.sm,
    alignSelf: 'stretch',
  },
  exampleText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: 'rgba(15, 23, 42, 0.60)',
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: radius.pill,
  },
  loadingText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: colors.card,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.alertDanger,
    marginLeft: spacing.xs,
  },
  cancelButtonText: {
    color: colors.alertDanger,
    fontSize: 11,
    fontWeight: '800',
  },
  inputBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    backgroundColor: colors.accentDeep,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.borderSubtle,
    opacity: 0.5,
  },
  sendButtonText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 14,
  },
});