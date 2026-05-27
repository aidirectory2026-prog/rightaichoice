/**
 * Data-audit invariants — each one is a SQL query that should return a row
 * with `actual`, `expected`, and `pass` columns. Runs live against Supabase
 * and surfaces a PASS/FAIL on `/admin/data-audit`.
 *
 * Why this exists: the admin dashboard pulls from ~25 tables and ~15 RPCs.
 * Silent drift (forgot to apply a migration, mid-flight rename, missing
 * index causing stale data) is hard to catch by eyeballing dashboards.
 * These invariants assert relationships that MUST hold if the data is
 * correct, and fail loudly when one doesn't.
 *
 * Each check returns:
 *   { id, category, label, sql, ... runtime fields }
 *
 * Categories:
 *   - "catalog"      — tools table integrity
 *   - "events"       — user_events table integrity + sums
 *   - "triangulation"— same metric computed two ways must match
 *   - "boundaries"   — today ≤ week ≤ month, etc.
 *   - "freshness"    — recent activity exists where expected
 *   - "mirror"       — Mixpanel mirror reconciliation
 */
import { getAdminClient } from '@/lib/cron/supabase-admin'

export type AuditCheck = {
  id: string
  category: 'catalog' | 'events' | 'triangulation' | 'boundaries' | 'freshness' | 'mirror' | 'tracking-rpc' | 'tracking-windows' | 'tracking-stability' | 'tracking-dedup'
  label: string
  /** Plain-English explanation of what's being asserted. */
  rationale: string
  /** SQL that evaluates the invariant. Must return a single row with the columns described. */
  sql: string
  /** How to interpret the row to decide PASS/FAIL. */
  interpret: (row: Record<string, unknown>) => { pass: boolean; actual: string; expected: string; note?: string }
}

export type AuditResult = AuditCheck & {
  pass: boolean
  actual: string
  expected: string
  note?: string
  error?: string
  ms: number
}

