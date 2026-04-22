'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { analytics } from '@/lib/analytics'

export function GoalInput() {
  const router = useRouter()
  const [goal, setGoal] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = goal.trim()
    if (!trimmed) return
    analytics.heroCtaClicked('plan_my_stack', 'homepage_goal_input')
    analytics.searchQuerySubmitted(trimmed, 0, 'homepage_goal_input')
    router.push(`/plan?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="What do you want to build?"
        className="rai-input-halo w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-4 sm:pl-5 pr-14 sm:pr-40 py-4 text-base text-white placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/50"
      />
      <button
        type="submit"
        aria-label="Plan my stack"
        className="rai-cta-shimmer rai-arrow-nudge absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 sm:px-5 py-2.5 sm:py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors min-h-[40px]"
      >
        <span className="hidden sm:inline">Plan My Stack</span>
        <ArrowRight data-arrow className="h-4 w-4" />
      </button>
    </form>
  )
}
