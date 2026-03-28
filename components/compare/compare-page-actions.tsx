'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

export function ComparePageActions({
  toolSlugs,
  toolIds,
}: {
  toolSlugs: string[]
  toolIds: string[]
}) {
  const [copied, setCopied] = useState(false)

  // Suppress unused var — toolIds reserved for future save-to-DB feature
  void toolIds

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select a temporary input
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            Copied!
          </>
        ) : (
          <>
            <Share2 className="h-3.5 w-3.5" />
            Share
          </>
        )}
      </button>
    </div>
  )
}
