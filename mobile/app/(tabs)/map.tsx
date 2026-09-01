import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LeafletMapView, LeafletMapHandle } from '../../src/components/map/LeafletMapView';
import { RoutePlannerSheet } from '../../src/components/map/RoutePlannerSheet';
import { OceanStatePanel } from '../../src/components/ocean/OceanStatePanel';
import { LocationPickerModal } from '../../src/components/chat/LocationPickerModal';
import { PageInfoModal } from '../../src/components/ui/PageInfoModal';
import { useMapStore, LAYER_OPTIONS } from '../../src/store/mapStore';
import { useChatStore } from '../../src/store/chatStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { routeApi } from '../../src/api/routeApi';
import { RouteResponse, LatLonPoint, LocationHint } from '../../src/types/contract';
import { MAP_ROUTE_PRESETS, MapRoutePreset } from '../../src/constants/presets';
import { colors, spacing, radius, typography, shadow } from '../../src/theme/theme';
import { PressableScale, AnimatedPill, FadeInUpView } from '../../src/components/ui/anim';

const DEMO_HOTSPOTS = [
  { id: 'pfz-1', name: 'Kakinada Offshore Front', lat: 17.11, lon: 82.35, dist_nm: 8.5, sst: 28.4, chl: 1.8, species: 'Yellowfin Tuna, Mackerel' },
  { id: 'pfz-2', name: 'Godavari Plume Zone', lat: 16.85, lon: 82.55, dist_nm: 14.2, sst: 28.1, chl: 2.1, species: 'Sardines, Ribbonfish' },
  { id: 'pfz-3', name: 'Deep Sea Thermal Edge', lat: 17.25, lon: 82.75, dist_nm: 22.0, sst: 27.8, chl: 1.2, species: 'Skipjack Tuna, Seer Fish' },
];

