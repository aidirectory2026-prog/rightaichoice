'use client'

import { useState, useTransition } from 'react'
import { Bookmark } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { toggleSave } from '@/actions/tools'
import { analytics } from '@/lib/analytics'
import { useRouter } from 'next/navigation'

export function SaveToolButton({
  toolId,
  toolName,
  initialSaved,
}: {
  toolId: string
  toolName?: string
  initialSaved: boolean
}) {
  const { user } = useAuth()
  const router = useRouter()
  const [saved, setSaved] = useState(initialSaved)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!user) {
      router.push('/login')
      return
    }

    startTransition(async () => {
      const result = await toggleSave(toolId)
      if (!result.error) {
        setSaved(result.saved)
        if (result.saved) analytics.toolSaved(toolId, toolName ?? toolId)
        else analytics.toolUnsaved(toolId, toolName ?? toolId)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
        saved
          ? 'border-emerald-700 bg-emerald-950 text-emerald-400 hover:bg-emerald-900'
          : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
      } disabled:opacity-50`}
    >
      <Bookmark className={`h-4 w-4 ${saved ? 'fill-emerald-400' : ''}`} />
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}
