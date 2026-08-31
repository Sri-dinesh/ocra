import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { buildLeafletHtml } from './leafletHtml';
import { LatLonPoint } from '../../types/contract';

export interface RouteStyle {
  type: 'ASTAR' | 'NAIVE';
  points: LatLonPoint[];
}

export interface LeafletMapHandle {
  setCenter(lat: number, lon: number, zoom?: number): void;
  focus(lat: number, lon: number, zoom?: number): void;
  drawRoute(style: RouteStyle): void;
  clearRoutes(): void;
  setVessel(lat: number, lon: number): void;
  setPfz(points: LatLonPoint[]): void;
  setGeofences(imbl?: LatLonPoint[], mpa?: LatLonPoint[]): void;
  setLayers(active: string[]): void;
}

interface Props {
  centerLat?: number;
  centerLon?: number;
  zoom?: number;
  onMapMoved?: (c: { lat: number; lon: number; zoom: number }) => void;
  onReady?: () => void;
}

const buildGeo = (pts?: LatLonPoint[]) =>
  (pts || []).map((p) => ({ lat: p.lat, lon: p.lon }));

/**
 * WebView + postMessage bridge (Task A4.2). All map mutation happens on the
 * native/HTML side; RN only sends lightweight commands.
 */
export const LeafletMapView = forwardRef<LeafletMapHandle, Props>(
  ({ centerLat = 16.9891, centerLon = 82.2475, zoom = 8, onMapMoved, onReady }, ref) => {
    const webViewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
      setCenter(lat, lon, z) {
        webViewRef.current?.postMessage(JSON.stringify({ type: 'SET_CENTER', lat, lon, zoom: z }));
      },
      focus(lat, lon, z) {
        webViewRef.current?.postMessage(JSON.stringify({ type: 'FOCUS', lat, lon, zoom: z || 9 }));
      },
      drawRoute(style) {
        webViewRef.current?.postMessage(
          JSON.stringify({
            type: 'DRAW_ROUTE',
            route: { type: style.type, points: buildGeo(style.points) },
          }),
        );
      },
      clearRoutes() {
        webViewRef.current?.postMessage(JSON.stringify({ type: 'DRAW_ROUTE' }));
      },
      setVessel(lat, lon) {
        webViewRef.current?.postMessage(JSON.stringify({ type: 'SET_VESSEL', lat, lon }));
      },
      setPfz(points) {
        webViewRef.current?.postMessage(JSON.stringify({ type: 'SET_PFZ', points: buildGeo(points) }));
      },
      setGeofences(imbl, mpa) {
        webViewRef.current?.postMessage(
          JSON.stringify({ type: 'SET_GEOFENCES', imbl: buildGeo(imbl), mpa: buildGeo(mpa) }),
        );
      },
      setLayers(active) {
        webViewRef.current?.postMessage(JSON.stringify({ type: 'SET_LAYERS', active }));
      },
    }));

    const handleMessage = (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'MAP_MOVED') {
          onMapMoved?.({ lat: data.lat, lon: data.lon, zoom: data.zoom });
        }
      } catch {
        /* ignore */
      }
    };

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowsBackForwardNavigationGestures={false}
          source={{ html: buildLeafletHtml({ lat: centerLat, lon: centerLon, zoom }) }}
          style={styles.webview}
          onMessage={handleMessage}
          onLoadEnd={() => onReady?.()}
          startInLoadingState
          setBuiltInZoomControls={false}
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color="#2DD4BF" />
            </View>
          )}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B192C',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B192C',
  },
});