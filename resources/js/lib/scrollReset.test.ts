import { describe, expect, it, vi } from 'vitest'

import { resolveScrollBehavior, resetWindowScroll } from '@/lib/scrollReset'

describe('scrollReset', () => {
  it('scrolls the window and root elements to the top', () => {
    const scrollTo = vi.fn()
    const root = { scrollTop: 400 }
    const body = { scrollTop: 400, tabIndex: -1, focus: vi.fn() }

    vi.stubGlobal('window', {
      scrollTo,
      location: { hash: '' },
    })
    vi.stubGlobal('document', {
      scrollingElement: root,
      documentElement: root,
      body,
      activeElement: body,
    })

    resetWindowScroll()

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' })
    expect(root.scrollTop).toBe(0)
    expect(body.scrollTop).toBe(0)

    vi.unstubAllGlobals()
  })

  it('returns top-of-page for route changes without a hash', () => {
    expect(resolveScrollBehavior({ hash: '' } as never, {} as never, null)).toEqual({
      top: 0,
      left: 0,
      behavior: 'auto',
    })
  })

  it('restores saved position on back/forward navigation', () => {
    const saved = { top: 240, left: 0 }
    expect(resolveScrollBehavior({ hash: '' } as never, {} as never, saved)).toBe(saved)
  })
})
