// Phase 10.8 — Resources §6: Glossary & FAQ. Every term that appears on the
// admin screens, defined once. Epoch dates are imported live (TRACKING_EPOCHS
// + EPOCHS) so the glossary never drifts from the real cut-over dates.
import { BookMarked } from 'lucide-react'
import { GuideHeader, Section, Callout, Code, DefRow, GuideFooterNav } from '../_components'
import { EPOCHS } from '@/lib/admin/metric-docs'
import { TRACKING_EPOCHS } from '@/lib/admin/constants'

export const metadata = { title: 'Glossary & FAQ — Admin' }

export default function GlossaryPage() {
  return (
    <div>
      <GuideHeader
        icon={<BookMarked className="h-6 w-6 text-emerald-500" />}
        title="Glossary & FAQ"
        subtitle="The vocabulary behind every screen in this admin — defined once, plainly. When a term on a chart is unclear, it is defined here."
      />

      <Section title="Core terms" audience="everyone">
        <dl>
          <DefRow term="distinct_id">
            The stable ID for one browser/visitor. Anonymous visitors get a random
            <Code>distinct_id</Code> that persists across their visits; it is the unit behind
            &quot;unique visitors&quot;.
          </DefRow>
          <DefRow term="user (account)">
            A signed-in person — a row in <Code>profiles</Code> with a <Code>user_id</Code>. One
            user can have several <Code>distinct_id</Code>s (different devices/browsers). At login
            we stitch the anonymous <Code>distinct_id</Code> to the <Code>user_id</Code>, so
            &quot;3 signed-in accounts&quot; counts users, not browsers.
          </DefRow>
          <DefRow term="session">
            One continuous visit. Modern events carry a real <Code>session_id</Code>; for older
            events without one we fall back to a 30-minute-inactivity-gap rule (clearly labelled as
            a fallback in the user&apos;s journey view).
          </DefRow>
          <DefRow term="bot flag (bot_likely)">
            Whether we believe an event came from automation rather than a person. Set from
            user-agent rules + a behavioural classifier. Precision is ~100% (anything flagged IS a
            bot) but recall is ~30% (some stealth bots still slip through), so &quot;humans only&quot;
            numbers are upper bounds.
          </DefRow>
          <DefRow term="first touch">
            The very first channel/source/landing page we ever saw for a visitor — what originally
            brought them. Distinct from &quot;last touch&quot; (the most recent) and the full
            multi-touch path stored per visitor.
          </DefRow>
          <DefRow term="UTM">
            The <Code>utm_source</Code> / <Code>utm_medium</Code> / <Code>utm_campaign</Code> tags
            on a link (e.g. from a campaign URL). When present they classify the visit&apos;s
            channel; when absent we fall back to the referrer host.
          </DefRow>
          <DefRow term="traffic channel">
            The taxonomy bucket a visit is classified into — Search / AI / Social / Community /
            Email / Paid / Referral / Direct / Internal — derived from click-ids, then UTM medium,
            then the referrer host map.
          </DefRow>
          <DefRow term="IST window">
            All day-boundaries on these screens use India Standard Time (Asia/Kolkata), not UTC.
            &quot;Today&quot; and every daily bucket start at IST midnight — so a metric won&apos;t
            disagree with another just because one used UTC days.
          </DefRow>
          <DefRow term="insert_id">
            A unique id per fired event used to de-duplicate: if the same event arrives twice (a
            retry after an outage), only one row is kept.
          </DefRow>
          <DefRow term="schema_valid">
            <Code>false</Code> when an event&apos;s payload didn&apos;t match its registered schema.
            Such rows are <strong>tagged, never dropped</strong> — capture at any cost, flag
            don&apos;t lose.
          </DefRow>
          <DefRow term="rollup">
            A pre-computed daily summary table (event counts, DAU) that makes trends fast. The
            dashboards still read raw events; the rollups are reconciled against raw every night.
          </DefRow>
        </dl>
      </Section>

      <Section title="Data epochs — the dates each thing started" audience="everyone">
        <p>
          A dimension that didn&apos;t exist before its epoch shows up as &quot;(unknown)&quot; or
          &quot;(direct)&quot; for earlier events — that is expected, not a bug. These strings are
          read live from the system:
        </p>
        <dl>
          <DefRow term="event mirror">{EPOCHS.mirror}</DefRow>
          <DefRow term="attribution">{EPOCHS.attribution}</DefRow>
          <DefRow term="channel">
            Per-event <Code>traffic_channel</Code> / <Code>traffic_source</Code> stamped since{' '}
            <strong>{TRACKING_EPOCHS.channel}</strong>; earlier rows bucket as
            &quot;(unknown — pre-channel epoch)&quot;.
          </DefRow>
          <DefRow term="bot backfill">{EPOCHS.botBackfill}</DefRow>
        </dl>
      </Section>

      <Section title="FAQ" audience="everyone">
        <Callout tone="note" title="Why are “human” visitor numbers lower than I expected?">
          Two reasons: the bot backfill re-classified a large stealth-bot farm as non-human in June
          2026, and the bot flag is conservative on the human side. Treat human counts as a floor of
          quality, not the raw headcount.
        </Callout>
        <Callout tone="note" title="Why do two pages sometimes show slightly different totals?">
          Usually a window or bot-filter difference, or an epoch. Open each tile&apos;s ⓘ provenance
          card — it states the exact window and bot semantics. Genuine contradictions are caught by
          the nightly invariants and surfaced on the trust banner.
        </Callout>
        <Callout tone="note" title="Can this guide go out of date?">
          The event dictionary and metric cards cannot — they are generated from the live system on
          every page view. The hand-written prose (this page, the two &quot;how tracking works&quot;
          pages) is reviewed when the pipeline changes.
        </Callout>
        <Callout tone="note" title="Where do I see one visitor's full story?">
          Open their profile from the Users directory (or any event&apos;s raw rows) — the User 360
          view shows their identity, traits, every session, the full event stream, and a Microsoft
          Clarity replay link.
        </Callout>
      </Section>

      <GuideFooterNav prev={{ href: '/admin/resources/trust', label: 'Trust & verification' }} />
    </div>
  )
}
