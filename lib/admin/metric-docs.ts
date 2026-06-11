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
