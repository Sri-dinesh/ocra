import { apiClient } from './client';
import { RouteRequest, RouteResponse } from '../types/contract';

export const routeApi = {
  async getRoute(req: RouteRequest): Promise<RouteResponse> {
    const response = await apiClient.post<RouteResponse>('/api/v1/route', req);
    return response.data;
  },
};
