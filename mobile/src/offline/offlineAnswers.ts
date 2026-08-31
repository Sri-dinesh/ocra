import { SyncPayloadResponse } from '../types/contract';

/**
 * Offline query evaluation engine (Task A6.4).
 * Answers strictly from the cached sync payload; never fabricates data the
 * cache does not contain — and says so plainly.
 */

function fmt(n: number | undefined, unit: string, digits = 1): string | null {
  if (n === undefined || n === null || Number.isNaN(n)) return null;
  return `${n.toFixed(digits)} ${unit}`;
}

export interface OfflineAnswer {
  text: string;
  answered: boolean;
  cellUsed: { lat: number; lon: number } | null;
}

export function answerFromCache(userText: string, payload: SyncPayloadResponse): OfflineAnswer {
  const q = userText.toLowerCase();
  const cell = { lat: payload.cell.lat, lon: payload.cell.lon };

  const wave = fmt(payload.wave_m, 'm');
  const wind = fmt(payload.wind_kt, 'kt', 0);
  const sst = fmt(payload.sst_c, '°C');
  const chl = fmt(payload.chl, 'mg/m³');

  if (/(wave|height|swell)/.test(q)) {
    return {
      answered: !!wave,
      cellUsed: cell,
      text: wave
        ? `Cached significant wave height at ${cell.lat.toFixed(2)}, ${cell.lon.toFixed(2)}: ${wave}. (Offline data, synced earlier.)`
        : 'Wave height is not available in this cell\u2019s offline cache.',
    };
  }
  if (/(wind|gust)/.test(q)) {
    return {
      answered: !!wind,
      cellUsed: cell,
      text: wind
        ? `Cached surface wind speed: ${wind}. (Offline data, synced earlier.)`
        : 'Wind speed is not available in this cell\u2019s offline cache.',
    };
  }
  if (/(temp|sst|sea surface)/.test(q)) {
    return {
      answered: !!sst,
      cellUsed: cell,
      text: sst
        ? `Cached sea surface temperature: ${sst}. (Offline data, synced earlier.)`
        : 'Sea surface temperature is not available in this cell\u2019s offline cache.',
    };
  }
  if (/(chlor|chl)/.test(q)) {
    return {
      answered: !!chl,
      cellUsed: cell,
      text: chl
        ? `Cached chlorophyll-a: ${chl}. (Offline data, synced earlier.)`
        : 'Chlorophyll is not available in this cell\u2019s offline cache.',
    };
  }
  if (/(boundary|imb|iml)/.test(q) && payload.imbl_nm !== undefined && payload.imbl_nm !== null) {
    return {
      answered: true,
      cellUsed: cell,
      text: `Cached distance to nearest International Maritime Boundary Line: ${payload.imbl_nm.toFixed(1)} nm. (Offline data, synced earlier.)`,
    };
  }
  if (/(cyclone|storm|hazard|alert)/.test(q)) {
    const hz = payload.hz || [];
    return {
      answered: true,
      cellUsed: cell,
      text:
        hz.length === 0
          ? 'No active hazards recorded in this cell\u2019s offline cache.'
          : `Cached hazards: ${hz.map((h) => `${h.type} (${h.severity})`).join(', ')}.`,
    };
  }

  // Generic fallback: honest summary of what we hold, then decline anything else.
  const parts = [wave && `waves ${wave}`, wind && `wind ${wind}`, sst && `SST ${sst}`, chl && `chl ${chl}`].filter(
    Boolean,
  ) as string[];
  const summary = parts.length ? parts.join(', ') : 'no ocean parameters';

  return {
    answered: true,
    cellUsed: cell,
    text: `Offline mode: I can only answer from locally cached data for ${cell.lat.toFixed(1)}, ${cell.lon.toFixed(1)} — currently ${summary}. Connect to the network for a full advisory.`,
  };
}