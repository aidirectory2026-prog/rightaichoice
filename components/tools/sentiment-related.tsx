import Link from 'next/link'
import { ArrowRight, Radar, GitCompareArrows, LayoutGrid, HelpCircle } from 'lucide-react'
import { ToolLogo } from '@/components/tools/tool-logo'

// Phase 9 S6 — server-rendered interlink + FAQ sections beneath the live
// sentiment experience. Fills the page, keeps users in the funnel (scan other
// tools), and adds real internal links (compares, alternatives, category).

type AltTool = { slug: string; name: string; tagline?: string | null; logo_url?: string | null }
type Compare = { slug: string }
type Category = { name: string; slug: string } | null

function titleize(slug: string): string {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const FAQS = (toolName: string) => [
  { q: `Where does the ${toolName} sentiment come from?`, a: `We sweep the open web in real time — social media, community forums, review sites, video reviews and public discussions — then synthesize what real users actually say into one honest report.` },
  { q: 'How current is the data?', a: `Every scan runs live, right when you click — so it reflects what people are saying now, not a stale cache. Each report also lists the actual recent mentions behind it.` },
  { q: 'Is it unbiased?', a: `Yes. We don't take vendor input for these reports — the verdict is built from independent user opinion, including the complaints and red flags marketing pages leave out.` },
  { q: 'How much does it cost?', a: `Your first 3 scans are free with an account — no card needed. After that it's a small one-time fee per scan (₹20 in India, $1 internationally). No subscription.` },
  { q: 'Can I download the report?', a: `Yes — every report can be downloaded as a clean, shareable file with the full verdict, praise, gripes, quotes and live mentions.` },
]

export function SentimentRelated({
  toolName, toolSlug, alternatives, compares, category,
}: {
  toolName: string; toolSlug: string; alternatives: AltTool[]; compares: Compare[]; category: Category
}) {
  const otherFromCompare = (slug: string) => {
    const parts = slug.split('-vs-')
    return parts.find((p) => p !== toolSlug) ?? parts[parts.length - 1]
  }

  return (
    <div className="mt-12 space-y-12">
      {/* Compare head-to-head */}
      {compares.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white"><GitCompareArrows className="h-5 w-5 text-emerald-400" /> Compare {toolName} head-to-head</h2>
          <p className="mt-1 text-sm text-zinc-500">See how it stacks up against the tools people weigh it against.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {compares.slice(0, 8).map((c) => (
              <Link key={c.slug} href={`/compare/${c.slug}`} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-sm font-medium text-zinc-200 transition hover:border-emerald-600/50 hover:text-white">
                {toolName} vs {titleize(otherFromCompare(c.slug))}
                <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Top alternatives */}
      {alternatives.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white"><LayoutGrid className="h-5 w-5 text-emerald-400" /> Top alternatives to {toolName}</h2>
          <p className="mt-1 text-sm text-zinc-500">Researching options? Explore the closest alternatives.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alternatives.slice(0, 6).map((a) => (
              <Link key={a.slug} href={`/tools/${a.slug}`} className="group rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 transition hover:border-emerald-500/30">
                <div className="flex items-center gap-3">
                  {/* P3 (Cowork QA): ToolLogo (next/image + initial-letter fallback) replaces the raw <img>. */}
                  <ToolLogo
                    tool={a}
                    size={36}
                    className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-800"
                    fallbackClassName="text-sm font-bold text-zinc-400"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white group-hover:text-emerald-300">{a.name}</p>
                    {a.tagline && <p className="truncate text-xs text-zinc-500">{a.tagline}</p>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Scan other tools — keep users in the sentiment funnel */}
      {alternatives.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white"><Radar className="h-5 w-5 text-emerald-400" /> Check sentiment on these too</h2>
          <p className="mt-1 text-sm text-zinc-500">Run a live scan on the alternatives before you decide.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {alternatives.slice(0, 8).map((a) => (
              <Link key={a.slug} href={`/tools/${a.slug}/sentiment`} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/40 bg-emerald-950/20 px-3.5 py-2 text-sm font-medium text-emerald-200 transition hover:border-emerald-600 hover:bg-emerald-950/40">
                Scan {a.name}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white"><HelpCircle className="h-5 w-5 text-emerald-400" /> Frequently asked</h2>
        <div className="mt-4 space-y-3">
          {FAQS(toolName).map((f) => (
            <div key={f.q} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
              <h3 className="text-sm font-semibold text-white">{f.q}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer interlinks */}
      <section className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-zinc-800 pt-6 text-sm">
        <Link href={`/tools/${toolSlug}`} className="text-emerald-300 hover:text-emerald-200">← Back to {toolName}</Link>
        {category && <Link href={`/tools?category=${category.slug}`} className="text-zinc-400 hover:text-white">Browse {category.name}</Link>}
        <Link href="/tools" className="text-zinc-400 hover:text-white">All AI tools</Link>
        <Link href="/compare" className="text-zinc-400 hover:text-white">All comparisons</Link>
      </section>
    </div>
  )
}
