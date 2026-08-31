import { create } from 'zustand';

export type UserRole = 'fisherman' | 'researcher' | 'coast_guard' | 'policymaker';

interface SettingsState {
  role: UserRole;
  language: string;
  autoVoicePlayback: boolean;
  hapticsEnabled: boolean;
  setRole: (role: UserRole) => void;
  setLanguage: (language: string) => void;
  setAutoVoicePlayback: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  role: 'fisherman',
  language: 'en-IN',
  autoVoicePlayback: true,
  hapticsEnabled: true,
  setRole: (role) => set({ role }),
  setLanguage: (language) => set({ language }),
  setAutoVoicePlayback: (autoVoicePlayback) => set({ autoVoicePlayback }),
  setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
}));

export const ROLE_META: Record<
  UserRole,
  { title: string; short: string; icon: string; desc: string }
> = {
  fisherman: {
    title: 'Coastal Fisherman',
    short: 'Fisherman',
    icon: '🎣',
    desc: 'Voice-first advice, PFZ suitability, safe return routes, boundary alerts',
  },
  researcher: {
    title: 'Marine Researcher',
    short: 'Researcher',
    icon: '🔬',
    desc: 'Raw multi-sensor datasets, SST/Chlorophyll trends, species density',
  },
  coast_guard: {
    title: 'Coast Guard / Authority',
    short: 'Coast Guard',
    icon: '🛡️',
    desc: 'Vessel surveillance, IMBL containment violations, storm warnings',
  },
  policymaker: {
    title: 'Maritime Policy & Planner',
    short: 'Policymaker',
    icon: '📋',
    desc: 'Zone analytics, aggregated risk overviews, policy briefs',
  },
};