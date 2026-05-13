/**
 * Phase 8.next Stage 5 / Tier 2 (2026-05-13): "Latest from {Tool}" UI section.
 *
 * Renders the latest_updates JSONB array as a chronological timeline
 * of 5-10 items with source pill, formatted date, title, summary, and
 * external link-out. Empty state shows "We're gathering recent updates"
 * with a tracker icon.
 *
 * Position on /tools/[slug]: between "Our Take" verdict block and the
 * Viability Score section (high prominence — freshness is the most
 * important user-facing signal we ship).
 */
import {
  ListChecks,
  Megaphone,
  Newspaper,
  MessageCircle,
  TrendingUp,
  AtSign, // Twitter/X icon was deprecated from lucide post-rebrand; @ is the cleanest standin
  ExternalLink,
  Radio,
} from 'lucide-react'

type LatestUpdateItem = {
  date: string
  source: 'changelog' | 'blog' | 'news' | 'reddit' | 'hackernews' | 'twitter'
  title: string
  url: string
  summary: string
  type: 'feature' | 'pricing' | 'launch' | 'discussion' | 'news' | 'changelog'
}

const SOURCE_META: Record<
  LatestUpdateItem['source'],
  { Icon: typeof ListChecks; label: string; tone: string }
> = {
  changelog: { Icon: ListChecks, label: 'Changelog', tone: 'text-emerald-400' },
  blog: { Icon: Megaphone, label: 'Blog', tone: 'text-sky-400' },
  news: { Icon: Newspaper, label: 'News', tone: 'text-amber-400' },
  reddit: { Icon: MessageCircle, label: 'Reddit', tone: 'text-orange-400' },
  hackernews: { Icon: TrendingUp, label: 'Hacker News', tone: 'text-orange-500' },
  twitter: { Icon: AtSign, label: 'Twitter / X', tone: 'text-zinc-300' },
}

function formatDate(isoDate: string): string {
  // Prefer relative ("3 days ago") for ≤30d, absolute ("May 4") for older
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return isoDate
  const ms = Date.now() - d.getTime()
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days <= 30) return `${days} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatHeaderTimestamp(isoTs: string | null | undefined): string | null {
  if (!isoTs) return null
  const d = new Date(isoTs)
  if (Number.isNaN(d.getTime())) return null
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days <= 30) return `${days} days ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function LatestUpdatesSection({
  toolName,
  items,
  updatedAt,
}: {
  toolName: string
  items: LatestUpdateItem[] | null | undefined
  updatedAt: string | null | undefined
}) {
  const safeItems = Array.isArray(items) ? items : []
  const headerStamp = formatHeaderTimestamp(updatedAt)

  // Empty state: section still renders so the page-flow stays
  // consistent across tools (some pages have rich data, others wait
  // for the next refresh — both should look intentional).
  if (safeItems.length === 0) {
    return (
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Radio className="h-5 w-5 text-emerald-400" />
            Latest from {toolName}
          </h2>
        </div>
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-6 text-sm text-zinc-500">
          We're gathering recent updates for {toolName} from changelogs,
          press, Hacker News, and social. Check back in a day or two.
        </div>
      </section>
    )
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Radio className="h-5 w-5 text-emerald-400" />
          Latest from {toolName}
        </h2>
        {headerStamp && (
          <span className="text-xs text-zinc-500">Updated {headerStamp}</span>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 divide-y divide-zinc-800/70">
        {safeItems.map((item, i) => {
          const meta = SOURCE_META[item.source] ?? SOURCE_META.news
          const Icon = meta.Icon
          return (
            <a
              key={`${item.url}-${i}`}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 p-4 hover:bg-zinc-900/60 transition-colors"
            >
              <div className={`mt-0.5 shrink-0 ${meta.tone}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span className={meta.tone}>{meta.label}</span>
                  <span>·</span>
                  <span>{formatDate(item.date)}</span>
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 line-clamp-2">
                  {item.title}
                </h3>
                {item.summary && (
                  <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
                    {item.summary}
                  </p>
                )}
              </div>
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-700 group-hover:text-emerald-400 transition-colors" />
            </a>
          )
        })}
      </div>
    </section>
  )
}
