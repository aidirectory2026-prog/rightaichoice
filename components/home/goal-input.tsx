'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'

export function GoalInput() {
  const router = useRouter()
  const [goal, setGoal] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = goal.trim()
    if (!trimmed) return
    router.push(`/plan?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="What do you want to build? e.g. &quot;Launch a SaaS MVP&quot;"
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-5 pr-36 py-4 text-base text-white placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/50 transition-colors"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
      >
        Plan My Stack
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  )
}
