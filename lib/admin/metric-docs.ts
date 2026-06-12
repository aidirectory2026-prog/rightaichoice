// Phase 10.5a.1 (2026-06-12) — metric provenance map.
//
// One entry per metric tile/panel on the rebuilt Overview dashboard and the
// Audience pages: what it counts (plain English), how it's computed
// (table/RPC + window + bot semantics), why the number can be trusted
// (which verification mean covers it), and known caveats (data epochs,
// bot-recall limits). Pure data — importable from server AND client
// components; feeds the ⓘ popovers (components/admin/metric-info.tsx) now
// and the Phase 8 Resources "metric provenance cards" later.
//
// Keep entries honest and specific: every `whyTrusted` claim must point at a
// real verification artifact (audit row in docs/admin/metric-audit.md, the
// filter-matrix verifier, the synthetic suite, the baseline snapshot oracle,
// or a nightly invariant).

/** Shared caveat strings — the epochs every attribution metric inherits. */
export const EPOCHS = {
  mirror:
    'Our own event mirror (user_events) starts 2026-05-20 — nothing before that date exists in any of these numbers.',
  attribution:
    'Referrer / UTM / session / first-touch fields are only captured since 2026-06-10 (PR #12). Earlier events have empty attribution and surface as "(unknown)" or "(direct)".',
  botBackfill:
    'The behavioral bot classifier (migration 148) re-flagged history on 2026-06-11; "humans only" numbers before and after that date use the same corrected flags.',
  botRecall:
    'Bot flag precision is ~100% but recall is ~29–30% (hand-audited 2026-06-11): everything flagged bot IS a bot, but a chunk of stealth-bot traffic still counts as "human". Treat human counts as upper bounds.',
} as const

export interface MetricDoc {
  key: string
  title: string
  /** Plain English: what does this number actually count? */
  whatItCounts: string
  /** Technical: table/RPC, window semantics, bot semantics. */
  howComputed: string
  /** Which verification mean proves it (audit row / synthetic suite / filter matrix / invariant / snapshot oracle). */
  whyTrusted: string
  /** Epochs + known limits the reader must keep in mind. */
  caveats: readonly string[]
}

