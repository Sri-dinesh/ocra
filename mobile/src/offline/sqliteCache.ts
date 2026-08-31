import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { SyncPayloadResponse } from '../types/contract';

/**
 * Edge offline cache (Task A6.1).
 * Single table mirroring the sync_payload schema, versioned.
 */
const DB_NAME = 'sagaradristi.db';
const MAX_ROWS = 200;

let dbPromise: Promise<SQLiteDatabase> | null = null;

function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS sync_cache (
          cell TEXT PRIMARY KEY,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

export const cellKey = (lat: number, lon: number) => `${lat.toFixed(2)},${lon.toFixed(2)}`;

export const sqliteCache = {
  async saveSyncPayload(payload: SyncPayloadResponse): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync(
        'INSERT OR REPLACE INTO sync_cache (cell, payload, updated_at) VALUES (?, ?, ?)',
        cellKey(payload.cell.lat, payload.cell.lon),
        JSON.stringify(payload),
        payload.t || new Date().toISOString(),
      );
      await db.runAsync(
        'DELETE FROM sync_cache WHERE cell NOT IN (SELECT cell FROM sync_cache ORDER BY updated_at DESC LIMIT ?)',
        MAX_ROWS,
      );
    } catch (e) {
      console.warn('[offline] saveSyncPayload failed', e);
    }
  },

  async getCachedPayload(lat: number, lon: number): Promise<SyncPayloadResponse | null> {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<{ payload: string }>(
        'SELECT payload FROM sync_cache WHERE cell = ?',
        cellKey(lat, lon),
      );
      return row ? (JSON.parse(row.payload) as SyncPayloadResponse) : null;
    } catch (e) {
      console.warn('[offline] getCachedPayload failed', e);
      return null;
    }
  },

  /** Nearest cached payload to a coordinate, used to answer "off-book" locations honestly. */
  async getNearestPayload(lat: number, lon: number): Promise<SyncPayloadResponse | null> {
    try {
      const db = await getDb();
      const rows = await db.getAllAsync<{ cell: string; payload: string }>(
        'SELECT cell, payload FROM sync_cache',
      );
      if (!rows.length) return null;
      let best: SyncPayloadResponse | null = null;
      let bestDist = Infinity;
      for (const row of rows) {
        const parsed = JSON.parse(row.payload) as SyncPayloadResponse;
        const d = Math.hypot(parsed.cell.lat - lat, parsed.cell.lon - lon);
        if (d < bestDist) {
          bestDist = d;
          best = parsed;
        }
      }
      return best;
    } catch (e) {
      console.warn('[offline] getNearestPayload failed', e);
      return null;
    }
  },

  async getAvailableCellsCount(): Promise<number> {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM sync_cache');
      return row?.n ?? 0;
    } catch {
      return 0;
    }
  },

  async clear(): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync('DELETE FROM sync_cache');
    } catch (e) {
      console.warn('[offline] clear failed', e);
    }
  },
};