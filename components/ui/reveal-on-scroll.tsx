'use client'

// Phase 12 Bug-4.7 (2026-06-27): a light entrance animation — sections fade +
// slide up as they scroll into view. Safe by design:
//  • The hidden state is `motion-safe:` only, so reduced-motion users (and the
//    no-animation fallback) always see content fully visible.
//  • If IntersectionObserver is unavailable, it reveals immediately.
//  • Content is always rendered in the DOM (we only animate opacity/transform),
//    so SEO / GEO extraction is unaffected.

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export function RevealOnScroll({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      // No IO support → reveal immediately, but defer out of the effect body
      // so we don't trigger a synchronous cascading render.
      const raf = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(raf)
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-out ${
        shown ? 'opacity-100 translate-y-0' : 'motion-safe:opacity-0 motion-safe:translate-y-3'
      } ${className ?? ''}`}
    >
      {children}
    </div>
  )
}
