'use client'

// Phase 12 Bug-4.2 (2026-06-27): floating "back to top" control for long pages
// (tool pages run 30+ sections). Appears after the reader scrolls past a
// threshold, smooth-scrolls to the top. Positioned to clear the mobile action
// bar. motion-safe so reduced-motion users get an instant jump, not a slide.

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export function BackToTop({ threshold = 600 }: { threshold?: number }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior:
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'auto'
              : 'smooth',
        })
      }
      /* Mobile: bottom-32 sits ABOVE the stacked bottom bars (global nav ~60px +
         the tool page's MobileActionBar ~50px) so it never overlaps the Compare
         button; z-[70] beats the action bar's z-[60]. Desktop has no bottom
         bars → bottom-6. */
      className={`fixed bottom-32 right-4 z-[70] flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/90 text-zinc-200 shadow-lg backdrop-blur transition-all duration-200 hover:border-emerald-600 hover:text-emerald-300 sm:bottom-6 sm:right-6 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
      }`}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  )
}
