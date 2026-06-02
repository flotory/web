export const colors = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  ink: '#0F172A',
  inkMuted: '#64748B',
  inkSoft: '#98A2B3',
  border: '#E2E8F0',
  primary: '#0F172A',
  primarySoft: '#334155',
  primaryText: '#FFFFFF',
  danger: '#F04438',
  dangerSoft: '#FFE4E2',
  successText: '#166534',
  success: '#22C55E',
  successBg: '#ECFDF3',
  successBorder: '#BBF7D0',
  accent: '#D97706',
  accentSoft: '#FCF6E9',
  accentBorder: '#FDE68A',
  lavender: '#EEF2FF',
  lavenderBorder: '#E0E7FF',
  plum: '#1E293B',
  progressTrack: '#E2E8F0',
} as const

export const space = {
  screenX: 18,
  sectionY: 28,
  cardPad: 18,
} as const

export const radius = {
  card: 22,
  button: 999,
  image: 20,
} as const

export const shadows = {
  sm: {
    shadowColor: colors.ink,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  md: {
    shadowColor: colors.ink,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  button: {
    shadowColor: colors.ink,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
} as const

export const type = {
  hero: { fontSize: 34, fontWeight: '800' as const, color: colors.ink, letterSpacing: -0.5 },
  section: { fontSize: 22, fontWeight: '600' as const, color: colors.ink },
  body: { fontSize: 16, color: colors.inkMuted, lineHeight: 22 },
  caption: { fontSize: 13, color: colors.inkSoft },
  label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.6, color: colors.inkSoft },
}
