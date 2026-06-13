// Phase 10.8 — Resources §5: Trust & verification. The eight independent
// verification means that keep these numbers honest, a "this number looks
// wrong" runbook, and the data-privacy / retention posture (RLS: raw events
// incl. IP + UA are admin-read-only). Prose is hand-written here; the data
// epochs are imported live from lib/admin/metric-docs so they can't drift.
import { ShieldCheck } from 'lucide-react'
import { GuideHeader, Section, Callout, Code, GuideFooterNav } from '../_components'
import { EPOCHS } from '@/lib/admin/metric-docs'

export const metadata = { title: 'Trust & verification — Admin' }

const MEANS: { n: number; title: string; plain: string; tech: string }[] = [
  {
    n: 1,
    title: 'Hand-SQL cross-checks',
    plain: 'Every headline number was reproduced by a second, independently hand-written query during the Phase 1 audit — if the dashboard and the hand query agree, the math is right.',
    tech: 'docs/admin/metric-audit.md holds a verdict (PASS/FAIL/UNVERIFIABLE) + a reproduction query per metric, traced into the actual RPC bodies in supabase/migrations.',
  },
  {
    n: 2,
    title: 'Synthetic event suite',
    plain: 'A robot visitor fires every single event we track and we confirm each one lands in the database with all its details — proving nothing is silently broken.',
    tech: 'npm run tracking:synthetic — 97/97 events (real-browser where possible, canonical payload for auth/payment/server paths), asserting the row + every property + the envelope, double-firing to prove dedup, plus a negative test that a malformed event lands tagged schema_valid=false.',
  },
  {
    n: 3,
    title: 'Mixpanel mirror reconciliation',
    plain: 'We send the same events to Mixpanel as a second, independent copy. If our database and Mixpanel disagree, we investigate the gap.',
    tech: 'scripts/mixpanel/verify.ts diffs our user_events against the Mixpanel mirror; deltas are explained or chased.',
  },
  {
    n: 4,
    title: 'Ground-truth table triangulation',
    plain: 'Some things are logged a second way on our own server — page loads, affiliate click-outs, searches. We check the event counts against those server logs.',
    tech: 'page_views, click_logs and search_logs are server-side logs independent of the client event pipeline; used to triangulate page_viewed / tool_visit_redirected / search volumes.',
  },
  {
    n: 5,
    title: 'Rollup-vs-raw reconciliation invariants',
    plain: 'The fast pre-computed trend tables are checked, every night, against the raw events they summarise — they must match exactly for every completed day.',
    tech: 'Phase 7e invariants I13a (event counts) + I13b (DAU) in run_tracking_invariants(): event_rollup_daily / dau_rollup_daily summed back vs raw user_events for every complete IST day < today, exact match or FAIL.',
  },
  {
    n: 6,
    title: 'Filter-matrix verifier',
    plain: 'Every filter and every combination of filters is proven to return exactly what an independent query with the same filters returns — so a filtered view is never quietly wrong.',
    tech: 'npm run tracking:filters — 36 checks: 15 filter combinations (singles, pairs, 3-stacks, with-bots) each run through both the real RPC path and independent raw SQL, demanding exact equality.',
  },
  {
    n: 7,
    title: 'Baseline snapshot diffs',
    plain: 'Before and after every redesign we snapshot every number for a fixed past week. The pixels can change; the numbers must not. A zero diff proves a redesign changed only the look.',
    tech: 'scripts/audit/snapshot-admin-metrics.ts pins a window (2026-06-01→07) and writes docs/admin/baselines/*.json; diff-baselines.ts must report 0 changed/added/removed except documented fixes.',
  },
  {
    n: 8,
    title: 'Nightly watchdog + trust banner',
    plain: 'Every night the whole system re-checks itself, and if anything fails, a red banner appears across every admin page — broken tracking becomes impossible to miss.',
    tech: 'The nightly cron runs the invariant suite into tracking_health; the layout reads the latest batch and renders a red (fail) / amber (warn) trust banner. /admin/tracking-health shows the detail.',
  },
]

