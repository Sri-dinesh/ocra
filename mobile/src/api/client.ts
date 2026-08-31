import { Platform } from 'react-native';
import axios from 'axios';
import Constants from 'expo-constants';

const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

function getResolvedBaseUrl(): string {
  // If an explicit network IP (e.g. http://10.10.20.19:8000) is set and not localhost, use it directly
  if (rawBaseUrl && !rawBaseUrl.includes('localhost') && !rawBaseUrl.includes('127.0.0.1')) {
    return rawBaseUrl;
  }

  // Extract host IP from Metro connection for physical iOS/Android devices running Expo Go
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost;

  const metroHostIp = hostUri ? hostUri.split(':')[0] : null;

  if (metroHostIp && metroHostIp !== 'localhost' && metroHostIp !== '127.0.0.1') {
    return `http://${metroHostIp}:8000`;
  }

  // Fallback for Android Studio Emulator when accessing host machine localhost
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }

  return rawBaseUrl;
}

export const API_BASE_URL = getResolvedBaseUrl();

console.log('[ORCA Mobile] Resolved API_BASE_URL:', API_BASE_URL);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Candidate host URLs for resilient local development failover
const CANDIDATE_URLS = [
  API_BASE_URL,
  'http://10.0.2.2:8000',      // Android Emulator host loopback bridge
  'http://10.10.20.19:8000',    // LAN WiFi host IP
  'http://localhost:8000',     // Localhost (Web / iOS simulator)
].filter((url, idx, self) => Boolean(url) && self.indexOf(url) === idx);

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config;
    if (!config || (config as any)._retried) {
      return Promise.reject(error);
    }
    (config as any)._retried = true;

    // If network unreachable, cycle through candidate local development IPs
    if (error.message?.includes('Network Error') || error.code === 'ERR_NETWORK') {
      for (const candidate of CANDIDATE_URLS) {
        if (candidate !== config.baseURL) {
          try {
            console.log(`[apiClient] Retrying ${config.url} via candidate: ${candidate}...`);
            const retryConfig = { ...config, baseURL: candidate, _retried: true };
            const res = await axios(retryConfig);
            return res;
          } catch (retryErr) {
            // Keep trying next candidate URL
          }
        }
      }
    }
    return Promise.reject(error);
  }
);
