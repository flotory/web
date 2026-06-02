export const colors = {
  bg: '#FAFBFF',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F8FC',
  ink: '#172033',
  inkMuted: '#667085',
  inkSoft: '#98A2B3',
  border: '#E2E8F0',
  primary: '#5B4CF0',
  primaryText: '#FFFFFF',
  danger: '#F04438',
  dangerSoft: '#FFE4E2',
  successText: '#166534',
  success: '#12B76A',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',
  accent: '#F4B942',
  accentSoft: '#FFF8E7',
  accentBorder: '#F6D37B',
  lavender: '#F8F7FF',
  lavenderBorder: '#E8E4FF',
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
