'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { X, Scale, Trash2 } from 'lucide-react'
import { useCompare } from '@/components/providers/compare-provider'

export function CompareTray() {
  const { items, remove, clear } = useCompare()
  const router = useRouter()

  if (items.length === 0) return null

  const handleCompare = () => {
    const slugs = items.map((i) => i.slug).join(',')
    router.push(`/compare?tools=${slugs}`)
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
        {/* Label */}
        <div className="flex items-center gap-2 text-sm text-zinc-400 shrink-0">
          <Scale className="h-4 w-4 text-emerald-400" />
          <span className="hidden sm:inline">Compare</span>
          <span className="text-zinc-600">({items.length}/3)</span>
        </div>

        {/* Tool pills */}
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 shrink-0"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded bg-zinc-700 overflow-hidden">
                {item.logo_url ? (
                  <Image
                    src={item.logo_url}
                    alt={item.name}
                    width={20}
                    height={20}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[8px] font-bold text-zinc-400">
                    {item.name.charAt(0)}
                  </span>
                )}
              </div>
              <span className="text-sm text-zinc-300 font-medium">
                {item.name}
              </span>
              <button
                onClick={() => remove(item.id)}
                className="text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={clear}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
          <button
            onClick={handleCompare}
            disabled={items.length < 2}
            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Compare Now
          </button>
        </div>
      </div>
    </div>
  )
}
