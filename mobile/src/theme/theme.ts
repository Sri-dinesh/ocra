/**
 * Sagaradristi — Design Tokens
 * "Ocean at night" canvas. Sourced from the Sagaradristi design system.
 */

export const colors = {
  // Canvas
  bg: '#0A192F',        // deep ocean navy (base canvas)
  surface: '#0F172A',   // header / nav / input bars
  card: '#1E293B',      // raised cards
  cardSelected: '#0F2644',
  border: '#334155',
  borderSubtle: '#1E293B',

  // Accents
  accent: '#38BDF8',    // primary cyan — metadata / navigation / links
  accentDeep: '#0EA5E9',// pressed state / buttons
  aqua: '#2DD4BF',      // WATER DATA — all physical ocean values
  aquaDim: '#14B8A6',

  // Text
  text: '#F8FAFC',
  textSecondary: '#E2E8F0',
  textMuted: '#94A3B8',
  textFaint: '#64748B',

  // User / roles
  userBubble: '#007AFF',
  userBubbleText: '#FFFFFF',

  // Risk bands (low → extreme)
  riskLow: '#10B981',
  riskModerate: '#F59E0B',
  riskHigh: '#F97316',
  riskExtreme: '#EF4444',

  // Watchdog / alerts
  alertDanger: '#EF4444',
  alertDangerBg: '#7F1D1D',
  alertDangerText: '#FEE2E2',
  offlineWarn: '#B45309',
  offlineWarnText: '#FEF3C7',

  // Innovation / glow
  glowAqua: 'rgba(45, 212, 191, 0.35)',
  glowCyan: 'rgba(56, 189, 248, 0.35)',

  // Map accents
  routeAstar: '#2DD4BF',
  routeNaive: '#EF4444',
  imblFill: 'rgba(239, 68, 68, 0.22)',
  mpaFill: 'rgba(245, 158, 11, 0.20)',
  pfzPin: '#F59E0B',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  hero: { fontSize: 30, fontWeight: '800', lineHeight: 38 },
  title: { fontSize: 20, fontWeight: '800', lineHeight: 26 },
  section: { fontSize: 17, fontWeight: '700', lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 21 },
  bodyStrong: { fontSize: 15, fontWeight: '600', lineHeight: 21 },
  caption: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  metric: { fontSize: 24, fontWeight: '800', lineHeight: 28 },
  chip: { fontSize: 12, fontWeight: '700', lineHeight: 16 },
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  float: {
    shadowColor: colors.aqua,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
} as const;

export const brand = {
  name: 'Sagaradristi',
  nameDevanagari: 'सागरदृष्टि',
  tagline: 'Ocean Vision · Collaborative Intelligence',
  waveMark: '◈',
} as const;

export const sourceBadgeColors: Record<string, string> = {
  'INCOIS OSF': colors.accentDeep,
  'Copernicus CMEMS': colors.aqua,
  'NOAA ERDDAP': colors.riskHigh,
  'IMD': colors.accent,
  'OBIS': colors.riskLow,
};