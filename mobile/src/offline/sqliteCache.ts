import { SyncPayloadResponse } from '../types/contract';

let memoryPayload: SyncPayloadResponse | null = {
  v: 1,
  t: '2026-08-29T06:00:00+05:30',
  cell: { lat: 16.9891, lon: 82.2475 },
  wave_m: 1.8,
  wind_kt: 14.0,
  sst_c: 28.2,
  chl: 1.4,
  hz: [],
  imbl_nm: 42.6,
};

export const sqliteCache = {
  async saveSyncPayload(payload: SyncPayloadResponse): Promise<void> {
    memoryPayload = payload;
    // TODO (AKASH): Implement Expo SQLite persistent caching in Phase 6
  },

  async getLastSyncPayload(): Promise<SyncPayloadResponse | null> {
    // TODO (AKASH): Implement Expo SQLite read in Phase 6
    return memoryPayload;
  },
};
