import { create } from 'zustand';
import { WatchdogAlert, SubscribeResponse } from '../types/contract';
import { watchdogApi } from '../api/watchdogApi';

export const SEVERITY_ORDER = ['critical', 'high', 'moderate', 'low'] as const;
export type Severity = (typeof SEVERITY_ORDER)[number];

interface AlertState {
  alerts: WatchdogAlert[];
  unreadCount: number;
  subscription: SubscribeResponse | null;
  vesselId: string | null;
  vesselLabel: string;
  isSubscribing: boolean;
  isPolling: boolean;
  lastPolledAt: string | null;
  watchdogPolling: boolean;

  subscribeVessel: (label: string, lat: number, lon: number) => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  refreshAlerts: () => Promise<void>;
  dismissAlert: (id: string) => void;
  clearAlerts: () => void;
  markAllRead: () => void;
  setVesselLabel: (label: string) => void;
  triggerDemoHazard: (kind: 'imbl' | 'cyclone' | 'wave') => void;
}

const DEFAULTS = {
  alerts: [] as WatchdogAlert[],
  unreadCount: 0,
  subscription: null,
  vesselId: null,
  vesselLabel: 'Sea Hawk-01',
  isSubscribing: false,
  isPolling: false,
  lastPolledAt: null,
  watchdogPolling: false,
};

export const useAlertStore = create<AlertState>((set, get) => ({
  ...DEFAULTS,

  subscribeVessel: async (label, lat, lon) => {
    set({ isSubscribing: true });
    try {
      const sub = await watchdogApi.subscribe({ label, lat, lon });
      set({
        subscription: sub,
        vesselId: sub.vessel_id,
        vesselLabel: label,
        isSubscribing: false,
      });
      const alerts = await watchdogApi.getAlerts(sub.vessel_id);
      if (alerts?.length) {
        const fresh = alerts.filter(
          (a) => !get().alerts.some((e) => `${e.alert_type}_${e.triggered_at}` === `${a.alert_type}_${a.triggered_at}`),
        );
        if (fresh.length) {
          set((s) => ({
            alerts: [...fresh, ...s.alerts].sort(
              (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
            ),
            unreadCount: s.unreadCount + fresh.length,
          }));
        }
      }
      set({ lastPolledAt: new Date().toISOString() });
      get().startPolling();
    } catch (e) {
      console.warn('[watchdog] subscribe failed', e);
      // Offline-tolerant: register locally with a stable demo identity so the
      // rest of the app (overlay, badges, history) still functions.
      set({
        vesselId: 'demo-vessel-01',
        vesselLabel: label,
        subscription: {
          vessel_id: 'demo-vessel-01',
          message: 'Local watchdog profile (offline). Re-subscribe when back online.',
          poll_interval_seconds: 30,
        },
      });
    } finally {
      set({ isSubscribing: false });
    }
  },

  refreshAlerts: async () => {
    const vesselId = get().vesselId;
    if (!vesselId) return;
    try {
      const alerts = await watchdogApi.getAlerts(vesselId);
      if (!alerts?.length) return;
      set({
        alerts: alerts,
        lastPolledAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[watchdog] poll failed (offline?)', e);
    }
  },

  startPolling: () => {
    if (get().watchdogPolling) return;
    set({ watchdogPolling: true, isPolling: true });
    const tick = async () => {
      if (!get().watchdogPolling) return;
      await get().refreshAlerts();
    };
    tick();
    const interval = setInterval(tick, 20000);
    // Keep the handle addressable so stopPolling can clear it.
    (get() as unknown as { _pollTimer?: ReturnType<typeof setInterval> })._pollTimer = interval;
  },

  stopPolling: () => {
    const s = get() as unknown as { _pollTimer?: ReturnType<typeof setInterval> };
    if (s._pollTimer) clearInterval(s._pollTimer);
    set({ watchdogPolling: false, isPolling: false });
  },

  dismissAlert: (id) => {
    set((s) => ({ alerts: s.alerts.filter((a) => `${a.alert_type}_${a.triggered_at}` !== id) }));
  },

  clearAlerts: () => set({ alerts: [], unreadCount: 0 }),
  markAllRead: () => set({ unreadCount: 0 }),
  setVesselLabel: (vesselLabel) => set({ vesselLabel }),
  triggerDemoHazard: (kind) => {
    const vesselId = get().vesselId || 'demo-vessel-01';
    let newAlert: WatchdogAlert;
    const now = new Date().toISOString();

    if (kind === 'imbl') {
      newAlert = {
        vessel_id: vesselId,
        alert_type: 'imbl_proximity',
        severity: 'critical',
        message: 'CRITICAL: Vessel is within 3.8 nm of the International Maritime Boundary Line (IMBL). Reverse course heading 270° West immediately.',
        triggered_at: now,
      };
    } else if (kind === 'cyclone') {
      newAlert = {
        vessel_id: vesselId,
        alert_type: 'cyclone_warning',
        severity: 'high',
        message: 'CYCLONE ALERT: Deep Depression BOB-03 moving NW at 18 knots. Gusts exceeding 45 knots expected within 6 hours. Seek harbor shelter.',
        triggered_at: now,
      };
    } else {
      newAlert = {
        vessel_id: vesselId,
        alert_type: 'wave_spike',
        severity: 'moderate',
        message: 'HIGH SWELL WARNING: Significant wave heights approaching 3.2m due to incoming southern swell. Small craft caution advised.',
        triggered_at: now,
      };
    }

    set((s) => ({
      alerts: [newAlert, ...s.alerts.filter((a) => a.alert_type !== newAlert.alert_type)],
      unreadCount: s.unreadCount + 1,
      vesselId: s.vesselId || 'demo-vessel-01',
    }));
  },
}));