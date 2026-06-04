export type ImagePresetId = 'square'

export interface ImagePreset {
  id: ImagePresetId
  label: string
  aspectRatio: number
  outputWidth: number
  outputHeight: number
  outputMime: 'image/jpeg' | 'image/webp'
  outputQuality: number
  maxFileSizeBytes: number
  accept: string
  helpText: string
}

export const IMAGE_PRESETS: Record<ImagePresetId, ImagePreset> = {
  square: {
    id: 'square',
    label: 'Square',
    aspectRatio: 1,
    outputWidth: 512,
    outputHeight: 512,
    outputMime: 'image/jpeg',
    outputQuality: 0.9,
    maxFileSizeBytes: 5 * 1024 * 1024,
    accept: 'image/png,image/jpeg,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif',
    helpText: 'Drag to reposition. The image is saved as a square.',
  },
}

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

export function imagePreset(id: ImagePresetId): ImagePreset {
  return IMAGE_PRESETS[id]
}
