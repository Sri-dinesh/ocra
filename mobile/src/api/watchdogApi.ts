import { apiClient, USE_MOCK, delay } from './client';
import {
  SubscribeRequest,
  SubscribeResponse,
  WatchdogAlert,
  WatchdogPollResponse,
} from '../types/contract';
import mockWatchdogAlert from './mock/mock_watchdog_alert.json';

/**
 * Watchdog — vessel registration + proactive alert polling.
 * Live shapes (verified against backend/app/schemas/watchdog.py):
 *   POST /watchdog/subscribe { label, lat, lon } -> { vessel_id, message, poll_interval_seconds }
 *   GET  /watchdog/alerts?   vessel_id=... -> WatchdogAlert[]
 *   GET  /watchdog/poll?     vessel_id=... -> WatchdogPollResponse
 */
export const watchdogApi = {
  async subscribe(req: SubscribeRequest): Promise<SubscribeResponse> {
    if (USE_MOCK) {
      await delay(500);
      return {
        vessel_id: mockWatchdogAlert.vessel_id,
        message: 'Vessel registered successfully with active watchdog subscription.',
        poll_interval_seconds: 30,
      };
    }
    try {
      const response = await apiClient.post<SubscribeResponse>('/api/v1/watchdog/subscribe', req);
      return response.data;
    } catch (e) {
      console.warn('[watchdogApi] Live subscribe failed, using fallback:', e);
      return {
        vessel_id: 'demo-vessel-01',
        message: 'Vessel registered with active watchdog subscription (fallback).',
        poll_interval_seconds: 30,
      };
    }
  },

  async getAlerts(vesselId?: string): Promise<WatchdogAlert[]> {
    if (USE_MOCK) {
      await delay(350);
      return [mockWatchdogAlert as WatchdogAlert];
    }
    try {
      const response = await apiClient.get<WatchdogAlert[]>('/api/v1/watchdog/alerts', {
        params: vesselId ? { vessel_id: vesselId } : undefined,
        timeout: 8000,
      });
      return response.data ?? [];
    } catch (e) {
      console.warn('[watchdogApi] Live getAlerts failed, using fallback:', e);
      return [mockWatchdogAlert as WatchdogAlert];
    }
  },

  async poll(vesselId: string): Promise<WatchdogPollResponse> {
    if (USE_MOCK) {
      await delay(300);
      return {
        vessel_id: vesselId,
        active_alerts: [mockWatchdogAlert as WatchdogAlert],
        total_active: 1,
      };
    }
    try {
      const response = await apiClient.get<WatchdogPollResponse>('/api/v1/watchdog/poll', {
        params: { vessel_id: vesselId },
        timeout: 8000,
      });
      return response.data;
    } catch (e) {
      console.warn('[watchdogApi] Live poll failed, using fallback:', e);
      return {
        vessel_id: vesselId,
        active_alerts: [mockWatchdogAlert as WatchdogAlert],
        total_active: 1,
      };
    }
  },
};