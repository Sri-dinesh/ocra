import { apiClient, USE_MOCK, delay } from './client';
import { OceanStateResponse, SyncPayloadResponse } from '../types/contract';
import mockOceanstateResponse from './mock/mock_oceanstate_response.json';

export const oceanstateApi = {
  async getOceanState(lat: number, lon: number, time?: string): Promise<OceanStateResponse> {
    if (USE_MOCK) {
      await delay(500);
      return mockOceanstateResponse as OceanStateResponse;
    }
    const response = await apiClient.get<OceanStateResponse>('/api/v1/oceanstate', {
      params: { lat, lon, time },
    });
    return response.data;
  },

  async getSyncPayload(cell: string): Promise<SyncPayloadResponse> {
    if (USE_MOCK) {
      await delay(300);
      return {
        v: 1,
        t: "2026-08-29T06:00:00+05:30",
        cell: { lat: 16.9891, lon: 82.2475 },
        wave_m: 1.8,
        wind_kt: 14.0,
        sst_c: 28.2,
        chl: 1.4,
        hz: [],
        imbl_nm: 42.6,
      };
    }
    const response = await apiClient.get<SyncPayloadResponse>('/api/v1/sync/payload', {
      params: { cell },
    });
    return response.data;
  },
};
