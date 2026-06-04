/** Full tab bar surface with a smooth center scoop for the QR action button. */
export function buildTabBarSurfacePath(
  width: number,
  height: number,
  options?: { cornerRadius?: number; notchWidth?: number; notchDepth?: number },
): string {
  const r = options?.cornerRadius ?? 18
  const notchWidth = options?.notchWidth ?? 86
  const depth = options?.notchDepth ?? 20
  const cx = width / 2
  const left = cx - notchWidth / 2
  const right = cx + notchWidth / 2
  const w = width
  const h = height
  const cp = notchWidth * 0.23

  return [
    `M 0 ${h}`,
    'L 0 0',
    `Q 0 0 ${r} 0`,
    `L ${left} 0`,
    `C ${left + cp} 0 ${cx - cp} ${depth} ${cx} ${depth}`,
    `C ${cx + cp} ${depth} ${right - cp} 0 ${right} 0`,
    `L ${w - r} 0`,
    `Q ${w} 0 ${w} ${r}`,
    `L ${w} ${h}`,
    'Z',
  ].join(' ')
}
