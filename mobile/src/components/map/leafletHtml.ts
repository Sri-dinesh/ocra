/**
 * Leaflet maritime map — HTML bundle (Task A4.1).
 * Loaded as a string into react-native-webview; all dynamic behaviour comes in
 * over the postMessage bridge from React Native. Vessel beacon pulses via CSS
 * keyframes (compositor-driven, no JS rAF — refresh-rate friendly).
 */

export interface HtmlOptions {
  lat: number;
  lon: number;
  zoom: number;
}

export function buildLeafletHtml({ lat, lon, zoom }: HtmlOptions): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<title>Sagaradristi Marine Map</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { margin:0; padding:0; width:100%; height:100%; background:#0B192C; }
  .leaflet-container { background:#0B192C; font-family: system-ui, sans-serif; }
  .beacon-wrap { position:relative; width:22px; height:22px; }
  .beacon-core { position:absolute; inset:4px; border-radius:50%; background:#2DD4BF; box-shadow:0 0 12px #2DD4BF; }
  .beacon-ring { position:absolute; inset:0; border-radius:50%; border:2px solid #2DD4BF;
    animation: beacon 2.2s ease-out infinite; }
  @keyframes beacon { 0% { transform:scale(.6); opacity:.9; } 70% { transform:scale(2.1); opacity:0; } 100% { opacity:0; } }
  .pfz-pin { width:0; height:0; border-left:7px solid transparent; border-right:7px solid transparent;
    border-bottom:14px solid #F59E0B; filter: drop-shadow(0 2px 4px rgba(0,0,0,.5)); }
  .pop-label { font-size:11px; font-weight:700; color:#111827; }
  .pop-sub { font-size:10px; color:#374151; }
  .leaflet-popup-content-wrapper, .leaflet-popup-tip { background:#1E293B; color:#F8FAFC; border:1px solid #334155; }
  .leaflet-control-attribution { background:rgba(15,23,42,.6) !important; color:#64748B !important; }
  .legend { position:absolute; bottom:18px; left:12px; z-index:1000; background:rgba(15,23,42,.88);
    border:1px solid #334155; border-radius:10px; padding:8px 10px; font-size:10px; color:#94A3B8; }
  .legend div { display:flex; align-items:center; gap:6px; margin:2px 0; }
  .swatch { width:12px; height:3px; border-radius:2px; display:inline-block; }
</style>
</head>
<body>
<div id="map"></div>
<div class="legend" id="legend">
  <div><span class="swatch" style="background:#2DD4BF"></span>A* safe route</div>
  <div><span class="swatch" style="background:#EF4444"></span>Naive straight line</div>
  <div><span class="swatch" style="background:#F59E0B"></span>PFZ hotspot</div>
  <div><span class="swatch" style="background:rgba(239,68,68,.55)"></span>IMBL exclusion</div>
  <div><span class="swatch" style="background:rgba(245,158,11,.55)"></span>MPA (Coringa)</div>
</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map = L.map('map', { zoomControl: false }).setView([${lat}, ${lon}], ${zoom});

// OpenStreetMap & Esri Ocean free basemaps with automatic fallback
var baseTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Fallback to CARTO / Esri Ocean if tile fails
baseTile.on('tileerror', function() {
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }).addTo(map);
});

// ---- Layer groups ---------------------------------------------------------
var astarLayer = L.layerGroup().addTo(map);
var naiveLayer = L.layerGroup().addTo(map);
var pfzLayer = L.layerGroup().addTo(map);
var imblLayer = L.layerGroup().addTo(map);
var mpaLayer = L.layerGroup().addTo(map);

var LAYER_KEYS = { 'pfz': pfzLayer, 'sst_heatmap': null,
  'geofence': imblLayer, 'route': astarLayer, 'hazards': null };

// ---- Demo geofences (rendered until backend zone geometry is streamed) ----
function buildRect(swLat, swLon, neLat, neLon) {
  return [[swLat, swLon],[neLat, swLon],[neLat, neLon],[swLat, neLon]];
}
var IMBl_POLY = buildRect(16.80, 82.62, 17.25, 82.90);
var MPA_POLY = buildRect(16.85, 82.18, 17.05, 82.42);

function renderGeofences(imbl, mpa) {
  imblLayer.clearLayers();
  mpaLayer.clearLayers();
  var im = imbl || IMBl_POLY;
  var mp = mpa || MPA_POLY;
  L.polygon(im, { color:'#EF4444', weight:2, fillColor:'rgba(239,68,68,.22)', fillOpacity:1 })
    .bindPopup('<b>IMBL Exclusion Band</b><br>Do not cross (demo polygon)').addTo(imblLayer);
  L.polygon(mp, { color:'#F59E0B', weight:2, fillColor:'rgba(245,158,11,.20)', fillOpacity:1 })
    .bindPopup('<b>Coringa Marine Sanctuary (MPA)</b><br>Restricted zone (demo polygon)').addTo(mpaLayer);
}

// ---- PFZ hotspots ---------------------------------------------------------
var PFZ_DEFAULT = [
  { lat: 16.9891, lon: 82.2475, sst: 28.2, chl: 1.4, dist_km: 0 },
  { lat: 17.11, lon: 82.35, sst: 28.4, chl: 1.8, dist_km: 8 },
  { lat: 17.20, lon: 82.52, sst: 28.1, chl: 1.6, dist_km: 14 },
  { lat: 16.87, lon: 82.08, sst: 27.9, chl: 1.2, dist_km: 6 }
];

function renderPfz(points) {
  pfzLayer.clearLayers();
  var pts = (points && points.length) ? points : PFZ_DEFAULT;
  pts.forEach(function (p) {
    var icon = L.divIcon({ className:'', html:'<div class="pfz-pin"></div>', iconSize:[14,14], iconAnchor:[7,14] });
    L.marker([p.lat, p.lon], { icon: icon }).addTo(pfzLayer)
      .bindPopup('<div class="pop-label">🐟 PFZ Hotspot</div>' +
        '<div class="pop-sub">SST ' + (p.sst || '—') + ' °C · Chl ' + (p.chl || '—') + ' mg/m³</div>' +
        '<div class="pop-sub">' + (p.dist_km != null ? (p.dist_km + ' km from vessel') : '') + '</div>');
  });
}

// ---- Routes ---------------------------------------------------------------
function drawRoute(payload) {
  if (!map.hasLayer(astarLayer)) astarLayer.addTo(map);
  if (!map.hasLayer(naiveLayer)) naiveLayer.addTo(map);

  if (payload && payload.type === 'ASTAR') {
    astarLayer.clearLayers();
    if (payload.points && payload.points.length > 1) {
      var pts = payload.points.map(function (p) { return [p.lat, p.lon]; });
      var poly = L.polyline(pts, {
        color: '#2DD4BF',
        weight: 5,
        opacity: 0.95,
        lineJoin: 'round',
        lineCap: 'round'
      }).addTo(astarLayer);
      poly.bindPopup('<b>🧭 A* Safe Navigation Route</b><br>' + pts.length + ' waypoints · Obstacle Free');

      // Add Start & Destination Badges
      var startPt = pts[0];
      var goalPt = pts[pts.length - 1];

      var startIcon = L.divIcon({
        className: '',
        html: '<div style="background:#0F766E;color:#fff;font-size:10px;font-weight:900;padding:3px 7px;border-radius:12px;border:2px solid #2DD4BF;box-shadow:0 3px 8px rgba(0,0,0,0.6);white-space:nowrap;">🚩 DEPARTURE</div>',
        iconSize: [80, 22],
        iconAnchor: [40, 26]
      });
      L.marker(startPt, { icon: startIcon, zIndexOffset: 900 }).addTo(astarLayer);

      var goalIcon = L.divIcon({
        className: '',
        html: '<div style="background:#B45309;color:#fff;font-size:10px;font-weight:900;padding:3px 7px;border-radius:12px;border:2px solid #F59E0B;box-shadow:0 3px 8px rgba(0,0,0,0.6);white-space:nowrap;">🎯 DESTINATION</div>',
        iconSize: [95, 22],
        iconAnchor: [47, 26]
      });
      L.marker(goalPt, { icon: goalIcon, zIndexOffset: 900 }).addTo(astarLayer);

      try {
        var bounds = L.latLngBounds(pts);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12, animate: true });
      } catch (err) {}
    }
  } else if (payload && payload.type === 'NAIVE') {
    naiveLayer.clearLayers();
    if (payload.points && payload.points.length > 1) {
      var pts2 = payload.points.map(function (p) { return [p.lat, p.lon]; });
      L.polyline(pts2, {
        color: '#EF4444',
        weight: 3,
        opacity: 0.8,
        dashArray: '6, 8',
        lineJoin: 'round'
      }).addTo(naiveLayer).bindPopup('<b>⚠️ Naive Straight Line</b><br>Crosses protected/hazardous zones');
    }
  } else {
    astarLayer.clearLayers();
    naiveLayer.clearLayers();
  }
}

// ---- Vessel beacon --------------------------------------------------------
var vesselMarker = null;
function setVessel(vlat, vlon) {
  if (vesselMarker) { map.removeLayer(vesselMarker); }
  var icon = L.divIcon({ className:'', html:'<div class="beacon-wrap"><div class="beacon-ring"></div><div class="beacon-core"></div></div>',
    iconSize:[22,22], iconAnchor:[11,11] });
  vesselMarker = L.marker([vlat, vlon], { icon: icon, zIndexOffset: 1000 }).addTo(map)
    .bindPopup('<b>Your vessel</b><br>Position streamed from GPS');
}

// ---- Layer visibility -----------------------------------------------------
function setLayers(active) {
  var want = active || [];
  var mapping = { 'pfz': pfzLayer, 'geofence': imblLayer, 'imbl': imblLayer, 'mpa': mpaLayer, 'route': astarLayer };
  Object.keys(mapping).forEach(function (k) {
    var layer = mapping[k];
    if (layer) {
      if (want.indexOf(k) >= 0) { if (!map.hasLayer(layer)) layer.addTo(map); }
      else { if (map.hasLayer(layer)) map.removeLayer(layer); }
    }
  });
}

// Expose functions globally on window for direct JS injection
window.map = map;
window.drawRoute = drawRoute;
window.setVessel = setVessel;
window.renderPfz = renderPfz;
window.renderGeofences = renderGeofences;
window.setLayers = setLayers;

// ---- Bridge ---------------------------------------------------------------
function handleMessage(event) {
  try {
    var raw = event.data;
    var d = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!d || !d.type) return;
    switch (d.type) {
      case 'SET_CENTER': map.setView([d.lat, d.lon], d.zoom || map.getZoom()); break;
      case 'FOCUS': map.flyTo([d.lat, d.lon], d.zoom || 9, { duration: 1.0 }); break;
      case 'DRAW_ROUTE': drawRoute(d && d.route ? d.route : null); break;
      case 'SET_PFZ': renderPfz(d.points); break;
      case 'SET_GEOFENCES': renderGeofences(d.imbl, d.mpa); break;
      case 'SET_VESSEL': setVessel(d.lat, d.lon); break;
      case 'SET_LAYERS': setLayers(d.active); break;
      case 'ZOOM_IN': map.zoomIn(1); break;
      case 'ZOOM_OUT': map.zoomOut(1); break;
      case 'PAN':
        var panStep = 200;
        if (d.direction === 'north') map.panBy([0, -panStep], { animate: true });
        else if (d.direction === 'south') map.panBy([0, panStep], { animate: true });
        else if (d.direction === 'east') map.panBy([panStep, 0], { animate: true });
        else if (d.direction === 'west') map.panBy([-panStep, 0], { animate: true });
        break;
    }
  } catch (e) { /* ignore */ }
}

window.addEventListener('message', handleMessage);
document.addEventListener('message', handleMessage);

function send(obj) {
  if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify(obj)); }
}

map.on('moveend', function () {
  var c = map.getCenter();
  send({ type:'MAP_MOVED', lat:c.lat, lon:c.lng, zoom:map.getZoom() });
});

renderGeofences(null, null);
renderPfz(null, null);
L.marker([${lat}, ${lon}]).addTo(map).bindPopup('<b>Departure Harbor Point</b>');
</script>
</body>
</html>`;
}