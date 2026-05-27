/**
 * Phase 9 — Cornerstone editorial section.
 *
 * Renders the hand-written editorial layer (h1, subtitle, byline,
 * curated picks, top compares, long-form prose, FAQ) above the
 * generic category listing. Only mounts when /lib/cornerstones has
 * a registered entry for the current category slug.
 *
 * Pure presentational. Data sourced from lib/cornerstones/<slug>.tsx.
 * JSON-LD (Article + FAQPage) is emitted by the page renderer, not
 * here, so it co-locates with the breadcrumb schema.
 */

import Link from 'next/link'
import { ArrowRight, ShieldCheck, Clock } from 'lucide-react'
import type { Cornerstone } from '@/lib/cornerstones/types'

type Props = {
  cornerstone: Cornerstone
}

export function CornerstoneSection({ cornerstone }: Props) {
  const {
    h1,
    subtitle,
    lastReviewed,
    lastReviewedISO,
    picks,
    topCompares,
    body,
    faqs,
  } = cornerstone

  return (
    <article className="mb-12">
      {/* Hero */}
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          {h1}
        </h1>
        <p className="mt-3 max-w-3xl text-base text-zinc-300 leading-relaxed">
          {subtitle}
        </p>

        {/* Byline + last-reviewed — E-E-A-T anchor */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Reviewed by RightAIChoice editorial on{' '}
            <time dateTime={lastReviewedISO} className="font-semibold">
              {lastReviewed}
            </time>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3 w-3" aria-hidden />
            Last updated{' '}
            <time dateTime={lastReviewedISO} className="font-medium text-zinc-300">
              {lastReviewedISO}
            </time>
          </span>
        </div>
      </header>

      {/* Top head-to-head compares — above-the-fold crawl-priority strip */}
      {topCompares.length > 0 && (
        <section className="mb-10 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Popular head-to-head comparisons
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topCompares.map((c) => (
              <Link
                key={c.slug}
                href={`/compare/${c.slug}`}
                className="group rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition-colors hover:border-emerald-500/40 hover:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-white">
                    {c.label}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-400" />
                </div>
                <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                  {c.blurb}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Curated picks — "best for X" grid */}
      {picks.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white">Our picks</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Six tools, each the best at one specific job. Click through for
            the full editorial review and side-by-side pricing.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {picks.map((p) => (
              <Link
                key={p.slug}
                href={`/tools/${p.slug}`}
                className="group rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 transition-colors hover:border-emerald-500/40 hover:bg-zinc-900"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                  {p.bestFor}
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-lg font-bold text-white">{p.name}</span>
                  <ArrowRight className="h-4 w-4 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-400" />
                </div>
                <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
                  {p.reason}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Long-form editorial body. Element classes live in the
          cornerstone .tsx data file — keeps this renderer simple and
          avoids depending on @tailwindcss/typography (not installed). */}
      <div className="max-w-3xl">{body}</div>

      {/* FAQ — rendered as semantic h2 + dl pairs so it's accessible
          and matches the FAQPage JSON-LD emitted by the page. */}
      {faqs.length > 0 && (
        <section className="mt-12 border-t border-zinc-800 pt-10">
          <h2 className="text-2xl font-semibold text-white">
            Frequently asked questions
          </h2>
          <dl className="mt-6 space-y-6">
            {faqs.map((f) => (
              <div key={f.question}>
                <dt className="text-base font-semibold text-white">
                  {f.question}
                </dt>
                <dd className="mt-2 text-sm text-zinc-300 leading-relaxed">
                  {f.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Divider into the listing below */}
      <div className="mt-12 mb-2 border-t border-zinc-800 pt-8">
        <h2 className="text-2xl font-semibold text-white">
          Browse every tool in this category
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          The complete filterable list of every AI tool we cover in this
          space.
        </p>
      </div>
    </article>
  )
}
