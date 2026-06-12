import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/admin/page-header'
import { MetricInfo } from '@/components/admin/metric-info'
import { ReviewCard } from './review-card'

// Phase 10.5c.1 (2026-06-12) — re-skinned onto the shared admin kit
// (PageHeader breadcrumb, ⓘ provenance on the queue counts). Data + query
// semantics unchanged: the bucket/constraint filter links are this page's
// own sound custom controls (the queue is a generated JSON artifact, not a
// windowed metric) — kept; the global filter bar does not apply here.

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Tier-1 Review' }

type Bucket = '1A' | '1B' | '1C'
type BindingConstraint = 'title' | 'mixed' | 'rank'

type Rewrite = {
  page: string
  bucket: Bucket
  section?: string
  priority?: number
  bindingConstraint?: BindingConstraint
  currentTitle: string
  weightedPosition: number
  totalImpressions: number
  totalClicks: number
  topQuery: string
  suggestions: Array<{ title: string; rationale: string }>
}

export default async function Tier1ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ bucket?: string; constraint?: string }>
}) {
  const { bucket, constraint } = await searchParams
  const path = resolve(process.cwd(), 'candidates/tier1-rewrites.json')

  if (!existsSync(path)) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Tier-1 Title Review</h1>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
          <p className="text-zinc-400 mb-2">
            No rewrites generated yet.
          </p>
          <p className="text-sm text-zinc-500">
            Run <code className="bg-zinc-950 px-2 py-0.5 rounded text-emerald-400">npm run tier1:rewrite</code> first.
            It reads <code className="text-zinc-400">candidates/tier1-candidates.json</code>, calls DeepSeek for 3 title suggestions per page, and writes <code className="text-zinc-400">candidates/tier1-rewrites.json</code> for this page to consume.
          </p>
        </div>
      </div>
    )
  }

  const file = JSON.parse(readFileSync(path, 'utf-8')) as {
    rewrites: Rewrite[]
    totals?: { totalInOutput?: number; newSucceeded?: number; newFailed?: number }
    generatedAt?: string
  }
  let rewrites = (file.rewrites ?? [])
    .slice()
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  if (bucket === '1A' || bucket === '1B' || bucket === '1C') {
    rewrites = rewrites.filter((r) => r.bucket === bucket)
  }
  if (constraint === 'title' || constraint === 'mixed' || constraint === 'rank') {
    rewrites = rewrites.filter((r) => r.bindingConstraint === constraint)
  }
  const constraintCounts = {
    title: (file.rewrites ?? []).filter((r) => r.bindingConstraint === 'title').length,
    mixed: (file.rewrites ?? []).filter((r) => r.bindingConstraint === 'mixed').length,
    rank: (file.rewrites ?? []).filter((r) => r.bindingConstraint === 'rank').length,
  }

  const supabase = await createClient()
  const { data: overrides } = await supabase
    .from('title_overrides')
    .select('page_path, override_title')
    .is('reverted_at', null)
  const overrideMap = new Map<string, string>(
    (
      (overrides as Array<{ page_path: string; override_title: string }> | null) ??
      []
    ).map((o) => [o.page_path, o.override_title]),
  )

  const counts = {
    '1A': rewrites.filter((r) => r.bucket === '1A').length,
    '1B': rewrites.filter((r) => r.bucket === '1B').length,
    '1C': rewrites.filter((r) => r.bucket === '1C').length,
  }

  return (
    <div className="space-y-6">
      <PageHeader>
        <p className="flex items-center gap-1 text-xs text-zinc-500">
          {rewrites.length} pages shown · {overrideMap.size} active overrides
          {file.generatedAt && ` · generated ${file.generatedAt.slice(0, 10)}`}
          <MetricInfo docKey="tier1_queue" />
        </p>
      </PageHeader>
      <div className="-mt-4 flex flex-wrap items-end justify-end gap-4">
        <div className="flex flex-col gap-2">
          <nav className="flex flex-wrap gap-2 text-xs">
            <FilterLink href="/admin/tier1-review" label={`All (${counts['1A'] + counts['1B'] + counts['1C']})`} active={!bucket && !constraint} />
            <FilterLink href="/admin/tier1-review?constraint=title" label={`🟢 Title-bound (${constraintCounts.title})`} active={constraint === 'title'} />
            <FilterLink href="/admin/tier1-review?constraint=mixed" label={`🟡 Mixed (${constraintCounts.mixed})`} active={constraint === 'mixed'} />
            <FilterLink href="/admin/tier1-review?constraint=rank" label={`🔴 Rank-bound (${constraintCounts.rank})`} active={constraint === 'rank'} />
          </nav>
          <nav className="flex gap-2 text-xs">
            <FilterLink href="/admin/tier1-review?bucket=1A" label={`1A pos≤10 (${counts['1A']})`} active={bucket === '1A'} />
            <FilterLink href="/admin/tier1-review?bucket=1B" label={`1B 11–20 (${counts['1B']})`} active={bucket === '1B'} />
            <FilterLink href="/admin/tier1-review?bucket=1C" label={`1C 21–30 (${counts['1C']})`} active={bucket === '1C'} />
          </nav>
        </div>
      </div>

      <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-4 text-sm text-emerald-100/90">
        <p className="font-medium text-emerald-300 mb-1">How to work this queue (ROI order)</p>
        <p>
          Rows are sorted by <span className="font-mono">priority</span> = impressions × title-leverage. Start with{' '}
          <span className="text-emerald-300">🟢 Title-bound</span> — page-1 compares/blog where a sharper title directly
          lifts clicks. <span className="text-amber-300">🟡 Mixed</span> (pos 11–20) can break onto page 1.{' '}
          <span className="text-rose-300">🔴 Rank-bound</span> pages (buried or templated tool pages) need ranking work,
          not titles — skip them here. Approve ~10/day; we measure the lift after 7 days.
        </p>
      </div>

      <div className="space-y-4">
        {rewrites.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 text-zinc-400 text-sm">
            No rewrites in this bucket.
          </div>
        ) : (
          rewrites.map((r) => (
            <ReviewCard
              key={r.page}
              rewrite={r}
              activeOverride={overrideMap.get(r.page) ?? null}
            />
          ))
        )}
      </div>
    </div>
  )
}

function FilterLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded border ${
        active
          ? 'border-emerald-600 bg-emerald-950 text-emerald-300'
          : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
      }`}
    >
      {label}
    </Link>
  )
}
