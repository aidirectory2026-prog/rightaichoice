'use client'

// Phase 8.g.11.d (2026-05-23) — passive browser-API capture, mounted once
// from the root layout. Listens at the document/window level for:
//   - copy / paste (selection length + page_path)
//   - context-menu (right-click)
//   - tab visibility change (with previous duration)
//   - browser back button (popstate)
//
// 10.7c.2 (2026-06-13) — frustration / behavior-depth signals added:
//   - rage_click (3+ clicks <1s within 30px — throttled 1/10s, max 10/page)
//   - dead_click (cursor:pointer element, no interactive ancestor, NO DOM
//     mutation or navigation within 600ms — throttled 1/5s, max 10/page)
//   - exit_intent (desktop-only mouse-out through viewport top — once/page,
//     suppressed first 5s)
//   - error_encountered (window error capture-phase + unhandledrejection —
//     deduped per message, max 5/page)
//   - external_link_clicked (anchor to a foreign host — throttled 1/1s)
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
// 10.7c.2 — frustration-signal tuning.
const RAGE_WINDOW_MS = 1000
const RAGE_RADIUS_PX = 30
const RAGE_MIN_CLICKS = 3
const RAGE_MIN_GAP_MS = 10_000
const RAGE_MAX_PER_PAGE = 10
const DEAD_PROBE_MS = 600
const DEAD_MIN_GAP_MS = 5_000
const DEAD_MAX_PER_PAGE = 10
const EXIT_INTENT_SUPPRESS_MS = 5_000
const ERROR_MAX_PER_PAGE = 5
const EXTERNAL_LINK_MIN_GAP_MS = 1_000

