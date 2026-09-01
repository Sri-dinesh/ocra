import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { PressableScale, FadeInUpView } from '../ui/anim';
import { LatLonPoint, LocationHint } from '../../types/contract';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentLocation?: LocationHint | LatLonPoint;
  onFocusCoordinates: (coords: LatLonPoint, label?: string) => void;
  onSetVesselLocation: (coords: LatLonPoint, label?: string) => void;
  onPlotRouteToCoordinates: (coords: LatLonPoint, label?: string) => void;
}

const QUICK_COORDS = [
  { name: 'Kakinada Harbor', lat: 16.9891, lon: 82.2475, zone: 'Bay of Bengal' },
  { name: 'Godavari Offshore Plume', lat: 16.8500, lon: 82.5500, zone: 'PFZ Thermal Edge' },
  { name: 'Visakhapatnam Deep Sea', lat: 17.6868, lon: 83.2185, zone: 'Continental Shelf' },
  { name: 'Chennai Port Outer', lat: 13.0827, lon: 80.2707, zone: 'Coromandel Coast' },
  { name: 'Palk Bay IMBL Border', lat: 9.3000, lon: 79.2000, zone: 'International Boundary' },
  { name: 'Kochi Deep Channel', lat: 9.9312, lon: 76.2673, zone: 'Arabian Sea' },
  { name: 'Mangalore High Seas', lat: 12.9141, lon: 74.8560, zone: 'Karnataka Coast' },
  { name: 'Andaman Marine Trench', lat: 11.6234, lon: 92.7265, zone: 'Bay of Bengal East' },
];