const docs = {
  // ── Overview dashboard — KPI row ─────────────────────────────────────
  kpi_visitors: {
    key: 'kpi_visitors',
    title: 'Visitors',
    whatItCounts:
      'Distinct browsers (anonymous device IDs) that fired at least one event in the selected window. One person on two devices counts twice; a cleared cookie counts as a new visitor.',
    howComputed:
      'RPC distinct_visitors_in_window on user_events: count(distinct distinct_id) with created_at >= start AND < end, bot_likely excluded unless "Including bots", optional filters via the shared insights_apply_filters predicate (migration 154). Delta chip compares the immediately-preceding window of equal length.',
    whyTrusted:
      'Hand-SQL cross-checked in the Phase 1 audit (audit week: 214 humans, exact match); every filter combination proven equal to independent raw SQL by the filter-matrix verifier (15 combos, all green); pinned-window value frozen in the baseline snapshot oracle.',
    caveats: [EPOCHS.mirror, EPOCHS.botRecall],
  },
  kpi_page_views: {
    key: 'kpi_page_views',
    title: 'Page views',
    whatItCounts: 'Total page_viewed events in the window — every page load our tracking script saw.',
    howComputed:
      'Direct PostgREST count on user_events where event_name = page_viewed, created_at >= start AND < end, bot_likely = false unless toggled, optional filters via the applyFilters() TS mirror of the shared SQL predicate.',
    whyTrusted:
      'page_viewed has a strict schema + synthetic browser recipe (Phase 3 suite fires it and asserts the row + every property + dedup); the direct-select path is one of the two live paths the filter-matrix verifier proves against raw SQL on every run.',
    caveats: [
      'Ad-blockers strip the client tracker; pages served to blocked browsers are invisible here (~25–35% on tech audiences). Ground-truth server-side page_views logs run higher by design.',
      EPOCHS.botRecall,
    ],
  },
  kpi_signed_in: {
    key: 'kpi_signed_in',
    title: 'Signed-in actives',
    whatItCounts:
      'Distinct logged-in ACCOUNTS active in the window — real authenticated humans, not browsers. The strictest "real users" number on this page.',
    howComputed:
      'RPC distinct_known_users_in_window: count(distinct user_id) where user_id is not null, same window/bot/filter semantics as Visitors.',
    whyTrusted:
      'Hand-SQL verified in the Phase 1 audit (audit week: 3 accounts, exact match); identity stitching (anonymous distinct_id ↔ user_id on login) is exercised by the synthetic auth recipes; covered by the filter-matrix verifier via the same shared predicate.',
    caveats: [EPOCHS.mirror],
  },
  kpi_signups: {
    key: 'kpi_signups',
    title: 'Signups',
    whatItCounts: 'signup_completed events in the window — new accounts created.',
    howComputed:
      'Direct count on user_events where event_name = signup_completed, window >= start AND < end, humans-only by default, optional filters via applyFilters().',
    whyTrusted:
      'Event has a registry entry + schema; payload-driven synthetic verification (auth flows are verified by canonical payload, labeled as such, since the browser suite can not complete OAuth). Cross-checkable against the profiles table for any window.',
    caveats: ['If a signup happens while the tracker is ad-blocked, the event can be lost client-side — reconcile against the profiles table for exact account counts.'],
  },
  kpi_outclicks: {
    key: 'kpi_outclicks',
    title: 'Outclicks',
    whatItCounts:
      'tool_visit_redirected events by humans — clicks that left RightAIChoice for a vendor site (the affiliate-revenue signal).',
    howComputed:
      'Direct count on user_events where event_name = tool_visit_redirected, window >= start AND < end, bot_likely excluded unless toggled (this matters here more than anywhere: the June 2026 audit found historic outclicks were ~99% bots before flagging), optional filters via applyFilters().',
    whyTrusted:
      'The bot-inflation bug is exactly what Phase 1/2 caught and fixed; the behavioral classifier (migration 148) re-flagged history; synthetic suite fires the event through the real redirect path and asserts the row; click_logs is the independent server-side ground truth to triangulate.',
    caveats: [EPOCHS.botBackfill, EPOCHS.botRecall],
  },
  kpi_newsletter: {
    key: 'kpi_newsletter',
    title: 'Newsletter subs',
    whatItCounts: 'newsletter_subscribed events in the window — new newsletter signups.',
    howComputed:
      'Direct count on user_events where event_name = newsletter_subscribed, window >= start AND < end, humans-only by default, optional filters via applyFilters().',
    whyTrusted:
      'Schema-registered event with a synthetic firing recipe (form submit on localhost asserts the DB row + envelope + dedup double-fire).',
    caveats: ['Counts subscribe EVENTS, not net list size — unsubscribes are not deducted here.'],
  },

  // ── Overview dashboard — strips & charts ─────────────────────────────
  right_now_pulse: {
    key: 'right_now_pulse',
    title: 'Right now — live pulse',
    whatItCounts:
      'DAU / WAU / MAU and signed-in actives over LIVE windows ending now: "today" = the current IST calendar day, 7d/30d = rolling windows back from this moment. Deliberately NOT affected by the filter bar above.',
    howComputed:
      'distinct_visitors_in_window / distinct_known_users_in_window with now-anchored cutoffs (IST midnight for today; now()-7d/30d) and no p_end / no optional filters. This is audit finding F5 made explicit: these tiles were silently ignoring the page date filter, so the rebuild moved them into this visually separate strip whose label states the exemption.',
    whyTrusted:
      'Same RPCs as the (audited, hand-SQL-verified) Visitors/Signed-in tiles — only the window anchoring differs; the F5 audit row documents the semantics; the snapshot oracle records them under "volatile" (now-anchored, excluded from strict diffing) by design.',
    caveats: ['These six numbers move in real time and will not match the filtered tiles above unless your filter happens to be the same live window.', EPOCHS.botRecall],
  },
  dau_trend: {
    key: 'dau_trend',
    title: 'Daily active users',
    whatItCounts: 'Distinct visitors per IST calendar day across the selected window.',
    howComputed:
      "RPC insights_daily_active_users: count(distinct distinct_id) grouped by date_trunc('day', created_at AT TIME ZONE Asia/Kolkata), window >= start AND < end, bots excluded unless toggled, optional filters via the shared predicate.",
    whyTrusted:
      'Window semantics unified in Phase 2 (the original DAU/WAU/MAU window-rule mismatch was audit finding #1); IST day-bucketing hand-verified; pinned-week series frozen in the baseline snapshot.',
    caveats: ['Days are IST calendar days — a visitor at 1am IST belongs to that IST date, not the UTC one.', EPOCHS.botRecall],
  },
  top_sources: {
    key: 'top_sources',
    title: 'Top sources (first-touch)',
    whatItCounts:
      'Where visitors FIRST came from: distinct visitors in the window, grouped by their first-touch referrer. "(unknown)" = the visitor predates attribution capture or has no profile; "(direct)" = genuinely no referrer.',
    howComputed:
      "RPC insights_top_property('first_touch_referrer'): user_events in-window joined to user_intent_profile, count(DISTINCT distinct_id) per first-touch value — visitors, not events (audit F4 changed this: the old version counted events and silently hid ~50% of traffic with no unknown bucket).",
    whyTrusted:
      'F4 fix hand-verified against raw SQL (direct 208 / google 11 visitors in the audit week); the RPC participates in the shared-predicate filter matrix; ordering made deterministic with an explicit tie-breaker (Phase 5a).',
    caveats: [EPOCHS.attribution, 'First-touch is per-visitor and sticky — a returning Google visitor stays "google" forever, whatever brings them back later.'],
  },
  top_pages: {
    key: 'top_pages',
    title: 'Top pages',
    whatItCounts: 'Most-viewed pages in the window, by page_viewed event count per page path.',
    howComputed:
      "RPC insights_top_property('page_path'): count(*) of events grouped by the top-level page_path column, window >= start AND < end, humans-only unless toggled, optional filters via the shared predicate. Event counts (views), not visitors.",
    whyTrusted:
      'Same audited RPC + shared filter predicate as Top sources; page_path completeness is tracked per-event by the nightly event-health invariants (pct_page_path); deterministic ordering via the Phase 5a tie-breaker.',
    caveats: ['Counts views, not unique visitors — one person refreshing 10× contributes 10.', EPOCHS.botRecall],
  },
  top_events: {
    key: 'top_events',
    title: 'Top events',
    whatItCounts: 'The highest-volume event types in the window — what people actually do most.',
    howComputed:
      'RPC insights_top_events: count(*) grouped by event_name, window >= start AND < end, bots excluded unless toggled, optional filters via the shared predicate, deterministic tie-breaker (events desc, name asc).',
    whyTrusted:
      'Hand-SQL verified in the Phase 1 audit (top-3 exact match); every event name shown here must exist in the schema registry (CI guard) and carries a synthetic firing recipe; filter behavior covered by the matrix verifier.',
    caveats: ['High-frequency ambient events (scroll milestones, impressions) dominate by design — depth, not reach. Click a row for the raw stream.'],
  },
  top_tools_viewed: {
    key: 'top_tools_viewed',
    title: 'Most-viewed tools',
    whatItCounts: 'Tool detail pages with the most tool_page_viewed events in the window.',
    howComputed:
      "RPC insights_top_jsonb_property(tool_page_viewed, 'tool_slug'): count(*) grouped by properties->>tool_slug, window >= start AND < end, humans-only unless toggled, shared filter predicate, deterministic tie-breaker (Phase 5a).",
    whyTrusted:
      'Hand-SQL verified in the Phase 1 audit (audit week: screenplayiq 8 / vercel 7 — exact match); tool_slug is a schema-required property of the event, so the property the panel queries can never silently drift (CI guard).',
    caveats: ['Event counts, not visitors. Tools renamed/merged keep their historical slug rows.', EPOCHS.botRecall],
  },
  top_tools_clicked: {
    key: 'top_tools_clicked',
    title: 'Most clicked-out tools',
    whatItCounts: 'Tools whose vendor link humans clicked most (tool_visit_redirected per tool) — the per-tool revenue signal.',
    howComputed:
      "RPC insights_top_jsonb_property(tool_visit_redirected, 'tool_slug') — same window/bot/filter semantics as Most-viewed; humans-only default is critical here (historic outclicks were ~99% bot before the classifier).",
    whyTrusted:
      'Outclick bot-inflation was a headline Phase 1 finding, fixed and re-verified in Phase 2; synthetic suite covers the redirect event; click_logs provides independent server-side triangulation.',
    caveats: [EPOCHS.botBackfill, EPOCHS.botRecall],
  },

  // ── Audience — users directory ───────────────────────────────────────
  users_directory: {
    key: 'users_directory',
    title: 'Users directory',
    whatItCounts:
      'Every visitor active in the selected window, one row per distinct browser ID, with window-scoped activity stats (events, active days, top country/device) and a lifetime-based New/Returning split.',
    howComputed:
      'RPC insights_user_directory (migration 155): in-window aggregation per distinct_id (events, IST active days, modal country/device, window last-seen) joined to a lifetime first-seen capped at the window end; is_returning = lifetime first_seen < window start (the F2-correct definition); sort allowlisted to last_seen | events | first_seen; paginated server-side with an exact total.',
    whyTrusted:
      'RPC verified against independent hand SQL on the pinned audit week (row totals + per-visitor sample rows, recorded in the 10.5a.3 commit); filter behavior exercised by the extended filter-matrix verifier; row count must equal the audited Visitors tile for identical filters (cross-tile invariant).',
    caveats: [
      'A "user" row is a browser ID — the same human on phone + laptop is two rows until they log in (then both rows carry the account badge).',
      EPOCHS.mirror,
      EPOCHS.botRecall,
    ],
  },
  users_returning_badge: {
    key: 'users_returning_badge',
    title: 'New vs Returning',
    whatItCounts:
      'Returning = the visitor existed BEFORE this window started (lifetime first event predates the window). New = their first event ever is inside the window.',
    howComputed:
      'is_returning = (lifetime first_seen < window start), lifetime capped at the window end so historical windows are immutable. This is the definition audit F2/F10 mandated — membership in the window is decided by events IN the window, never by lifetime last-seen.',
    whyTrusted:
      'F2 fix verified by hand SQL (637-vs-633 discrepancy eliminated; returning-summary total now exactly equals the Visitors tile); the p_end cap (Phase 5a fix) was itself caught by the Phase 4A gate as +0.1d/9.5h drift in avg_days_between and is documented in phase4a-gate.md.',
    caveats: ['Cookie clears manufacture "new" visitors; cross-device humans look new on each device until login stitches them.'],
  },

  // ── Audience — geography ─────────────────────────────────────────────
  geo_countries: {
    key: 'geo_countries',
    title: 'Visitors by country',
    whatItCounts: 'Distinct visitors per country in the window, with each country\'s busiest city.',
    howComputed:
      'RPC insights_geo_breakdown: count(distinct distinct_id) + count(*) per country (Vercel edge geo headers stored on every event), window >= start AND < end, humans-only unless toggled, optional filters via the shared predicate (added Phase 5a, migration 156). Rows with empty country are excluded from this panel.',
    whyTrusted:
      'Window membership semantics fixed in migration 149 and re-verified; the Phase 5a filter-matrix extension asserts a filtered geo path equals independent raw SQL; country completeness is visible per-event in the nightly event-health checks.',
    caveats: ['Geo comes from IP at the edge — VPNs lie, and a small share of events carry no country at all (excluded here, visible in the device "unknown" style buckets).', EPOCHS.botRecall],
  },
  geo_referrers: {
    key: 'geo_referrers',
    title: 'Top referrers (host)',
    whatItCounts: 'Referring site hostnames in the window, by distinct visitors whose page views carried that referrer. "(direct)" = no referrer header.',
    howComputed:
      'Direct select of page_viewed rows (referrer, distinct_id) in-window with the applyFilters() mirror, hostname extracted in app code, deduped per visitor. Last-touch semantics (the referrer ON the page view), unlike the dashboard\'s first-touch Sources panel.',
    whyTrusted:
      'Same direct-select + applyFilters path the filter-matrix verifier proves against raw SQL; complements (and is reconcilable with) the audited first-touch RPC — the two panels answer different questions by design.',
    caveats: [EPOCHS.attribution, 'In-app navigation after landing has no external referrer, so visit-level "(direct)" overstates true direct share.'],
  },
  geo_utm: {
    key: 'geo_utm',
    title: 'UTM campaigns',
    whatItCounts: 'Visitors per UTM source/medium/campaign combination — only traffic that arrived via tagged links.',
    howComputed:
      'Direct select of in-window events with utm_source IS NOT NULL (top-level columns — properties->>utm_* has zero rows in the live DB, verified 2026-06-12), deduped per visitor per combination, applyFilters() mirror applied.',
    whyTrusted:
      'UTM filter equivalence (TS mirror vs SQL predicate vs raw SQL) is asserted by the filter-matrix verifier; the top-level-column decision is documented in lib/admin/filters.ts with the live-DB verification date.',
    caveats: [EPOCHS.attribution, 'Untagged links are invisible here — this panel measures campaign hygiene as much as campaign performance.'],
  },

  // ── Audience — devices ───────────────────────────────────────────────
  devices_breakdown: {
    key: 'devices_breakdown',
    title: 'Device types',
    whatItCounts: 'Visitors and events per device class (desktop / mobile / tablet / unknown).',
    howComputed:
      'RPC insights_device_breakdown: per-device count(distinct distinct_id), count(*), and client/server event split, window >= start AND < end, humans-only unless toggled, optional filters via the shared predicate (migration 156). "unknown" = NULL device_type (server-emitted events have no UA classification).',
    whyTrusted:
      'The device=unknown ⇄ NULL convention is itself a verified filter-matrix case; window semantics fixed in migration 149; Phase 5a verifier extension asserts a filtered devices path against raw SQL.',
    caveats: ['Device class comes from Vercel\'s UA classification — UA spoofing lands wherever it claims to be.', EPOCHS.botRecall],
  },
  devices_browser_os: {
    key: 'devices_browser_os',
    title: 'Browsers & OS',
    whatItCounts: 'Visitors per browser and per OS family in the window.',
    howComputed:
      'Direct select of in-window events (user_agent, distinct_id) with the applyFilters() mirror, then a small in-app heuristic classifier (bucket-level only: Chrome/Safari/Firefox/…, Windows/macOS/iOS/…), deduped per visitor.',
    whyTrusted:
      'The data path (window + bot + filter predicates) is the verifier-covered direct-select path; the classifier is deliberately coarse and labeled heuristic — buckets, not versions.',
    caveats: ['Heuristic UA parsing: rare browsers land in "other"; sampled at the 10k most recent in-window rows on very large windows.'],
  },
  // ── Behavior — events explorer (Phase 10.5b) ─────────────────────────
  events_volume_list: {
    key: 'events_volume_list',
    title: 'Event volume list',
    whatItCounts:
      'Every event type seen in the window: count per the bots toggle, the always-visible bot share, distinct visitors who fired it, last fire time, and a per-day trend.',
    howComputed:
      "RPC insights_event_volume_list (migration 157): one pass over user_events in window >= start AND < end with the shared filter predicate; `events`/`visitors`/`last fired`/spark respect the bots toggle, `bot_events` always counts bot_likely rows so the split never hides; spark buckets are IST calendar days; deterministic ordering (events desc, bot events desc, name asc). A global event filter is deliberately dropped — this list IS the picker.",
    whyTrusted:
      'Same shared predicate the filter-matrix verifier proves against raw SQL on every run; per-event totals are reconcilable with the audited Top-events RPC for the same window; an event can only be listed with a name — names without a registry entry surface in the "unregistered" group instead of disappearing.',
    caveats: [EPOCHS.mirror, EPOCHS.botRecall, 'Bot-only events stay visible with a 0 human count when bots are excluded — by design.'],
  },
  event_property_breakdown: {
    key: 'event_property_breakdown',
    title: 'Property breakdown',
    whatItCounts:
      'For the selected event: the most frequent values of one of its schema-declared payload properties, with event and distinct-visitor counts per value.',
    howComputed:
      "RPC insights_event_property_breakdown (migration 157): count(*) + count(distinct distinct_id) grouped by properties->>prop for event_name = the selected event, window >= start AND < end, bots per toggle, optional filters via the shared predicate, deterministic ordering (events desc, value asc). Empty/missing values bucket as '(missing)'. The property name is allowlisted in TS against the event's EVENT_SCHEMAS entry before the RPC is ever called.",
    whyTrusted:
      'Two breakdown combos are asserted equal to independent hand-written raw SQL by the filter-matrix verifier (Phase 5b extension); the key-allowlist means the panel can only query properties the schema registry declares (CI-guarded), so a renamed property fails loudly instead of charting an empty column.',
    caveats: [EPOCHS.mirror, 'Counts events, not visitors, in the bar; the visitors column de-duplicates per value.'],
  },
  event_raw_stream: {
    key: 'event_raw_stream',
    title: 'Raw event stream',
    whatItCounts: 'The most recent raw rows for the selected event in the window — actual payloads, exactly as stored.',
    howComputed:
      'Direct PostgREST select on user_events (newest first, id tie-break) pinned to the selected event, window >= start AND < end, bots per toggle, optional filters via the applyFilters() TS mirror. No aggregation — what you see is the stored row.',
    whyTrusted:
      'The direct-select + applyFilters path is one of the two live paths the filter-matrix verifier proves against raw SQL; rows carry schema_valid tagging from /api/track-mirror, so payload drift is visible per row.',
    caveats: ['A raw stream shows rows, not truth-about-people: one human can be several distinct_ids (devices, cookie clears).'],
  },

  // ── Funnels & conversion (Phase 10.5b) ───────────────────────────────
  funnel_plan_journey: {
    key: 'funnel_plan_journey',
    title: 'Plan journey funnel',
    whatItCounts:
      'How far visitors get INSIDE the plan flow: started → intake submitted → plan completed → clicked a recommended tool. Event counts per step.',
    howComputed:
      'Four direct PostgREST counts on user_events (plan_started / plan_intake_submitted / plan_completed / plan_results_tool_clicked), window >= start AND < end, humans-only unless toggled, optional filters via the applyFilters() mirror. Step-over-step % = step ÷ previous step.',
    whyTrusted:
      'Same getPlanFunnel the audited insights page has always used — pinned-week values frozen in the baseline snapshot oracle; the direct-select path is verifier-covered; every step event has a schema + synthetic recipe (plan_results_tool_clicked permanently at 0 was exactly the class of bug the registry CI guard now prevents).',
    caveats: ['Counts events, not unique users — one person restarting the flow counts twice.', EPOCHS.mirror, EPOCHS.botRecall],
  },
  funnel_plan_acquisition: {
    key: 'funnel_plan_acquisition',
    title: 'Plan acquisition funnel (CTA → signup → plan)',
    whatItCounts:
      'The full path INTO the plan flow: CTA shown → CTA clicked → signup modal shown → (4a OAuth / 4b skipped branches) → signup completed → /plan loaded → plan finalized.',
    howComputed:
      'Eight direct counts on user_events (lib/admin/plan-conversion.ts), window >= start AND < end, humans-only by default (audit F6: conversion metrics exclude bots), optional filters via the shared mirror. 4a/4b are BRANCHES off step 3 — they are excluded from the main-path step-over-step % and shown with their % of the modal step instead.',
    whyTrusted:
      'F6 (humans-only conversions) was a documented Phase 2 fix; pinned-week funnel frozen in the snapshot oracle; each step event is schema-registered with a synthetic recipe (modal steps browser-verified, OAuth steps payload-verified and labeled as such).',
    caveats: ['Steps count events, not deduped users; a modal re-open counts again.', EPOCHS.mirror, EPOCHS.botRecall],
  },
  plan_surface_breakdown: {
    key: 'plan_surface_breakdown',
    title: 'Per-surface conversion',
    whatItCounts:
      'Which CTA placement (sticky bar / inline card / navbar / homepage / plan page) pulls impressions, clicks and signups.',
    howComputed:
      "Per surface: counts of plan_cta_impression / plan_cta_clicked filtered on properties->>surface (signups on properties->>source_surface), window + humans-only default + optional filters via the shared mirror. The final ALL row is computed WITHOUT the surface property filter — a built-in parity check: if per-surface rows don't roughly sum to it, events are firing without a surface prop.",
    whyTrusted:
      'The parity row is the trust mechanism — a silent JSONB-filter failure becomes a visible discrepancy instead of fake zeros; surface is a schema-required property of both CTA events (CI-guarded); pinned-week values in the snapshot oracle.',
    caveats: ['ALL row > sum of rows means some events carry no/unknown surface value — investigate before trusting per-surface CTR.'],
  },
  plan_intent_stream: {
    key: 'plan_intent_stream',
    title: 'Intent stream (typed goals)',
    whatItCounts:
      'Every goal a visitor actually typed into the plan CTA in the window — including people who bounced at the signup gate. The rawest demand signal we have.',
    howComputed:
      'Direct select on the plan_intents table (written durably at type-time, before any auth), newest first, window >= start AND < end. plan_intents has NO bot flag and no device/geo columns — the bots toggle and optional filters DO NOT apply to this panel (only the date range does).',
    whyTrusted:
      'plan_intents is a ground-truth capture table (server-written), not derived from the analytics mirror — it survives ad-blockers; rows link to the visitor timeline for replay.',
    caveats: ['Unfiltered by bots — a scripted visitor typing into the box would appear here.', 'One visitor can produce several intents (retypes).'],
  },
  plan_link_rate: {
    key: 'plan_link_rate',
    title: 'Anon → known link rate',
    whatItCounts: 'Share of typed goals that were later tied to an authenticated account (same-session OAuth or later reconciliation).',
    howComputed:
      'Two counts on plan_intents in the window: total rows vs rows with user_id IS NOT NULL; rate = linked ÷ total. Range-only (see Intent stream — the table has no filter dimensions).',
    whyTrusted:
      'Pinned-week value frozen in the snapshot oracle; linkage itself is exercised by the plan_intent_linked_to_user reconciliation path and verifiable per row in the stream below.',
    caveats: ['A goal typed today can become "linked" tomorrow — the rate for a recent window keeps improving as reconciliation catches up.'],
  },

  // ── Revenue — sentiment checker (Phase 10.5b, F13 fix) ───────────────
  sentiment_funnel: {
    key: 'sentiment_funnel',
    title: 'Sentiment acquisition → revenue funnel',
    whatItCounts:
      'How visitors move through the paid Sentiment Checker: card viewed → scan requested → scan completed → paywall shown → payment succeeded. Event counts per leg.',
    howComputed:
      'Five direct counts on user_events, window >= start AND < end, humans-only unless "Including bots", optional smart filters via the applyFilters() mirror. Before the Phase 5b rebuild (audit F13) these were ALL-TIME counts with no window and no bot filter — bots inflated "card viewed" almost 2× (101 all-time-any vs 52 humans on 2026-06-12).',
    whyTrusted:
      'A windowed humans-only leg is asserted equal to independent raw SQL by the filter-matrix verifier (Phase 5b extension); every leg event is schema-registered (server legs payload-verified by the synthetic suite, labeled as such); pinned-week funnel frozen in the snapshot oracle.',
    caveats: [
      'Legs mix client events (card viewed) with server events (scan/paywall/payment) — ad-blockers can suppress the client leg but never the server legs, so leg-over-leg % can exceed reality.',
      EPOCHS.botRecall,
    ],
  },
  sentiment_revenue: {
    key: 'sentiment_revenue',
    title: 'Revenue by currency',
    whatItCounts: 'Money actually collected for sentiment scans in the window, split by currency, plus the paid-payment count.',
    howComputed:
      "Direct select on sentiment_payments where status = 'paid', window >= start AND < end, summed per currency (amounts stored in minor units; ÷100 for display). The payments table has NO bot column — only the date range applies here, stated on the page.",
    whyTrusted:
      'sentiment_payments is the gateway-webhook ground truth (server-written rows, not analytics events); each row is reconcilable against the PayPal/Razorpay dashboard by gateway id; a windowed count is asserted vs raw SQL by the Phase 5b verifier extension.',
    caveats: ['PayPal is still in SANDBOX mode at the time of writing — sandbox payments look identical here; check the gateway column.', 'No currency conversion — each currency sums separately.'],
  },
  sentiment_scan_health: {
    key: 'sentiment_scan_health',
    title: 'Scan health (status, sources, latency)',
    whatItCounts:
      'Operational health of scans in the window: ready/partial/failed mix, free vs paid, which sources contributed posts, and p50/p95 scan latency.',
    howComputed:
      'Aggregated in app code over the windowed sentiment_searches rows (capped at the 500 most recent in-window): status/charge_type tallies, per-source frequency from the sources array, and percentile latency over non-null duration_ms. Range only — the scans table has no bot column.',
    whyTrusted:
      'sentiment_searches is written by the scan pipeline itself (one row per scan, status updated in place) — this panel reads the operational ground truth, not a mirror of it.',
    caveats: ['Latency percentiles are computed over completed scans that recorded a duration; failed-fast scans without duration_ms are excluded.', 'On windows with > 500 scans the aggregates cover the most recent 500.'],
  },

  // ── Behavior — tool engagement (Phase 10.5b) ─────────────────────────
  tools_heatmap: {
    key: 'tools_heatmap',
    title: 'Tool engagement heatmap',
    whatItCounts:
      'Every tool that got traffic in the window: page views, unique visitors, vendor click-outs and the resulting CTR, plus last visit.',
    howComputed:
      "RPC insights_tool_heatmap: one pass over user_events in window >= start AND < end (explicit cutoffs since the 5b rebuild — calendar ranges are exact, not approximated by a rolling day count), humans-only unless toggled, optional filters via the shared predicate (migration 157). Tool attribution = properties->>tool_slug, falling back to the /tools/<slug> path segment; CTR = clicks ÷ views per tool; deterministic ordering (views desc, visitors desc, slug asc).",
    whyTrusted:
      'Reads the same audited event set as the Most-viewed / Most-clicked dashboard panels (hand-SQL verified in Phase 1) through the verifier-covered shared predicate; click_logs triangulates the click column server-side.',
    caveats: ['Views count events, not visitors.', EPOCHS.botBackfill, EPOCHS.botRecall],
  },
  tool_audience: {
    key: 'tool_audience',
    title: 'Tool audience detail',
    whatItCounts:
      'One tool\'s window audience: unique visitors who touched it, page views, affiliate click-outs, saves, and which alternatives those users compared it against.',
    howComputed:
      "Counts: direct selects on user_events pinned to tool_page_viewed / tool_visit_redirected / tool_saved with properties->>tool_slug = this tool, window + bots + optional filters via the applyFilters() mirror. Unique users: RPC distinct_visitors_for_tool (any event carrying the slug). Compared-with: RPC insights_tool_compared_with over user_intent_profile pair arrays — optional filters restrict to visitors with ≥1 matching event (154 §11 semantics, both RPCs filter-aware since migration 157).",
    whyTrusted:
      'Same event substrate as the audited dashboard tool panels; the null fast-path of the 157 RPC extensions was probe-verified against raw SQL on the pinned week; tool_slug is a schema-required property (CI-guarded).',
    caveats: ['Compared-with reflects profile aggregates (per-visitor lifetime arrays scoped by last-active) — it answers "who", not "how many times".', EPOCHS.mirror, EPOCHS.botRecall],
  },

  // ── SEO & Growth (Phase 10.5c) ───────────────────────────────────────
  seo_pulse_wow: {
    key: 'seo_pulse_wow',
    title: 'Site-wide GSC totals (WoW)',
    whatItCounts:
      'Google Search Console clicks / impressions / CTR / average position for the whole site over the trailing 7-day and 28-day scopes, with the delta against the PREVIOUS weekly snapshot of the same scope.',
    howComputed:
      'The latest two rows per scope from gsc_snapshots (snapshot_date desc, totals jsonb written verbatim from the GSC API by the weekly snapshot-gsc cron, Mon). Delta = current − prior. This is snapshot pairing, NOT the global date filter — the page deliberately keeps this custom control.',
    whyTrusted:
      'Phase 1 agent audit verified the WoW totals exactly against the stored gsc_snapshots rows (PASS, metric-audit.md "Also verified PASS"); the numbers are Google\'s own — we store and difference them, we never recompute them.',
    caveats: [
      'GSC data lags ~2 days and Google revises recent days — two snapshots taken a week apart are comparable, but neither matches the live GSC UI for the same window.',
      'No snapshot row → "No snapshot yet": the weekly cron has not run for that scope.',
    ],
  },
  seo_pulse_queue: {
    key: 'seo_pulse_queue',
    title: 'Triage queue counts',
    whatItCounts:
      'Open weekly-loop actions by status: proposed (awaiting a decision), accepted (awaiting execution), executed (measuring for 4 weeks), plus the critical/high priority split of the proposed queue.',
    howComputed:
      "One select on weekly_loop_actions with status IN ('proposed','accepted','rejected'-excluded …) — exactly the rows rendered in the cards below, counted in app code after the fetch. Accept / Reject / Mark-executed are server actions that update the same table.",
    whyTrusted:
      'Phase 1 agent audit verified the action counts exactly (PASS); the counts and the visible card lists come from the SAME fetched rows, so the tiles can never disagree with the queue you see.',
    caveats: ['Not date-ranged — the queue is a live worklist, not a windowed metric.'],
  },
  seo_impact_summary: {
    key: 'seo_impact_summary',
    title: 'Title-change impact summary',
    whatItCounts:
      'For approved title overrides: how many have a +28-day outcome measurement, how many are still waiting, the average CTR lift and the average position gain across measured pages that had impressions in BOTH windows.',
    howComputed:
      'title_overrides rows with a baseline captured and reverted_at IS NULL; measured = measured_at set (outcome_* columns written by the weekly seo-impact cron 28 days after approval against the latest GSC snapshot); avg lift = mean(outcome_ctr − baseline_ctr); position gain = mean(baseline_position − outcome_position), so positive = moved UP the SERP.',
    whyTrusted:
      'Source-traced in the Phase 1 audit sweep; baseline and outcome are both stored GSC numbers (never recomputed), and the comparable-pages rule (impressions in both windows) is applied in page code you can read at app/admin/seo-impact/page.tsx.',
    caveats: [
      'Before/after is NOT a controlled experiment — seasonality and ranking shifts land in the same delta.',
      'Pages with zero impressions in either window are excluded from the averages but still listed.',
    ],
  },
  niche_tracker_summary: {
    key: 'niche_tracker_summary',
    title: 'Niche page tracker summary',
    whatItCounts:
      'The /best niche pages being tracked: how many have ANY impressions in the latest 28-day GSC snapshot, how many gained impressions vs the prior snapshot, and total impressions/clicks across all tracked pages.',
    howComputed:
      'Single select on the service-role niche_page_latest view (seeded from lib/data/best-pages.ts joined to the latest two gsc_snapshots), summed in app code. Refreshes weekly when the Mon snapshot cron lands — not affected by the global date filter.',
    whyTrusted:
      'Phase 1 agent audit recomputed the view exactly from the GSC snapshot JSONB (PASS — 64 tracked / 398 impressions at audit time); totals are sums over the same rows the table below displays.',
    caveats: [
      'Pages built recently read 0 until Google reports them (~2–4 weeks).',
      'Clicks stay near 0 while positions sit on page 4+ — authority-gated, not a page-quality signal.',
    ],
  },
  ai_citations_kpis: {
    key: 'ai_citations_kpis',
    title: 'AI citation KPIs (30d)',
    whatItCounts:
      'Manually logged answer-engine checks over the last 30 days: how many times RightAIChoice was cited, across how many distinct engines, and the citation rate (cited ÷ checked). Target: 10 citations / 30d (doc 11).',
    howComputed:
      "SQL on ai_citations via _admin_audit_exec with checked_on >= current_date − 30 days — a true rolling DB window computed at query time, deliberately FIXED at 30 days (the doc-11 KPI definition) rather than following the global date filter.",
    whyTrusted:
      'The table is a manual log — every row was typed in by the operator, so the KPI is exactly as trustworthy as the logging discipline; the SQL is a 3-aggregate one-liner you can re-run verbatim from the page source (Phase 1: verified trivially).',
    caveats: [
      'Manual-first tracking: weeks with no checking discipline read as zero citations even if engines cite us.',
      'A "not cited" row is signal too — log misses, or the rate is meaningless.',
    ],
  },
  authority_summary: {
    key: 'authority_summary',
    title: 'Referring-domain tracker',
    whatItCounts:
      'Unique referring domains ever logged, how many were first seen inside the selected window, the average DA estimate over rows that have one, and the top acquisition channel all-time.',
    howComputed:
      'One select over referring_domains (manually curated via the add-form + 7O outreach workflows); the window count filters first_seen_at >= range start in app code; channel totals and avg DA are computed over the same fetched rows the tables below render.',
    whyTrusted:
      'Source-traced in Phase 1; the tiles aggregate exactly the rows listed on this page — recount the table and you have re-verified the tile.',
    caveats: [
      'Manually curated — a backlink nobody logged does not exist here (Ahrefs/Moz are the discovery tools, this is the ledger).',
      'DA estimates are whatever was typed at log time; they are not refreshed automatically.',
    ],
  },
  tier1_queue: {
    key: 'tier1_queue',
    title: 'Tier-1 title rewrite queue',
    whatItCounts:
      'AI-suggested title rewrites awaiting review, bucketed by current GSC position (1A pos≤10 / 1B 11–20 / 1C 21–30) and by binding constraint (title-bound / mixed / rank-bound), plus how many overrides are currently active.',
    howComputed:
      'Reads candidates/tier1-rewrites.json (generated by npm run tier1:rewrite from GSC candidates + DeepSeek suggestions, priority = impressions × title-leverage) and joins active title_overrides (reverted_at IS NULL) from the DB. File-based by design — the queue is a build artifact, not a live metric.',
    whyTrusted:
      'Counts are client-visible filters over the same JSON file rendered below; the active-override count is a direct DB select. Approvals write through the audited title_overrides path that /admin/seo-impact measures 28 days later.',
    caveats: [
      'The JSON is as fresh as its last generation run (date shown in the header) — regenerate before a review session.',
      'Priority is a heuristic for ROI ordering, not a measurement.',
    ],
  },

  // ── Content Ops (Phase 10.5c) ────────────────────────────────────────
  kr_catalog_state: {
    key: 'kr_catalog_state',
    title: 'Catalog state',
    whatItCounts:
      'The live catalog right now (always today, never windowed): published tools, the single stalest verification timestamp, the compare-pages cascade backlog, never-refreshed tools, and how many tools have a "Latest from" feed.',
    howComputed:
      'Five cheap exact PostgREST counts/selects on tools + the v_stale_comparisons view, fetched fresh on every request (force-dynamic, no caching).',
    whyTrusted:
      'Phase 1 agent audit PASS: catalog counts were twice-fetched deterministic and exact (2,003 published at audit time); the stalest-tool and cascade-backlog tiles matched hand SQL.',
    caveats: ['These tiles ignore the date picker by design — they describe the catalog NOW.'],
  },
  kr_user_activity: {
    key: 'kr_user_activity',
    title: 'User activity (window)',
    whatItCounts:
      'Ground-truth user actions in the selected window: server-logged page views and searches, tool saves, saved plans, newsletter signups, and newly logged referring domains.',
    howComputed:
      'Exact head-counts on the server-side ground-truth tables (page_views, search_logs, user_saved_tools, saved_stacks, newsletter_subscribers, referring_domains) with created_at >= window start. Top tools / top searches come from the kr_top_tools / kr_top_searches SQL-side GROUP BY RPCs (audit F9 fix: the old client-side grouping silently undercounted past 2,000 un-ordered rows at 14d/30d/90d).',
    whyTrusted:
      'F9 is a documented Phase-2 fix with the kr_* RPCs verified against hand SQL; these are server-written tables, so ad-blockers cannot hide activity here — they are the triangulation source for the analytics mirror, not derived from it.',
    caveats: [
      'page_views/search_logs include any traffic that executes the server path — bot filtering does not apply on this page.',
      'Window start is a rolling cutoff (>= start); presets behave exactly as the picker labels them.',
    ],
  },
  kr_activity_feed: {
    key: 'kr_activity_feed',
    title: 'Activity feed (tools refreshed / added / latest)',
    whatItCounts:
      'WHICH tools changed in the window, by name: refresh-SOP completions (with the fields each run updated), newly published tools (manual vs auto-ingested), and tools whose "Latest from" feed was rebuilt.',
    howComputed:
      'refresh_logs (status=refreshed) and tools (created_at / latest_updates_at >= window start), newest first, 20 per panel with a "view all" drill-down to /admin/activity (full list, cap 500).',
    whyTrusted:
      'Reads the pipelines\' own write-ahead logs — the same rows the refresh/ingestion jobs wrote, not a derived aggregate; spot-checked in the Phase 1 sweep.',
    caveats: ['Panels show the 20 most recent; the count next to each panel is the fetched-row count, capped at 20 — use "view all" for the real total.'],
  },
  kr_pipeline_results: {
    key: 'kr_pipeline_results',
    title: 'Pipeline results (window)',
    whatItCounts:
      'What the content pipelines did in the window: refresh ok/failed mix, ingestion discovered/duplicate/gated/failed mix, regenerated compare editorials, and the last 8 errors of each kind with drill-down.',
    howComputed:
      'kr_refresh_mix RPC (SQL-side GROUP BY — audit F9 fix: the old 5,000-row client grouping dropped ~26% of a 30d window), ingestion_logs grouped in app code (volume safely below its cap), tool_comparisons.last_reviewed_at for cascade, plus bounded error selects.',
    whyTrusted:
      'F9 fix verified against hand SQL in Phase 2; error lists are raw rows (no aggregation to get wrong); the ok/failed badge and the error list read the same tables.',
    caveats: ['Ingestion mix still groups client-side under a 5,000-row cap — accurate at current volumes, revisit if ingestion ever exceeds that in one window.'],
  },
  kr_pipeline_cost: {
    key: 'kr_pipeline_cost',
    title: 'Pipeline cost (NOT INSTRUMENTED — F8)',
    whatItCounts:
      'It currently counts nothing real: every pipeline_runs row ever has estimated_cost_usd / DeepSeek + Anthropic tokens / apify_usd at 0 or NULL, because no handler calls ctx.recordTokens / ctx.recordApifyUsd.',
    howComputed:
      'The plumbing exists (per-pipeline cost aggregation + a $5/day trailing-24h red flag) and activates automatically once any run logs a nonzero cost; until then the page renders an explicit "Not instrumented (F8)" state instead of a misleading "$0.00".',
    whyTrusted:
      'Audit finding F8 (metric-audit.md): SELECT count(*) FILTER (WHERE coalesce(estimated_cost_usd,0)>0) FROM pipeline_runs → 0 of 1,826 rows. Honesty rule: a number we do not measure is rendered as "not measured", never as zero.',
    caveats: ['Fix direction: populate token+cost fields in withPipelineLogging/cronRoute handlers — until then ALL cost UI on this page and /admin/health is informational only.'],
  },
  kr_health_score: {
    key: 'kr_health_score',
    title: 'Pipeline health score (7d + 30d)',
    whatItCounts:
      'Per pipeline: success rate over the last 7 and 30 days, the trend vs the prior equal window, run count, mean/p95 duration (7d), and error-class tallies (30d). Degrading pipelines (<90% 7d) sort first with a red edge.',
    howComputed:
      'pipeline_runs rows from the last 60 days (cap 10,000 — current volume ~2k), aggregated in app code with fixed now-anchored 7/14/30/60-day windows. Deliberately NOT controlled by the page date picker: a health score over an arbitrary window is noise.',
    whyTrusted:
      'Reads the same pipeline_runs substrate whose per-pipeline numbers the Phase 1 audit verified exactly against the pipeline_health RPC; the aggregation is plain counting you can re-run from the page source.',
    caveats: ['Success rate counts runs, not items — one run that processed 0 items "succeeds".', 'The 10k/60d cap is monitored headroom, not a correctness guarantee at 5× current volume.'],
  },
  tools_catalog_freshness: {
    key: 'tools_catalog_freshness',
    title: 'Tools catalog freshness split',
    whatItCounts:
      'Published tools split by verification age: Fresh (verified <30d ago), Aging (30–90d), Stale (>90d or never verified). Tiles link to the matching filtered list.',
    howComputed:
      'Computed in app code over the full fetched tools list using two cutoffs (now−30d, now−90d) on last_verified_at; the stale/aging filter views re-apply the SAME cutoffs as SQL predicates, so tile counts and filtered lists agree.',
    whyTrusted:
      'Trivially recountable: the tiles aggregate exactly the rows in the table below; the freshness SLA versions of these numbers are independently checked nightly by /admin/data-audit (fresh-7day-sla).',
    caveats: ['Drafts are excluded from the freshness split (unpublished tools have no freshness SLA).'],
  },
  freshness_field_map: {
    key: 'freshness_field_map',
    title: 'Field freshness map',
    whatItCounts:
      'Per data field (last_verified_at, latest_updates_at, viability, …) × pricing tier: how many published tools never had the field filled, how many are stale past 7d/30d, and the p50/p95 age with the single oldest tool.',
    howComputed:
      'Single select on the v_field_freshness MATERIALIZED view, refreshed nightly by the refresh-freshness-view cron (23:45 UTC) — numbers are as of the last refresh, not live.',
    whyTrusted:
      'Source-traced in the Phase 1 sweep; the view definition (migrations 091/091a) is plain percentile SQL over tools, and the nightly refresh is itself monitored on /admin/health.',
    caveats: ['Materialized: up to ~24h stale by design. If the refresh cron fails, this page silently shows yesterday — check /admin/health if numbers look frozen.'],
  },
  daily_checklist: {
    key: 'daily_checklist',
    title: 'Daily checklist counters',
    whatItCounts:
      'Today\'s manual-growth-loop progress: referring domains logged today, outreach emails sent today (target 5+), HARO replies today, founder drafts in the pool, plus lifetime totals.',
    howComputed:
      'Exact counts on referring_domains (first_seen_at) and outreach_log (sent_at) since IST midnight — the 9.A.1 fix replaced the old UTC midnight that made "today" wrong for the first 5.5 IST hours — plus head-counts for lifetime.',
    whyTrusted:
      'The IST-midnight window comes from the same shared parseRange helper every audited admin page uses; counts are over manually written ledger tables (same trust model as /admin/authority).',
    caveats: ['"Done" states are inferred from counters (e.g. outreach ≥ 5), not ticked boxes — sending 5 emails nobody logged leaves the task red.'],
  },

  devices_adblock: {
    key: 'devices_adblock',
    title: 'Ad-block signal',
    whatItCounts: 'Share of events that arrived via the server-side mirror rather than the browser tracker — a directional proxy for ad-blocker prevalence.',
    howComputed:
      'server_events / total_events from insights_device_breakdown. Ad-blockers strip the client tracker but server-emitted events still land, so a high server share suggests more blocking in that bucket.',
    whyTrusted:
      'Arithmetic over the audited breakdown RPC. Explicitly directional — there is no per-session ad-block ground truth, and the page says so.',
    caveats: ['Not a measurement, an inference. Industry baseline for tech audiences is ~25–35% blocked.'],
  },
} as const

export type MetricDocKey = keyof typeof docs

export const METRIC_DOCS: Record<MetricDocKey, MetricDoc> = docs

export function getMetricDoc(key: MetricDocKey): MetricDoc {
  return METRIC_DOCS[key]
}
