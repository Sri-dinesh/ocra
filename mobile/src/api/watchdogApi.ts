import { apiClient } from './client';
import {
  SubscribeRequest,
  SubscribeResponse,
  WatchdogAlert,
  WatchdogPollResponse,
} from '../types/contract';

/**
 * Watchdog — vessel registration + proactive alert polling.
 * Live shapes (verified against backend/app/schemas/watchdog.py):
 *   POST /api/v1/watchdog/subscribe { label, lat, lon } -> { vessel_id, message, poll_interval_seconds }
 *   GET  /api/v1/watchdog/alerts?   vessel_id=... -> WatchdogAlert[]
 *   GET  /api/v1/watchdog/poll?     vessel_id=... -> WatchdogPollResponse
 */
export const watchdogApi = {
  async subscribe(req: SubscribeRequest): Promise<SubscribeResponse> {
    const response = await apiClient.post<SubscribeResponse>('/api/v1/watchdog/subscribe', req);
    return response.data;
  },

  async getAlerts(vesselId?: string): Promise<WatchdogAlert[]> {
    const response = await apiClient.get<WatchdogAlert[]>('/api/v1/watchdog/alerts', {
      params: vesselId ? { vessel_id: vesselId } : undefined,
      timeout: 10000,
    });
    return response.data ?? [];
  },

  async poll(vesselId: string): Promise<WatchdogPollResponse> {
    const response = await apiClient.get<WatchdogPollResponse>('/api/v1/watchdog/poll', {
      params: { vessel_id: vesselId },
      timeout: 10000,
    });
    return response.data;
  },
};