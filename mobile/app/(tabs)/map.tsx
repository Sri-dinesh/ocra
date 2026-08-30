import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { LeafletMapView, LeafletMapHandle } from '../../src/components/map/LeafletMapView';
import { RoutePlannerSheet } from '../../src/components/map/RoutePlannerSheet';
import { OceanStatePanel } from '../../src/components/ocean/OceanStatePanel';
import { useMapStore, LAYER_OPTIONS } from '../../src/store/mapStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { routeApi } from '../../src/api/routeApi';
import { RouteResponse, LatLonPoint } from '../../src/types/contract';
import { colors, spacing, radius, typography } from '../../src/theme/theme';
import { PressableScale, AnimatedPill, FadeInUpView } from '../../src/components/ui/anim';

export default function MapScreen() {
  const mapRef = useRef<LeafletMapHandle>(null);
  const { center, zoom, activeLayers, pfzMarkers, setCenter, setZoom, setRoute } =
    useMapStore();
  const role = useSettingsStore((s) => s.role);

  const [plannerOpen, setPlannerOpen] = useState(false);
  const [oceanOpen, setOceanOpen] = useState(false);
  const [routeSummary, setRouteSummary] = useState<RouteResponse | null>(null);
  const [autoBound, setAutoBound] = useState(false);

  const syncToMap = useCallback(() => {
    const m = mapRef.current;
    if (!m) return;
    m.setVessel(center.lat, center.lon);
    m.setPfz(pfzMarkers);
    m.setLayers(activeLayers);
  }, [center, pfzMarkers, activeLayers]);

  useEffect(() => {
    if (!autoBound) return;
    syncToMap();
  }, [autoBound, syncToMap]);

  const drawDemoRoute = useCallback(async () => {
    try {
      const res = await routeApi.getRoute({
        start: { lat: 16.9891, lon: 82.2475 },
        goal: { lat: 17.15, lon: 82.45 },
        boat_class: 'small',
      });
      setRoute(res.route);
      setRouteSummary(res);
      mapRef.current?.drawRoute({ type: 'ASTAR', points: res.route });
      mapRef.current?.drawRoute({
        type: 'NAIVE',
        points: [
          { lat: 16.9891, lon: 82.2475 },
          { lat: 17.15, lon: 82.45 },
        ] as LatLonPoint[],
      });
    } catch {
      // No route yet — planner lets the user request one manually.
    }
  }, [setRoute]);

  const handleReady = useCallback(() => {
    setAutoBound(true);
    drawDemoRoute();
  }, [drawDemoRoute]);

  const handleRouteDrawn = useCallback(
    (astar: LatLonPoint[], naive: LatLonPoint[], summary: RouteResponse) => {
      setRoute(astar);
      setRouteSummary(summary);
      mapRef.current?.drawRoute({ type: 'ASTAR', points: astar });
      mapRef.current?.drawRoute({ type: 'NAIVE', points: naive });
      mapRef.current?.focus(astar[0]?.lat ?? center.lat, astar[0]?.lon ?? center.lon, 9);
      setPlannerOpen(false);
    },
    [center, setRoute],
  );

  const handleLayerToggle = (key: string) => {
    const next = activeLayers.includes(key)
      ? activeLayers.filter((k) => k !== key)
      : [...activeLayers, key];
    useMapStore.getState().setLayers(next);
    mapRef.current?.setLayers(next);
  };

  const recenterVessel = () => {
    mapRef.current?.focus(center.lat, center.lon, Math.max(zoom, 9));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.mapWrap}>
        <LeafletMapView
          ref={mapRef}
          centerLat={center.lat}
          centerLon={center.lon}
          zoom={zoom}
          onMapMoved={(c) => {
            setCenter({ lat: c.lat, lon: c.lon });
            setZoom(c.zoom);
          }}
          onReady={handleReady}
        />
      </View>

      <View style={styles.layerBar}>
        {LAYER_OPTIONS.map((opt) => {
          const active = activeLayers.includes(opt.key);
          return (
            <PressableScale key={opt.key} onPress={() => handleLayerToggle(opt.key)}>
              <AnimatedPill
                colorOn={colors.accentDeep}
                colorOff={colors.card}
                active={active}
              >
                <Text style={[styles.layerChipText, { color: active ? colors.text : colors.textMuted }]}>
                  {active ? '✓ ' : ''}{opt.label}
                </Text>
              </AnimatedPill>
            </PressableScale>
          );
        })}
      </View>

      <PressableScale style={styles.recenterBtn} onPress={recenterVessel}>
        <Text style={styles.recenterIcon}>⌖</Text>
      </PressableScale>

      <View style={styles.floatingActions}>
        <PressableScale
          style={[styles.actionBtn, plannerOpen && styles.actionBtnActive]}
          onPress={() => setPlannerOpen((v) => !v)}
        >
          <Text style={styles.actionText}>{routeSummary ? `✔ ${routeSummary.distance_nm} nm` : '🧭 Route'}</Text>
        </PressableScale>
        <PressableScale
          style={[styles.actionBtn, oceanOpen && styles.actionBtnActive]}
          onPress={() => setOceanOpen((v) => !v)}
        >
          <Text style={styles.actionText}>🌊 Ocean State</Text>
        </PressableScale>
      </View>

      {oceanOpen && (
        <FadeInUpView style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Live Sensors</Text>
            <TouchableOpacity onPress={() => setOceanOpen(false)} hitSlop={12}>
              <Text style={styles.panelClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <OceanStatePanel lat={center.lat} lon={center.lon} role={role} />
        </FadeInUpView>
      )}

      {plannerOpen && (
        <RoutePlannerSheet onRouteDrawn={handleRouteDrawn} onClose={() => setPlannerOpen(false)} />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  mapWrap: {
    flex: 1,
  },
  layerBar: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderRadius: radius.pill,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
    maxWidth: '92%',
  },
  layerChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  recenterBtn: {
    position: 'absolute',
    top: spacing.lg + 42,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recenterIcon: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '800',
  },
  floatingActions: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  actionBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnActive: {
    borderColor: colors.aqua,
  },
  actionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  panel: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 78,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  panelTitle: {
    ...typography.section,
    color: colors.text,
  },
  panelClose: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
  },
});