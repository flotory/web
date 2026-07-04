import type { RouteLocationNormalizedLoaded } from 'vue-router'

type SavedScrollPosition = { left: number; top: number }

/** Reset window scroll without smooth animation (avoids fighting focus-restore). */
export function resetWindowScroll(): void {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  const root = document.scrollingElement ?? document.documentElement
  root.scrollTop = 0
  document.body.scrollTop = 0
}

function resetAfterReload(): void {
  if (window.location.hash) {
    return
  }

  const active = document.activeElement
  if (active instanceof HTMLElement && active !== document.body && active !== document.documentElement) {
    active.blur()
  }

  resetWindowScroll()

  if (document.body.tabIndex < 0) {
    document.body.tabIndex = -1
  }
  document.body.focus({ preventScroll: true })
}

function scheduleResetAfterReload(): void {
  resetAfterReload()
  requestAnimationFrame(() => {
    resetAfterReload()
    requestAnimationFrame(resetAfterReload)
  })
}

/** Vue Router scrollBehavior — route changes (e.g. footer links) start at the top. */
export function resolveScrollBehavior(
  to: RouteLocationNormalizedLoaded,
  _from: RouteLocationNormalizedLoaded,
  savedPosition: SavedScrollPosition | null,
) {
  if (savedPosition) {
    return savedPosition
  }

  if (to.hash) {
    return { el: to.hash, top: 0, behavior: 'smooth' as const }
  }

  return { top: 0, left: 0, behavior: 'auto' as const }
}

/**
 * Disable browser scroll restore on refresh and undo focus-restore scrolling
 * (e.g. into the footer). Pairs with the inline script in app.blade.php.
 */
export function installScrollReset(): void {
  if (typeof window === 'undefined') {
    return
  }

  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual'
  }

  window.addEventListener('pageshow', () => {
    if (!window.location.hash) {
      resetAfterReload()
    }
  })

  window.addEventListener('load', scheduleResetAfterReload, { once: true })
}
