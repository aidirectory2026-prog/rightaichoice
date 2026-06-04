import Link from 'next/link'
import { Radar, ArrowRight } from 'lucide-react'

// Phase 9 S6 — prominent inline CTA banner that drives the tool page to the
// dedicated live Market Sentiment page. Matches the site's PlanCTAInline design
// language (emerald gradient card, icon + headline + one-line description +
// button) but sized as a high-visibility full-width banner near the top of the
// content for conversion.

export function SentimentCTA({ toolSlug, toolName }: { toolSlug: string; toolName: string }) {
  return (
    <section
      aria-label={`See what real users think about ${toolName}`}
      className="mt-6 overflow-hidden rounded-2xl border border-emerald-600/40 bg-gradient-to-br from-emerald-950/50 via-zinc-950 to-zinc-900/40 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/40 sm:flex">
            <Radar className="h-5 w-5 text-emerald-300" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-white sm:text-lg">Is {toolName} actually worth it?</h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" /></span>
                Live
              </span>
            </div>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-400">
              See what <span className="text-zinc-200">real users</span> actually say. We scan live discussions, reviews
              and complaints across the web and hand you an honest verdict — in under a minute.
            </p>
            <p className="mt-1.5 text-xs text-zinc-500">3 free scans · no card needed · downloadable report</p>
          </div>
        </div>

        <Link
          href={`/tools/${toolSlug}/sentiment`}
          className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-emerald-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
        >
          Run a free scan
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </section>
  )
}
