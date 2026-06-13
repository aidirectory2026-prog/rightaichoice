// Phase 10.8 — Resources (the in-admin learning guide). Shared presentational
// helpers for the six guide sections. Server-renderable (no client state):
// plain HTML + Tailwind in the dark-zinc admin idiom (matching
// components/admin/charts + metric-info). Pure layout — every word of guide
// CONTENT lives in the section pages; the AUTO-GENERATED sections (dictionary,
// metric cards) derive their data from lib/analytics-schema.ts and
// lib/admin/metric-docs.ts at render time so they can never drift.

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

/** Page title + one-line subtitle, matching the per-section header idiom. */
export function GuideHeader({
  title,
  subtitle,
  icon,
}: {
  title: string
  subtitle: string
  icon?: ReactNode
}) {
  return (
    <header className="mb-8">
      <h1 className="flex items-center gap-2 text-xl font-semibold text-white">
        {icon}
        {title}
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">{subtitle}</p>
    </header>
  )
}

/** A titled content section with an optional eyebrow + audience tag. */
export function Section({
  title,
  audience,
  children,
}: {
  title: string
  /** Optional badge — "for everyone" / "technical". */
  audience?: 'everyone' | 'technical'
  children: ReactNode
}) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
        {audience === 'everyone' && (
          <span className="rounded-full border border-emerald-900 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            for everyone
          </span>
        )}
        {audience === 'technical' && (
          <span className="rounded-full border border-sky-900 bg-sky-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-400">
            technical
          </span>
        )}
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-zinc-300">{children}</div>
    </section>
  )
}

/** A bordered callout card (note / warning / tip tones). */
export function Callout({
  tone = 'note',
  title,
  children,
}: {
  tone?: 'note' | 'warn' | 'good'
  title?: string
  children: ReactNode
}) {
  const tones = {
    note: 'border-zinc-800 bg-zinc-900/50 text-zinc-300',
    warn: 'border-amber-900/60 bg-amber-950/30 text-amber-200/90',
    good: 'border-emerald-900/60 bg-emerald-950/30 text-emerald-200/90',
  } as const
  return (
    <div className={`rounded-lg border p-4 text-sm leading-relaxed ${tones[tone]}`}>
      {title && <div className="mb-1 font-semibold">{title}</div>}
      {children}
    </div>
  )
}

/** Inline code / mono token. */
export function Code({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-zinc-950 px-1.5 py-0.5 font-mono text-[12px] text-emerald-300">
      {children}
    </span>
  )
}

/** A definition row (term + explanation) for glossary-style lists. */
export function DefRow({ term, children }: { term: ReactNode; children: ReactNode }) {
  return (
    <div className="border-b border-zinc-900 py-3 last:border-0 sm:grid sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="font-mono text-sm font-medium text-emerald-300">{term}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-zinc-400 sm:mt-0">{children}</dd>
    </div>
  )
}

/** Card link to another guide section (used on the landing page). */
export function GuideCard({
  href,
  step,
  title,
  blurb,
  icon,
}: {
  href: string
  step: string
  title: string
  blurb: string
  icon: ReactNode
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-emerald-800 hover:bg-zinc-900"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-emerald-400 group-hover:bg-emerald-950">
          {icon}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{step}</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100 group-hover:text-white">
        {title}
        <ArrowRight className="h-3.5 w-3.5 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-400" />
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{blurb}</p>
    </Link>
  )
}

/** Footer nav between guide sections (prev / next / back to index). */
export function GuideFooterNav({
  prev,
  next,
}: {
  prev?: { href: string; label: string }
  next?: { href: string; label: string }
}) {
  return (
    <nav className="mt-12 flex items-center justify-between gap-4 border-t border-zinc-800 pt-6 text-sm">
      {prev ? (
        <Link href={prev.href} className="text-zinc-400 hover:text-emerald-400">
          ← {prev.label}
        </Link>
      ) : (
        <Link href="/admin/resources" className="text-zinc-500 hover:text-zinc-300">
          ← All guide sections
        </Link>
      )}
      {next ? (
        <Link href={next.href} className="text-right text-zinc-400 hover:text-emerald-400">
          {next.label} →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}