export default function MapScreen() {
  const mapRef = useRef<LeafletMapHandle>(null);
  const { center, zoom, activeLayers, pfzMarkers, setCenter, setZoom, setRoute } = useMapStore();
  const { lastLocationHint, setLastLocationHint } = useChatStore();
  const role = useSettingsStore((s) => s.role);

  const [plannerOpen, setPlannerOpen] = useState(false);
  const [oceanOpen, setOceanOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<typeof DEMO_HOTSPOTS[0] | null>(null);
  const [routeSummary, setRouteSummary] = useState<RouteResponse | null>(null);
  const [autoBound, setAutoBound] = useState(false);

  // Stable vessel GPS reference (does not change on free map pan)
  const vesselLat = lastLocationHint?.lat ?? 16.9891;
  const vesselLon = lastLocationHint?.lon ?? 82.2475;

  // Sync state to Leaflet WebView
  const syncToMap = useCallback(() => {
    const m = mapRef.current;
    if (!m) return;
    m.setVessel(vesselLat, vesselLon);
    m.setPfz(pfzMarkers);
    m.setLayers(activeLayers);
  }, [vesselLat, vesselLon, pfzMarkers, activeLayers]);

  useEffect(() => {
    if (!autoBound) return;
    syncToMap();
  }, [autoBound, syncToMap]);

  // If lastLocationHint changes from chat/selector, focus map to it
  useEffect(() => {
    if (lastLocationHint) {
      setCenter({ lat: lastLocationHint.lat, lon: lastLocationHint.lon });
      mapRef.current?.focus(lastLocationHint.lat, lastLocationHint.lon, 9);
      mapRef.current?.setVessel(lastLocationHint.lat, lastLocationHint.lon);
    }
  }, [lastLocationHint, setCenter]);

  const drawDemoRoute = useCallback(async () => {
    try {
      const res = await routeApi.getRoute({
        start: { lat: vesselLat, lon: vesselLon },
        goal: { lat: vesselLat + 0.16, lon: vesselLon + 0.20 },
        boat_class: 'small',
      });
      setRoute(res.route);
      setRouteSummary(res);
      mapRef.current?.drawRoute({ type: 'ASTAR', points: res.route });
      mapRef.current?.drawRoute({
        type: 'NAIVE',
        points: [
          { lat: vesselLat, lon: vesselLon },
          { lat: vesselLat + 0.16, lon: vesselLon + 0.20 },
        ] as LatLonPoint[],
      });
    } catch {
      // Planner allows custom route creation
    }
  }, [vesselLat, vesselLon, setRoute]);

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
      mapRef.current?.focus(astar[0]?.lat ?? vesselLat, astar[0]?.lon ?? vesselLon, 9);
      setPlannerOpen(false);
      setSelectedHotspot(null);
    },
    [vesselLat, vesselLon, setRoute],
  );

  const handleRunPresetRoute = async (preset: MapRoutePreset) => {
    setLastLocationHint(preset.start);
    setCenter({ lat: preset.start.lat, lon: preset.start.lon });
    mapRef.current?.focus(preset.start.lat, preset.start.lon, 9);
    mapRef.current?.setVessel(preset.start.lat, preset.start.lon);

    try {
      const res = await routeApi.getRoute({
        start: { lat: preset.start.lat, lon: preset.start.lon },
        goal: { lat: preset.goal.lat, lon: preset.goal.lon },
        boat_class: 'small',
      });
      handleRouteDrawn(
        res.route,
        [
          { lat: preset.start.lat, lon: preset.start.lon },
          { lat: preset.goal.lat, lon: preset.goal.lon },
        ],
        res
      );
    } catch (e) {
      // Fallback
    }
  };

  const handleLayerToggle = (key: string) => {
    const next = activeLayers.includes(key)
      ? activeLayers.filter((k) => k !== key)
      : [...activeLayers, key];
    useMapStore.getState().setLayers(next);
    mapRef.current?.setLayers(next);
  };

  const recenterVessel = () => {
    mapRef.current?.focus(vesselLat, vesselLon, 9);
    mapRef.current?.setVessel(vesselLat, vesselLon);
  };

  const handleFocusHotspot = (spot: typeof DEMO_HOTSPOTS[0]) => {
    setSelectedHotspot(spot);
    mapRef.current?.focus(spot.lat, spot.lon, 10);
  };

  const handleRouteToHotspot = async (spot: typeof DEMO_HOTSPOTS[0]) => {
    try {
      const res = await routeApi.getRoute({
        start: { lat: vesselLat, lon: vesselLon },
        goal: { lat: spot.lat, lon: spot.lon },
        boat_class: 'small',
      });
      handleRouteDrawn(
        res.route,
        [
          { lat: vesselLat, lon: vesselLon },
          { lat: spot.lat, lon: spot.lon },
        ],
        res
      );
    } catch (e) {
      setPlannerOpen(true);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>🗺️</Text>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Ocean Navigator
            </Text>
            {/* Quick Port Selector Pill */}
            <PressableScale
              style={styles.locationPill}
              onPress={() => setIsLocationModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Change harbor port"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.locationPillText} numberOfLines={1}>
                📍 {lastLocationHint?.name || 'Kakinada'} ▾
              </Text>
            </PressableScale>
          </View>
        </View>

        {/* Info / Help Button */}
        <PressableScale
          style={styles.infoBtn}
          onPress={() => setIsInfoModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Map Guide and Legend"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.infoBtnText}>ℹ️</Text>
        </PressableScale>
      </View>

      {/* Main Map Container */}
      <View style={styles.mapWrap}>
        <LeafletMapView
          ref={mapRef}
          centerLat={center.lat}
          centerLon={center.lon}
          zoom={zoom}
          onMapMoved={(c) => {
            // Update zoom level without resetting center (allows free pan everywhere)
            setZoom(c.zoom);
          }}
          onReady={handleReady}
        />
      </View>

      {/* Layer Selection Chips (Scrollable Horizontal) */}
      <View style={styles.layerBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.layerBarContent}
        >
          {LAYER_OPTIONS.map((opt) => {
            const active = activeLayers.includes(opt.key);
            return (
              <PressableScale key={opt.key} onPress={() => handleLayerToggle(opt.key)}>
                <AnimatedPill
                  colorOn="rgba(14, 116, 144, 0.92)"
                  colorOff="rgba(15, 23, 42, 0.88)"
                  active={active}
                >
                  <Text style={[styles.layerChipText, { color: active ? '#38BDF8' : colors.textMuted }]}>
                    {active ? '✓ ' : ''}{opt.label}
                  </Text>
                </AnimatedPill>
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>

      {/* Scenario Route Presets Bar (Instant One-Tap Testing) */}
      <View style={styles.presetsBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsBarContent}
        >
          <View style={styles.presetTag}>
            <Text style={styles.presetTagText}>⚡ TEST ROUTES:</Text>
          </View>
          {MAP_ROUTE_PRESETS.map((preset) => (
            <PressableScale
              key={preset.id}
              style={styles.presetRouteChip}
              onPress={() => handleRunPresetRoute(preset)}
            >
              <Text style={styles.presetRouteChipText}>
                {preset.icon} {preset.title}
              </Text>
            </PressableScale>
          ))}
        </ScrollView>
      </View>

      {/* Interactive Map Navigation Controls (Zoom In, Zoom Out, 4-Way Directional D-Pad & Recenter) */}
      <View style={styles.mapControlsDock}>
        {/* Zoom In & Out */}
        <View style={styles.zoomButtonGroup}>
          <TouchableOpacity
            style={styles.mapCtrlBtn}
            onPress={() => mapRef.current?.zoomIn()}
            accessibilityLabel="Zoom in"
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={styles.mapCtrlText}>＋</Text>
          </TouchableOpacity>
          <View style={styles.mapCtrlDivider} />
          <TouchableOpacity
            style={styles.mapCtrlBtn}
            onPress={() => mapRef.current?.zoomOut()}
            accessibilityLabel="Zoom out"
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={styles.mapCtrlText}>－</Text>
          </TouchableOpacity>
        </View>

        {/* 4-Way Directional Pan D-Pad */}
        <View style={styles.dpadGroup}>
          <TouchableOpacity
            style={[styles.dpadBtn, styles.dpadNorth]}
            onPress={() => mapRef.current?.pan('north')}
            accessibilityLabel="Pan North (Up)"
          >
            <Text style={styles.dpadArrow}>▲</Text>
          </TouchableOpacity>

          <View style={styles.dpadMiddleRow}>
            <TouchableOpacity
              style={[styles.dpadBtn, styles.dpadWest]}
              onPress={() => mapRef.current?.pan('west')}
              accessibilityLabel="Pan West (Left)"
            >
              <Text style={styles.dpadArrow}>◀</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dpadCenter}
              onPress={recenterVessel}
              accessibilityLabel="Recenter vessel position"
            >
              <Text style={styles.dpadCenterIcon}>⌖</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dpadBtn, styles.dpadEast]}
              onPress={() => mapRef.current?.pan('east')}
              accessibilityLabel="Pan East (Right)"
            >
              <Text style={styles.dpadArrow}>▶</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.dpadBtn, styles.dpadSouth]}
            onPress={() => mapRef.current?.pan('south')}
            accessibilityLabel="Pan South (Down)"
          >
            <Text style={styles.dpadArrow}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Selected Hotspot Floating Card */}
      {selectedHotspot && !oceanOpen && (
        <FadeInUpView style={styles.hotspotCard}>
          <View style={styles.hotspotHeader}>
            <View style={styles.hotspotTitleRow}>
              <Text style={styles.hotspotEmoji}>🐟</Text>
              <View>
                <Text style={styles.hotspotName}>{selectedHotspot.name}</Text>
                <Text style={styles.hotspotCoords}>
                  {selectedHotspot.lat.toFixed(2)}°N, {selectedHotspot.lon.toFixed(2)}°E · {selectedHotspot.dist_nm} nm offshore
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setSelectedHotspot(null)} hitSlop={10}>
              <Text style={styles.hotspotClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.hotspotMetaGrid}>
            <View style={styles.hotspotMetaItem}>
              <Text style={styles.hotspotMetaLabel}>Target Catch</Text>
              <Text style={styles.hotspotMetaVal}>{selectedHotspot.species}</Text>
            </View>
            <View style={styles.hotspotMetaItem}>
              <Text style={styles.hotspotMetaLabel}>Water Temp</Text>
              <Text style={styles.hotspotMetaVal}>{selectedHotspot.sst}°C</Text>
            </View>
            <View style={styles.hotspotMetaItem}>
              <Text style={styles.hotspotMetaLabel}>Chlorophyll</Text>
              <Text style={styles.hotspotMetaVal}>{selectedHotspot.chl} mg/m³</Text>
            </View>
          </View>

          <PressableScale
            style={styles.routeToSpotBtn}
            onPress={() => handleRouteToHotspot(selectedHotspot)}
          >
            <Text style={styles.routeToSpotBtnText}>🧭 Plot Safe Route to This Hotspot</Text>
          </PressableScale>
        </FadeInUpView>
      )}

      {/* Floating Bottom Quick Action Dock */}
      <View style={styles.bottomDock}>
        <PressableScale
          style={[styles.actionBtn, plannerOpen && styles.actionBtnActive]}
          onPress={() => {
            setPlannerOpen((v) => !v);
            setOceanOpen(false);
          }}
        >
          <Text style={styles.actionIcon}>🧭</Text>
          <Text style={styles.actionText}>
            {routeSummary ? `${routeSummary.distance_nm} nm` : 'Route'}
          </Text>
        </PressableScale>

        <PressableScale
          style={[styles.actionBtn, oceanOpen && styles.actionBtnActive]}
          onPress={() => {
            setOceanOpen((v) => !v);
            setPlannerOpen(false);
          }}
        >
          <Text style={styles.actionIcon}>🌊</Text>
          <Text style={styles.actionText}>Sea State</Text>
        </PressableScale>

        <PressableScale
          style={styles.actionBtn}
          onPress={() => handleFocusHotspot(DEMO_HOTSPOTS[0])}
        >
          <Text style={styles.actionIcon}>🎯</Text>
          <Text style={styles.actionText}>Nearest PFZ</Text>
        </PressableScale>
      </View>

      {/* Live Ocean Sensors Panel */}
      {oceanOpen && (
        <FadeInUpView style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>🌊 Live Ocean Observations</Text>
            <TouchableOpacity onPress={() => setOceanOpen(false)} hitSlop={12}>
              <Text style={styles.panelClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <OceanStatePanel lat={center.lat} lon={center.lon} role={role} />
        </FadeInUpView>
      )}

      {/* Route Planner Drawer */}
      {plannerOpen && (
        <RoutePlannerSheet
          onRouteDrawn={handleRouteDrawn}
          onClose={() => setPlannerOpen(false)}
        />
      )}

      {/* Location Selector Modal */}
      <LocationPickerModal
        visible={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />

      {/* Page Info / Guide Modal */}
      <PageInfoModal
        visible={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        icon="🗺️"
        title="Ocean Navigator & GIS"
        subtitle="Live Maritime Maps & A* Safe Routing"
        whatIsIt="An interactive geospatial map providing real-time satellite oceanographic layers, Potential Fishing Zone (PFZ) hotspots, and obstacle-avoiding navigation."
        howToUse={[
          'Tap the layer chips at the top to toggle Fish Zones (🐟), Protected Boundaries (🛡️), or Sea Temperature (🌊).',
          'Use the on-screen navigation buttons (+ / - to Zoom, D-Pad ▲ ▼ ◀ ▶ to Pan in any direction, or ⌖ to Recenter).',
          'Explore freely by dragging the map anywhere in the Indian Ocean without losing your position.',
          'Tap any test route in the "⚡ TEST ROUTES" bar to instantly plot obstacle-free maritime routes.',
          'Tap "🌊 Sea State" to inspect live wave height, wind speeds, and water temperature from INCOIS & Copernicus.',
        ]}
        features={[
          {
            icon: '🐟',
            title: 'Potential Fishing Zones (PFZ)',
            description: 'INCOIS satellite thermal fronts where pelagic fish (Tuna, Mackerel) congregate for higher catch efficiency.',
          },
          {
            icon: '🛡️',
            title: 'Geofencing & IMBL Boundaries',
            description: 'Live boundary overlays protecting vessels from entering Coringa Wildlife Sanctuary (MPA) or straying near the International Maritime Boundary Line.',
          },
          {
            icon: '🧭',
            title: 'A* Safe Pathfinding',
            description: 'Calculates shortest navigable marine paths with obstacle avoidance and safety buffers.',
          },
        ]}
        legends={[
          { badge: 'Teal Line', badgeBg: '#2DD4BF', badgeColor: '#031024', label: 'A* Safe Navigation Path (Obstacle Free)' },
          { badge: 'Red Line', badgeBg: '#EF4444', badgeColor: '#FFFFFF', label: 'Naive Straight Line (Passes through hazards)' },
          { badge: 'Yellow Pin', badgeBg: '#F59E0B', badgeColor: '#031024', label: 'INCOIS Potential Fishing Hotspot' },
          { badge: 'Red Zone', badgeBg: 'rgba(239,68,68,0.3)', badgeColor: '#EF4444', label: 'IMBL International Boundary Buffer' },
          { badge: 'Orange Zone', badgeBg: 'rgba(245,158,11,0.3)', badgeColor: '#F59E0B', label: 'Marine Protected Area (Coringa Sanctuary)' },
        ]}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: 'rgba(11, 25, 44, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    ...typography.section,
    color: colors.text,
    fontSize: 16,
    lineHeight: 20,
  },
  locationPill: {
    backgroundColor: 'rgba(14, 116, 144, 0.28)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  locationPillText: {
    fontSize: 11,
    color: colors.aqua,
    fontWeight: '700',
  },
  infoBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBtnText: {
    fontSize: 17,
  },
  mapWrap: {
    flex: 1,
  },
  layerBarWrapper: {
    position: 'absolute',
    top: spacing.lg + 52,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  layerBarContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  layerChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  presetsBarWrapper: {
    position: 'absolute',
    top: spacing.lg + 92,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  presetsBarContent: {
    paddingHorizontal: spacing.md,
    gap: 6,
    alignItems: 'center',
  },
  presetTag: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  presetTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.aqua,
    letterSpacing: 0.5,
  },
  presetRouteChip: {
    backgroundColor: 'rgba(30, 41, 59, 0.92)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    ...shadow.md,
  },
  presetRouteChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  mapControlsDock: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.lg + 138,
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 6,
  },
  zoomButtonGroup: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    overflow: 'hidden',
    ...shadow.md,
  },
  mapCtrlBtn: {
    width: 40,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCtrlText: {
    color: colors.aqua,
    fontSize: 20,
    fontWeight: '900',
  },
  mapCtrlDivider: {
    height: 1,
    backgroundColor: 'rgba(51, 65, 85, 0.6)',
  },
  dpadGroup: {
    width: 88,
    height: 88,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 44,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 2,
    ...shadow.md,
  },
  dpadMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 2,
  },
  dpadBtn: {
    width: 26,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
  },
  dpadNorth: {
    marginTop: 1,
  },
  dpadSouth: {
    marginBottom: 1,
  },
  dpadWest: {},
  dpadEast: {},
  dpadArrow: {
    color: colors.aqua,
    fontSize: 12,
    fontWeight: '900',
  },
  dpadCenter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadCenterIcon: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  hotspotCard: {
    position: 'absolute',
    bottom: 84,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    padding: spacing.md,
    zIndex: 6,
    ...shadow.md,
  },
  hotspotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  hotspotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  hotspotEmoji: {
    fontSize: 22,
  },
  hotspotName: {
    ...typography.bodyStrong,
    color: colors.text,
    fontSize: 14,
  },
  hotspotCoords: {
    fontSize: 11,
    color: colors.textMuted,
  },
  hotspotClose: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
    padding: 2,
  },
  hotspotMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.xs,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: radius.sm,
    padding: 8,
  },
  hotspotMetaItem: {
    flex: 1,
  },
  hotspotMetaLabel: {
    fontSize: 10,
    color: colors.textFaint,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  hotspotMetaVal: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '700',
    marginTop: 2,
  },
  routeToSpotBtn: {
    backgroundColor: colors.accentDeep,
    borderRadius: radius.pill,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  routeToSpotBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  bottomDock: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    zIndex: 5,
  },
  actionBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.md,
  },
  actionBtnActive: {
    borderColor: colors.aqua,
    backgroundColor: 'rgba(14, 116, 144, 0.95)',
  },
  actionIcon: {
    fontSize: 14,
  },
  actionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  panel: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 78,
    zIndex: 6,
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
    fontSize: 14,
  },
  panelClose: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
  },
});