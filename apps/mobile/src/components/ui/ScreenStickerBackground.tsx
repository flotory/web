import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import type { ComponentProps } from 'react'
import { useMemo } from 'react'
import { StyleSheet, View, useWindowDimensions } from 'react-native'

import { colors, screenBackground, screenWallpaperBaseColor } from '../../theme'

type IconName = ComponentProps<typeof Ionicons>['name']
type WallpaperVariant = (typeof screenBackground)['variant']

const STICKERS: readonly { name: IconName; size: number; rotate: number }[] = [
  { name: 'cafe-outline', size: 21, rotate: -14 },
  { name: 'gift-outline', size: 19, rotate: 9 },
  { name: 'star-outline', size: 17, rotate: 16 },
  { name: 'qr-code-outline', size: 20, rotate: -8 },
  { name: 'ticket-outline', size: 18, rotate: 11 },
  { name: 'heart-outline', size: 16, rotate: -12 },
  { name: 'restaurant-outline', size: 19, rotate: 7 },
  { name: 'ice-cream-outline', size: 18, rotate: -10 },
  { name: 'storefront-outline', size: 20, rotate: 13 },
  { name: 'wine-outline', size: 17, rotate: -6 },
  { name: 'sparkles-outline', size: 16, rotate: 10 },
  { name: 'ribbon-outline', size: 17, rotate: -11 },
]

type VariantConfig = {
  baseColor: string
  tileW: number
  tileH: number
  iconColors: readonly string[]
}

const VARIANTS: Record<WallpaperVariant, VariantConfig> = {
  stickers: {
    baseColor: colors.bg,
    tileW: 76,
    tileH: 76,
    iconColors: ['rgba(15, 23, 42, 0.07)'],
  },
  warm: {
    baseColor: screenBackground.warm.base,
    tileW: 88,
    tileH: 88,
    iconColors: [
      screenBackground.warm.iconForest,
      screenBackground.warm.iconClay,
      screenBackground.warm.iconSand,
      screenBackground.warm.iconAmber,
      screenBackground.warm.iconMoss,
    ],
  },
  dots: {
    baseColor: '#F8FAFC',
    tileW: 28,
    tileH: 28,
    iconColors: ['rgba(15, 23, 42, 0.07)'],
  },
}

interface ScreenStickerBackgroundProps {
  minHeight: number
}

const WARM_WATERMARKS: readonly { name: IconName; leftRatio: number; topRatio: number; size: number; rotate: number }[] = [
  { name: 'cafe-outline', leftRatio: 0.08, topRatio: 0.18, size: 72, rotate: -18 },
  { name: 'gift-outline', leftRatio: 0.72, topRatio: 0.42, size: 64, rotate: 12 },
  { name: 'star-outline', leftRatio: 0.38, topRatio: 0.68, size: 56, rotate: 8 },
]

