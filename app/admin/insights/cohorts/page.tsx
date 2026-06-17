// Phase 11 (Mixpanel upgrade) — Cohorts. Build a segment from conditions
// (did/didn't do an event, "did A then B", user-property filters), combine with
// All/Any, run it, and save it. Powered by insights_cohort (migration 163).

import Link from 'next/link'
import { ChevronLeft, Users } from 'lucide-react'
import { CohortBuilder } from '@/components/admin/cohort-builder'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Cohorts — Admin' }

export default function CohortsPage() {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/admin" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
          <ChevronLeft className="h-3 w-3" />Admin
        </Link>
        <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Users className="h-5 w-5 text-emerald-500" />
          Cohorts
        </h1>
      </div>
      <p className="mb-4 max-w-3xl text-xs text-zinc-500">
        Find groups of people by what they did. Combine conditions with <strong className="text-zinc-300">All</strong> or
        <strong className="text-zinc-300"> Any</strong> — e.g. <em>“did <code className="text-zinc-400">plan_started</code> but
        not <code className="text-zinc-400">plan_completed</code>”</em>, <em>“did <code className="text-zinc-400">search_query_submitted</code>
        then <code className="text-zinc-400">plan_started</code>”</em>, or <em>email domain = gmail.com</em>. Save a cohort to reload it later.
      </p>
      <CohortBuilder eventNames={[...SCHEMA_EVENT_NAMES]} />
    </div>
  )
}
