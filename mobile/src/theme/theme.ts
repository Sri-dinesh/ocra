/**
 * Sagaradristi — Design Tokens
 * "Ocean at night" canvas. Sourced from the Sagaradristi design system.
 */

export const colors = {
  // Canvas - sleek neutral dark (Tailwind Slate-950/900)
  bg: '#020617',        // deep sleek dark (base canvas)
  surface: '#0F172A',   // header / nav / input bars (slightly lighter)
  card: '#1E293B',      // raised cards
  cardSelected: '#0F2644', // subtle highlight
  border: 'rgba(255, 255, 255, 0.08)',
  borderSubtle: 'rgba(255, 255, 255, 0.04)',

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
  userBubble: '#0EA5E9',
  userBubbleText: '#FFFFFF',

  // Risk bands (low → extreme)
  riskLow: '#10B981',
  riskModerate: '#F59E0B',
  riskHigh: '#F97316',
  riskExtreme: '#EF4444',

  // Watchdog / alerts - softer background variants
  alertDanger: '#EF4444',
  alertDangerBg: 'rgba(239, 68, 68, 0.1)',
  alertDangerText: '#FEE2E2',
  offlineWarn: '#F59E0B',
  offlineWarnText: '#FEF3C7',

  // Innovation / glow
  glowAqua: 'rgba(45, 212, 191, 0.25)',
  glowCyan: 'rgba(56, 189, 248, 0.25)',

  // Map accents
  routeAstar: '#2DD4BF',
  routeNaive: '#EF4444',
  imblFill: 'rgba(239, 68, 68, 0.15)',
  mpaFill: 'rgba(245, 158, 11, 0.15)',
  pfzPin: '#F59E0B',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  pill: 999,
} as const;

export const typography = {
  hero: { fontSize: 32, fontWeight: '700', lineHeight: 40, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700', lineHeight: 28, letterSpacing: -0.3 },
  section: { fontSize: 18, fontWeight: '600', lineHeight: 24, letterSpacing: -0.2 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyStrong: { fontSize: 16, fontWeight: '500', lineHeight: 24 },
  caption: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  metric: { fontSize: 28, fontWeight: '700', lineHeight: 32, letterSpacing: -0.5 },
  chip: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  float: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
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