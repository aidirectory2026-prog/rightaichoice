// Phase 10.8 — Resources §3: Event dictionary. AUTO-GENERATED at render time
// from lib/analytics-schema.ts (the schema registry) — NOT hand-copied — so it
// can never drift from the events the app actually fires. For every event:
// plain-English meaning, technical description, lifecycle status, every
// property (name / type / required), and a link to its live
// /admin/insights/events?event=<name> detail page. Grouped by category like
// the Events explorer.

import Link from 'next/link'
import { ListTree, ArrowUpRight } from 'lucide-react'
import { GuideHeader, Section, Callout, GuideFooterNav } from '../_components'
import {
  EVENT_SCHEMAS,
  SCHEMA_EVENT_NAMES,
  SERVER_ONLY_EVENTS,
  type EventCategory,
  type EventSchemaEntry,
} from '@/lib/analytics-schema'
import { schemaPropTypes, eventLifecycle, type EventLifecycleStatus } from '@/lib/admin/event-props'

export const metadata = { title: 'Event dictionary — Learning guide' }

/** Display order + a friendly label per registry category. */
const CATEGORY_META: Array<{ cat: EventCategory; label: string; blurb: string }> = [
  { cat: 'navigation', label: 'Navigation & top-level CTAs', blurb: 'Page views and the main call-to-action buttons.' },
  { cat: 'discovery', label: 'Discovery', blurb: 'Browsing, filtering and finding tools.' },
  { cat: 'search', label: 'Search', blurb: 'The site search box and its results.' },
  { cat: 'tools', label: 'Tools', blurb: 'Tool detail pages, saves, and vendor click-outs.' },
  { cat: 'compare', label: 'Compare', blurb: 'Side-by-side tool comparisons.' },
  { cat: 'plan', label: 'Plan flow', blurb: 'The guided plan / decision-engine funnel.' },
  { cat: 'chat', label: 'AI chat', blurb: 'The conversational assistant.' },
  { cat: 'reviews', label: 'Reviews', blurb: 'User reviews and ratings.' },
  { cat: 'sentiment', label: 'Sentiment Checker', blurb: 'The paid market-sentiment scan family.' },
  { cat: 'auth', label: 'Auth & accounts', blurb: 'Signup, login and account steps.' },
  { cat: 'engagement', label: 'Engagement', blurb: 'Scroll, time, clicks, errors — ambient behaviour signals.' },
  { cat: 'content', label: 'Content', blurb: 'Newsletter and content interactions.' },
  { cat: 'system', label: 'System', blurb: 'Performance and technical telemetry.' },
]

const LIFECYCLE_BADGE: Record<EventLifecycleStatus, { label: string; cls: string }> = {
  fired: { label: 'FIRED', cls: 'border-emerald-800 bg-emerald-950/40 text-emerald-300' },
  planned: { label: 'PLANNED', cls: 'border-sky-800 bg-sky-950/40 text-sky-300' },
  deprecated: { label: 'DEPRECATED', cls: 'border-zinc-700 bg-zinc-900 text-zinc-400' },
  unregistered: { label: 'UNREGISTERED', cls: 'border-rose-800 bg-rose-950/40 text-rose-300' },
}

