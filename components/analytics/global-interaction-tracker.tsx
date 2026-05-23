'use client'

// Phase 8.g.11.d (2026-05-23) — passive browser-API capture, mounted once
// from the root layout. Listens at the document/window level for:
//   - copy / paste (selection length + page_path)
//   - context-menu (right-click)
//   - tab visibility change (with previous duration)
//   - browser back button (popstate)
//
// Throttled per-event to keep volume sane. Doesn't collide with Clarity
// (which captures click coordinates + rage clicks + scroll heatmaps);
// these events complement Clarity by giving SQL-queryable signal.

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { analytics } from '@/lib/analytics'

const COPY_PASTE_MIN_GAP_MS = 1500
const CONTEXT_MENU_MIN_GAP_MS = 3000
const VISIBILITY_MIN_GAP_MS = 5000

function elementId(target: EventTarget | null): string {
  if (!(target instanceof Element)) return 'unknown'
  // Prefer id, then a stable data-attr, then tag + class fragment.
  if (target.id) return `#${target.id}`
  const dataId = target.getAttribute('data-track-id')
  if (dataId) return `[data-track-id=${dataId}]`
  const tag = target.tagName.toLowerCase()
  const cls = target.className && typeof target.className === 'string'
    ? '.' + target.className.split(/\s+/).slice(0, 2).join('.')
    : ''
  return `${tag}${cls}`.slice(0, 80)
}

export function GlobalInteractionTracker() {
  const pathname = usePathname()
  // Per-event throttles to avoid burst events flooding the mirror.
  const lastCopyAtRef = useRef(0)
  const lastPasteAtRef = useRef(0)
  const lastContextAtRef = useRef(0)
  const lastVisChangeAtRef = useRef(0)
  // Tracks when the tab was last visible so we can attribute hidden_duration_ms.
  const visibleSinceRef = useRef<number>(Date.now())

  useEffect(() => {
    function onCopy() {
      const now = Date.now()
      if (now - lastCopyAtRef.current < COPY_PASTE_MIN_GAP_MS) return
      lastCopyAtRef.current = now
      let selectionLength = 0
      try {
        selectionLength = window.getSelection()?.toString().length ?? 0
      } catch {
        // ignore
      }
      analytics.copyTextEvent({ selection_length: selectionLength, page_path: pathname })
    }

    function onPaste(e: ClipboardEvent) {
      const now = Date.now()
      if (now - lastPasteAtRef.current < COPY_PASTE_MIN_GAP_MS) return
      lastPasteAtRef.current = now
      analytics.pasteTextEvent({ target_element_id: elementId(e.target), page_path: pathname })
    }

    function onContextMenu(e: MouseEvent) {
      const now = Date.now()
      if (now - lastContextAtRef.current < CONTEXT_MENU_MIN_GAP_MS) return
      lastContextAtRef.current = now
      analytics.contextMenuOpened({ target_element_id: elementId(e.target), page_path: pathname })
    }

    function onVisibilityChange() {
      const now = Date.now()
      if (now - lastVisChangeAtRef.current < VISIBILITY_MIN_GAP_MS) return
      lastVisChangeAtRef.current = now
      if (document.visibilityState === 'hidden') {
        // tab going to background — close out the visible window
        const durationMs = visibleSinceRef.current ? now - visibleSinceRef.current : undefined
        analytics.tabVisibilityChanged({ state: 'hidden', duration_ms: durationMs })
      } else {
        // tab returning to foreground
        visibleSinceRef.current = now
        analytics.tabVisibilityChanged({ state: 'visible' })
      }
    }

    function onPopState() {
      analytics.navigationBack({ from_path: pathname })
    }

    document.addEventListener('copy', onCopy)
    document.addEventListener('paste', onPaste)
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('popstate', onPopState)

    return () => {
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('paste', onPaste)
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('popstate', onPopState)
    }
  }, [pathname])

  return null
}
