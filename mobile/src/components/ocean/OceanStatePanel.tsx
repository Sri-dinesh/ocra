import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { oceanstateApi } from '../../api/oceanstateApi';
import { sqliteCache } from '../../offline/sqliteCache';
import { OceanStateResponse } from '../../types/contract';
import { UserRole } from '../../store/settingsStore';
import { colors, spacing, radius, typography } from '../../theme/theme';

interface Props {
  lat: number;
  lon: number;
  role: UserRole;
}

interface Metric {
  key: string;
  label: string;
  value: string | null;
  unit: string;
}

const fmt = (n: number | undefined): string | null =>
  n === undefined || n === null || Number.isNaN(n) ? null : `${Number(n).toFixed(1)}`;

export const OceanStatePanel: React.FC<Props> = ({ lat, lon, role }) => {
  const [data, setData] = useState<OceanStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(false);
    oceanstateApi
      .getOceanState(lat, lon)
      .then((d) => {
        if (mounted) setData(d);
        // Prime SQLite offline cache in background
        oceanstateApi
          .getSyncPayload(`${lat.toFixed(4)},${lon.toFixed(4)}`)
          .then((payload) => sqliteCache.saveSyncPayload(payload))
          .catch(() => undefined);
      })
      .catch(() => {
        if (mounted) setError(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [lat, lon]);

  const showCurrent = role === 'researcher' || role === 'coast_guard';

  const metrics: Metric[] = [
    { key: 'wave', label: 'Wave Ht', value: fmt(data?.wave_height_m), unit: 'm' },
    { key: 'wind', label: 'Wind', value: fmt(data?.wind_speed_kt), unit: 'kt' },
    { key: 'sst', label: 'SST', value: fmt(data?.sst_c), unit: '°C' },
    { key: 'chl', label: 'Chl-a', value: fmt(data?.chl_a_mgm3), unit: '' },
    ...(showCurrent && data?.current_speed_ms !== undefined
      ? [{ key: 'cur', label: 'Current', value: fmt(data.current_speed_ms), unit: 'm/s' }]
      : []),
  ];

  const qualityColor =
    data?.quality === 'good' ? colors.riskLow : data?.quality === 'stale' ? colors.riskModerate : colors.riskHigh;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Ocean State</Text>
        <Text style={styles.coords}>
          {lat.toFixed(2)}°, {lon.toFixed(2)}°
        </Text>
        {data?.quality && (
          <View style={[styles.pill, { backgroundColor: qualityColor + '33', borderColor: qualityColor }]}>
            <Text style={[styles.pillText, { color: qualityColor }]}>
              {data.quality.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <Text style={styles.stateText}>Reading sensors…</Text>
      ) : error ? (
        <Text style={styles.stateText}>Sensors unavailable. Check connection.</Text>
      ) : (
        <>
          <View style={styles.grid}>
            {metrics.map((m) => (
              <View key={m.key} style={styles.tile}>
                <Text style={styles.metricLabel}>{m.label}</Text>
                <Text style={styles.metricValue} numberOfLines={1}>
                  {m.value ?? '—'}
                  {m.value && <Text style={styles.metricUnit}> {m.unit}</Text>}
                </Text>
              </View>
            ))}
          </View>
          {role === 'researcher' && data?.source_map && (
            <View style={styles.sources}>
              {Object.entries(data.source_map).map(([field, src]) => (
                <Text key={field} style={styles.sourceLine}>
                  {field}: <Text style={styles.sourceName}>{src}</Text>
                </Text>
              ))}
            </View>
          )}
          <Text style={styles.validAt}>
            Valid {data?.valid_time ? new Date(data.valid_time).toLocaleString() : '—'}
          </Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.section,
    color: colors.text,
    flex: 1,
  },
  coords: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '600',
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stateText: {
    color: colors.textMuted,
    fontSize: 13,
    paddingVertical: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metricValue: {
    ...typography.metric,
    color: colors.aqua,
    marginTop: 2,
  },
  metricUnit: {
    fontSize: 12,
    color: colors.aquaDim,
    fontWeight: '700',
  },
  sources: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sourceLine: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  sourceName: {
    color: colors.accent,
    fontWeight: '700',
  },
  validAt: {
    marginTop: spacing.sm,
    color: colors.textFaint,
    fontSize: 10,
  },
});