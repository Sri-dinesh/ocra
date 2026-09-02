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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { PageInfoModal } from '../../src/components/ui/PageInfoModal';
import {
  QUERY_CATEGORIES,
  QUERY_PRESETS,
  QUICK_FOLLOW_UPS,
  QueryPresetItem,
} from '../../src/constants/presets';

function detectScriptLanguage(text: string, fallback: string): string {
  let telugu = 0;
  let tamil = 0;
  let hindi = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0x0c00 && code <= 0x0c7f) telugu++;
    else if (code >= 0x0b80 && code <= 0x0bff) tamil++;
    else if (code >= 0x0900 && code <= 0x097f) hindi++;
  }
  if (telugu > 0 && telugu >= tamil && telugu >= hindi) return 'te-IN';
  if (tamil > 0 && tamil >= telugu && tamil >= hindi) return 'ta-IN';
  if (hindi > 0) return 'hi-IN';
  return fallback;
}

const DEFAULT_LOCATION: LocationHint = { lat: 16.9891, lon: 82.2475, name: 'Kakinada' };

export default function ChatScreen() {
  const router = useRouter();
  const online = useOnline();
  const insets = useSafeAreaInsets();
  const [inputQuery, setInputQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

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
          const effectiveLang = detectScriptLanguage(text, language);
          const response = await queryApi.sendQuery(
            {
              text,
              conversation_id: currentConversationId || undefined,
              role,
              language: effectiveLang,
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
          speakReply(response.recommendation, response.language || effectiveLang).catch(() => undefined);
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
      try {
        const transcript = await sttService.transcribe(uri, useSettingsStore.getState().language);
        if (transcript && transcript.trim()) {
          handleSend(transcript.trim());
        }
      } catch (err) {
        console.warn('[PTT] Transcription error:', err);
      }
    },
    [handleSend],
  );

  const handleSurpriseMe = () => {
    const list = selectedCategory === 'all'
      ? QUERY_PRESETS
      : QUERY_PRESETS.filter((p) => p.category === selectedCategory);
    const chosen = list[Math.floor(Math.random() * list.length)] || QUERY_PRESETS[0];
    handleSend(chosen.text);
  };

  const activePresets = selectedCategory === 'all'
    ? QUERY_PRESETS
    : QUERY_PRESETS.filter((p) => p.category === selectedCategory);

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
      <View style={[styles.topHeader, { paddingTop: Math.max(insets.top + spacing.sm, spacing.xl) }]}>
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
          {/* Guide / Info Button */}
          <PressableScale
            style={styles.headerActionBtn}
            onPress={() => setIsInfoModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="How to use Sagaradristi"
          >
            <Text style={styles.headerActionIcon}>ℹ️</Text>
          </PressableScale>

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
          showsVerticalScrollIndicator={false}
        >
          <FadeInView delay={30}>
            <View style={styles.emblem}>
              <Text style={styles.emblemGlyph}>{brand.waveMark}</Text>
            </View>
          </FadeInView>
          <FadeInDownView delay={60}>
            <Text style={styles.brandName}>{brand.name}</Text>
            <Text style={styles.brandDev}>{brand.nameDevanagari}</Text>
            <Text style={styles.tagline}>{brand.tagline}</Text>
          </FadeInDownView>

          {/* Preset Categories Selector Bar */}
          <View style={styles.categoryContainer}>
            <Text style={styles.hint}>Explore Prompt Presets</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryPillsScroll}
            >
              {QUERY_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text style={[styles.categoryPillText, isActive && styles.categoryPillTextActive]}>
                      {cat.icon} {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Surprise Me Button */}
          <PressableScale
            style={styles.surpriseBtn}
            onPress={handleSurpriseMe}
            accessibilityRole="button"
          >
            <Text style={styles.surpriseBtnText}>🎲 Surprise Me (Random Test Query)</Text>
          </PressableScale>

          {/* Active Preset Cards Grid */}
          <View style={styles.presetsList}>
            {activePresets.map((preset, i) => (
              <FadeInDownView key={preset.text + i} delay={100 + i * 40}>
                <PressableScale
                  style={styles.presetCard}
                  onPress={() => handleSend(preset.text)}
                  accessibilityRole="button"
                >
                  <View style={styles.presetCardTop}>
                    <Text style={styles.presetIcon}>{preset.icon}</Text>
                    <Text style={styles.presetQuestion}>{preset.text}</Text>
                  </View>
                  {preset.subtitle && (
                    <Text style={styles.presetSubtitle}>🏷️ {preset.subtitle}</Text>
                  )}
                </PressableScale>
              </FadeInDownView>
            ))}
          </View>
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

      {/* Quick Follow-up Suggestions Bar (Shown during active chat) */}
      {messages.length > 0 && !isLoading && (
        <View style={styles.quickFollowUpBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickFollowUpScroll}
          >
            {QUICK_FOLLOW_UPS.map((q) => (
              <TouchableOpacity
                key={q}
                style={styles.followUpChip}
                onPress={() => handleSend(q)}
              >
                <Text style={styles.followUpChipText}>💬 {q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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

      {/* Advisory AI Guide Modal */}
      <PageInfoModal
        visible={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        icon="💬"
        title="Marine Advisory AI"
        subtitle="Conversational Ocean Decision Support"
        whatIsIt="An intelligent marine assistant that analyzes live satellite observations, IMD weather forecasts, and safety rules to answer questions in your regional Indian language."
        howToUse={[
          'Type your question or tap the mic button 🎙️ next to Send to ask using voice in Telugu, Tamil, Hindi, or English.',
          'Tap the harbor pill 📍 at the top to change your departure port (e.g. Kakinada, Chennai, Visakhapatnam).',
          'Review the real-time Risk Band (0–100) and Sail Clearance decision generated by deterministic safety guardrails.',
          'Tap "Show the Science (Going Deep)" on any message to view raw satellite evidence and data provenance.',
          'Ask natural follow-up questions (e.g. "What about tomorrow morning there?") — the assistant remembers prior context!',
        ]}
        features={[
          {
            icon: '🎙️',
            title: 'Multilingual Voice Intelligence',
            description: 'Speak and receive audio readouts in Indian regional languages with Bhashini & Expo Speech.',
          },
          {
            icon: '🛡️',
            title: 'Deterministic Safety Guardrail',
            description: 'Calculates non-linear risk scores from wave heights, gale winds, and cyclone proximity without hallucinations.',
          },
          {
            icon: '🔄',
            title: 'Multi-Session Conversation History',
            description: 'All queries are organized into conversations, accessible via the clock button 🕒.',
          },
        ]}
        legends={[
          { badge: 'Low Risk', badgeBg: 'rgba(16,185,129,0.2)', badgeColor: '#10B981', label: 'Score < 30 · Safe sea conditions for coastal fishing' },
          { badge: 'Moderate Risk', badgeBg: 'rgba(245,158,11,0.2)', badgeColor: '#F59E0B', label: 'Score 30–60 · Caution advised, check swell & wind' },
          { badge: 'High Risk', badgeBg: 'rgba(249,115,22,0.2)', badgeColor: '#F97316', label: 'Score 60–80 · Departure restricted for small crafts' },
          { badge: 'Extreme Risk', badgeBg: 'rgba(239,68,68,0.2)', badgeColor: '#EF4444', label: 'Score 80–100 · Active cyclone or gale warning, stay ashore' },
        ]}
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
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
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
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.2)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
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
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadow.float,
  },
  emblemGlyph: {
    fontSize: 44,
    color: colors.aqua,
    fontWeight: '900',
  },
  brandName: {
    ...typography.title,
    fontSize: 28,
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
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  categoryContainer: {
    width: '100%',
    marginBottom: spacing.md,
  },
  hint: {
    ...typography.caption,
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  categoryPillsScroll: {
    gap: spacing.sm,
    paddingVertical: 4,
  },
  categoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  categoryPillActive: {
    backgroundColor: 'rgba(14, 116, 144, 0.2)',
    borderColor: colors.accent,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  categoryPillTextActive: {
    color: colors.text,
    fontWeight: '800',
  },
  surpriseBtn: {
    backgroundColor: 'rgba(45, 212, 191, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.2)',
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  surpriseBtnText: {
    color: colors.aqua,
    fontSize: 14,
    fontWeight: '800',
  },
  presetsList: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  presetCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  presetCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  presetIcon: {
    fontSize: 18,
  },
  presetQuestion: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  presetSubtitle: {
    fontSize: 12,
    color: colors.textFaint,
    marginTop: 4,
    marginLeft: 26,
  },
  quickFollowUpBar: {
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 8,
  },
  quickFollowUpScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  followUpChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  followUpChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  loadingText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    marginLeft: spacing.sm,
  },
  cancelButtonText: {
    color: colors.alertDanger,
    fontSize: 12,
    fontWeight: '800',
  },
  inputBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sendButton: {
    backgroundColor: colors.accentDeep,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.5,
  },
  sendButtonText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 15,
  },
});