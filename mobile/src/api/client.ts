import axios from 'axios';

// Defaults to true for complete mock-first independence
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Utility to simulate realistic network latency for mock calls
 */
export const delay = (ms: number = 500): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
