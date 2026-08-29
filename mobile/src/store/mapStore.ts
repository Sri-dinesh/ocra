import { create } from 'zustand';
import { LatLonPoint } from '../types/contract';

interface MapState {
  center: LatLonPoint;
  zoom: number;
  activeLayers: string[];
  pfzMarkers: LatLonPoint[];
  currentRoute: LatLonPoint[];
  setCenter: (center: LatLonPoint) => void;
  setLayers: (layers: string[]) => void;
  setRoute: (route: LatLonPoint[]) => void;
}

export const useMapStore = create<MapState>((set) => ({
  center: { lat: 16.9891, lon: 82.2475 },
  zoom: 8,
  activeLayers: ['pfz', 'sst_heatmap', 'geofence'],
  pfzMarkers: [
    { lat: 16.9891, lon: 82.2475 },
    { lat: 17.15, lon: 82.45 },
  ],
  currentRoute: [],
  setCenter: (center) => set({ center }),
  setLayers: (activeLayers) => set({ activeLayers }),
  setRoute: (currentRoute) => set({ currentRoute }),
}));
