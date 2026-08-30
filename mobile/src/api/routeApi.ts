import { apiClient, USE_MOCK, delay } from './client';
import { RouteRequest, RouteResponse } from '../types/contract';
import mockRouteResponse from './mock/mock_route_response.json';

export const routeApi = {
  async getRoute(req: RouteRequest): Promise<RouteResponse> {
    if (USE_MOCK) {
      await delay(700);
      return mockRouteResponse as RouteResponse;
    }
    try {
      const response = await apiClient.post<RouteResponse>('/api/v1/route', req);
      return response.data;
    } catch (e) {
      console.warn('[routeApi] Live route failed, using fallback route:', e);
      return mockRouteResponse as RouteResponse;
    }
  },
};