function EventCard({ name }: { name: string }) {
  const entry = (EVENT_SCHEMAS as Record<string, EventSchemaEntry>)[name]
  const lc = eventLifecycle(name)
  const props = schemaPropTypes(name)
  const isServerOnly = SERVER_ONLY_EVENTS.has(name)

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/admin/insights/events?event=${encodeURIComponent(name)}`}
          className="group inline-flex items-center gap-1 font-mono text-sm font-semibold text-emerald-300 hover:text-emerald-200"
        >
          {name}
          <ArrowUpRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-emerald-400" />
        </Link>
        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wider ${LIFECYCLE_BADGE[lc.status].cls}`}>
          {LIFECYCLE_BADGE[lc.status].label}
        </span>
        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[9px] font-medium tracking-wider text-zinc-400">
          {entry.source}{isServerOnly ? ' · server-only' : ''}
        </span>
      </div>

      <p className="mt-2 text-sm text-zinc-200">{entry.plainEnglish}</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{entry.description}</p>

      <div className="mt-3 border-t border-zinc-800 pt-2">
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Properties ({props.length})
        </div>
        {props.length === 0 ? (
          <p className="text-[11px] text-zinc-500">
            No payload properties — this event carries only the shared envelope (session, device,
            attribution).
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-[11px] sm:grid-cols-2">
            {props.map((p) => (
              <li key={p.key} className="font-mono">
                <span className="text-emerald-300">{p.key}</span>
                <span className="text-zinc-300">: {p.type}</span>
                <span className={p.optional ? 'text-zinc-600' : 'text-amber-500/70'}>
                  {p.optional ? ' (optional)' : ' (required)'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function EventDictionaryPage() {
  const schemas = EVENT_SCHEMAS as Record<string, EventSchemaEntry>
  const groups = CATEGORY_META.map((m) => ({
    ...m,
    names: SCHEMA_EVENT_NAMES.filter((n) => schemas[n].category === m.cat),
  })).filter((g) => g.names.length > 0)

  // Defensive: surface any category present in the registry that this page's
  // ordered list doesn't know about, so a new category can never silently
  // hide events (the dictionary stays exhaustive by construction).
  const known = new Set(CATEGORY_META.map((m) => m.cat))
  const orphanNames = SCHEMA_EVENT_NAMES.filter((n) => !known.has(schemas[n].category))

  return (
    <div>
      <GuideHeader
        icon={<ListTree className="h-6 w-6 text-emerald-500" />}
        title="Event dictionary"
        subtitle={`Every one of the ${SCHEMA_EVENT_NAMES.length} events the app fires, grouped by area. This page is generated live from the schema registry (lib/analytics-schema.ts) — the same source the tracking code, the CI guard and the synthetic suite use — so it always describes reality. Click any event name to open its live detail page (volume, raw rows, synthetic-test status).`}
      />

      <Callout tone="note" title="How to read a property">
        Each property shows its <strong>name</strong>, <strong>type</strong> (string, number,
        boolean, <code className="font-mono text-emerald-300">enum(a|b)</code>, arrays, …) and
        whether it is <strong>required</strong> or <strong>optional</strong>. The lifecycle badge
        says whether the event currently <strong>FIRED</strong>, is <strong>PLANNED</strong>, or
        is <strong>DEPRECATED</strong>. &quot;server-only&quot; events are emitted by our backend
        (payments, the authoritative affiliate redirect) and survive ad-blockers.
      </Callout>

      <p className="mb-6 mt-4 text-sm text-zinc-400">
        Jump to:{' '}
        {groups.map((g, i) => (
          <span key={g.cat}>
            <a href={`#cat-${g.cat}`} className="text-emerald-400 hover:text-emerald-300">
              {g.label}
            </a>
            <span className="text-zinc-600"> ({g.names.length})</span>
            {i < groups.length - 1 ? <span className="text-zinc-700"> · </span> : null}
          </span>
        ))}
      </p>

      {groups.map((g) => (
        <section key={g.cat} id={`cat-${g.cat}`} className="mb-10 scroll-mt-20">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-zinc-100">
              {g.label} <span className="text-sm font-normal text-zinc-500">· {g.names.length}</span>
            </h2>
            <p className="text-xs text-zinc-500">{g.blurb}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {g.names.map((n) => (
              <EventCard key={n} name={n} />
            ))}
          </div>
        </section>
      ))}

      {orphanNames.length > 0 && (
        <Section title="Uncategorised (registry category not in this page's list)" audience="technical">
          <Callout tone="warn">
            These events have a category the dictionary&apos;s ordered list doesn&apos;t render —
            add it to <code className="font-mono">CATEGORY_META</code>. Shown here so no event ever
            disappears from the dictionary.
          </Callout>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {orphanNames.map((n) => (
              <EventCard key={n} name={n} />
            ))}
          </div>
        </Section>
      )}

      <GuideFooterNav
        prev={{ href: '/admin/resources/tracking-technical', label: 'How tracking works, technically' }}
        next={{ href: '/admin/resources/metrics', label: 'Metric provenance cards' }}
      />
    </div>
  )
}
