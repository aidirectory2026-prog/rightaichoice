// Phase 10.8 — Resources §2: How tracking works, technically. The real
// mechanics, accurate to the code: capture() → in-memory queue → batched
// POST /api/track-mirror → user_events + user_intent_profile; identity
// stitching, the session model, bot detection, dedup, the outage retry
// queue, and tag-don't-drop schema validation. Every claim here traces to a
// real file (cited inline) so an engineer can verify it.

import { Cpu } from 'lucide-react'
import { GuideHeader, Section, Callout, Code, GuideFooterNav } from '../_components'

export const metadata = { title: 'How tracking works (technical) — Learning guide' }

export default function TrackingTechnicalPage() {
  return (
    <div>
      <GuideHeader
        icon={<Cpu className="h-6 w-6 text-emerald-500" />}
        title="How tracking works, technically"
        subtitle="The exact path an event takes from a browser interaction to a row in our database — function names, tables, and the design decisions behind each hop. Accurate to the code; file references are inline so you can read the source."
      />

      <Section title="The single choke point: capture()" audience="technical">
        <p>
          Every analytics event in the app funnels through ONE function —{' '}
          <Code>capture()</Code> in <Code>lib/analytics.ts</Code>. Each public method
          (<Code>analytics.toolPageViewed()</Code>, <Code>analytics.heroCtaClicked()</Code>, …)
          builds a payload and calls it. Having a single choke point is what makes everything
          downstream possible: one place to attach the envelope, one place to validate, one place
          to dual-write.
        </p>
        <p>
          <Code>capture()</Code> does two things with each event: (1) sends it to{' '}
          <strong>Mixpanel</strong> via the browser SDK, and (2) enqueues a copy for{' '}
          <strong>our own database</strong> through the mirror. The two are independent — the
          mirror is fire-and-forget and never blocks or throws if Mixpanel (or its host) is
          unreachable.
        </p>
      </Section>

      <Section title="The envelope: what rides on every event" audience="technical">
        <p>
          Before an event leaves the browser, <Code>mirrorContext()</Code> merges a shared{' '}
          <em>envelope</em> around the event-specific payload. This is the context every event
          carries whether it&apos;s a page view or a payment:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-zinc-400">
          <li><Code>distinct_id</Code> — the browser/identity id (see stitching below)</li>
          <li><Code>session_id</Code> — one UUID per tab session (<Code>sessionStorage</Code>), independent of Mixpanel</li>
          <li>referrer, <Code>utm_source/medium/campaign</Code>, and the sticky <Code>first_touch_*</Code> fields (persisted in <Code>localStorage</Code> so they survive logout/SDK reset)</li>
          <li><Code>traffic_channel</Code> / <Code>traffic_source</Code> — classified at capture time by <Code>lib/analytics/channels.ts</Code> (10.7a)</li>
          <li>ad click-ids (<Code>gclid/fbclid/msclkid/ttclid</Code>) when present in the URL</li>
          <li>the <Code>env_*</Code> device/environment envelope — locale, timezone, viewport, DPR, connection, CPU/memory, color scheme, ad-blocker signal (10.7b)</li>
          <li><Code>webdriver</Code> — true under automation (Playwright/Selenium); folds into the bot flag server-side</li>
          <li><Code>insert_id</Code> — a random UUID per event, the dedup key (see below)</li>
          <li><Code>client_time_ms</Code> — the browser&apos;s event timestamp, used as <Code>created_at</Code></li>
        </ul>
        <p>
          The envelope keys are namespaced (<Code>env_*</Code>, <Code>traffic_*</Code>) so they
          can never collide with a real payload property — a lesson learned when a bare{' '}
          <Code>channel</Code> envelope key would have clobbered the <Code>channel</Code> payload
          property of <Code>share_clicked</Code>.
        </p>
      </Section>

      <Section title="The queue and the batched POST" audience="technical">
        <p>
          Mirrored events do not POST one at a time. They queue in an in-memory array
          (<Code>MIRROR_QUEUE</Code>, cap 100) and flush every <strong>8 seconds</strong>
          (<Code>MIRROR_FLUSH_MS</Code>) or on <Code>pagehide</Code>, whichever comes first. On
          page unload the flush uses <Code>navigator.sendBeacon()</Code> so the last events still
          make it out even as the tab closes (and it survives BFCache restore).
        </p>
        <p>
          The flush POSTs a batch of up to 100 events to <Code>/api/track-mirror</Code>. Batching
          keeps the request count low without delaying analysis meaningfully.
        </p>
      </Section>

      <Section title="The outage retry queue (events are never dropped on the floor)" audience="technical">
        <p>
          If a flush fails — Supabase 5xx, a network blip, the endpoint returning{' '}
          <Code>503</Code> — the events are not lost. They go into a{' '}
          <strong>holding pen</strong> in <Code>sessionStorage</Code> (<Code>mirror_retry_queue_v1</Code>,
          cap 500 events, max age 24h). On the next successful flush the retry queue drains{' '}
          <em>first</em>, so chronology is preserved. The 24h age cap stops a long outage from
          replaying stale data forever.
        </p>
        <p>
          The server side mirrors this resilience: <Code>/api/track-mirror</Code> wraps the insert
          in <Code>withRetry()</Code> (3 attempts, exponential backoff capped well under the
          function timeout) for transient pool hiccups, and returns <Code>503</Code> (not 500) on
          permanent failure precisely so the client keeps the batch and replays it. This holding
          pen was added after a real Supabase outage that had been silently dropping{' '}
          <Code>page_viewed</Code> events.
        </p>
      </Section>

      <Section title="What the server does with a batch" audience="technical">
        <p>
          <Code>POST /api/track-mirror</Code> (in <Code>app/api/track-mirror/route.ts</Code>) does,
          for each batch:
        </p>
        <ol className="list-decimal space-y-1.5 pl-5 text-zinc-400">
          <li>
            <strong>Resolve the real user.</strong> <Code>user_id</Code> is read{' '}
            <em>server-side from the auth cookie</em>, never trusted from the client payload — a
            hostile client can&apos;t spoof events as another user. If a valid session exists,
            every row in the batch is stamped with that <Code>user_id</Code> and{' '}
            <Code>auth_state=&apos;known&apos;</Code>; anon batches stay null/<Code>anon</Code>.
          </li>
          <li>
            <strong>Stamp request context.</strong> IP and user-agent from headers; country/city/
            region from Vercel&apos;s free edge geo headers; the bot flag (next section).
          </li>
          <li>
            <strong>Validate (tag, don&apos;t drop).</strong> Each event is checked against its
            schema (next-but-one section).
          </li>
          <li>
            <strong>Insert.</strong> All rows are written to <Code>public.user_events</Code> in one{' '}
            <Code>upsert</Code> keyed on <Code>insert_id</Code> (dedup).
          </li>
          <li>
            <strong>Update the per-visitor profile.</strong> Per event, the relevant arrays/
            counters/segments are pushed into <Code>public.user_intent_profile</Code> via the{' '}
            <Code>upsert_user_intent</Code> RPC — plus one multi-touch attribution touch and one
            session fragment per distinct_id per batch.
          </li>
        </ol>
      </Section>

      <Section title="Identity stitching: anonymous ↔ account" audience="technical">
        <p>
          A visitor starts anonymous with a <Code>distinct_id</Code> (the Mixpanel id, with a{' '}
          <Code>localStorage</Code> fallback id when the SDK store is empty). When they log in,{' '}
          <Code>identify(userId)</Code> calls <Code>mixpanel.identify()</Code> and flips the
          client <Code>auth_state</Code> to <Code>known</Code>; on logout, <Code>reset()</Code>{' '}
          returns it to <Code>anon</Code>.
        </p>
        <p>
          The durable stitch happens server-side: once the auth cookie is present, every event
          carries the resolved <Code>user_id</Code>, so the same browser&apos;s anonymous{' '}
          <Code>distinct_id</Code> and its account are linked in <Code>user_events</Code> and in
          the profile. This is what lets the &quot;Signed-in actives&quot; metric count{' '}
          <Code>distinct user_id</Code> (real humans) rather than browsers — and why a person on
          two devices is two browser rows until login stitches both to one account.
        </p>
      </Section>

      <Section title="The session model" audience="technical">
        <p>
          A <strong>session</strong> is identified two ways, by design:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-zinc-400">
          <li>
            <strong>Client tab session</strong> — <Code>session_id</Code>, one UUID per tab
            (<Code>sessionStorage</Code>), rides in <Code>properties.session_id</Code> on every
            event so SQL can group events into sessions with no schema migration.
          </li>
          <li>
            <strong>Computed session history</strong> — the server folds a per-batch{' '}
            <em>session fragment</em> (start/end timestamps, landing, exit, page count, engaged
            seconds, channel) into <Code>user_intent_profile.session_history</Code>. The{' '}
            <Code>upsert_user_intent</Code> RPC (migration 162) owns the <strong>30-minute gap</strong>
            {' '}merge/append rule and a cap of 30 sessions. A batch is a single tab&apos;s ≤8s
            flush window, so it can never straddle the 30-minute boundary — per-batch min/max
            timestamps are safe session-extension increments.
          </li>
        </ul>
      </Section>

      <Section title="Bot detection" audience="technical">
        <p>
          Bot classification is a single source of truth in <Code>lib/bot-detection.ts</Code>
          (<Code>isLikelyBotUA()</Code>), called from <Code>/api/track-mirror</Code> and the
          server view path so they can never disagree. A row is marked{' '}
          <Code>bot_likely=true</Code> if the UA matches the bot regex, looks like a stale-Chrome
          datacenter UA or a dev-build Chrome (the F7 recall fix — the regex alone had ~30%
          recall), OR if <Code>properties.webdriver === true</Code> (stealth-headless browsers
          ship stock Chrome UAs but expose <Code>navigator.webdriver</Code>).
        </p>
        <Callout tone="warn" title="Precision ~100%, recall ~30%">
          The behavioral classifier (migration 148) re-flagged history on 2026-06-11. Everything
          we flag as a bot <em>is</em> a bot (precision ~100%), but a chunk of stealth-bot traffic
          still counts as human (recall ~29–30%, hand-audited). Treat every &quot;human&quot;
          count as a careful upper bound. By default every &quot;real users&quot; number on these
          screens excludes <Code>bot_likely=true</Code> rows; the &quot;Including bots&quot; filter
          toggles them in.
        </Callout>
      </Section>

      <Section title="Dedup via insert_id" audience="technical">
        <p>
          Every event gets a random <Code>insert_id</Code> (UUID) at capture time. The server
          insert is an <Code>upsert</Code> with <Code>onConflict: &apos;insert_id&apos;,
          ignoreDuplicates: true</Code>. So if a beacon is retried (outage replay, sendBeacon +
          a later flush, double network attempt), the second copy is silently ignored — one event,
          one row, no double-counting. The synthetic suite proves this directly: it double-fires
          events with a deterministic <Code>insert_id</Code> and asserts exactly one row lands.
        </p>
      </Section>

      <Section title="Schema validation: tag, don't drop" audience="technical">
        <p>
          Each fired event has a strict zod schema in <Code>lib/analytics-schema.ts</Code>
          (the same registry that generates the event dictionary). Validation runs at two points:
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-zinc-400">
          <li>
            <strong>In dev/test</strong> at the <Code>capture()</Code> choke point — loud locally
            so drift is caught before it ships; zero-cost in production builds.
          </li>
          <li>
            <strong>In production</strong> inside <Code>/api/track-mirror</Code>: every row is
            <Code>validateEvent()</Code>-checked. A row that drifts is <strong>tagged</strong> with{' '}
            <Code>schema_valid=false</Code> + the first issues — but <strong>never dropped</strong>.
            Capture at any cost; flag, don&apos;t lose. Conforming rows stay byte-identical (the
            tag keys are only written when invalid).
          </li>
        </ul>
        <p>
          The envelope keys (<Code>session_id</Code>, <Code>webdriver</Code>, <Code>first_touch_*</Code>,
          the tags themselves, …) are stripped before the strict check, so the same validator
          works on the raw payload at capture and on the payload+envelope at the mirror.
        </p>
      </Section>

      <Callout tone="good" title="The one-line trace">
        <Code>analytics.method()</Code> → <Code>capture()</Code> → [Mixpanel] + queue →
        8s/pagehide flush → <Code>POST /api/track-mirror</Code> → validate &amp; tag → bot flag →
        upsert into <Code>user_events</Code> (dedup on <Code>insert_id</Code>) → fold into{' '}
        <Code>user_intent_profile</Code>. Failures land in the sessionStorage holding pen and
        replay on the next flush.
      </Callout>

      <GuideFooterNav
        prev={{ href: '/admin/resources/tracking-overview', label: 'How tracking works' }}
        next={{ href: '/admin/resources/event-dictionary', label: 'Event dictionary' }}
      />
    </div>
  )
}
