import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

/**
 * Realtime connectivity monitor (Task A6.2).
 * Exposes a hook + a lightweight external snapshot for non-React consumers.
 */
export let isOnline = true;

export function setIsOnline(value: boolean) {
  isOnline = value;
}

export const useOnline = (): boolean => {
  const [online, setOnline] = useState(isOnline);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state: NetInfoState) => {
      const value = state.isConnected !== false && state.isInternetReachable !== false;
      setIsOnline(value);
      setOnline(value);
    });
    NetInfo.fetch().then((state) => {
      const value = state.isConnected !== false && state.isInternetReachable !== false;
      setIsOnline(value);
      setOnline(value);
    }).catch(() => undefined);
    return unsub;
  }, []);

  return online;
};