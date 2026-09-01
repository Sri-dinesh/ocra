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
  const [activeTab, setActiveTab] = useState<'search' | 'map'>('search');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom coordinates input state
  const [customName, setCustomName] = useState('');
  const [customLat, setCustomLat] = useState('');
  const [customLon, setCustomLon] = useState('');

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
    if (isNaN(lat) || isNaN(lon)) return;

    const customLoc: LocationHint = {
      lat,
      lon,
      name: customName.trim() || `Custom GPS (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
    };
    setLastLocationHint(customLoc);
    onClose();
  };

  const handleConfirmMapLocation = () => {
    const mapLoc: LocationHint = {
      lat: parseFloat(mapPoint.lat.toFixed(4)),
      lon: parseFloat(mapPoint.lon.toFixed(4)),
      name: `Selected Marine Sector (${mapPoint.lat.toFixed(2)}°N, ${mapPoint.lon.toFixed(2)}°E)`,
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
                🔍 Search Coastal Ports
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'map' && styles.tabBtnActive]}
              onPress={() => setActiveTab('map')}
            >
              <Text style={[styles.tabText, activeTab === 'map' && styles.tabTextActive]}>
                🗺️ Pick from Map
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'search' ? (
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
    ...typography.section,
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  headerCurrentLoc: {
    fontSize: 12,
    color: colors.aqua,
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    padding: 3,
    marginBottom: spacing.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  tabBtnActive: {
    backgroundColor: colors.accentDeep,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.text,
  },
  tabContent: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
  portsList: {
    paddingBottom: spacing.xxl,
  },
  portItemWrapper: {
    marginBottom: spacing.xs,
  },
  portCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  portCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.cardSelected,
  },
  portInfo: {
    flex: 1,
  },
  portHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  portPinIcon: {
    fontSize: 14,
  },
  portName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  portNameSelected: {
    color: colors.accent,
  },
  portSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  portCoords: {
    fontSize: 11,
    color: colors.aqua,
    fontWeight: '600',
  },
  activeBadge: {
    backgroundColor: colors.accentDeep,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 0.5,
  },
  customCoordsBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  customCoordsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  customInput: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  coordsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  coordField: {
    flex: 1,
  },
  applyCoordsBtn: {
    backgroundColor: colors.accentDeep,
    borderRadius: radius.sm,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  applyCoordsBtnDisabled: {
    backgroundColor: colors.borderSubtle,
    opacity: 0.5,
  },
  applyCoordsText: {
    color: colors.text,
    fontSize: 13,
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
