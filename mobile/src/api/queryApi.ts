import { apiClient, USE_MOCK, delay } from './client';
import { QueryRequest, QueryResponse, EvidenceDetailResponse } from '../types/contract';
import mockQueryResponse from './mock/mock_query_response.json';

export const queryApi = {
  async sendQuery(req: QueryRequest): Promise<QueryResponse> {
    if (USE_MOCK) {
      await delay(600);
      return mockQueryResponse as QueryResponse;
    }
    const response = await apiClient.post<QueryResponse>('/api/v1/query', req);
    return response.data;
  },

  async getEvidence(queryId: string): Promise<EvidenceDetailResponse> {
    if (USE_MOCK) {
      await delay(400);
      return {
        query_id: queryId,
        raw_query: "Can I go fishing tomorrow morning near Kakinada?",
        plan: {
          intent: "sail_clearance",
          location: { lat: 16.9891, lon: 82.2475, name: "Kakinada" },
          required_agents: ["ocean", "weather", "gis"],
        },
        evidence: mockQueryResponse.evidence as any,
        created_at: "2026-08-28T22:11:03+05:30",
      };
    }
    const response = await apiClient.get<EvidenceDetailResponse>(`/api/v1/evidence/${queryId}`);
    return response.data;
  },
};
