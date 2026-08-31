import { create } from 'zustand';
import { QueryResponse, LocationHint } from '../types/contract';

export interface ChatMessage {
  id: string;
  role: 'user' | 'orca';
  text: string;
  timestamp: string;
  responsePayload?: QueryResponse;
  locationHint?: LocationHint;
  kind?: 'normal' | 'thinking' | 'offline' | 'error' | 'clarification';
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  lastLocationHint: LocationHint | undefined;
  addMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  setLastLocationHint: (hint: LocationHint | undefined) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  lastLocationHint: undefined,
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setLoading: (isLoading) => set({ isLoading }),
  setLastLocationHint: (hint) => set({ lastLocationHint: hint }),
  clearChat: () => set({ messages: [], lastLocationHint: undefined }),
}));