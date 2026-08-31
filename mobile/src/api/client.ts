import { Platform } from 'react-native';
import axios from 'axios';
import Constants from 'expo-constants';

// Defaults to true for complete mock-first independence
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

function getResolvedBaseUrl(): string {
  if (USE_MOCK) return rawBaseUrl;
  
  // If an explicit network IP (e.g. http://192.168.1.60:8000) is set, use it directly
  if (rawBaseUrl && !rawBaseUrl.includes('localhost') && !rawBaseUrl.includes('127.0.0.1')) {
    return rawBaseUrl;
  }

  // Extract host IP from Metro connection for physical iOS/Android devices
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  const metroHostIp = hostUri ? hostUri.split(':')[0] : null;

  if (metroHostIp) {
    return rawBaseUrl.replace('localhost', metroHostIp).replace('127.0.0.1', metroHostIp);
  }

  // Fallback for Android Studio Emulator when using localhost
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }

  return rawBaseUrl;
}

export const API_BASE_URL = getResolvedBaseUrl();

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

