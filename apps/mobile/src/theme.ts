export const colors = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  ink: '#0F172A',
  inkMuted: '#64748B',
  inkSoft: '#94A3B8',
  border: '#E2E8F0',
  primary: '#4F46E5',
  primaryText: '#FFFFFF',
  success: '#047857',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',
  accent: '#D97706',
  lavender: '#EEF2FF',
  plum: '#1E293B',
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

export const type = {
  hero: { fontSize: 34, fontWeight: '800' as const, color: colors.ink, letterSpacing: -0.5 },
  section: { fontSize: 22, fontWeight: '600' as const, color: colors.ink },
  body: { fontSize: 16, color: colors.inkMuted, lineHeight: 22 },
  caption: { fontSize: 13, color: colors.inkSoft },
  label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.6, color: colors.inkSoft },
}
