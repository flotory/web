import { describe, expect, it } from 'vitest'

import { legalConfig } from '@/lib/legalConfig'
import { renderLegalMarkdown } from '@/lib/legalMarkdown'

describe('renderLegalMarkdown', () => {
  it('replaces legal placeholders and renders headings and lists', () => {
    const html = renderLegalMarkdown(`# Title

## Section

Intro paragraph.

- First item
- Second item`)

    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<h2>Section</h2>')
    expect(html).toContain('<p>Intro paragraph.</p>')
    expect(html).toContain('<li>First item</li>')
    expect(html).not.toContain('[SUPPORT_EMAIL]')
  })

  it('fills support email placeholder from legal config', () => {
    const html = renderLegalMarkdown('Contact [SUPPORT_EMAIL] for help.')
    expect(html).toContain(legalConfig.supportEmail)
    expect(html).not.toContain('[SUPPORT_EMAIL]')
  })
})