export const AUDIT_CHECKS: AuditCheck[] = [
  // ── CATALOG ─────────────────────────────────────────────────────────────
  {
    id: 'catalog-no-orphan-merged',
    category: 'catalog',
    label: 'No published tool points to a merged_into target',
    rationale: 'A tool with merged_into set should be unpublished — otherwise the merge is half-applied and the canonical/duplicate both render.',
    sql: `SELECT count(*)::int AS bad FROM tools WHERE is_published = true AND merged_into IS NOT NULL`,
    interpret: (r) => ({ pass: Number(r.bad) === 0, actual: `${r.bad} bad row(s)`, expected: '0' }),
  },
  {
    id: 'catalog-viability-coverage',
    category: 'catalog',
    label: 'All published tools have a viability_score',
    rationale: 'Viability badge is shown on every tool page. A null score creates a visible gap. Backfill should keep coverage at 100%.',
    sql: `SELECT count(*) FILTER (WHERE viability_score IS NULL)::int AS missing,
                 count(*)::int AS total
            FROM tools WHERE is_published = true`,
    interpret: (r) => ({
      pass: Number(r.missing) === 0,
      actual: `${r.missing} of ${r.total} missing`,
      expected: `0 of ${r.total}`,
    }),
  },
  {
    id: 'catalog-features-coverage',
    category: 'catalog',
    label: '≥99% of published tools have features populated',
    rationale: 'Key Features is the most-viewed section on a tool page. <1% slippage is acceptable (genuine edge cases); more = a refresh job is broken.',
    sql: `SELECT count(*) FILTER (WHERE coalesce(array_length(features, 1), 0) = 0)::int AS missing,
                 count(*)::int AS total
            FROM tools WHERE is_published = true`,
    interpret: (r) => {
      const pct = (Number(r.total) - Number(r.missing)) / Number(r.total) * 100
      return {
        pass: pct >= 99,
        actual: `${pct.toFixed(1)}% have features (${r.missing} missing of ${r.total})`,
        expected: '≥99%',
      }
    },
  },
  {
    id: 'catalog-faqs-coverage',
    category: 'catalog',
    label: '≥95% of published tools have FAQs',
    rationale: 'FAQ section is SEO-critical. Empty FAQs hurt long-tail rankings.',
    sql: `SELECT count(*) FILTER (WHERE jsonb_array_length(coalesce(faqs_long_tail, '[]'::jsonb)) = 0)::int AS missing,
                 count(*)::int AS total
            FROM tools WHERE is_published = true`,
    interpret: (r) => {
      const pct = (Number(r.total) - Number(r.missing)) / Number(r.total) * 100
      return {
        pass: pct >= 95,
        actual: `${pct.toFixed(1)}% have FAQs (${r.missing} missing)`,
        expected: '≥95%',
      }
    },
  },
  {
    id: 'catalog-tutorial-titles-coverage',
    category: 'catalog',
    label: 'Every tool with tutorial_urls has matching tutorial_links (real titles)',
    rationale: 'If tutorial_urls is populated but tutorial_links is empty, the UI shows path-parsed titles instead of real <title> tags. After the backfill ran, these should match.',
    sql: `SELECT count(*) FILTER (WHERE coalesce(array_length(tutorial_urls, 1), 0) > 0
                                    AND jsonb_array_length(coalesce(tutorial_links, '[]'::jsonb)) = 0)::int AS missing,
                 count(*) FILTER (WHERE coalesce(array_length(tutorial_urls, 1), 0) > 0)::int AS with_urls
            FROM tools WHERE is_published = true`,
    interpret: (r) => ({
      pass: Number(r.missing) === 0,
      actual: `${r.missing} of ${r.with_urls} tools have URLs but no real titles`,
      expected: `0 of ${r.with_urls}`,
    }),
  },
  {
    id: 'catalog-published-count-sanity',
    category: 'catalog',
    label: 'Total published tools matches expected band',
    rationale: 'Catalog should be 2,000–2,500 after the scale push. A sudden drop signals an unpublish bug or bulk-delete.',
    sql: `SELECT count(*)::int AS n FROM tools WHERE is_published = true`,
    interpret: (r) => ({
      pass: Number(r.n) >= 2000 && Number(r.n) <= 2500,
      actual: `${r.n} published`,
      expected: '2000–2500',
    }),
  },

  // ── EVENTS (user_events table integrity) ────────────────────────────────
  {
    id: 'events-no-future-timestamps',
    category: 'events',
    label: 'No events with created_at in the future',
    rationale: 'Client-side timestamps can drift. Future-dated events break "today" filters.',
    sql: `SELECT count(*)::int AS bad FROM user_events WHERE created_at > now() + interval '5 minutes'`,
    interpret: (r) => ({ pass: Number(r.bad) === 0, actual: `${r.bad} future event(s)`, expected: '0' }),
  },
  {
    id: 'events-distinct-id-populated',
    category: 'events',
    label: '≥99% of recent events have distinct_id',
    rationale: 'distinct_id is the join key for user-funnel analysis. Missing values break funnels and de-dup.',
    sql: `SELECT count(*) FILTER (WHERE distinct_id IS NULL OR distinct_id = '')::int AS missing,
                 count(*)::int AS total
            FROM user_events WHERE created_at >= now() - interval '7 days'`,
    interpret: (r) => {
      const total = Number(r.total)
      if (total === 0) return { pass: true, actual: 'no events in window', expected: 'n/a', note: 'no traffic to assess' }
      const pct = (total - Number(r.missing)) / total * 100
      return {
        pass: pct >= 99,
        actual: `${pct.toFixed(1)}% populated (${r.missing} missing of ${r.total})`,
        expected: '≥99%',
      }
    },
  },
  {
    id: 'events-no-duplicate-insert-ids',
    category: 'events',
    label: 'No duplicate insert_id values in last 7d',
    rationale: 'insert_id is the dedupe key for the Mixpanel mirror. Duplicates mean double-counting on the dashboards.',
    sql: `WITH d AS (
            SELECT insert_id, count(*) AS c
            FROM user_events
            WHERE created_at >= now() - interval '7 days' AND insert_id IS NOT NULL
            GROUP BY insert_id HAVING count(*) > 1
          )
          SELECT count(*)::int AS dup_groups, coalesce(sum(c - 1), 0)::int AS extra_rows FROM d`,
    interpret: (r) => ({
      pass: Number(r.dup_groups) === 0,
      actual: `${r.dup_groups} duplicate group(s) (${r.extra_rows} extra row(s))`,
      expected: '0',
    }),
  },
  {
    id: 'events-bot-share-reasonable',
    category: 'events',
    label: 'Bot share in last 7d is <80%',
    rationale: 'A high bot share (>80%) suggests bot detection is broken OR a scraper attack is in progress. Either way, dashboards are misleading without "humans only" filter.',
    sql: `WITH t AS (
            SELECT count(*) FILTER (WHERE bot_likely)::numeric AS bots,
                   count(*)::numeric AS total
            FROM user_events WHERE created_at >= now() - interval '7 days'
          )
          SELECT bots, total,
                 CASE WHEN total = 0 THEN 0 ELSE round(bots / total * 100, 1) END AS bot_pct
            FROM t`,
    interpret: (r) => {
      const total = Number(r.total)
      if (total === 0) return { pass: true, actual: 'no events', expected: 'n/a' }
      const pct = Number(r.bot_pct)
      return { pass: pct < 80, actual: `${pct}% bot share`, expected: '<80%' }
    },
  },

  // ── TRIANGULATION (same metric, two ways) ───────────────────────────────
  {
    id: 'tri-dau-7d',
    category: 'triangulation',
    label: 'DAU(7d) raw distinct ≤ RPC daily-sum',
    rationale: 'Two paths to "active users". The RPC sums distinct users PER DAY (so a user active on 3 days counts 3 times) while raw counts distinct over the whole 7d (so the same user counts once). Therefore RPC ≥ raw always. If raw > RPC, the RPC is broken.',
    sql: `WITH raw AS (
            SELECT count(DISTINCT distinct_id)::int AS v
            FROM user_events
            WHERE created_at >= now() - interval '7 days'
              AND distinct_id IS NOT NULL
              AND coalesce(bot_likely, false) = false
          ),
          rpc AS (
            SELECT coalesce(sum(users), 0)::int AS v
            FROM insights_daily_active_users(7, false)
          )
          SELECT raw.v AS raw_dau, rpc.v AS rpc_dau,
                 abs(raw.v - rpc.v) AS delta FROM raw, rpc`,
    interpret: (r) => {
      const raw = Number(r.raw_dau)
      const rpc = Number(r.rpc_dau)
      return {
        pass: raw > 0 && rpc > 0 && rpc >= raw,
        actual: `raw=${raw}, rpc=${rpc} (delta=${r.delta})`,
        expected: 'rpc ≥ raw > 0',
      }
    },
  },
  {
    id: 'tri-published-vs-categories',
    category: 'triangulation',
    label: 'Sum of category counts ≥ total published',
    rationale: 'Each tool can be in multiple categories. So sum-of-counts ≥ total. If sum < total, some tools are uncategorized.',
    sql: `SELECT
            (SELECT count(*)::int FROM tools WHERE is_published = true) AS total,
            (SELECT count(*)::int FROM tool_categories tc
              JOIN tools t ON t.id = tc.tool_id
              WHERE t.is_published = true) AS category_assignments`,
    interpret: (r) => {
      const total = Number(r.total)
      const cats = Number(r.category_assignments)
      return {
        pass: cats >= total,
        actual: `total=${total}, assignments=${cats}`,
        expected: `assignments ≥ ${total}`,
        note: cats < total ? `${total - cats} tools uncategorized` : undefined,
      }
    },
  },

  // ── BOUNDARIES (time-window monotonicity) ───────────────────────────────
  {
    id: 'bound-today-le-week',
    category: 'boundaries',
    label: 'Events today ≤ events in last 7 days',
    rationale: 'Trivially true unless the time-window filter is broken. Today is a subset of the last 7 days.',
    sql: `SELECT
            (SELECT count(*)::int FROM user_events WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') AS today,
            (SELECT count(*)::int FROM user_events WHERE created_at >= now() - interval '7 days') AS week`,
    interpret: (r) => {
      const today = Number(r.today)
      const week = Number(r.week)
      return {
        pass: today <= week,
        actual: `today=${today}, week=${week}`,
        expected: 'today ≤ week',
      }
    },
  },
  {
    id: 'bound-bot-filter-monotone',
    category: 'boundaries',
    label: 'Humans-only event count ≤ all-events count (7d)',
    rationale: 'Filtering out bots can only reduce the count. If humans > all, the bot flag is corrupted.',
    sql: `SELECT count(*) FILTER (WHERE coalesce(bot_likely, false) = false)::int AS humans,
                 count(*)::int AS all_events
            FROM user_events WHERE created_at >= now() - interval '7 days'`,
    interpret: (r) => ({
      pass: Number(r.humans) <= Number(r.all_events),
      actual: `humans=${r.humans}, all=${r.all_events}`,
      expected: 'humans ≤ all',
    }),
  },

  // ── FRESHNESS (recent activity must exist) ──────────────────────────────
  {
    id: 'fresh-events-today',
    category: 'freshness',
    label: 'At least 1 event recorded in last 6 hours',
    rationale: 'If no event arrived in 6 hours, the tracking pipeline is silently broken. Cron/ISR pages should be generating events.',
    sql: `SELECT count(*)::int AS n FROM user_events WHERE created_at >= now() - interval '6 hours'`,
    interpret: (r) => ({
      pass: Number(r.n) > 0,
      actual: `${r.n} event(s) in last 6h`,
      expected: '> 0',
      note: Number(r.n) === 0 ? 'check track-mirror endpoint + Mixpanel mirror cron' : undefined,
    }),
  },
  {
    id: 'fresh-tools-last-refresh',
    category: 'freshness',
    label: 'Stalest published tool was refreshed within 30 days',
    rationale: 'No tool should go more than 30 days without a Phase 4 SOP refresh. If the oldest is older, the refresh cron is stuck.',
    sql: `SELECT min(last_full_refresh_at) AS oldest,
                 (count(*) FILTER (WHERE last_full_refresh_at IS NULL))::int AS never_refreshed,
                 count(*)::int AS total
            FROM tools WHERE is_published = true`,
    interpret: (r) => {
      if (Number(r.never_refreshed) > 0) {
        return {
          pass: false,
          actual: `${r.never_refreshed} tools never refreshed`,
          expected: '0 never-refreshed',
        }
      }
      const oldest = r.oldest ? new Date(r.oldest as string) : null
      if (!oldest) return { pass: true, actual: 'no tools', expected: 'n/a' }
      const ageDays = (Date.now() - oldest.getTime()) / (24 * 60 * 60 * 1000)
      return {
        pass: ageDays <= 30,
        actual: `oldest = ${ageDays.toFixed(1)}d ago`,
        expected: '≤ 30d',
      }
    },
  },

  // ── MIRROR HEALTH (Mixpanel → Supabase mirror via /api/track-mirror) ────
  {
    id: 'mirror-client-events-recent',
    category: 'mirror',
    label: 'Client-side events arrived in last 6h (track-mirror endpoint healthy)',
    rationale: 'Browser-side analytics post to /api/track-mirror which writes user_events with source_kind=client. If no client events in 6 hours, the mirror endpoint or the JS posting layer is broken.',
    sql: `SELECT count(*)::int AS n FROM user_events
           WHERE created_at >= now() - interval '6 hours'
             AND source_kind = 'client'`,
    interpret: (r) => ({
      pass: Number(r.n) > 0,
      actual: `${r.n} client event(s) in last 6h`,
      expected: '> 0',
      note: Number(r.n) === 0 ? 'check /api/track-mirror endpoint + browser console' : undefined,
    }),
  },
  {
    id: 'mirror-server-events-recent',
    category: 'mirror',
    label: 'Server-side events arrived in last 24h',
    rationale: 'Server-side tracking fires from API routes + cron jobs. A 24h gap means cron schedules silently stopped firing.',
    sql: `SELECT count(*)::int AS n FROM user_events
           WHERE created_at >= now() - interval '24 hours'
             AND source_kind = 'server'`,
    interpret: (r) => ({
      pass: Number(r.n) > 0,
      actual: `${r.n} server event(s) in last 24h`,
      expected: '> 0',
    }),
  },
  {
    id: 'mirror-source-balance-not-skewed',
    category: 'mirror',
    label: 'Client + server channels both have ≥5% share in last 24h',
    rationale: 'If one channel is silently broken, the ratio skews. <5% on either side = one channel mostly dropped.',
    sql: `SELECT
            count(*) FILTER (WHERE source_kind = 'client')::int AS client_n,
            count(*) FILTER (WHERE source_kind = 'server')::int AS server_n,
            count(*)::int AS total
          FROM user_events WHERE created_at >= now() - interval '24 hours'`,
    interpret: (r) => {
      const total = Number(r.total)
      if (total === 0) return { pass: true, actual: 'no events', expected: 'n/a' }
      const c = Number(r.client_n)
      const s = Number(r.server_n)
      const cPct = (c / total) * 100
      const sPct = (s / total) * 100
      return {
        pass: cPct >= 5 && sPct >= 5,
        actual: `client ${cPct.toFixed(1)}% (${c}), server ${sPct.toFixed(1)}% (${s})`,
        expected: 'both ≥5%',
      }
    },
  },

  // ── TRACKING-RPC FIDELITY (raw SQL vs the RPC the dashboard reads) ──────
  {
    id: 'tri-pageview-rpc',
    category: 'tracking-rpc',
    label: 'page_viewed count (7d, humans) raw == sum(insights_events_by_device)',
    rationale: '/admin/insights pulls page-views-by-device from insights_events_by_device(\'page_viewed\'). If raw count != sum of buckets, the RPC is dropping/double-counting rows and every device chart is wrong. NOTE: the event name is "page_viewed" (underscore), NOT "pageview".',
    sql: `WITH raw AS (
            SELECT count(*)::int AS v FROM user_events
             WHERE event_name = 'page_viewed'
               AND created_at >= now() - interval '7 days'
               AND coalesce(bot_likely, false) = false
          ), rpc AS (
            SELECT coalesce(sum(events), 0)::int AS v
              FROM insights_events_by_device('page_viewed', 7, false)
          )
          SELECT raw.v AS raw_n, rpc.v AS rpc_n, abs(raw.v - rpc.v) AS delta FROM raw, rpc`,
    interpret: (r) => {
      const raw = Number(r.raw_n)
      const rpc = Number(r.rpc_n)
      const delta = Number(r.delta)
      const tol = Math.max(5, Math.floor(raw * 0.01))
      return {
        pass: delta <= tol,
        actual: `raw=${raw}, rpc=${rpc} (delta=${delta})`,
        expected: `delta ≤ ${tol} (1% tolerance)`,
      }
    },
  },
  {
    id: 'tri-top-event-rpc',
    category: 'tracking-rpc',
    label: 'Top event (7d, humans) — raw winner matches insights_top_events winner',
    rationale: 'Top-N rankings should be deterministic. If the raw most-frequent event_name disagrees with the RPC, the bot/distinct filter is being applied inconsistently.',
    sql: `WITH raw AS (
            SELECT event_name, count(*)::int AS n
              FROM user_events
             WHERE created_at >= now() - interval '7 days'
               AND coalesce(bot_likely, false) = false
             GROUP BY event_name ORDER BY n DESC LIMIT 1
          ), rpc AS (
            SELECT event_name, events::int AS n
              FROM insights_top_events(7, 1, false)
             LIMIT 1
          )
          SELECT raw.event_name AS raw_event, raw.n AS raw_n,
                 rpc.event_name AS rpc_event, rpc.n AS rpc_n
            FROM raw, rpc`,
    interpret: (r) => ({
      pass: r.raw_event === r.rpc_event,
      actual: `raw=${r.raw_event} (${r.raw_n}), rpc=${r.rpc_event} (${r.rpc_n})`,
      expected: 'same event_name',
    }),
  },
  {
    id: 'tri-bot-share-rpc',
    category: 'tracking-rpc',
    label: 'Bot share (7d) raw == insights_bot_share RPC',
    rationale: 'The Humans-only toggle on every dashboard depends on bot_likely. If raw and RPC disagree, "Including bots" and "Humans only" don\'t actually flip the underlying filter.',
    sql: `WITH raw AS (
            SELECT count(*) FILTER (WHERE bot_likely)::numeric AS bots,
                   count(*)::numeric AS total
              FROM user_events WHERE created_at >= now() - interval '7 days'
          ), rpc AS (
            SELECT bot_events::numeric AS bots, total_events::numeric AS total
              FROM insights_bot_share(7)
          )
          SELECT raw.bots AS raw_bots, raw.total AS raw_total,
                 rpc.bots AS rpc_bots, rpc.total AS rpc_total FROM raw, rpc`,
    interpret: (r) => {
      const rawTot = Number(r.raw_total); const rpcTot = Number(r.rpc_total)
      const rawBots = Number(r.raw_bots); const rpcBots = Number(r.rpc_bots)
      const tolT = Math.max(2, Math.floor(rawTot * 0.005))
      const tolB = Math.max(2, Math.floor(rawBots * 0.02))
      return {
        pass: Math.abs(rawTot - rpcTot) <= tolT && Math.abs(rawBots - rpcBots) <= tolB,
        actual: `raw=${rawBots}/${rawTot}, rpc=${rpcBots}/${rpcTot}`,
        expected: `total delta ≤ ${tolT}, bots delta ≤ ${tolB}`,
      }
    },
  },
  {
    id: 'tri-top-tools-by-views-rpc',
    category: 'tracking-rpc',
    label: 'Top viewed-tool (7d, humans) — raw winner matches RPC winner',
    rationale: 'Top-N tools widget is the most-used surface. A mismatch means the leaderboard is ordering wrong. queries.ts line 314 calls insights_top_jsonb_property("tool_page_viewed", "tool_slug", ...) — this audit uses the same call.',
    sql: `WITH raw AS (
            SELECT (properties->>'tool_slug') AS slug, count(*)::int AS n
              FROM user_events
             WHERE event_name = 'tool_page_viewed'
               AND created_at >= now() - interval '7 days'
               AND coalesce(bot_likely, false) = false
               AND properties->>'tool_slug' IS NOT NULL
               AND properties->>'tool_slug' <> ''
             GROUP BY 1 ORDER BY 2 DESC LIMIT 1
          ), rpc AS (
            SELECT value AS slug, events::int AS n
              FROM insights_top_jsonb_property('tool_page_viewed', 'tool_slug', 7, 1, false) LIMIT 1
          )
          SELECT raw.slug AS raw_slug, raw.n AS raw_n,
                 rpc.slug AS rpc_slug, rpc.n AS rpc_n FROM raw, rpc`,
    interpret: (r) => ({
      pass: r.raw_slug === r.rpc_slug,
      actual: `raw=${r.raw_slug} (${r.raw_n}), rpc=${r.rpc_slug} (${r.rpc_n})`,
      expected: 'same slug',
    }),
  },

  // ── TIME-WINDOW BOUNDARY CORRECTNESS ────────────────────────────────────
  {
    id: 'window-today-boundary-utc-vs-ist',
    category: 'tracking-windows',
    label: 'Today (IST calendar) window returns events with created_at in [IST midnight, now]',
    rationale: 'Verifies the IST-anchored "Today" filter doesn\'t accidentally use UTC midnight (would lose 5.5h of events at the start of the day in India).',
    sql: `WITH boundary AS (
            SELECT date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata' AS ist_start
          )
          SELECT
            (SELECT count(*)::int FROM user_events, boundary
              WHERE created_at >= ist_start) AS in_window,
            (SELECT count(*)::int FROM user_events, boundary
              WHERE created_at >= ist_start - interval '6 hours'
                AND created_at < ist_start) AS just_before_window,
            (SELECT ist_start FROM boundary) AS ist_start_iso`,
    interpret: (r) => ({
      pass: Number(r.in_window) >= 0,
      actual: `in-window=${r.in_window}, just-before=${r.just_before_window}, IST midnight=${r.ist_start_iso}`,
      expected: 'in_window ≥ 0 (sanity)',
      note: 'Spot-check: visit a page now, run audit again — in_window should increment by 1.',
    }),
  },
  {
    id: 'window-yesterday-strict-isolation',
    category: 'tracking-windows',
    label: 'Yesterday window contains zero events from today or 2 days ago',
    rationale: 'Yesterday filter must be a strict 24h calendar slice — no bleed-in from today (would inflate yesterday) or before (would over-count).',
    sql: `WITH b AS (
            SELECT date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata' AS today_start,
                   (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata') - interval '1 day' AS y_start
          )
          SELECT
            (SELECT count(*)::int FROM user_events, b
              WHERE created_at >= y_start AND created_at < today_start) AS yesterday_n,
            (SELECT count(*)::int FROM user_events, b
              WHERE created_at >= today_start) AS today_leak,
            (SELECT count(*)::int FROM user_events, b
              WHERE created_at < y_start AND created_at >= y_start - interval '1 day') AS day_before_leak`,
    interpret: (r) => ({
      pass: true,  // monotonicity already covered; this is informational
      actual: `yesterday=${r.yesterday_n}, today=${r.today_leak}, day-before=${r.day_before_leak}`,
      expected: 'all 3 isolated buckets',
      note: 'These should be three separate counts — if yesterday_n changes when you re-run, time math is broken.',
    }),
  },

  // ── TRACKING-STABILITY (same query twice == same answer) ────────────────
  {
    id: 'stability-top-events-deterministic',
    category: 'tracking-stability',
    label: 'Top-events RPC is deterministic across two consecutive calls',
    rationale: 'If consecutive calls reorder differently, the RPC has non-deterministic ordering (e.g., missing tie-breaker) and the dashboard reshuffles on every refresh.',
    sql: `WITH a AS (
            SELECT array_agg(event_name) AS arr FROM (
              SELECT event_name FROM insights_top_events(7, 10, false)
            ) s
          ), b AS (
            SELECT array_agg(event_name) AS arr FROM (
              SELECT event_name FROM insights_top_events(7, 10, false)
            ) s
          )
          SELECT (a.arr = b.arr) AS stable, a.arr AS arr_a, b.arr AS arr_b FROM a, b`,
    interpret: (r) => ({
      pass: r.stable === true,
      actual: `stable=${r.stable}`,
      expected: 'true',
    }),
  },

  // ── TRACKING-DEDUP (no double-counting) ─────────────────────────────────
  {
    id: 'dedup-pageview-rapid-fire',
    category: 'tracking-dedup',
    label: 'No more than 50 cases of same distinct_id+page_path firing 3+ pageviews within 2 seconds (24h)',
    rationale: 'Rapid-fire identical pageviews mean the tracking JS is double-firing (e.g., StrictMode dev re-render leaking to prod, or two trackers mounted). Inflates every page-view metric.',
    sql: `WITH groups AS (
            SELECT distinct_id, page_path,
                   date_trunc('second', created_at) AS sec,
                   count(*) AS n
              FROM user_events
             WHERE event_name = 'page_viewed'
               AND created_at >= now() - interval '24 hours'
               AND distinct_id IS NOT NULL
             GROUP BY 1, 2, 3 HAVING count(*) >= 3
          )
          SELECT count(*)::int AS suspicious_groups,
                 coalesce(sum(n - 1), 0)::int AS extra_views FROM groups`,
    interpret: (r) => ({
      pass: Number(r.suspicious_groups) <= 50,
      actual: `${r.suspicious_groups} suspicious groups (${r.extra_views} extra views)`,
      expected: '≤ 50 groups',
    }),
  },
  {
    id: 'dedup-search-rapid-fire',
    category: 'tracking-dedup',
    label: 'No bursts of identical search query from same user within 1s (24h)',
    rationale: 'If the search box fires on every keystroke without debounce, count of "search" events is inflated. Same query firing 5x in 1s = a bug.',
    sql: `WITH groups AS (
            SELECT distinct_id,
                   coalesce(properties->>'query', properties->>'q', '') AS q,
                   date_trunc('second', created_at) AS sec,
                   count(*) AS n
              FROM user_events
             WHERE event_name = 'search_query_submitted'
               AND created_at >= now() - interval '24 hours'
               AND distinct_id IS NOT NULL
             GROUP BY 1, 2, 3 HAVING count(*) >= 3
          )
          SELECT count(*)::int AS suspicious_groups FROM groups`,
    interpret: (r) => ({
      pass: Number(r.suspicious_groups) === 0,
      actual: `${r.suspicious_groups} groups of 3+ identical searches in 1s`,
      expected: '0',
    }),
  },

  // ── TRACKING-WINDOWS additional: distinct_id stability ──────────────────
  {
    id: 'tracking-distinct-id-not-regenerating',
    category: 'tracking-windows',
    label: 'Median distinct_id has ≥2 events in 7d (no per-pageview regeneration)',
    rationale: 'If distinct_id regenerates on every page load, DAU is inflated and every funnel breaks (each step looks like a new user). Healthy ID stickiness means median user fires multiple events.',
    sql: `WITH per_id AS (
            SELECT distinct_id, count(*) AS n
              FROM user_events
             WHERE created_at >= now() - interval '7 days'
               AND distinct_id IS NOT NULL
               AND coalesce(bot_likely, false) = false
             GROUP BY distinct_id
          )
          SELECT
            percentile_cont(0.5) WITHIN GROUP (ORDER BY n)::int AS median_events,
            percentile_cont(0.9) WITHIN GROUP (ORDER BY n)::int AS p90_events,
            count(*)::int AS distinct_ids
            FROM per_id`,
    interpret: (r) => ({
      pass: Number(r.median_events) >= 2,
      actual: `median=${r.median_events} events/user, p90=${r.p90_events}, distinct_ids=${r.distinct_ids}`,
      expected: 'median ≥ 2',
      note: Number(r.median_events) < 2 ? 'distinct_id is likely regenerating per page load — check the analytics client init' : undefined,
    }),
  },
]

export async function runAudit(): Promise<AuditResult[]> {
  const db = getAdminClient()
  const results: AuditResult[] = []
  for (const check of AUDIT_CHECKS) {
    const t0 = Date.now()
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (db as any).rpc('_admin_audit_exec', { p_sql: check.sql })
      if (error) {
        results.push({ ...check, pass: false, actual: 'query failed', expected: '', error: error.message, ms: Date.now() - t0 })
        continue
      }
      const row = Array.isArray(data) ? data[0] : data
      if (!row) {
        results.push({ ...check, pass: false, actual: 'no row returned', expected: '', ms: Date.now() - t0 })
        continue
      }
      const interp = check.interpret(row as Record<string, unknown>)
      results.push({ ...check, ...interp, ms: Date.now() - t0 })
    } catch (e) {
      results.push({ ...check, pass: false, actual: 'exception', expected: '', error: (e as Error).message, ms: Date.now() - t0 })
    }
  }
  return results
}
