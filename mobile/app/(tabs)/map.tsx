import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { LeafletMapView } from '../../src/components/map/LeafletMapView';
import { useMapStore } from '../../src/store/mapStore';

export default function MapScreen() {
  const { center, activeLayers } = useMapStore();

  return (
    <View style={styles.container}>
      <LeafletMapView centerLat={center.lat} centerLon={center.lon} />

      <View style={styles.layerBar}>
        <Text style={styles.layerTitle}>Layers:</Text>
        {['PFZ Zones', 'SST Heatmap', 'IMBL Boundary'].map((layer, idx) => (
          <View key={idx} style={styles.layerChip}>
            <Text style={styles.layerChipText}>✓ {layer}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A192F',
  },
  layerBar: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  layerTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 6,
  },
  layerChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  layerChipText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
});
