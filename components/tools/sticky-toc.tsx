'use client'

import { useEffect, useState } from 'react'
import { ListOrdered } from 'lucide-react'

type Heading = { id: string; text: string }

/**
 * Phase 6.7 (2026-05-12): sticky table-of-contents for the long
 * /tools/[slug] page. Auto-discovers <h2> elements at runtime so we
 * don't have to add explicit IDs to every section in the page handler.
 *
 * - Slugifies each h2's text into a stable ID and writes it back onto
 *   the DOM node so anchor links work + the URL hash matches the spec
 * - IntersectionObserver tracks which section is in view; the matching
 *   TOC link gets emerald-highlighted
 * - Click handler does smooth-scroll instead of the default jump
 * - Hidden below the lg: breakpoint (right rail collapses there too)
 *
 * Renders nothing until headings are discovered (Hydration friendly:
 * it doesn't try to compute headings during SSR).
 */
export function StickyToc() {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const main = document.querySelector('main')
    if (!main) return
    const h2s = Array.from(main.querySelectorAll('h2'))
    const seen = new Set<string>()
    const list: Heading[] = []
    for (const el of h2s) {
      const text = (el.textContent ?? '').trim()
      if (!text || text.length > 60) continue
      let id = el.id
      if (!id) {
        id = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
          .slice(0, 60)
        if (!id) continue
        let suffix = 1
        let unique = id
        while (seen.has(unique)) {
          suffix += 1
          unique = `${id}-${suffix}`
        }
        id = unique
        el.id = id
      }
      seen.add(id)
      list.push({ id, text })
    }
    setHeadings(list)

    if (list.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top of the viewport that's at
        // least partially visible. Avoids jumping when several sections
        // are intersecting during fast scrolling.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActiveId(visible.target.id)
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    )
    for (const h of list) {
      const el = document.getElementById(h.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  if (headings.length === 0) return null

  return (
    <nav
      aria-label="On this page"
      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        <ListOrdered className="h-3.5 w-3.5" />
        On this page
      </div>
      <ul className="space-y-1">
        {headings.map((h) => {
          const isActive = activeId === h.id
          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  const el = document.getElementById(h.id)
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    history.replaceState(null, '', `#${h.id}`)
                  }
                }}
                className={`block rounded-md px-2 py-1 text-xs leading-snug transition-colors ${
                  isActive
                    ? 'bg-emerald-950/40 text-emerald-300'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                {h.text}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
