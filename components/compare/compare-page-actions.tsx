'use client'

import { ShareButton } from '@/components/shared/share-button'

export function ComparePageActions({
  toolSlugs,
  toolIds,
}: {
  toolSlugs: string[]
  toolIds: string[]
}) {
  // toolIds reserved for future save-to-DB feature
  void toolIds

  const compareUrl = `/compare?tools=${toolSlugs.join(',')}`
  const title = `${toolSlugs.map((s) => s.replace(/-/g, ' ')).join(' vs ')} — AI Tool Comparison`

  return (
    <div className="flex items-center gap-2">
      <ShareButton
        url={compareUrl}
        title={title}
        text={`Comparing ${toolSlugs.map((s) => s.replace(/-/g, ' ')).join(' vs ')} — see which AI tool wins on RightAIChoice`}
        variant="button"
      />
    </div>
  )
}
