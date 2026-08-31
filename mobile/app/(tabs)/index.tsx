import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useChatStore, ChatMessage } from '../../src/store/chatStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { queryApi } from '../../src/api/queryApi';
import { ChatBubble } from '../../src/components/chat/ChatBubble';
import { PushToTalkButton } from '../../src/components/chat/PushToTalkButton';
import { OfflineBanner } from '../../src/components/common/OfflineBanner';
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
  'Plot the safest route to the fishing grounds 25 nm east.',
  'Any cyclone warning for the coast tonight?',
];

export default function ChatScreen() {
  const router = useRouter();
  const online = useOnline();
  const [inputQuery, setInputQuery] = React.useState('');
  const { messages, isLoading, addMessage, setLoading, lastLocationHint, setLastLocationHint } =
    useChatStore();
  const { role, language } = useSettingsStore();
  const listRef = useRef<FlatList<ChatMessage>>(null);

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

      try {
        if (!online) {
          // Edge offline mode (Task A6.4): answer strictly from SQLite cache.
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
          const response = await queryApi.sendQuery({ text, role, language, location_hint: hint });
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
      }
    },
    [inputQuery, isLoading, online, role, language, lastLocationHint, setLastLocationHint],
  );

  const handlePushToTalk = useCallback(async (uri: string) => {
    const transcript = await sttService.transcribe(uri, useSettingsStore.getState().language);
    handleSend(transcript);
  }, [handleSend]);

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

          <Text style={styles.hint}>Try one of these…</Text>
          {EXAMPLES.map((q, i) => (
            <FadeInDownView key={q} delay={220 + i * 90}>
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

      {isLoading && (
        <View style={styles.loadingRow}>
          <ThinkingDots />
          <Text style={styles.loadingText}>Scanning the oceans…</Text>
        </View>
      )}

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
        <PressableScale
          style={[styles.sendButton, !inputQuery.trim() && styles.sendButtonDisabled]}
          disabled={!inputQuery.trim() || isLoading}
          onPress={() => handleSend()}
          accessibilityRole="button"
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </PressableScale>
      </View>

      <View style={styles.voiceRow}>
        <PushToTalkButton isProcessing={isLoading} onRecordingComplete={handlePushToTalk} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
  },
  loadingText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    backgroundColor: colors.accentDeep,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
  sendButtonText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 14,
  },
  voiceRow: {
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
});