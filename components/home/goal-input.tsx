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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:relative sm:gap-0">
      <input
        type="text"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="What do you want to build?"
        className="rai-input-halo w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-4 sm:pl-5 pr-4 sm:pr-40 py-4 text-base text-white placeholder:text-zinc-500 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/50"
      />
      <button
        type="submit"
        aria-label="Plan my stack"
        className="rai-cta-shimmer rai-arrow-nudge flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-base font-medium text-white hover:bg-emerald-500 transition-colors min-h-[52px] sm:absolute sm:right-2 sm:top-1/2 sm:w-auto sm:-translate-y-1/2 sm:rounded-lg sm:text-sm sm:min-h-[40px] sm:py-2"
      >
        Plan My Stack
        <ArrowRight data-arrow className="h-4 w-4" />
      </button>
    </form>
  )
}
