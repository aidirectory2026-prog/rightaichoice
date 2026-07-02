import Link from 'next/link'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { PageHeader } from '@/components/admin/page-header'
import { normalizeDomain, MULTI_TENANT_HOSTS } from '@/lib/cron/dedup'
import { SubmissionCard, type SubmissionCardData } from './submission-card'

// Phase 14 — vendor tool-submission review queue. Approve creates the tools
// DRAFT row (SOP publishes later); Reject emails the submitter with a reason.
// Reads via the service-role client (RLS hides other users' rows otherwise);
// the admin layout gate has already verified profiles.is_admin.

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Submissions' }

const STATUSES = ['pending', 'approved', 'rejected', 'all'] as const
type StatusFilter = (typeof STATUSES)[number]

type Row = Omit<SubmissionCardData, 'submitter_email' | 'similar_tools'> & {
  user_id: string
  tool_id: string | null
}

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const status: StatusFilter = STATUSES.includes(sp.status as StatusFilter)
    ? (sp.status as StatusFilter)
    : 'pending'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = getAdminClient() as any

  let query = admin
    .from('tool_submissions')
    .select(
      'id, user_id, name, website_url, tagline, description, pricing_type, categories_freetext, logo_url, submitter_role, normalized_domain, proposed_slug, status, rejected_reason, created_at, tool_id',
    )
    .order('created_at', { ascending: false })
    .limit(100)
  if (status !== 'all') query = query.eq('status', status)
  const { data: rowsRaw } = await query
  const rows = (rowsRaw ?? []) as Row[]

  // Per-row context: submitter email + dedupe hints (same-domain / same-slug
  // / similar-name tools, drafts included).
  const cards: SubmissionCardData[] = await Promise.all(
    rows.map(async row => {
      const [emailRes, similarRes] = await Promise.all([
        admin.auth.admin.getUserById(row.user_id).catch(() => null),
        admin
          .from('tools')
          .select('slug, name, is_published, website_url')
          .or(`slug.eq.${row.proposed_slug},name.ilike.%${row.name.replace(/[%,]/g, '')}%`)
          .limit(5),
      ])
      const domainUsable = !MULTI_TENANT_HOSTS.has(row.normalized_domain)
      const { data: domainToolsRaw } = domainUsable
        ? await admin
            .from('tools')
            .select('slug, name, is_published, website_url')
            .ilike('website_url', `%${row.normalized_domain}%`)
            .limit(5)
        : { data: [] }

      type ToolHint = { slug: string; name: string; is_published: boolean; website_url: string | null }
      const merged = new Map<string, ToolHint>()
      for (const t of [...((similarRes?.data ?? []) as ToolHint[]), ...((domainToolsRaw ?? []) as ToolHint[])]) {
        // Exact-domain ilike prefilter can substring-match ("ai.com" in
        // "openai.com") — keep name/slug hits, verify domain hits exactly.
        const fromDomainQuery = t.website_url && domainUsable
          ? normalizeDomain(t.website_url) === row.normalized_domain
          : false
        const fromNameQuery = ((similarRes?.data ?? []) as ToolHint[]).some(s => s.slug === t.slug)
        if (fromDomainQuery || fromNameQuery) merged.set(t.slug, t)
      }

      return {
        ...row,
        submitter_email: emailRes?.data?.user?.email ?? null,
        similar_tools: Array.from(merged.values()).map(({ slug, name, is_published }) => ({
          slug,
          name,
          is_published,
        })),
      }
    }),
  )

  const counts = { pending: 0, approved: 0, rejected: 0 }
  {
    const { data: allRaw } = await admin.from('tool_submissions').select('status')
    for (const r of (allRaw ?? []) as Array<{ status: keyof typeof counts }>) {
      if (r.status in counts) counts[r.status]++
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader />
      <div>
        <h1 className="text-2xl font-bold text-white">Tool submissions</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Vendor-submitted tools. Approve → draft pipeline (onboard SOP publishes if quality gates
          pass). Reject → submitter is emailed the reason. Submissions never influence rankings.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map(s => (
          <Link
            key={s}
            href={s === 'pending' ? '/admin/submissions' : `/admin/submissions?status=${s}`}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              s === status
                ? 'border-emerald-600 text-emerald-300 bg-emerald-950/40'
                : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {s}
            {s !== 'all' && (
              <span className="ml-1 text-xs text-zinc-500">{counts[s as keyof typeof counts]}</span>
            )}
          </Link>
        ))}
      </div>

      {cards.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6">
          <p className="text-zinc-400">No {status === 'all' ? '' : `${status} `}submissions.</p>
          <p className="text-sm text-zinc-500 mt-1">
            Vendors submit at <span className="text-emerald-400">/submit</span>; new ones land here
            and ping {`ADMIN_NOTIFY_EMAIL`}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map(c => (
            <SubmissionCard key={c.id} sub={c} />
          ))}
        </div>
      )}
    </div>
  )
}