export default function TrustPage() {
  return (
    <div>
      <GuideHeader
        icon={<ShieldCheck className="h-6 w-6 text-emerald-500" />}
        title="Trust & verification"
        subtitle="A number is only useful if you can trust it. This is how — eight independent checks, a runbook for when something looks off, and exactly who can see the raw data."
      />

      <Section title="The eight independent verification means" audience="everyone">
        <p>
          No single check is trusted on its own. Each of these proves the numbers a different way,
          so a bug would have to fool all of them at once to survive. They run continuously — most
          on every commit (CI) and every night (the watchdog).
        </p>
        <div className="mt-4 space-y-3">
          {MEANS.map((m) => (
            <div
              key={m.n}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-950 text-xs font-bold text-emerald-400">
                  {m.n}
                </span>
                <h3 className="text-sm font-semibold text-zinc-100">{m.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{m.plain}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{m.tech}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="“This number looks wrong” — a runbook" audience="everyone">
        <p>When a metric looks off, walk these steps in order before assuming the data is bad:</p>
        <ol className="ml-5 list-decimal space-y-2">
          <li>
            <strong>Check the trust banner &amp; <Code>/admin/tracking-health</Code>.</strong> If a
            check is failing (red) or warning (amber), start there — the failing invariant usually
            names the exact problem.
          </li>
          <li>
            <strong>Mind the data epochs.</strong> A number that looks too low before a certain
            date is often an epoch, not a bug — see the caveats below and the Glossary. Attribution
            and channel fields simply did not exist before their epoch.
          </li>
          <li>
            <strong>Remember the bot recall caveat.</strong> Human counts are <em>upper bounds</em>:
            the bot flag catches ~30% of stealth bots, so &quot;humans&quot; still includes some
            undetected automated traffic. A surprisingly high human number may be bots.
          </li>
          <li>
            <strong>Re-run the proof.</strong> <Code>npm run tracking:synthetic</Code> re-proves
            every event end-to-end; <Code>npm run tracking:filters</Code> re-proves every filter;
            the snapshot oracle re-proves the pinned week. Green means the machinery is sound.
          </li>
          <li>
            <strong>Open the metric&apos;s provenance card</strong> (the ⓘ on the tile, or the{' '}
            <Code>/admin/resources/metrics</Code> page) to see precisely what it counts, how, and
            which check covers it — the &quot;wrong&quot; number is often the <em>correct</em>{' '}
            answer to a different question than the one in your head.
          </li>
          <li>
            <strong>Triangulate.</strong> Compare against the independent ground-truth tables
            (page_views / click_logs / search_logs) and the Mixpanel mirror. Agreement across
            independent sources is strong evidence the number is real.
          </li>
        </ol>
      </Section>

      <Section title="Data epochs (the dates a dimension started existing)" audience="everyone">
        <p>These caveats are imported live from the system, so they always reflect reality:</p>
        <ul className="ml-5 list-disc space-y-1.5 text-zinc-300">
          <li>{EPOCHS.mirror}</li>
          <li>{EPOCHS.attribution}</li>
          <li>{EPOCHS.botBackfill}</li>
          <li>{EPOCHS.botRecall}</li>
        </ul>
      </Section>

      <Section title="Privacy & retention" audience="technical">
        <p>
          We capture what a business needs to understand its visitors — and no more. Event payloads
          store <strong>value lengths, not values</strong> for form fields, the{' '}
          <strong>domain only</strong> (never the local part) for any captured email, and{' '}
          <strong>skip password and hidden fields entirely</strong>.
        </p>
        <p>
          Each event row does carry an <Code>ip</Code> and <Code>user_agent</Code> — needed for bot
          detection and geo. Access to that raw data is locked down at the database level:
        </p>
        <Callout tone="note" title="Row-level security on user_events">
          Two policies, nothing else: (1) <Code>service_role</Code> full access — used only by the
          server-side mirror and admin queries; (2) <Code>admin_read</Code> — SELECT only for an
          authenticated user whose <Code>profiles.is_admin = true</Code>. A regular logged-in user
          cannot read anyone&apos;s events, and an anonymous client cannot read any. Raw IP + UA are
          therefore <strong>admin-only</strong>.
        </Callout>
        <p>
          Microsoft Clarity (session replays) and Mixpanel (the mirror copy) are the two external
          processors; both are linked from a visitor&apos;s profile for an admin, and both inherit
          the same &quot;admin-only, never resold&quot; posture.
        </p>
      </Section>

      <GuideFooterNav
        prev={{ href: '/admin/resources/metrics', label: 'Metric provenance cards' }}
        next={{ href: '/admin/resources/glossary', label: 'Glossary & FAQ' }}
      />
    </div>
  )
}
