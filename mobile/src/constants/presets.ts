import { LocationHint } from '../types/contract';
import { UserRole } from '../store/settingsStore';

export interface QueryPresetItem {
  text: string;
  subtitle?: string;
  category: string;
  icon: string;
}

export interface QueryCategory {
  id: string;
  label: string;
  icon: string;
}

export const QUERY_CATEGORIES: QueryCategory[] = [
  { id: 'all', label: 'All Presets', icon: '⭐' },
  { id: 'safety', label: 'Sail Clearance', icon: '⛵' },
  { id: 'fishing', label: 'Fish Zones (PFZ)', icon: '🎣' },
  { id: 'geofence', label: 'IMBL & MPAs', icon: '🛡️' },
  { id: 'science', label: 'Ocean Analytics', icon: '🔬' },
  { id: 'indic', label: 'Regional (తెలుగు / தமிழ் / हिन्दी)', icon: '🇮🇳' },
];

export const QUERY_PRESETS: QueryPresetItem[] = [
  // Sail Clearance & Safety
  {
    category: 'safety',
    icon: '⛵',
    text: 'Can I go fishing tomorrow morning near Kakinada?',
    subtitle: 'Deterministic sail clearance guardrail',
  },
  {
    category: 'safety',
    icon: '🌊',
    text: 'What are the current wave height and wind speed at my location?',
    subtitle: 'Real-time INCOIS ocean state telemetry',
  },
  {
    category: 'safety',
    icon: '🌀',
    text: 'Is there any cyclone warning or gale alert for the coast tonight?',
    subtitle: 'IMD storm bulletin & squall warning',
  },
  {
    category: 'safety',
    icon: '🚤',
    text: 'Is it safe for a small motorized boat in these swells?',
    subtitle: 'Vessel-class vulnerability evaluation',
  },

  // Potential Fishing Zones
  {
    category: 'fishing',
    icon: '🎣',
    text: 'Where are the highest potential fishing zones near Kakinada today?',
    subtitle: 'INCOIS PFZ thermal fronts & chlorophyll',
  },
  {
    category: 'fishing',
    icon: '🌡️',
    text: 'What is the chlorophyll concentration and water temperature at my location?',
    subtitle: 'Copernicus CMEMS & ISRO OceanSat',
  },
  {
    category: 'fishing',
    icon: '🧭',
    text: 'Plot the safest route to the fishing grounds 25 nm east.',
    subtitle: 'A* Obstacle-avoiding navigational route',
  },
  {
    category: 'fishing',
    icon: '🐟',
    text: 'Which pelagic fish species are expected near the Godavari plume?',
    subtitle: 'Species suitability & water clarity',
  },

  // IMBL & Geofencing
  {
    category: 'geofence',
    icon: '🛡️',
    text: 'Which fishing zones should be avoided due to geofencing restrictions?',
    subtitle: 'Coringa Sanctuary & IMBL boundary check',
  },
  {
    category: 'geofence',
    icon: '⚡',
    text: 'How far am I from the International Maritime Boundary Line (IMBL)?',
    subtitle: '5nm safety perimeter verification',
  },
  {
    category: 'geofence',
    icon: '🦺',
    text: 'Can I pass through the Coringa Wildlife Sanctuary buffer zone?',
    subtitle: 'Marine protected area compliance',
  },

  // Ocean Analytics
  {
    category: 'science',
    icon: '🔬',
    text: 'Why has fish productivity declined in this coastal region over the last month?',
    subtitle: 'Multi-week upwelling & SST thermal anomaly',
  },
  {
    category: 'science',
    icon: '📊',
    text: 'What is the current thermocline depth and salinity near Visakhapatnam?',
    subtitle: 'NOAA ERDDAP depth profile data',
  },
  {
    category: 'science',
    icon: '🌡️',
    text: 'Are there any marine heatwave anomalies detected in the Bay of Bengal?',
    subtitle: 'Copernicus sea surface temperature anomaly',
  },

  // Regional Indian Languages
  {
    category: 'indic',
    icon: '🇮🇳',
    text: 'వాతావరణం మరియు సముద్ర పరిస్థితులను పరిగణనలోకి తీసుకుని, చేపల వేట నౌకకు అత్యంత సురక్షితమైన మార్గం ఏది?',
    subtitle: 'తెలుగు (Telugu - Safe Route)',
  },
  {
    category: 'indic',
    icon: '🇮🇳',
    text: 'కాకినాడ సమీపంలో రేపు ఉదయం చేపల వేటకు వెళ్లడం సురక్షితమేనా?',
    subtitle: 'తెలుగు (Telugu - Sail Clearance)',
  },
  {
    category: 'indic',
    icon: '🇮🇳',
    text: 'காக்கிநாடா அருகே நாளை காலை மீன்பிடிக்க செல்வது பாதுகாப்பானதா?',
    subtitle: 'தமிழ் (Tamil - Sail Clearance)',
  },
  {
    category: 'indic',
    icon: '🇮🇳',
    text: 'கடலில் தற்போதைய அலை உயரம் மற்றும் காற்றின் வேகம் என்ன?',
    subtitle: 'தமிழ் (Tamil - Wave & Wind)',
  },
  {
    category: 'indic',
    icon: '🇮🇳',
    text: 'क्या कल सुबह काकीनाडा के पास मछली पकड़ने जाना सुरक्षित है?',
    subtitle: 'हिन्दी (Hindi - Sail Clearance)',
  },
  {
    category: 'indic',
    icon: '🇮🇳',
    text: 'वर्तमान लहर की ऊंचाई और हवा की गति क्या है?',
    subtitle: 'हिन्दी (Hindi - Wave & Wind)',
  },
];

