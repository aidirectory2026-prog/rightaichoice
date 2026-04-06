'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, Loader2, Check } from 'lucide-react'
import { ShareButton } from '@/components/shared/share-button'
import { saveComparisonAction } from '@/actions/comparisons'

export function ComparePageActions({
  toolSlugs,
  toolIds,
  savedSlug,
}: {
  toolSlugs: string[]
  toolIds: string[]
  savedSlug?: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(!!savedSlug)

  // Canonical shareable URL — slug-based if saved, query-param as fallback
  const shareUrl = savedSlug
    ? `https://rightaichoice.com/compare/${savedSlug}`
    : `/compare?tools=${toolSlugs.join(',')}`

  const title = `${toolSlugs.map((s) => s.replace(/-/g, ' ')).join(' vs ')} — AI Tool Comparison`

  async function handleSave() {
    if (savedSlug || saving) return
    setSaving(true)

    const { slug, error } = await saveComparisonAction(toolSlugs, toolIds)

    if (slug && !error) {
      setSaved(true)
      router.push(`/compare/${slug}`)
    }

    setSaving(false)
  }

  return (
    <div className="flex items-center gap-2">
      {/* Save & get permanent link */}
      {!saved && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Link2 className="h-3.5 w-3.5" />
          )}
          {saving ? 'Saving…' : 'Save & Share'}
        </button>
      )}

      {saved && (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm font-medium text-emerald-400">
          <Check className="h-3.5 w-3.5" />
          Saved
        </span>
      )}

      <ShareButton
        url={shareUrl}
        title={title}
        text={`Comparing ${toolSlugs.map((s) => s.replace(/-/g, ' ')).join(' vs ')} — see which AI tool wins on RightAIChoice`}
        variant="button"
      />
    </div>
  )
}
