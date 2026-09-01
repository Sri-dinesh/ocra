import { apiClient } from './client';
import { QueryRequest, QueryResponse, EvidenceDetailResponse } from '../types/contract';
import { oceanstateApi } from './oceanstateApi';
import { sqliteCache } from '../offline/sqliteCache';

export const queryApi = {
  async sendQuery(req: QueryRequest, signal?: AbortSignal): Promise<QueryResponse> {
    const response = await apiClient.post<QueryResponse>('/api/v1/query', req, { signal });

    // Prime local SQLite edge cache in background for offline support
    if (req.location_hint) {
      const { lat, lon } = req.location_hint;
      oceanstateApi
        .getSyncPayload(`${lat.toFixed(4)},${lon.toFixed(4)}`)
        .then((payload) => sqliteCache.saveSyncPayload(payload))
        .catch(() => undefined);
    }

    return response.data;
  },

  async getEvidence(queryId: string): Promise<EvidenceDetailResponse> {
    const response = await apiClient.get<EvidenceDetailResponse>(`/api/v1/evidence/${queryId}`);
    return response.data;
  },
};