// Quick follow-up query suggestions shown when chatting
export const QUICK_FOLLOW_UPS = [
  'What about tomorrow morning?',
  'Is it safe for a small craft?',
  'Plot the safest route there',
  'Show the satellite evidence',
  'Check cyclone warnings',
];

// Map Route Presets
export interface MapRoutePreset {
  id: string;
  title: string;
  description: string;
  icon: string;
  start: LocationHint;
  goal: LocationHint;
}

export const MAP_ROUTE_PRESETS: MapRoutePreset[] = [
  {
    id: 'kakinada-pfz',
    title: 'Kakinada ➔ Tuna Front',
    description: 'Direct to INCOIS Potential Fishing Zone (8.5 nm)',
    icon: '🐟',
    start: { lat: 16.9891, lon: 82.2475, name: 'Kakinada Harbor' },
    goal: { lat: 17.11, lon: 82.35, name: 'Offshore Front PFZ' },
  },
  {
    id: 'coringa-avoidance',
    title: 'Coringa MPA Avoidance',
    description: 'Safe detour bypassing Coringa Wildlife Sanctuary',
    icon: '🛡️',
    start: { lat: 16.95, lon: 82.22, name: 'Kakinada Anchorage' },
    goal: { lat: 16.80, lon: 82.48, name: 'Godavari Estuary' },
  },
  {
    id: 'vizag-trench',
    title: 'Vizag ➔ Deep Sea Trench',
    description: 'Pelagic fishery route offshore Visakhapatnam (18 nm)',
    icon: '🌊',
    start: { lat: 17.6868, lon: 83.2185, name: 'Visakhapatnam Port' },
    goal: { lat: 17.85, lon: 83.48, name: 'Deep Sea Thermal Edge' },
  },
  {
    id: 'imbl-bypass',
    title: 'Palk Bay ➔ IMBL Buffer',
    description: 'Maintains 5.0nm buffer from international boundary',
    icon: '⚡',
    start: { lat: 9.2876, lon: 79.3129, name: 'Rameswaram' },
    goal: { lat: 9.42, lon: 79.18, name: 'Safe Coastal Zone' },
  },
];

// Profile Personas Presets
export interface PersonaPreset {
  id: string;
  role: UserRole;
  title: string;
  subtitle: string;
  icon: string;
  language: string;
  location: LocationHint;
  autoVoice: boolean;
}

export const PERSONA_PRESETS: PersonaPreset[] = [
  {
    id: 'fisherman-telugu',
    role: 'fisherman',
    title: 'Coastal Fisherman (Kakinada)',
    subtitle: 'తెలుగు · Small Craft · Auto Voice ON · Kakinada',
    icon: '🎣',
    language: 'te-IN',
    location: { lat: 16.9891, lon: 82.2475, name: 'Kakinada' },
    autoVoice: true,
  },
  {
    id: 'researcher-vizag',
    role: 'researcher',
    title: 'Ocean Scientist (ISRO / INCOIS)',
    subtitle: 'English · Research Vessel · Deep Analytics · Vizag',
    icon: '🔬',
    language: 'en-IN',
    location: { lat: 17.6868, lon: 83.2185, name: 'Visakhapatnam' },
    autoVoice: false,
  },
  {
    id: 'coastguard-chennai',
    role: 'coast_guard',
    title: 'Coast Guard Safety Patrol',
    subtitle: 'English / Tamil · Fast Patrol · IMBL Shield · Chennai',
    icon: '🛡️',
    language: 'en-IN',
    location: { lat: 13.0827, lon: 80.2707, name: 'Chennai' },
    autoVoice: true,
  },
];
