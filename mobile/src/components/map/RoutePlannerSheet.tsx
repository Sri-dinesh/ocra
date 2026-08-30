import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { routeApi } from '../../api/routeApi';
import { RouteResponse, LatLonPoint } from '../../types/contract';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { PressableScale } from '../ui/anim';

interface Props {
  defaultStart?: LatLonPoint;
  defaultGoal?: LatLonPoint;
  onRouteDrawn: (astar: LatLonPoint[], naive: LatLonPoint[], summary: RouteResponse) => void;
  onClose: () => void;
}

const BOATS = ['small', 'medium', 'large'];

export const RoutePlannerSheet: React.FC<Props> = ({
  defaultStart = { lat: 16.9891, lon: 82.2475 },
  defaultGoal = { lat: 17.15, lon: 82.45 },
  onRouteDrawn,
  onClose,
}) => {
  const [startLat, setStartLat] = useState(String(defaultStart.lat));
  const [startLon, setStartLon] = useState(String(defaultStart.lon));
  const [goalLat, setGoalLat] = useState(String(defaultGoal.lat));
  const [goalLon, setGoalLon] = useState(String(defaultGoal.lon));
  const [boatClass, setBoatClass] = useState('small');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RouteResponse | null>(null);

  const plan = async () => {
    setError(null);
    setLoading(true);
    try {
      const start = { lat: parseFloat(startLat), lon: parseFloat(startLon) };
      const goal = { lat: parseFloat(goalLat), lon: parseFloat(goalLon) };
      if (Number.isNaN(start.lat) || Number.isNaN(start.lon) || Number.isNaN(goal.lat) || Number.isNaN(goal.lon)) {
        throw new Error('Enter valid coordinates');
      }
      const res = await routeApi.getRoute({ start, goal, boat_class: boatClass });
      setSummary(res);
      const naive = [start, goal];
      onRouteDrawn(res.route, naive, res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Route request failed');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholderTextColor={colors.textFaint}
      />
    </View>
  );

  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <Text style={styles.title}>Route Planner</Text>
        <TouchableOpacity onPress={onClose} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pointRow}>
        <Field label="Start lat" value={startLat} onChange={setStartLat} />
        <Field label="Start lon" value={startLon} onChange={setStartLon} />
      </View>
      <View style={styles.pointRow}>
        <Field label="Goal lat" value={goalLat} onChange={setGoalLat} />
        <Field label="Goal lon" value={goalLon} onChange={setGoalLon} />
      </View>

      <View style={styles.boatRow}>
        <Text style={styles.fieldLabel}>Boat class</Text>
        <View style={styles.boatChips}>
          {BOATS.map((b) => (
            <PressableScale
              key={b}
              style={[styles.boatChip, boatClass === b && styles.boatChipActive]}
              onPress={() => setBoatClass(b)}
            >
              <Text style={[styles.boatChipText, boatClass === b && styles.boatChipTextActive]}>
                {b}
              </Text>
            </PressableScale>
          ))}
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {summary && (
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Distance</Text>
            <Text style={styles.summaryValue}>{summary.distance_nm} nm</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pathfinder</Text>
            <Text style={styles.summaryValue}>{summary.pathfinder.toUpperCase()}</Text>
          </View>
          <Text style={styles.avoided}>
            ⛔ Avoided: {summary.avoided_zones?.length ? summary.avoided_zones.join(', ') : 'none'}
          </Text>
        </View>
      )}

      <PressableScale style={styles.planBtn} onPress={plan} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#06283D" />
        ) : (
          <Text style={styles.planBtnText}>{summary ? 'Re-plan route' : 'Plot safe route →'}</Text>
        )}
      </PressableScale>
    </View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.section,
    color: colors.text,
  },
  close: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
  },
  pointRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  field: {
    flex: 1,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 14,
  },
  boatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.sm,
  },
  boatChips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  boatChip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  boatChipActive: {
    backgroundColor: colors.accentDeep,
    borderColor: colors.accent,
  },
  boatChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  boatChipTextActive: {
    color: colors.text,
  },
  error: {
    color: colors.alertDanger,
    fontSize: 12,
    marginVertical: spacing.sm,
  },
  summary: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  summaryValue: {
    color: colors.aqua,
    fontSize: 13,
    fontWeight: '800',
  },
  avoided: {
    color: colors.alertDanger,
    fontSize: 11,
    marginTop: 4,
  },
  planBtn: {
    backgroundColor: colors.aqua,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  planBtnText: {
    color: '#06283D',
    fontSize: 15,
    fontWeight: '800',
  },
});