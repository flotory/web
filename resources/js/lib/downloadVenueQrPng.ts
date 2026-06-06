export function downloadVenueQrPng(canvasSelector: string, slug: string): boolean {
  const canvas = document.querySelector<HTMLCanvasElement>(`${canvasSelector} canvas`)
  if (!canvas) {
    return false
  }

  const exportCanvas = document.createElement('canvas')
  exportCanvas.width = 512
  exportCanvas.height = 512
  const ctx = exportCanvas.getContext('2d')
  if (!ctx) {
    return false
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 512, 512)
  ctx.drawImage(canvas, 0, 0, 512, 512)

  const link = document.createElement('a')
  link.download = `${slug}-qr.png`
  link.href = exportCanvas.toDataURL('image/png')
  document.body.appendChild(link)
  link.click()
  link.remove()

  return true
}
