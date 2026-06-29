// Phase 13 D2.1 — read model for the directory-submission panel on /admin/authority.
// Uses the service-role admin client (directory_submissions is RLS service-role-only).

import { getAdminClient } from '../cron/supabase-admin'

export type DirRow = {
  directory_key: string
  directory_name: string
  directory_url: string
  submit_url: string | null
  authority_tier: number
  da_estimate: number | null
  dofollow: boolean | null
  status: string
  live_url: string | null
  backlink_detected: boolean
  notes: string | null
}

export type DirectoryPipeline = {
  total: number
  counts: Record<string, number>
  backlinks: number
  next: DirRow[] // top queued by tier
  active: DirRow[] // submitted/live rows
}

export async function loadDirectoryPipeline(): Promise<DirectoryPipeline> {
  const db = getAdminClient()
  const { data } = await db
    .from('directory_submissions')
    .select('directory_key, directory_name, directory_url, submit_url, authority_tier, da_estimate, dofollow, status, live_url, backlink_detected, notes')
    .order('authority_tier', { ascending: true })
    .order('da_estimate', { ascending: false, nullsFirst: false })
  const rows = (data ?? []) as DirRow[]

  const counts: Record<string, number> = {}
  for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1
  return {
    total: rows.length,
    counts,
    backlinks: rows.filter((r) => r.backlink_detected).length,
    next: rows.filter((r) => r.status === 'queued').slice(0, 8),
    active: rows.filter((r) => r.status === 'submitted' || r.status === 'live'),
  }
}
