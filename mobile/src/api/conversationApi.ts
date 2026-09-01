import { apiClient } from './client';
import {
  ConversationSummary,
  ConversationDetailResponse,
  CreateConversationRequest,
  UpdateConversationRequest,
} from '../types/contract';

export const conversationApi = {
  async listConversations(limit: number = 50, offset: number = 0): Promise<ConversationSummary[]> {
    const response = await apiClient.get<ConversationSummary[]>('/api/v1/conversations', {
      params: { limit, offset },
    });
    return response.data;
  },

  async getConversation(conversationId: string): Promise<ConversationDetailResponse> {
    const response = await apiClient.get<ConversationDetailResponse>(
      `/api/v1/conversations/${conversationId}`
    );
    return response.data;
  },

  async createConversation(req: CreateConversationRequest = {}): Promise<ConversationSummary> {
    const response = await apiClient.post<ConversationSummary>('/api/v1/conversations', req);
    return response.data;
  },

  async updateConversation(
    conversationId: string,
    req: UpdateConversationRequest
  ): Promise<ConversationSummary> {
    const response = await apiClient.patch<ConversationSummary>(
      `/api/v1/conversations/${conversationId}`,
      req
    );
    return response.data;
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await apiClient.delete(`/api/v1/conversations/${conversationId}`);
  },
};
