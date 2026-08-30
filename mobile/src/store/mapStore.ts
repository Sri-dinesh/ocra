import { create } from 'zustand';
import { LatLonPoint } from '../types/contract';

export const LAYER_OPTIONS: { key: string; label: string }[] = [
  { key: 'pfz', label: 'PFZ' },
  { key: 'geofence', label: 'IMBL/MPA' },
  { key: 'route', label: 'Route' },
];

interface MapState {
  center: LatLonPoint;
  zoom: number;
  activeLayers: string[];
  pfzMarkers: LatLonPoint[];
  currentRoute: LatLonPoint[];
  vesselPosition: LatLonPoint;
  setCenter: (center: LatLonPoint) => void;
  setZoom: (zoom: number) => void;
  setLayers: (layers: string[]) => void;
  toggleLayer: (key: string) => void;
  setRoute: (route: LatLonPoint[]) => void;
  setVessel: (position: LatLonPoint) => void;
  setPfz: (points: LatLonPoint[]) => void;
}

export const useMapStore = create<MapState>((set) => ({
  center: { lat: 16.9891, lon: 82.2475 },
  zoom: 8,
  activeLayers: ['pfz', 'geofence', 'route'],
  pfzMarkers: [
    { lat: 16.9891, lon: 82.2475 },
    { lat: 17.11, lon: 82.35 },
    { lat: 17.20, lon: 82.52 },
    { lat: 16.87, lon: 82.08 },
  ],
  currentRoute: [],
  vesselPosition: { lat: 16.9891, lon: 82.2475 },
  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setLayers: (activeLayers) => set({ activeLayers }),
  toggleLayer: (key) =>
    set((s) => ({
      activeLayers: s.activeLayers.includes(key)
        ? s.activeLayers.filter((k) => k !== key)
        : [...s.activeLayers, key],
    })),
  setRoute: (currentRoute) => set({ currentRoute }),
  setVessel: (vesselPosition) => set({ vesselPosition }),
  setPfz: (pfzMarkers) => set({ pfzMarkers }),
}));