export function CoordinateInputModal({
  visible,
  onClose,
  currentLocation,
  onFocusCoordinates,
  onSetVesselLocation,
  onPlotRouteToCoordinates,
}: Props) {
  const [latText, setLatText] = useState(
    currentLocation?.lat ? String(currentLocation.lat) : '16.9891'
  );
  const [lonText, setLonText] = useState(
    currentLocation?.lon ? String(currentLocation.lon) : '82.2475'
  );
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const parsedLat = parseFloat(latText);
  const parsedLon = parseFloat(lonText);
  const isValid =
    !isNaN(parsedLat) &&
    !isNaN(parsedLon) &&
    parsedLat >= -90 &&
    parsedLat <= 90 &&
    parsedLon >= -180 &&
    parsedLon <= 180;

  const handleApplyPreset = (item: typeof QUICK_COORDS[0]) => {
    setLatText(String(item.lat));
    setLonText(String(item.lon));
    setLabel(item.name);
    setError(null);
  };

  const handleJump = () => {
    if (!isValid) {
      setError('Please enter valid Latitude (-90 to 90) and Longitude (-180 to 180)');
      return;
    }
    setError(null);
    onFocusCoordinates({ lat: parsedLat, lon: parsedLon }, label.trim() || undefined);
    onClose();
  };

  const handleSetVessel = () => {
    if (!isValid) {
      setError('Please enter valid Latitude (-90 to 90) and Longitude (-180 to 180)');
      return;
    }
    setError(null);
    onSetVesselLocation({ lat: parsedLat, lon: parsedLon }, label.trim() || undefined);
    onClose();
  };

  const handlePlotRoute = () => {
    if (!isValid) {
      setError('Please enter valid Latitude (-90 to 90) and Longitude (-180 to 180)');
      return;
    }
    setError(null);
    onPlotRouteToCoordinates({ lat: parsedLat, lon: parsedLon }, label.trim() || undefined);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <FadeInUpView style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerIcon}>🎯</Text>
              <View>
                <Text style={styles.headerTitle}>Direct GPS Coordinates</Text>
                <Text style={styles.headerSubtitle}>
                  Enter exact Latitude & Longitude decimal values
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

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Optional Location Name Label */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>LOCATION NAME / TAG (OPTIONAL)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Tuna Fishing Point Alpha, Survey Sector 4"
                placeholderTextColor={colors.textFaint}
                value={label}
                onChangeText={setLabel}
              />
            </View>

            {/* Coordinate Inputs (Lat & Lon) */}
            <View style={styles.coordRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>LATITUDE (°N / °S)</Text>
                <TextInput
                  style={[styles.textInput, styles.coordInput]}
                  placeholder="e.g. 16.9891"
                  placeholderTextColor={colors.textFaint}
                  value={latText}
                  onChangeText={(val) => {
                    setLatText(val);
                    setError(null);
                  }}
                  keyboardType="numeric"
                />
                <Text style={styles.coordHint}>Range: -90.0 to +90.0</Text>
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>LONGITUDE (°E / °W)</Text>
                <TextInput
                  style={[styles.textInput, styles.coordInput]}
                  placeholder="e.g. 82.2475"
                  placeholderTextColor={colors.textFaint}
                  value={lonText}
                  onChangeText={(val) => {
                    setLonText(val);
                    setError(null);
                  }}
                  keyboardType="numeric"
                />
                <Text style={styles.coordHint}>Range: -180.0 to +180.0</Text>
              </View>
            </View>

            {/* Formatted Coordinate Preview */}
            {isValid && (
              <View style={styles.previewBox}>
                <Text style={styles.previewIcon}>🌐</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewCoords}>
                    {parsedLat >= 0 ? `${parsedLat.toFixed(4)}°N` : `${Math.abs(parsedLat).toFixed(4)}°S`},{' '}
                    {parsedLon >= 0 ? `${parsedLon.toFixed(4)}°E` : `${Math.abs(parsedLon).toFixed(4)}°W`}
                  </Text>
                  <Text style={styles.previewSub}>
                    {label ? `Label: "${label}"` : 'Decimal Degrees (WGS 84)'}
                  </Text>
                </View>
              </View>
            )}

            {error && <Text style={styles.errorText}>⚠️ {error}</Text>}

            {/* Primary Action Buttons */}
            <View style={styles.actionButtonGroup}>
              <PressableScale style={styles.jumpBtn} onPress={handleJump}>
                <Text style={styles.jumpBtnText}>🎯 Jump & Focus Map</Text>
              </PressableScale>

              <View style={styles.secondaryActionRow}>
                <PressableScale
                  style={[styles.secondaryBtn, { flex: 1 }]}
                  onPress={handleSetVessel}
                >
                  <Text style={styles.secondaryBtnText}>⚓ Set as Vessel GPS</Text>
                </PressableScale>

                <PressableScale
                  style={[styles.secondaryBtn, styles.routeBtn, { flex: 1 }]}
                  onPress={handlePlotRoute}
                >
                  <Text style={[styles.secondaryBtnText, styles.routeBtnText]}>
                    🧭 Plot Safe Route
                  </Text>
                </PressableScale>
              </View>
            </View>

            {/* Quick Maritime Sector Presets */}
            <View style={styles.presetSection}>
              <Text style={styles.presetSectionTitle}>⚡ QUICK MARITIME SECTOR PRESETS</Text>
              <View style={styles.presetGrid}>
                {QUICK_COORDS.map((preset) => (
                  <TouchableOpacity
                    key={preset.name}
                    style={styles.presetChip}
                    onPress={() => handleApplyPreset(preset)}
                  >
                    <Text style={styles.presetChipName}>{preset.name}</Text>
                    <Text style={styles.presetChipCoords}>
                      {preset.lat.toFixed(2)}°N, {preset.lon.toFixed(2)}°E · {preset.zone}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </FadeInUpView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 16, 36, 0.85)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.1)',
    maxHeight: '88%',
    paddingBottom: spacing.xxl,
    ...shadow.float,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
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
  headerSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
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
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textFaint,
    letterSpacing: 1,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  coordRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  coordInput: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.aqua,
  },
  coordHint: {
    fontSize: 10,
    color: colors.textFaint,
    marginTop: 4,
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  previewIcon: {
    fontSize: 22,
  },
  previewCoords: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.aqua,
  },
  previewSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  errorText: {
    color: colors.alertDanger,
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtonGroup: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  jumpBtn: {
    backgroundColor: colors.accentDeep,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
    ...shadow.md,
  },
  jumpBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  routeBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'transparent',
  },
  routeBtnText: {
    color: '#F59E0B',
  },
  presetSection: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  presetSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textFaint,
    letterSpacing: 1,
    marginBottom: 4,
  },
  presetGrid: {
    gap: 8,
  },
  presetChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  presetChipName: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  presetChipCoords: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
});
