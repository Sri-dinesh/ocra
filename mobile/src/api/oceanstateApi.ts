import { apiClient } from './client';
import { OceanStateResponse, SyncPayloadResponse } from '../types/contract';

export const oceanstateApi = {
  async getOceanState(lat: number, lon: number, time?: string): Promise<OceanStateResponse> {
    const response = await apiClient.get<OceanStateResponse>('/api/v1/oceanstate', {
      params: { lat, lon, time },
    });
    return response.data;
  },

  async getSyncPayload(cell: string): Promise<SyncPayloadResponse> {
    const response = await apiClient.get<SyncPayloadResponse>('/api/v1/sync/payload', {
      params: { cell },
    });
    return response.data;
  },
};
