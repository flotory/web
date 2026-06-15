import { applyLegalPlaceholders } from '@/lib/legalConfig'

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function inlineMarkdown(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function isBulletLine(line: string): boolean {
  return /^-\s+/.test(line.trim())
}

function bulletText(line: string): string {
  return line.trim().replace(/^-\s+/, '')
}

/**
 * Minimal markdown renderer for legal documents (headings, paragraphs, bullet lists).
 */
export function renderLegalMarkdown(source: string): string {
  const normalized = applyLegalPlaceholders(source).replace(/\r\n/g, '\n').trim()
  const blocks = normalized.split(/\n{2,}/)
  const parts: string[] = []

  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trimEnd())
    const first = lines[0]?.trim() ?? ''

    if (first.startsWith('### ')) {
      parts.push(`<h3>${inlineMarkdown(first.slice(4))}</h3>`)
      continue
    }

    if (first.startsWith('## ')) {
      parts.push(`<h2>${inlineMarkdown(first.slice(3))}</h2>`)
      continue
    }

    if (first.startsWith('# ')) {
      parts.push(`<h1>${inlineMarkdown(first.slice(2))}</h1>`)
      continue
    }

    if (lines.every((line) => line.trim() === '' || isBulletLine(line))) {
      const items = lines.filter((line) => line.trim() !== '').map((line) => `<li>${inlineMarkdown(bulletText(line))}</li>`)
      if (items.length > 0) {
        parts.push(`<ul>${items.join('')}</ul>`)
      }
      continue
    }

    parts.push(`<p>${lines.map((line) => inlineMarkdown(line)).join('<br />')}</p>`)
  }

  return parts.join('\n')
}
