import React, { forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
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
  zoomIn(): void;
  zoomOut(): void;
  pan(direction: 'north' | 'south' | 'east' | 'west'): void;
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
    const initialHtml = useMemo(
      () => buildLeafletHtml({ lat: centerLat, lon: centerLon, zoom }),
      [] // Keep source stable so dragging map never reloads WebView
    );

    useImperativeHandle(ref, () => ({
      setCenter(lat, lon, z) {
        webViewRef.current?.injectJavaScript(`if (window.map) { window.map.setView([${lat}, ${lon}], ${z || 'window.map.getZoom()'}); } true;`);
        webViewRef.current?.postMessage(JSON.stringify({ type: 'SET_CENTER', lat, lon, zoom: z }));
      },
      focus(lat, lon, z) {
        webViewRef.current?.injectJavaScript(`if (window.map) { window.map.flyTo([${lat}, ${lon}], ${z || 9}, { duration: 1.0 }); } true;`);
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
        webViewRef.current?.injectJavaScript(`if (typeof setVessel === 'function') { setVessel(${lat}, ${lon}); } true;`);
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
      zoomIn() {
        webViewRef.current?.injectJavaScript(`if (window.map) { window.map.zoomIn(1); } true;`);
        webViewRef.current?.postMessage(JSON.stringify({ type: 'ZOOM_IN' }));
      },
      zoomOut() {
        webViewRef.current?.injectJavaScript(`if (window.map) { window.map.zoomOut(1); } true;`);
        webViewRef.current?.postMessage(JSON.stringify({ type: 'ZOOM_OUT' }));
      },
      pan(direction) {
        const step = 200;
        const dx = direction === 'east' ? step : direction === 'west' ? -step : 0;
        const dy = direction === 'south' ? step : direction === 'north' ? -step : 0;
        webViewRef.current?.injectJavaScript(`if (window.map) { window.map.panBy([${dx}, ${dy}], { animate: true }); } true;`);
        webViewRef.current?.postMessage(JSON.stringify({ type: 'PAN', direction }));
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
          source={{ html: initialHtml }}
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
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B192C',
  },
});