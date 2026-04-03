'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteStack } from '@/actions/stacks'

export function DeleteStackButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('Delete this saved stack?')) return
    startTransition(() => { deleteStack(id) })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="shrink-0 p-1.5 text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-50"
      title="Delete stack"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}
