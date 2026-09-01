import { create } from 'zustand';
import { QueryResponse, LocationHint, ConversationSummary } from '../types/contract';
import { conversationApi } from '../api/conversationApi';

export interface ChatMessage {
  id: string;
  role: 'user' | 'orca';
  text: string;
  timestamp: string;
  responsePayload?: QueryResponse;
  locationHint?: LocationHint;
  kind?: 'normal' | 'thinking' | 'offline' | 'error' | 'clarification' | 'cancelled';
}

interface ChatState {
  currentConversationId: string | null;
  currentConversationTitle: string | null;
  conversations: ConversationSummary[];
  messages: ChatMessage[];
  isLoading: boolean;
  isLoadingHistory: boolean;
  lastLocationHint: LocationHint | undefined;
  activeAbortController: AbortController | null;

  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setLoading: (loading: boolean) => void;
  setLastLocationHint: (hint: LocationHint | undefined) => void;
  setCurrentConversation: (id: string | null, title?: string | null) => void;
  setActiveAbortController: (ctrl: AbortController | null) => void;
  cancelCurrentResponse: () => void;
  clearChat: () => void;
  createNewChat: () => void;

  fetchConversations: () => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  currentConversationId: null,
  currentConversationTitle: null,
  conversations: [],
  messages: [],
  isLoading: false,
  isLoadingHistory: false,
  lastLocationHint: { lat: 16.9891, lon: 82.2475, name: 'Kakinada' },
  activeAbortController: null,

  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setMessages: (messages) => set({ messages }),
  setLoading: (isLoading) => set({ isLoading }),
  setLastLocationHint: (hint) => set({ lastLocationHint: hint }),
  setCurrentConversation: (id, title) =>
    set({
      currentConversationId: id,
      currentConversationTitle: title || null,
    }),
  setActiveAbortController: (ctrl) => set({ activeAbortController: ctrl }),

  cancelCurrentResponse: () => {
    const ctrl = get().activeAbortController;
    if (ctrl) {
      try {
        ctrl.abort();
      } catch {
        /* ignore */
      }
    }
    set({
      isLoading: false,
      activeAbortController: null,
    });
    get().addMessage({
      id: `${Date.now()}`,
      role: 'orca',
      text: 'Response evaluation cancelled by user.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      kind: 'cancelled',
    });
  },

  clearChat: () =>
    set({
      currentConversationId: null,
      currentConversationTitle: null,
      messages: [],
      lastLocationHint: { lat: 16.9891, lon: 82.2475, name: 'Kakinada' },
      activeAbortController: null,
      isLoading: false,
    }),

  createNewChat: () => {
    set({
      currentConversationId: null,
      currentConversationTitle: null,
      messages: [],
      activeAbortController: null,
      isLoading: false,
    });
  },

  fetchConversations: async () => {
    try {
      const list = await conversationApi.listConversations();
      set({ conversations: list });
    } catch (err) {
      console.warn('[useChatStore] Error fetching conversations:', err);
    }
  },

  loadConversation: async (conversationId: string) => {
    set({ isLoadingHistory: true });
    try {
      const detail = await conversationApi.getConversation(conversationId);
      const formattedMessages: ChatMessage[] = (detail.messages || []).map((m) => ({
        id: m.id,
        role: m.role,
        text: m.text,
        timestamp: new Date(m.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        responsePayload: m.responsePayload,
        locationHint: m.locationHint,
        kind: (m.kind as any) || 'normal',
      }));

      set({
        currentConversationId: detail.id,
        currentConversationTitle: detail.title,
        messages: formattedMessages,
        isLoadingHistory: false,
      });
    } catch (err) {
      console.error('[useChatStore] Error loading conversation:', err);
      set({ isLoadingHistory: false });
    }
  },

  deleteConversation: async (conversationId: string) => {
    try {
      await conversationApi.deleteConversation(conversationId);
      const remaining = get().conversations.filter((c) => c.id !== conversationId);
      set({ conversations: remaining });

      if (get().currentConversationId === conversationId) {
        get().createNewChat();
      }
    } catch (err) {
      console.error('[useChatStore] Error deleting conversation:', err);
    }
  },
}));