import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useChatStore, ChatMessage } from '../../src/store/chatStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { queryApi } from '../../src/api/queryApi';
import { ChatBubble } from '../../src/components/chat/ChatBubble';
import { PushToTalkButton } from '../../src/components/chat/PushToTalkButton';
import { OfflineBanner } from '../../src/components/common/OfflineBanner';

export default function ChatScreen() {
  const router = useRouter();
  const [inputQuery, setInputQuery] = useState('');
  const { messages, isLoading, addMessage, setLoading } = useChatStore();
  const { role, language } = useSettingsStore();

  const handleSend = async (queryText?: string) => {
    const text = queryText || inputQuery;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    addMessage(userMsg);
    setInputQuery('');
    setLoading(true);

    try {
      const response = await queryApi.sendQuery({
        text: text.trim(),
        role,
        language,
        location_hint: { lat: 16.9891, lon: 82.2475, name: 'Kakinada' },
      });

      const orcaMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'orca',
        text: response.recommendation,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        responsePayload: response,
      };

      addMessage(orcaMsg);
    } catch (err) {
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'orca',
        text: 'Unable to reach marine decision service. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <OfflineBanner isOffline={false} />

      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🌊</Text>
          <Text style={styles.emptyTitle}>Welcome to ORCA</Text>
          <Text style={styles.emptySubtitle}>
            Ask about sea conditions, fishing zones, cyclone alerts, or safe navigation.
          </Text>
          <TouchableOpacity
            style={styles.exampleChip}
            onPress={() => handleSend('Can I go fishing tomorrow morning near Kakinada?')}
          >
            <Text style={styles.exampleChipText}>
              💡 "Can I go fishing tomorrow morning near Kakinada?"
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatBubble
              message={item}
              onPressEvidence={(queryId) => router.push(`/evidence/${queryId}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {isLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#38BDF8" />
          <Text style={styles.loadingText}>ORCA is analyzing marine sources...</Text>
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Ask marine question..."
          placeholderTextColor="#64748B"
          value={inputQuery}
          onChangeText={setInputQuery}
          onSubmitEditing={() => handleSend()}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputQuery.trim() && styles.sendButtonDisabled]}
          disabled={!inputQuery.trim() || isLoading}
          onPress={() => handleSend()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.voiceRow}>
        <PushToTalkButton isProcessing={isLoading} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A192F',
  },
  listContent: {
    paddingVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#38BDF8',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exampleChip: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  exampleChipText: {
    color: '#E2E8F0',
    fontSize: 13,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    color: '#38BDF8',
    marginLeft: 8,
    fontSize: 13,
  },
  inputBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 15,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#334155',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  voiceRow: {
    paddingVertical: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
  },
});
