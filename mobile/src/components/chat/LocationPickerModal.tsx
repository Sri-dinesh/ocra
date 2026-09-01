import React, { useState, useMemo, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useChatStore } from '../../store/chatStore';
import { COASTAL_PORTS, CoastalPort } from '../../constants/coastalPorts';
import { LocationHint } from '../../types/contract';
import { LeafletMapView, LeafletMapHandle } from '../map/LeafletMapView';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { PressableScale, FadeInDownView } from '../ui/anim';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function LocationPickerModal({ visible, onClose }: Props) {
  const { lastLocationHint, setLastLocationHint } = useChatStore();
  const [activeTab, setActiveTab] = useState<'search' | 'coords' | 'map'>('search');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom coordinates input state
  const [customName, setCustomName] = useState('');
  const [customLat, setCustomLat] = useState(
    lastLocationHint?.lat ? String(lastLocationHint.lat) : '16.9891'
  );
  const [customLon, setCustomLon] = useState(
    lastLocationHint?.lon ? String(lastLocationHint.lon) : '82.2475'
  );

  // Map pin state
  const [mapPoint, setMapPoint] = useState<{ lat: number; lon: number }>({
    lat: lastLocationHint?.lat || 16.9891,
    lon: lastLocationHint?.lon || 82.2475,
  });

  const mapRef = useRef<LeafletMapHandle>(null);

  const filteredPorts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return COASTAL_PORTS;
    return COASTAL_PORTS.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelectPort = (port: LocationHint) => {
    setLastLocationHint(port);
    onClose();
  };

  const handleApplyCustomCoords = () => {
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return;

    const customLoc: LocationHint = {
      lat: parseFloat(lat.toFixed(4)),
      lon: parseFloat(lon.toFixed(4)),
      name: customName.trim() || `GPS (${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E)`,
    };
    setLastLocationHint(customLoc);
    onClose();
  };

  const handleConfirmMapLocation = () => {
    const mapLoc: LocationHint = {
      lat: parseFloat(mapPoint.lat.toFixed(4)),
      lon: parseFloat(mapPoint.lon.toFixed(4)),
      name: `Selected Sector (${mapPoint.lat.toFixed(2)}°N, ${mapPoint.lon.toFixed(2)}°E)`,
    };
    setLastLocationHint(mapLoc);
    onClose();
  };

  const renderPortItem = ({ item, index }: { item: CoastalPort; index: number }) => {
    const isSelected =
      Math.abs(item.lat - (lastLocationHint?.lat || 0)) < 0.01 &&
      Math.abs(item.lon - (lastLocationHint?.lon || 0)) < 0.01;

    return (
      <FadeInDownView delay={index * 25} style={styles.portItemWrapper}>
        <PressableScale
          style={[styles.portCard, isSelected && styles.portCardSelected]}
          onPress={() => handleSelectPort(item)}
          accessibilityRole="button"
        >
          <View style={styles.portInfo}>
            <View style={styles.portHeaderRow}>
              <Text style={styles.portPinIcon}>{isSelected ? '📍' : '⚓'}</Text>
              <Text style={[styles.portName, isSelected && styles.portNameSelected]}>
                {item.name}
              </Text>
            </View>
            <Text style={styles.portSub}>{item.state} • {item.region}</Text>
            <Text style={styles.portCoords}>
              {item.lat.toFixed(4)}° N, {item.lon.toFixed(4)}° E
            </Text>
          </View>

          {isSelected && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>ACTIVE</Text>
            </View>
          )}
        </PressableScale>
      </FadeInDownView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerIcon}>📍</Text>
              <View>
                <Text style={styles.headerTitle}>Operating Location</Text>
                <Text style={styles.headerCurrentLoc} numberOfLines={1}>
                  Current: {lastLocationHint?.name || 'Kakinada'} ({lastLocationHint?.lat.toFixed(2)}, {lastLocationHint?.lon.toFixed(2)})
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'search' && styles.tabBtnActive]}
              onPress={() => setActiveTab('search')}
            >
              <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>
                🔍 Ports
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'coords' && styles.tabBtnActive]}
              onPress={() => setActiveTab('coords')}
            >
              <Text style={[styles.tabText, activeTab === 'coords' && styles.tabTextActive]}>
                🎯 Enter Lat/Lon
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'map' && styles.tabBtnActive]}
              onPress={() => setActiveTab('map')}
            >
              <Text style={[styles.tabText, activeTab === 'map' && styles.tabTextActive]}>
                🗺️ Pick Map
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'coords' ? (
            <View style={styles.coordsTabContent}>
              <Text style={styles.coordsSectionTitle}>Direct Latitude & Longitude Entry</Text>
              <Text style={styles.coordsSectionSub}>
                Specify exact GPS coordinates for offshore sectors, trawler drift positions, or survey points.
              </Text>

              <View style={styles.coordsForm}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>LOCATION NAME / TAG (OPTIONAL)</Text>
                  <TextInput
                    style={styles.customInput}
                    placeholder="e.g. Tuna Thermal Edge, Drift Point Bravo"
                    placeholderTextColor={colors.textFaint}
                    value={customName}
                    onChangeText={setCustomName}
                  />
                </View>

                <View style={styles.coordsRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>LATITUDE (°N)</Text>
                    <TextInput
                      style={[styles.customInput, styles.coordField]}
                      placeholder="e.g. 16.9891"
                      placeholderTextColor={colors.textFaint}
                      value={customLat}
                      onChangeText={setCustomLat}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>LONGITUDE (°E)</Text>
                    <TextInput
                      style={[styles.customInput, styles.coordField]}
                      placeholder="e.g. 82.2475"
                      placeholderTextColor={colors.textFaint}
                      value={customLon}
                      onChangeText={setCustomLon}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <PressableScale
                  style={[
                    styles.applyCoordsBtn,
                    (!customLat.trim() || !customLon.trim()) && styles.applyCoordsBtnDisabled,
                  ]}
                  disabled={!customLat.trim() || !customLon.trim()}
                  onPress={handleApplyCustomCoords}
                >
                  <Text style={styles.applyCoordsText}>⚓ Set as Operating GPS Location</Text>
                </PressableScale>
              </View>
            </View>
          ) : activeTab === 'search' ? (
            <View style={styles.tabContent}>
              {/* Search Bar */}
              <View style={styles.searchBar}>
                <Text style={styles.searchIcon}>🔎</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Type port or city (e.g., Chennai, Kochi, Vizag)..."
                  placeholderTextColor={colors.textFaint}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                />
              </View>

              {/* Ports List */}
              <FlatList
                data={filteredPorts}
                keyExtractor={(item) => `${item.name}-${item.lat}`}
                renderItem={renderPortItem}
                contentContainerStyle={styles.portsList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListFooterComponent={
                  <View style={styles.customCoordsBox}>
                    <Text style={styles.customCoordsTitle}>Or Enter Custom Coordinates</Text>
                    <TextInput
                      style={styles.customInput}
                      placeholder="Location Name / Label (e.g. Vessel Drift Point)"
                      placeholderTextColor={colors.textFaint}
                      value={customName}
                      onChangeText={setCustomName}
                    />
                    <View style={styles.coordsRow}>
                      <TextInput
                        style={[styles.customInput, styles.coordField]}
                        placeholder="Latitude (e.g. 16.9891)"
                        placeholderTextColor={colors.textFaint}
                        value={customLat}
                        onChangeText={setCustomLat}
                        keyboardType="numeric"
                      />
                      <TextInput
                        style={[styles.customInput, styles.coordField]}
                        placeholder="Longitude (e.g. 82.2475)"
                        placeholderTextColor={colors.textFaint}
                        value={customLon}
                        onChangeText={setCustomLon}
                        keyboardType="numeric"
                      />
                    </View>
                    <PressableScale
                      style={[
                        styles.applyCoordsBtn,
                        (!customLat.trim() || !customLon.trim()) && styles.applyCoordsBtnDisabled,
                      ]}
                      disabled={!customLat.trim() || !customLon.trim()}
                      onPress={handleApplyCustomCoords}
                    >
                      <Text style={styles.applyCoordsText}>Set Custom Coordinates</Text>
                    </PressableScale>
                  </View>
                }
              />
            </View>
          ) : (
            <View style={styles.mapTabContent}>
              <View style={styles.mapWrapper}>
                <LeafletMapView
                  ref={mapRef}
                  centerLat={mapPoint.lat}
                  centerLon={mapPoint.lon}
                  zoom={8}
                  onMapMoved={(c) => setMapPoint({ lat: c.lat, lon: c.lon })}
                />
                {/* Center Crosshair Marker */}
                <View style={styles.crosshairOverlay} pointerEvents="none">
                  <View style={styles.crosshairPin}>
                    <Text style={styles.crosshairIcon}>📍</Text>
                  </View>
                  <View style={styles.crosshairTarget} />
                </View>

                {/* Map Coordinates Floating Badge */}
                <View style={styles.mapCoordsBadge}>
                  <Text style={styles.mapCoordsText}>
                    {mapPoint.lat.toFixed(4)}° N, {mapPoint.lon.toFixed(4)}° E
                  </Text>
                </View>
              </View>

              <PressableScale
                style={styles.confirmMapBtn}
                onPress={handleConfirmMapLocation}
              >
                <Text style={styles.confirmMapBtnText}>Confirm Selected Coordinates</Text>
              </PressableScale>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 12, 24, 0.80)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: '85%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadow.float,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  headerCurrentLoc: {
    fontSize: 13,
    color: colors.aqua,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: radius.xl,
    padding: 6,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radius.lg,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    ...shadow.float,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textFaint,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  portsList: {
    paddingBottom: spacing.xxl,
  },
  portItemWrapper: {
    marginBottom: spacing.md,
  },
  portCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  portCardSelected: {
    borderColor: 'rgba(56, 189, 248, 0.4)',
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
  },
  portInfo: {
    flex: 1,
  },
  portHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 6,
  },
  portPinIcon: {
    fontSize: 16,
  },
  portName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  portNameSelected: {
    color: colors.accent,
  },
  portSub: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4,
  },
  portCoords: {
    fontSize: 12,
    color: colors.aqua,
    fontWeight: '600',
  },
  activeBadge: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  coordsTabContent: {
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  coordsSectionTitle: {
    ...typography.title,
    color: colors.text,
    fontSize: 18,
  },
  coordsSectionSub: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  coordsForm: {
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textFaint,
    letterSpacing: 1,
  },
  customCoordsBox: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  customCoordsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  customInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: spacing.sm,
  },
  coordsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  coordField: {
    flex: 1,
  },
  applyCoordsBtn: {
    backgroundColor: colors.accentDeep,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  applyCoordsBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.5,
  },
  applyCoordsText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  mapTabContent: {
    flex: 1,
  },
  mapWrapper: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    marginBottom: spacing.md,
  },
  crosshairOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairPin: {
    marginBottom: 20,
  },
  crosshairIcon: {
    fontSize: 32,
  },
  crosshairTarget: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: 'rgba(56, 189, 248, 0.4)',
  },
  mapCoordsBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.90)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    ...shadow.card,
  },
  mapCoordsText: {
    color: colors.aqua,
    fontSize: 12,
    fontWeight: '800',
  },
  confirmMapBtn: {
    backgroundColor: colors.accentDeep,
    borderRadius: radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
    ...shadow.float,
  },
  confirmMapBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
});
