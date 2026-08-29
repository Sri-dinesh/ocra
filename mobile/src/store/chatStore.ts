import { create } from 'zustand';
import { QueryResponse } from '../types/contract';

export interface ChatMessage {
  id: string;
  role: 'user' | 'orca';
  text: string;
  timestamp: string;
  responsePayload?: QueryResponse;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  addMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setLoading: (isLoading) => set({ isLoading }),
  clearChat: () => set({ messages: [] }),
}));
