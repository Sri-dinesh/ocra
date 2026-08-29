import { create } from 'zustand';
import { WatchdogAlert } from '../types/contract';

interface AlertState {
  alerts: WatchdogAlert[];
  unreadCount: number;
  addAlert: (alert: WatchdogAlert) => void;
  clearAlerts: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [
    {
      alert_type: 'IMBL_PROXIMITY',
      severity: 'critical',
      vessel_id: 'demo-vessel-01',
      message: 'You are 1.2nm from the International Maritime Boundary Line. Recommend course correction.',
      triggered_at: '2026-08-29T06:42:00+05:30',
    },
  ],
  unreadCount: 1,
  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts],
      unreadCount: state.unreadCount + 1,
    })),
  clearAlerts: () => set({ alerts: [], unreadCount: 0 }),
}));
