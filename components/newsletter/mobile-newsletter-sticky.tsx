'use client'

import { useEffect, useState } from 'react'
import { X, Mail } from 'lucide-react'
import { NewsletterForm } from './newsletter-form'

const DISMISS_KEY = 'rac_newsletter_dismissed_v1'
const DISMISS_DAYS = 14

export function MobileNewsletterSticky() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raw = window.localStorage.getItem(DISMISS_KEY)
    if (raw) {
      const dismissedAt = Number(raw)
      if (!Number.isNaN(dismissedAt)) {
        const ageDays = (Date.now() - dismissedAt) / 86_400_000
        if (ageDays < DISMISS_DAYS) return
      }
    }
    // Slight delay so it doesn't pop on first paint.
    const t = window.setTimeout(() => setVisible(true), 4000)
    return () => window.clearTimeout(t)
  }, [])

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="lg:hidden fixed left-3 right-3 bottom-[68px] z-40 rounded-xl border border-emerald-700/50 bg-zinc-950/95 backdrop-blur-sm shadow-xl p-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-2 text-sm font-semibold text-white mb-1">
        <Mail className="h-4 w-4 text-emerald-400" />
        One AI tool every Friday
      </div>
      <p className="text-xs text-zinc-400 mb-3">
        We surface 1 underrated tool we&apos;d actually pay for. No filler.
      </p>
      <NewsletterForm source="mobile_sticky" variant="compact" />
    </div>
  )
}