function WarmAmbientLayer({ minHeight, width }: { minHeight: number; width: number }) {
  const blobs = useMemo(
    () => [
      { size: 260, left: width * 0.52, top: minHeight * 0.04, color: screenBackground.warm.blobLight },
      { size: 200, left: -56, top: minHeight * 0.28, color: screenBackground.warm.blobMoss },
      { size: 140, left: width * 0.18, top: minHeight * 0.58, color: screenBackground.warm.blobWarm },
      { size: 100, left: width * 0.78, top: minHeight * 0.72, color: screenBackground.warm.blobWarm },
    ],
    [minHeight, width],
  )

  return (
    <>
      <LinearGradient
        colors={[...screenBackground.warm.wash]}
        locations={[0, 0.25, 0.55, 0.8, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      {blobs.map((blob, index) => (
        <View
          key={`blob-${index}`}
          style={{
            position: 'absolute',
            left: blob.left,
            top: blob.top,
            width: blob.size,
            height: blob.size,
            borderRadius: blob.size / 2,
            backgroundColor: blob.color,
          }}
        />
      ))}
      <LinearGradient
        colors={['transparent', screenBackground.warm.vignette, 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      {WARM_WATERMARKS.map((mark, index) => (
        <View
          key={`wm-${index}`}
          style={{
            position: 'absolute',
            left: width * mark.leftRatio,
            top: minHeight * mark.topRatio,
            transform: [{ rotate: `${mark.rotate}deg` }],
          }}
        >
          <Ionicons name={mark.name} size={mark.size} color="rgba(88, 62, 38, 0.045)" />
        </View>
      ))}
    </>
  )
}

function StickerTiles({
  minHeight,
  variant,
}: {
  minHeight: number
  variant: WallpaperVariant
}) {
  const { width } = useWindowDimensions()
  const config = VARIANTS[variant]
  const { tileW, tileH, iconColors } = config

  const tiles = useMemo(() => {
    const cols = Math.ceil(width / tileW) + 1
    const rows = Math.ceil(minHeight / tileH) + 2
    const items: {
      key: string
      left: number
      top: number
      sticker: (typeof STICKERS)[number]
      color: string
      scale: number
    }[] = []

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const index = (row * cols + col) % STICKERS.length
        const staggerX = row % 2 === 0 ? 8 : tileW * 0.42
        const jitterY = ((row + col) % 4) * 3
        items.push({
          key: `${row}-${col}`,
          left: col * tileW + staggerX,
          top: row * tileH + jitterY,
          sticker: STICKERS[index]!,
          color: iconColors[(row + col) % iconColors.length] ?? iconColors[0]!,
          scale: variant === 'warm' ? 0.92 + (index % 4) * 0.05 : 1,
        })
      }
    }

    return items
  }, [iconColors, minHeight, tileH, tileW, variant, width])

  return (
    <>
      {tiles.map((tile) => (
        <View
          key={tile.key}
          style={{
            position: 'absolute',
            left: tile.left,
            top: tile.top,
            width: tileW,
            height: tileH,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: `${tile.sticker.rotate}deg` }, { scale: tile.scale }],
          }}
        >
          <Ionicons
            name={tile.sticker.name}
            size={Math.round(tile.sticker.size * tile.scale)}
            color={tile.color}
          />
        </View>
      ))}
    </>
  )
}

function DotGrid({ minHeight, variant }: { minHeight: number; variant: WallpaperVariant }) {
  const { width } = useWindowDimensions()
  const { tileW, tileH, iconColors } = VARIANTS[variant]
  const dotColor = iconColors[0] ?? 'rgba(15, 23, 42, 0.06)'

  const dots = useMemo(() => {
    const cols = Math.ceil(width / tileW) + 1
    const rows = Math.ceil(minHeight / tileH) + 2
    const items: { key: string; left: number; top: number; size: number }[] = []

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const size = (row + col) % 5 === 0 ? 5 : 3.5
        items.push({
          key: `${row}-${col}`,
          left: col * tileW + (row % 2 === 0 ? 0 : tileW / 2),
          top: row * tileH,
          size,
        })
      }
    }

    return items
  }, [minHeight, tileH, tileW, width])

  return (
    <>
      {dots.map((dot) => (
        <View
          key={dot.key}
          style={{
            position: 'absolute',
            left: dot.left + tileW / 2 - dot.size / 2,
            top: dot.top + tileH / 2 - dot.size / 2,
            width: dot.size,
            height: dot.size,
            borderRadius: dot.size / 2,
            backgroundColor: dotColor,
          }}
        />
      ))}
    </>
  )
}

export default function ScreenStickerBackground({ minHeight }: ScreenStickerBackgroundProps) {
  const variant = screenBackground.variant
  const baseColor = screenWallpaperBaseColor()
  const { width } = useWindowDimensions()

  return (
    <View style={[styles.base, { minHeight, backgroundColor: baseColor }]} pointerEvents="none">
      {variant === 'warm' ? <WarmAmbientLayer minHeight={minHeight} width={width} /> : null}
      {variant === 'dots' ? (
        <DotGrid minHeight={minHeight} variant={variant} />
      ) : (
        <StickerTiles minHeight={minHeight} variant={variant} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
})
