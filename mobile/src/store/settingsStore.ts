import { create } from 'zustand';

export type UserRole = 'fisherman' | 'researcher' | 'coast_guard' | 'policymaker';

interface SettingsState {
  role: UserRole;
  language: string;
  autoVoicePlayback: boolean;
  setRole: (role: UserRole) => void;
  setLanguage: (language: string) => void;
  setAutoVoicePlayback: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  role: 'fisherman',
  language: 'en-IN',
  autoVoicePlayback: true,
  setRole: (role) => set({ role }),
  setLanguage: (language) => set({ language }),
  setAutoVoicePlayback: (autoVoicePlayback) => set({ autoVoicePlayback }),
}));
