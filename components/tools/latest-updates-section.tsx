'use client'

/**
 * "Latest from {Tool}" — smart activity feed (Phase 9 S8 redesign).
 *
 * Replaces the flat chronological list with: a deterministic "what changed
 * lately" recap line, type filter chips (All / Feature / Pricing / Launch / …),
 * and color-coded type badges + source pill per item. Still reads the same
 * latest_updates JSONB shape; no data pipeline change. The freshest item is
 * flagged "Newest". Empty state unchanged in spirit.
 *
 * Position on /tools/[slug]: between "Our Take" verdict and the Viability Score.
 */
import { useMemo, useState } from 'react'
import {
  ListChecks,
  Megaphone,
  Newspaper,
  MessageCircle,
  TrendingUp,
  AtSign, // Twitter/X icon was deprecated from lucide post-rebrand; @ is the cleanest standin
  ExternalLink,
  Radio,
  Sparkles,
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

// Type → badge styling + display label. Drives both the chips and per-item pills.
const TYPE_META: Record<
  LatestUpdateItem['type'],
  { label: string; dot: string; chip: string }
> = {
  feature: { label: 'Feature', dot: 'bg-emerald-400', chip: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  launch: { label: 'Launch', dot: 'bg-amber-400', chip: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  pricing: { label: 'Pricing', dot: 'bg-sky-400', chip: 'border-sky-500/30 bg-sky-500/10 text-sky-300' },
  changelog: { label: 'Changelog', dot: 'bg-violet-400', chip: 'border-violet-500/30 bg-violet-500/10 text-violet-300' },
  discussion: { label: 'Discussion', dot: 'bg-orange-400', chip: 'border-orange-500/30 bg-orange-500/10 text-orange-300' },
  news: { label: 'News', dot: 'bg-zinc-300', chip: 'border-zinc-600/40 bg-zinc-700/20 text-zinc-300' },
}
const TYPE_ORDER: LatestUpdateItem['type'][] = ['feature', 'launch', 'pricing', 'changelog', 'discussion', 'news']
const TYPE_NOUN: Record<LatestUpdateItem['type'], [string, string]> = {
  feature: ['feature update', 'feature updates'],
  launch: ['launch', 'launches'],
  pricing: ['pricing change', 'pricing changes'],
  changelog: ['changelog entry', 'changelog entries'],
  discussion: ['community discussion', 'community discussions'],
  news: ['news mention', 'news mentions'],
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

// Deterministic "what changed lately" recap from the item type mix — no AI call,
// no new data, so it stays accurate and free.
function buildRecap(items: LatestUpdateItem[]): string | null {
  if (items.length === 0) return null
  const counts = new Map<LatestUpdateItem['type'], number>()
  for (const it of items) counts.set(it.type, (counts.get(it.type) ?? 0) + 1)
  const parts: string[] = []
  for (const t of TYPE_ORDER) {
    const n = counts.get(t)
    if (!n) continue
    const [one, many] = TYPE_NOUN[t]
    parts.push(`${n} ${n === 1 ? one : many}`)
  }
  if (parts.length === 0) return null
  const joined =
    parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
  return `Across the latest ${items.length} update${items.length === 1 ? '' : 's'}: ${joined}.`
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
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items])
  const headerStamp = formatHeaderTimestamp(updatedAt)
  const recap = useMemo(() => buildRecap(safeItems), [safeItems])
  // Types actually present, in canonical order — drives the filter chips.
  const presentTypes = useMemo(
    () => TYPE_ORDER.filter((t) => safeItems.some((i) => i.type === t)),
    [safeItems],
  )
  const [active, setActive] = useState<'all' | LatestUpdateItem['type']>('all')
  const visible = active === 'all' ? safeItems : safeItems.filter((i) => i.type === active)

  // Newest item (by date) gets a subtle "Newest" flag.
  const newestKey = useMemo(() => {
    let best: { key: string; t: number } | null = null
    for (const i of safeItems) {
      const t = new Date(i.date).getTime()
      if (!Number.isNaN(t) && (!best || t > best.t)) best = { key: i.url + i.date, t }
    }
    return best?.key ?? null
  }, [safeItems])

  // Empty state: section still renders so the page-flow stays consistent.
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
          We&apos;re gathering recent updates for {toolName} from changelogs,
          press, Hacker News, and social. Check back in a day or two.
        </div>
      </section>
    )
  }

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Radio className="h-5 w-5 text-emerald-400" />
          Latest from {toolName}
        </h2>
        {headerStamp && <span className="text-xs text-zinc-500">Updated {headerStamp}</span>}
      </div>

      {/* "What changed lately" recap */}
      {recap && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-4 py-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <p className="text-sm text-zinc-300">{recap}</p>
        </div>
      )}

      {/* Type filter chips */}
      {presentTypes.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setActive('all')}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active === 'all'
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-700 text-zinc-400 hover:text-white'
            }`}
          >
            All ({safeItems.length})
          </button>
          {presentTypes.map((t) => {
            const n = safeItems.filter((i) => i.type === t).length
            const on = active === t
            return (
              <button
                key={t}
                onClick={() => setActive(t)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  on ? TYPE_META[t].chip : 'border-zinc-700 text-zinc-400 hover:text-white'
                }`}
              >
                {TYPE_META[t].label} ({n})
              </button>
            )
          })}
        </div>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 divide-y divide-zinc-800/70">
        {visible.map((item, i) => {
          const sm = SOURCE_META[item.source] ?? SOURCE_META.news
          const tm = TYPE_META[item.type] ?? TYPE_META.news
          const Icon = sm.Icon
          const isNewest = newestKey === item.url + item.date
          return (
            <a
              key={`${item.url}-${i}`}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 p-4 hover:bg-zinc-900/60 transition-colors"
            >
              <div className={`mt-0.5 shrink-0 ${sm.tone}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tm.chip}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${tm.dot}`} />
                    {tm.label}
                  </span>
                  <span className="text-zinc-500">{sm.label}</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-500">{formatDate(item.date)}</span>
                  {isNewest && (
                    <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                      Newest
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 line-clamp-2">
                  {item.title}
                </h3>
                {item.summary && (
                  <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{item.summary}</p>
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
