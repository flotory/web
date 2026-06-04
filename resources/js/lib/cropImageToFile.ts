import type { ImagePreset } from '@/lib/imagePresets'

export async function canvasToCroppedFile(
  canvas: HTMLCanvasElement,
  preset: ImagePreset,
  originalName?: string,
): Promise<File> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, preset.outputMime, preset.outputQuality)
  })

  if (!blob) {
    throw new Error('Could not process image.')
  }

  const base = (originalName?.replace(/\.[^.]+$/, '') || 'image').slice(0, 80)
  const extension = preset.outputMime === 'image/jpeg' ? 'jpg' : 'webp'

  return new File([blob], `${base}-cropped.${extension}`, { type: preset.outputMime })
}
