// Phase 10.8 — Resources §1: How tracking works (non-technical). The story of
// a visitor's action travelling from their browser to these admin screens,
// with a styled pipeline diagram (no chart/diagram dependency — plain divs + a
// tiny inline SVG for the connectors).

import { Workflow, MousePointerClick, Code2, Database, BarChart3, ShieldCheck } from 'lucide-react'
import { GuideHeader, Section, Callout, GuideFooterNav } from '../_components'

export const metadata = { title: 'How tracking works — Learning guide' }

const STAGES = [
  {
    icon: MousePointerClick,
    title: 'A visitor does something',
    body: 'Someone opens a page, clicks "Visit website", types a goal into the plan box, scrolls, or buys a sentiment scan. Every meaningful action is something we want to learn from.',
  },
  {
    icon: Code2,
    title: 'Our tracking code notices',
    body: 'A small piece of code loaded with every page watches for those actions. When one happens it builds a tidy record — what happened, on which page, on what kind of device, where the visitor came from.',
  },
  {
    icon: Database,
    title: 'It is written down — twice',
    body: 'That record is sent to two places at once: Mixpanel (an outside analytics tool we keep as a backup) AND our own database, which we fully own and never run out of room in.',
  },
  {
    icon: BarChart3,
    title: 'These admin screens read it back',
    body: 'Every chart, tile and table you see in this admin panel is built by counting and grouping those records — almost always from our own database, the copy we control.',
  },
] as const

export default function TrackingOverviewPage() {
  return (
    <div>
      <GuideHeader
        icon={<Workflow className="h-6 w-6 text-emerald-500" />}
        title="How tracking works"
        subtitle="The plain-English version — no code required. This is the journey every visitor's action takes to become a number you can read on these screens."
      />

      <Section title="The four-step journey" audience="everyone">
        <p>
          Think of it as a relay. A visitor does something, our code catches it, it gets written
          down in two places, and then this admin panel reads it back as charts. Here is the whole
          pipeline:
        </p>
      </Section>

      {/* ── Pipeline diagram (styled divs + inline SVG arrows) ──────────── */}
      <div className="mb-10 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-stretch">
          {STAGES.map((s, i) => (
            <div key={s.title} className="contents">
              <div className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950 text-emerald-400">
                    <s.icon className="h-4 w-4" />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                    Step {i + 1}
                  </span>
                </div>
                <div className="text-sm font-semibold text-zinc-100">{s.title}</div>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{s.body}</p>
              </div>
              {i < STAGES.length - 1 && (
                <div className="flex items-center justify-center" aria-hidden>
                  {/* horizontal arrow on wide screens, vertical on narrow */}
                  <svg className="hidden h-6 w-6 text-emerald-700 md:block" viewBox="0 0 24 24" fill="none">
                    <path d="M4 12h14m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <svg className="h-6 w-6 rotate-90 text-emerald-700 md:hidden" viewBox="0 0 24 24" fill="none">
                    <path d="M4 12h14m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-[11px] text-zinc-600">
          Browser → our tracking code → Mixpanel + our database → this admin panel
        </p>
      </div>

      <Section title="Why we keep our own copy" audience="everyone">
        <p>
          Mixpanel is excellent, but its free plan limits how much we can analyse, and the data
          lives on someone else's servers. So every record is <strong>also</strong> written into a
          database we own outright. That copy is the one these admin screens read. It means: no
          monthly caps on what we can look at, no vendor deciding what we can ask, and a permanent
          record we control. Mixpanel stays as a convenient backup mirror; Microsoft Clarity stays
          for watching anonymised session replays.
        </p>
      </Section>

      <Section title="Why some numbers are smaller than you'd expect" audience="everyone">
        <p>
          Two honest realities shape what we can see, and the guide is upfront about both:
        </p>
        <ul className="list-disc space-y-2 pl-5 text-zinc-400">
          <li>
            <strong>Ad-blockers.</strong> Many visitors (especially a tech-savvy audience) run an
            ad-blocker that stops our tracking code from loading. We never see those page views
            client-side. For the few actions our own server handles directly — like a confirmed
            "visit website" redirect or a payment — we still capture them, because the server does
            the writing, not the browser.
          </li>
          <li>
            <strong>Bots.</strong> A large share of raw web traffic is automated crawlers, not
            people. We flag the ones we can detect and, by default, every "real users" number on
            these screens excludes them. We catch essentially all of what we flag, but some clever
            bots still slip through — so treat human counts as a careful upper bound, never an
            exact headcount.
          </li>
        </ul>
      </Section>

      <Callout tone="note" title="Where to go deeper">
        Want the exact mechanics — the function names, the database tables, how a logged-out and a
        logged-in visit get stitched into one person? That is the next section,{' '}
        <em>How tracking works, technically</em>. Want to know why a specific tile is trustworthy?
        Open the <em>Metric provenance cards</em>.
      </Callout>

      <Callout tone="good" title="One-sentence summary">
        Every action a visitor takes is caught by our tracking code, written into a database we
        own (and mirrored to Mixpanel), and then counted up into the charts you see here —
        bot-filtered and honest about its blind spots.
      </Callout>

      <GuideFooterNav
        next={{ href: '/admin/resources/tracking-technical', label: 'How tracking works, technically' }}
      />
    </div>
  )
}