// Selector for genuinely interactive elements — a click inside one of these
// is expected to respond, so it is never a dead-click candidate.
const INTERACTIVE_SELECTOR = [
  'a', 'button', 'input', 'select', 'textarea', 'label', 'summary', 'option',
  '[role="button"]', '[role="link"]', '[role="tab"]', '[role="menuitem"]',
  '[role="option"]', '[role="checkbox"]', '[role="switch"]', '[role="combobox"]',
  '[contenteditable="true"]',
].join(',')

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
  // ── 10.7c.2 — frustration-signal state (reset per pathname below) ──
  const recentClicksRef = useRef<Array<{ t: number; x: number; y: number }>>([])
  const lastRageAtRef = useRef(0)
  const ragePageCountRef = useRef(0)
  const lastDeadAtRef = useRef(0)
  const deadPageCountRef = useRef(0)
  const deadProbeActiveRef = useRef(false)
  const exitIntentFiredRef = useRef(false)
  const pageMountedAtRef = useRef<number>(Date.now())
  const errorSeenMessagesRef = useRef<Set<string>>(new Set())
  const errorPageCountRef = useRef(0)
  const lastExternalAtRef = useRef(0)

  useEffect(() => {
    // 10.7c.2 — "per page" counters/dedup reset on every pathname change.
    recentClicksRef.current = []
    ragePageCountRef.current = 0
    deadPageCountRef.current = 0
    deadProbeActiveRef.current = false
    exitIntentFiredRef.current = false
    pageMountedAtRef.current = Date.now()
    errorSeenMessagesRef.current = new Set()
    errorPageCountRef.current = 0
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

    // ── 10.7c.2 — rage clicks: 3+ clicks within 1s inside a 30px radius.
    // Coordinates/target come from the LAST click of the burst.
    function detectRageClick(e: MouseEvent, now: number) {
      const clicks = recentClicksRef.current.filter((c) => now - c.t <= RAGE_WINDOW_MS)
      clicks.push({ t: now, x: e.clientX, y: e.clientY })
      recentClicksRef.current = clicks
      if (clicks.length < RAGE_MIN_CLICKS) return
      const last = clicks[clicks.length - 1]
      const allNear = clicks.every(
        (c) => Math.hypot(c.x - last.x, c.y - last.y) <= RAGE_RADIUS_PX,
      )
      if (!allNear) return
      if (now - lastRageAtRef.current < RAGE_MIN_GAP_MS) return
      if (ragePageCountRef.current >= RAGE_MAX_PER_PAGE) return
      lastRageAtRef.current = now
      ragePageCountRef.current += 1
      analytics.rageClick({
        page_path: pathname,
        target_element_id: elementId(e.target),
        click_count: clicks.length,
      })
      recentClicksRef.current = [] // one burst = one event
    }

    // ── 10.7c.2 — dead clicks: a click on something styled clickable
    // (cursor:pointer) with NO interactive ancestor that produces NO UI
    // response — no DOM mutation and no navigation within 600ms
    // (MutationObserver probe; SPA navigations mutate the DOM, so any real
    // response cancels the event). Compute-once: the probe only spins up
    // for throttled, qualifying candidates.
    function maybeProbeDeadClick(e: MouseEvent, now: number) {
      if (deadProbeActiveRef.current) return
      if (now - lastDeadAtRef.current < DEAD_MIN_GAP_MS) return
      if (deadPageCountRef.current >= DEAD_MAX_PER_PAGE) return
      const target = e.target
      if (!(target instanceof Element)) return
      if (target.closest(INTERACTIVE_SELECTOR)) return // real control — expected to respond
      let pointer = false
      try {
        pointer = window.getComputedStyle(target).cursor === 'pointer'
      } catch {
        // ignore — detached node
      }
      if (!pointer) return
      deadProbeActiveRef.current = true
      const hrefAtClick = window.location.href
      let mutated = false
      const observer = new MutationObserver(() => {
        mutated = true
        observer.disconnect()
      })
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      })
      window.setTimeout(() => {
        observer.disconnect()
        deadProbeActiveRef.current = false
        if (mutated || window.location.href !== hrefAtClick) return // UI responded
        lastDeadAtRef.current = Date.now()
        deadPageCountRef.current += 1
        analytics.deadClick({ page_path: pathname, target_element_id: elementId(target) })
      }, DEAD_PROBE_MS)
    }

    // ── 10.7c.2 — external links: anchor whose host is not ours. Affiliate
    // "Visit website" buttons navigate via internal /api/tools/[slug]/visit,
    // so they have an internal host and are correctly excluded here.
    function maybeTrackExternalLink(e: MouseEvent, now: number) {
      if (now - lastExternalAtRef.current < EXTERNAL_LINK_MIN_GAP_MS) return
      const target = e.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      try {
        const url = new URL(anchor.href, window.location.href)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return
        if (url.host === window.location.host) return
        lastExternalAtRef.current = now
        analytics.externalLinkClicked(url.href.slice(0, 500), 'anchor', elementId(anchor))
      } catch {
        // unparseable href — ignore
      }
    }

    // Single capture-phase click listener feeds all three click-derived
    // signals (capture so stopPropagation in app code can't hide clicks).
    function onClickCapture(e: MouseEvent) {
      const now = Date.now()
      detectRageClick(e, now)
      maybeProbeDeadClick(e, now)
      maybeTrackExternalLink(e, now)
    }

    // ── 10.7c.2 — exit intent: desktop-only (no touch points), mouse left
    // through the top of the viewport. Once per page, suppressed during the
    // first 5s after mount (entry-jitter is not intent).
    function onMouseOut(e: MouseEvent) {
      if (exitIntentFiredRef.current) return
      if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) return
      if (e.relatedTarget !== null) return
      if (e.clientY > 0) return
      const now = Date.now()
      if (now - pageMountedAtRef.current < EXIT_INTENT_SUPPRESS_MS) return
      exitIntentFiredRef.current = true
      analytics.exitIntent({
        page_path: pathname,
        seconds_on_page: Math.floor((now - pageMountedAtRef.current) / 1000),
      })
    }

    // ── 10.7c.2 — client error capture. Deduped per message, max 5/page.
    function recordError(
      boundary: string,
      message: string,
      extra: {
        error_type: 'js_error' | 'unhandled_rejection' | 'resource_error' | 'react_boundary'
        source_url?: string
        line?: number
        col?: number
      },
    ) {
      const key = `${extra.error_type}:${message.slice(0, 200)}`
      if (errorSeenMessagesRef.current.has(key)) return
      if (errorPageCountRef.current >= ERROR_MAX_PER_PAGE) return
      errorSeenMessagesRef.current.add(key)
      errorPageCountRef.current += 1
      analytics.errorEncountered(boundary, message, { ...extra, page_path: pathname })
    }

    // Capture phase distinguishes failed resource loads (event target is the
    // failing element, no error message) from JS exceptions (ErrorEvent).
    function onWindowError(e: Event) {
      if (e instanceof ErrorEvent && (e.message || e.error)) {
        recordError('window', e.message || String(e.error), {
          error_type: 'js_error',
          ...(e.filename ? { source_url: e.filename.slice(0, 300) } : {}),
          ...(typeof e.lineno === 'number' ? { line: e.lineno } : {}),
          ...(typeof e.colno === 'number' ? { col: e.colno } : {}),
        })
        return
      }
      const target = e.target
      if (target instanceof HTMLElement) {
        const tag = target.tagName.toLowerCase()
        if (tag === 'img' || tag === 'script' || tag === 'link' || tag === 'video' || tag === 'audio' || tag === 'source' || tag === 'iframe') {
          const src =
            target.getAttribute('src') || target.getAttribute('href') || 'unknown'
          recordError('resource', `Failed to load ${tag}: ${src.slice(0, 160)}`, {
            error_type: 'resource_error',
            source_url: src.slice(0, 300),
          })
        }
      }
    }

    function onUnhandledRejection(e: PromiseRejectionEvent) {
      const reason = e.reason
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : (() => {
                try {
                  return JSON.stringify(reason)?.slice(0, 200) ?? 'unknown rejection'
                } catch {
                  return 'unknown rejection'
                }
              })()
      recordError('window', message || 'unknown rejection', { error_type: 'unhandled_rejection' })
    }

    document.addEventListener('copy', onCopy)
    document.addEventListener('paste', onPaste)
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('popstate', onPopState)
    document.addEventListener('click', onClickCapture, true)
    document.addEventListener('mouseout', onMouseOut)
    window.addEventListener('error', onWindowError, true)
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    return () => {
      document.removeEventListener('copy', onCopy)
      document.removeEventListener('paste', onPaste)
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('popstate', onPopState)
      document.removeEventListener('click', onClickCapture, true)
      document.removeEventListener('mouseout', onMouseOut)
      window.removeEventListener('error', onWindowError, true)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [pathname])

  return null
}
