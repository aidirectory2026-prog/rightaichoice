# Build Log — Phase 10 (Bug-Fix + Real-Time Data SOP) · Opus 4.8

One dated entry per completed step. Format: **what / why / how / verification / residual risk**.
A step counts as done ONLY after it is verified, re-verified, and logged here.

- Plan: `Plan_phase 10.md` (same folder) · Audit: `docs/full-bug-audit-2026-06-07.md`
- Code worktree: `../rac-phase10` on branch `phase10-bugfix` (integrate to `main` via squash PR)
- Governing SOP: Isolate → Implement → Verify → Re-verify → Log → Commit

---

## Baseline snapshot (2026-06-07, before any fix)

Captured from live DB (`adtznghodbgkvknilfln`) + toolchain, so every cleanup can be proven by a
moved metric.

| Metric | Baseline |
|---|---|
| Tools total / published | 2,067 / 1,994 |
| `tsc --noEmit` | passes (exit 0) |
| Duplicate published name-pairs | 11 |
| Published tools with NULL logo | 398 |
| Pricing `contact` total / with no details | 770 / 262 |
| Viability distinct values (published) | 8 (range 72–90, avg 78.2) |
| `pages_freshness` never revalidated | 2,830 / 2,830 |
| `pipeline_runs` stuck `running` >1h | 195 |
| Comparisons that are indexable soft-404s | 14 / 637 |
| Discovery queue (`tool_candidates`) | 1 row |
| Full-refresh cycle (last_verified_at) | ~5.5–6.9 days (target ≤3) |
| RLS disabled tables | 1 (`tracked_niche_pages`) |

---

## Progress log

### 2026-06-07 — S0: Workspace, deliverables, baseline
- **What:** Created isolated worktree `../rac-phase10` on `phase10-bugfix`; symlinked
  `node_modules` + `.env.local` into it so typecheck/scripts run there; created the Phase 10 docs
  folder (this build log + `Plan_phase 10.md`) in the main repo for visibility; captured the
  baseline snapshot above.
- **Why:** AGENTS.md mandates a dedicated worktree for large streams so the shared `main` tree isn't
  a scratchpad for two concurrent sessions; baseline metrics make later cleanups provable.
- **How:** `git worktree add ../rac-phase10 -b phase10-bugfix`; `ln -s` for node_modules/env;
  Supabase read-only queries for the baseline.
- **Verification:** `git worktree list` shows the new tree; `node_modules/.bin` resolves in the
  worktree; baseline queries returned the values tabled above; `tsc --noEmit` exit 0.
- **Residual risk:** None. Docs intentionally kept in the main repo (user-visible); code stays in
  the worktree.

### 2026-06-07 — Plan update: Pro-tier optimizations + reporting cadence
- **What:** Folded Vercel Pro + Supabase Pro capabilities into the plan (new "Pro-tier
  optimizations" section, OPT-1…OPT-7), and changed the Governing SOP to
  **Isolate → Implement → Verify → Re-verify → Log → Report → Commit** — after every step I report
  in plain language and ask the operator for changes before continuing.
- **Why:** Operator confirmed both platforms are on Pro; pg_cron is already installed (verified
  running `tracking-invariants-nightly`), so DB-native scheduling replaces fragile cron-over-HTTP
  for maintenance jobs and removes the root cause of the stuck-row leak. Operator also requested a
  plain-language check-in after each step.
- **How:** Verified extensions (`pg_cron` 1.6.4 INSTALLED, `pg_net` available) and existing
  `cron.job` table; edited `Plan_phase 10.md`.
- **Verification:** `select * from cron.job` returns the existing job; extension query confirms
  availability. Plan + SOP updated.
- **Residual risk:** OPT-5 (PITR) and `pg_net` require operator/dashboard actions — flagged in-plan.

### 2026-06-08 — S1: Security & data exposure (#60, #20, #25, #34) — COMPLETE
- **What:**
  - **#60** Enabled Row-Level Security on `tracked_niche_pages` with `service_role_full_access` +
    `authenticated_read` policies (mirrors `093_gsc_snapshots`). Migration `138`.
  - **#20** API keys are now stored as a SHA-256 `key_hash` (+ display `key_prefix`); the raw key is
    returned once at creation and never persisted. Migration `139` (key_hash unique index; legacy
    `key` made nullable). Route `app/api/keys/route.ts`.
  - **#25** `analytics.identify` now strips the raw email and sends only `email_domain` to Mixpanel
    (central strip → covers all callers). `lib/analytics.ts`.
  - **#34** Newsletter unsubscribe now uses the service-role client (was a silent no-op under an
    admin-only RLS policy), verifies a signed HMAC token from the email link, and is rate-limited
    (5/min). New `lib/newsletter/unsubscribe-token.ts`; route + form + page updated.
- **Why:** Close the public data hole, eliminate plaintext-secret-at-rest, honour the site's own
  email-domain-only privacy rule, and make unsubscribe both functional and abuse-resistant.
- **How:** Migrations applied to prod via Supabase; code changes in the worktree; designed to not
  break the parallel SEO session (niche reads go through service-role, which bypasses RLS; legacy
  `key` column kept nullable so older deployed code doesn't error during rollout).
- **Verification:** `tsc --noEmit` exit 0. Live DB: `relrowsecurity=true` + 2 policies on
  tracked_niche_pages (anon has no policy → denied by default); `api_keys.key_hash` exists, `key`
  nullable. Grep confirms the keys route writes `key_hash` (no plaintext insert) and the only
  `identify()` caller's email is stripped centrally.
- **Residual risk:** Legacy `api_keys.key` column still exists (nullable) — drop in a post-deploy
  cleanup once the new code is live. Unsubscribe email-link generation (token in URL) is ready for
  when the Resend send pipeline is wired; self-service typed-email path stays rate-limited.

### 2026-06-08 — S2: Money-path hardening (#24, #5, #6, #23, +rate limits) — COMPLETE
- **What:**
  - **#24 (drift)** Live DB had BOTH `claim_sentiment_scan(p_user)` and `(p_user,p_free_limit)`; the
    app uses the 2-arg form so prod worked, but a restore from committed migrations would only have
    the 1-arg form and break every scan. Migration `140` captures the 2-arg version into source
    control and drops the dead 1-arg overload.
  - **#5 (Razorpay pay-less loophole)** `razorpay/verify` now (a) asserts the client's
    `razorpay_order_id` equals the order WE created (`row.gateway_order_id`) and (b) re-fetches the
    payment from Razorpay to confirm `order_id` + `amount === amount_minor` + `status='captured'`
    before granting credit. New `fetchRazorpayPayment()` in `lib/payments/razorpay.ts`.
  - **#6 (no safety net)** Added idempotent, signature-verified webhooks:
    `app/api/payments/razorpay/webhook` (HMAC via `RAZORPAY_WEBHOOK_SECRET`, `payment.captured`) and
    `app/api/payments/paypal/webhook` (verify-webhook-signature via `PAYPAL_WEBHOOK_ID`,
    `PAYMENT.CAPTURE.COMPLETED`, mapped back via the order's `custom_id=scan_<rowId>`). Both grant
    through `grant_sentiment_credit`, whose `status='paid'` guard prevents double-credit alongside
    the client path. New `verifyPaypalWebhook()` in `lib/payments/paypal.ts`.
  - **#23 (geo free-limit spoof)** New `freeScanLimitFromRequest()` grants the elevated India
    allowance (25 vs 5) ONLY from the unforgeable Vercel edge header, not the generic fallback. Scan
    + status routes switched to it. (PayPal capture already bound the order — verified, untouched.)
  - **#2.5** Added rate limits to `razorpay/verify` (rzp-verify) and `paypal/capture` (pp-capture);
    order routes were already limited.
- **Why:** Close a "pay ₹1, claim ₹20" substitution, stop money-taken-but-no-credit (refunds/
  chargebacks), eliminate migration drift that would break scans on any restore, and remove a
  free-scan-farming vector.
- **How:** Code in the worktree; migration 140 applied to prod via Supabase.
- **Verification:** `tsc --noEmit` exit 0. DB now shows a single `claim_sentiment_scan(uuid,integer)`
  overload. Grep confirms order_mismatch + amount/status checks + both webhook routes + capture
  rate-limit. grant_sentiment_credit idempotency re-confirmed from its definition (status='paid' →
  returns 0).
- **Residual risk / OPERATOR ACTIONS:** Webhooks only fire once configured in the gateway
  dashboards — set the Razorpay webhook URL + `RAZORPAY_WEBHOOK_SECRET`, and the PayPal webhook URL +
  add `PAYPAL_WEBHOOK_ID` env. Until then the (now-hardened) client paths remain the grant path.
  → **Reminder scheduled for 2026-06-20 09:00 IST** (routine `trig_011aq8muscwtn3Ev6uTEFCqE`) to do
  this dashboard configuration.

### 2026-06-08/09 — S3: Cost-control & abuse (+ rate-limiter foundation) — COMPLETE
Committed in 3 units (e6cb8fe, 5442b05, 12e5b73).
- **#19 Postgres rate limiter (S3.1):** `rateLimit()` is now async and backed by the
  `rate_limit_check` RPC (migration `141`: table + atomic fixed-window upsert + pg_cron hourly
  prune), with a per-instance in-memory fallback if the DB is briefly unreachable (fail-open on
  infra error only). All 12 call sites updated to `await`. This makes every existing limit actually
  enforced across serverless instances — and is what addresses **#22** (ai-panel): its 5/min cap is
  now real, no hard auth needed (preserves anonymous access).
- **#2 AI timeouts:** Anthropic client built with `timeout: 30s, maxRetries: 1` (covers chat +
  recommender); DeepSeek caller now always wraps the request in an AbortController (default 90s, the
  quality-gate keeps its 1500ms) that actually cancels the socket.
- **#1 report generator:** report page is now `noindex` (derived/thin; indexing invited crawler-
  triggered paid generation across the catalog); the client no longer auto-fires generation on load
  — it shows an explicit "Generate report" CTA (opt-in). Combined with the now-real rate limiter,
  the passive cost vector is closed while anonymous viewing of cached reports is preserved.
- **#10 stuck 'generating':** both the GET and generate routes treat a `generating` row older than
  3 min as stale and allow regeneration (no more infinite spinner).
- **#3 /recommend:** results pages (`?usecase=`) are `noindex`; the SSR AI call is now capped per IP
  (12/min) and errors are opaque.
- **#16 / #15:** chat and plan/intent now return opaque errors (raw logged server-side); **#15** +
  **#33** added rate limits to plan/intent (20/min, service-role write) and autocomplete (40/min).
- **#35:** `synthesizeReport` now guarantees every object the report UI reads
  (`pricing_analysis`, `community_buzz`, `learning_curve`, `sentiment_breakdown`, `themes`,
  `integration_insights`, …) so a missing model field can't white-screen the page.
- **Verification:** `tsc --noEmit` exit 0 at each unit; live DB test of `rate_limit_check` (3 ok →
  4th blocked); migration 141 applied; grep-confirmed each fix.
- **Residual risk:** Report generation remains open (no login) but is now opt-in + rate-limited +
  noindexed — flagged as a product choice if the operator later wants a hard auth gate. Adding the
  DB round-trip to rate-limited routes adds ~10–30ms; acceptable, and fails open on DB error.

### 2026-06-09 — S4: Automation reliability (#4/#13/#14, #12/#36/#37, #4.3, #40, #58) — COMPLETE
Commit c52db3e. Migrations 142 (view) + 143 (pg_cron reliability) applied to prod.
- **cascade-hubs revived (#4/#13/#14):** created `pages_freshness_needs_isr` VIEW (real
  column-to-column comparison — the old `.or()` treated `last_changed_at` as a string and errored
  the whole run); route now reads the view; added `export const GET = POST`; scheduled hourly in
  `vercel.json`. Verified the view returns the 2,830-row backlog it will now drain.
- **Reliability via pg_cron (#12/#36):** `pipeline-stuck-sweep` (every 15 min) marks dead 'running'
  rows → 'timeout' with **source-aware** thresholds (15 min Vercel, 210 min GH — so legit ≤180 min
  GH batch jobs aren't false-flagged); `pipeline-heartbeat` (hourly) inserts a synthetic failure for
  any previously-successful critical pipeline that goes silent (cascade-hubs 3h, freshness-batch 30h,
  poll-gh-actions 2h, onboard-tools 3h), which the existing alerter then emails. One-time cleanup
  swept the **195 stuck rows → 0** (verified).
- **Alerter (#37):** lookback widened 35→120 min so freshly-swept timeouts are caught before they
  age out (dedup keeps it safe).
- **poll-gh-actions (#4.3):** added a reconciliation pass that re-fetches rows still 'running' from
  earlier polls and settles them — fixes the leak's root cause (the `created>checkpoint` filter
  skipped runs that completed after the checkpoint advanced).
- **#40:** snapshot-daily-updates anchors the day on (now − 5 min) so a post-midnight fire files the
  correct date.
- **#58 discovery:** rewrote `discover.ts` off brittle HTML regexes onto stable JSON APIs —
  ProductHunt GraphQL `posts` feed + GitHub Search API — preferring real product website URLs
  (also helps dedup); per-source yields logged; 0-yield warned (+ heartbeat alerts). Dropped the
  unreliable aggregator HTML scrape.
- **Verification:** `tsc --noEmit` exit 0; live DB shows 0 stuck rows + 4 pg_cron jobs
  (tracking-invariants-nightly, rate-limit-prune, pipeline-stuck-sweep, pipeline-heartbeat); view
  returns 2,830.
- **Residual risk / notes:** cascade-hubs starts draining the backlog once this branch deploys (it's
  a Vercel cron). Alerter still needs RESEND_API_KEY + ALERT_EMAIL to actually email (existing env
  requirement). Discovery uses PRODUCTHUNT_TOKEN (already set for sentiment) + GITHUB_REPO_TOKEN
  (already set for poll-gh-actions); `topic:ai` GitHub query may surface some noise — the S6
  draft-until-green gate + dedup will filter it.

### 2026-06-09 — S5: Real-Time Data SOP (≤3-day + daily top-150) — CORE COMPLETE
Commit f0d7369. Migrations 144 (tiers + re-rank) + 145 (SLA monitor) applied to prod.
- **5.1 Schema:** `tools.refresh_tier ('daily'|'standard')` + `curated_top boolean` + index
  `(refresh_tier, is_published, last_verified_at)`.
- **5.2 Top-150 (hybrid):** `refresh_top_tools()` sets curated picks → daily (sticky) and fills the
  rest with the top-75 non-curated by a blended demand score
  (`gsc_impressions*3 + view_count + save_count*10 + viability*2`). Ran once → 75 daily (0 curated
  yet). Weekly re-rank via pg_cron `refresh-top-tools-weekly` (Mon 05:00). **OPERATOR INPUT NEEDED:**
  the 75 curated marquee tools — set `curated_top=true` for them (I'll propose a starter list); the
  mechanism already honours it on the next re-rank.
- **5.3 Throughput → ~765/day:** `runRefresh` is now tier-aware — refreshes due daily-tier tools
  (>20h) first, then fills with stalest 'standard'. Batch default 360→500; `freshness-batch.yml`
  runs refresh TWICE daily (02:00 + 14:00 UTC, 12h apart = no overlap), timeout 180→300m. Net
  ~150 daily + ~850 standard/day → long-tail cycle ≈2.2 days (<3d), daily tier ≤24h.
- **5.5 SLA monitor:** pg_cron `freshness-sla-monitor` (every 2h) raises an alert (synthetic failure
  row → existing alerter) if any daily-tier tool >24h or >25 published tools >3d. Deduped per 12h.
- **5.6 Change-detector:** daily-tier "due >20h" logic guarantees daily tools re-refresh each day;
  standard keeps the existing latest-updates fingerprint skip to save cost.
- **Verification:** `tsc --noEmit` exit 0; migrations applied; `refresh_top_tools()` returned 75;
  cron jobs now include `refresh-top-tools-weekly` + `freshness-sla-monitor`.
- **2026-06-09 UPDATE — curated-75 SET:** per operator direction (pin the biggest internet-traffic
  AI brands to compete for & capture their search traffic; data-driven 75 = our top performers),
  marked 75 marquee flagships `curated_top=true` (chatgpt, claude, gemini, midjourney, perplexity,
  github-copilot, cursor, canva, grammarly, deepseek, stable-diffusion, dall-e-3, sora, elevenlabs,
  suno, runway, synthesia, heygen, leonardo-ai, ideogram, hugging-face, ollama, langchain, replicate,
  cohere, mistral, groq, character-ai, quillbot, jasper, copy-ai, writesonic, otter-ai, fireflies,
  descript, gamma, framer, webflow, zapier, make, n8n, replit, lovable, bolt-new, v0, windsurf, devin,
  tabnine, codeium, phind, you-com, photoroom, removebg, clipdrop, krea, magnific, topaz, pika, kling,
  luma, murf, play-ht, krisp, wordtune, sudowrite, rytr, looka, durable, manus, vapi, lindy, elicit,
  consensus, microsoft-copilot). Re-ran `refresh_top_tools()` → **daily tier = 150** (75 curated +
  75 data-driven). Curated set is sticky across weekly re-ranks. Operator can adjust the flag anytime.
- **OPEN ITEMS / honest scope:**
  1. ~~Curated-75 pending~~ — DONE (above).
  2. **Catch-up:** the SLA monitor will report a standard-tier breach until the new 2×/day throughput
     brings the catalog under 3 days (≈3 days after this deploys) — this is correct, it self-clears.
  3. **5.4 section coverage:** the SLA (on `last_verified_at`) covers the core editorial/pricing/
     features/integrations/verdict/our_views/stars that `refresh.ts` rewrites each cycle. `latest_updates`
     (separate 03:00 job) and the per-section jobs (FAQs 2d, editorials daily, viability nightly,
     sentiment weekly) run on their own cadences; raising `refresh-latest-updates` throughput to a
     strict 3-day cycle is a recommended follow-up. Rarely-changing columns (`models`,
     `community_links`, `docs_url`, `workflow_scenarios`, `setup_time_text`, `migration_in/out`,
     `recent_changes`, `pricing_plan_guides`) are set at onboarding and not on the 3-day cycle.

### 2026-06-09 — OPERATOR: Resend alert test in progress
Resend env vars reported set in Vercel. Inserted a labeled test failure row
(`pipeline_runs` id `99b09afb-2433-41ae-a58b-19fcce02be4a`, key `phase10-resend-test`). The deployed
alerter (GH Actions every 30 min, or manual dispatch) should email it IF the env vars are in
Production AND a deploy happened after they were added. Row to be deleted after the test confirms.

### 2026-06-09 — S6: Pipeline data-quality — COMPLETE (3 commits: e7acee0, e03cb63, 4b2c938)
Stops bad data entering the catalog at the source.
- **#54** news-mention regex was double-escaped (`\\$&` → literal backslash) so any tool with a "."
  never matched press; fixed to single-backslash escape.
- **#57** dedup now skips domain-dedup for multi-tenant hosts (github.com, producthunt.com, …) so
  distinct tools aren't collapsed onto one domain, and dedups in-batch by slug AND name.
- **#52** enrich pricing coercion expanded (open-source→free, usage/seat/$→paid, free-tier→freemium,
  enterprise/custom→contact) and unknown now defaults to **freemium, not contact** — the cause of
  ~38% of the catalog (262 tools) being mislabeled enterprise. (Live 262 re-enriched in S8.)
- **#53** refresh now only overwrites editorial fields when the vendor page actually loaded
  (≥200 chars); a failed scrape preserves existing content and just advances freshness + stars
  (no more AI-hallucinated baselines clobbering curated copy).
- **#64** GitHub stars fetch authenticated (GITHUB_REPO_TOKEN) + type-guarded — full runs now refresh
  stars instead of hitting the 60/hr unauth cap after 60 tools.
- **#55** FAQ generator requires ≥5 parsed FAQs BEFORE its destructive delete (+ fence-safe parse),
  so a thin/empty AI response can't wipe a tool's FAQs.
- **#51 draft-until-green** — ingest inserts `is_published:false`; added a SOP-mode onboard cron
  (`/api/cron/onboard-tools?mode=sop` @ :17,:47) so drafts publish only after passing all gates;
  draft-stuck >48h pg_cron alert (mig 146).
- **#56** traction gate adds a `probed` flag — a probe outage (all-zeros from an error) no longer
  hard-rejects real tools; only a genuine "probed but no buzz" rejects.
- **#65** category-gap criterion only counts when categories were actually predicted (was a permanent
  always-fail that misrepresented the bar).
- **#66** `onboard_attempts` cap (mig 147) — a permanently-unscrapeable tool stops re-running the full
  paid SOP after 6 tries (surfaced by the draft-stuck alert).
- **#69** unified slugify to the canonical impl + added NFKD diacritic handling ("Café AI"→"cafe-ai");
  removed the divergent duplicate in `lib/utils.ts` (no importers).
- **#73** submit-indexnow exits non-zero on batch failure (was silently green).
- **#70** already handled (twitter scraper already warns on missing APIFY_TOKEN).
- **Verification:** `tsc --noEmit` exit 0 at each of the 3 commits; migrations 146–147 applied;
  curated-150 + tiering unaffected.
- **DEFERRED lows — now DONE (commit 36e5e0c, S6.4):** #67 (enrich latest_updates now extracts a
  real YYYY-MM-DD + enforces the 90-day window, matching the canonical path), #71 (Trustpilot
  timestamps validated before storing), #74 (approve-tier1 pings IndexNow only for successfully
  applied URLs), #75 (backfill-categories has `--dry-run`), #77 (mine-suggest scoped-run reset
  documented). `tsc` exit 0.

### 2026-06-09 — S7: SEO / schema correctness — COMPLETE (commits 61158e2, 3641ab2)
- **#8** best/for/stacks sitemaps now emit REAL per-path freshness via `getLastChangedAtBatch`
  (was `new Date()` every regeneration — poisoned the freshness signal); lastmod omitted when unknown.
- **#7/#43** new `safeJsonLd()` escapes `<`/`>`/`&`/line-separators in ALL JSON-LD injection
  (jsonLdScriptProps + the saved-stack page's own script) — closes the stored-XSS where a
  user-supplied stack title containing `</script>` could break out.
- **#9** best/[slug] + for/[slug] no longer emit an empty ItemList/FAQ when 0 tools (only breadcrumb).
- **#27/#68** compare with <2 existing tools now returns a real `notFound()` (404) instead of a
  styled HTTP-200 "Tools Not Found" soft-404. (14 live ones cleaned in S8.)
- **#28** comparison AggregateRating clamped to schema-valid 1–5 (a 0/>5 glitch no longer gets the
  whole page's rich results rejected).
- **#42** editorial-compare Article schema only ships with a REAL publish date (no "published today").
- **#44** best/for pages get OG siteName + `twitter: summary_large_image` (rich social cards).
- **#46** robots.ts blocks the `/mp` catch-all. **#47** 404 page has title + noindex.
- **Verification:** `tsc --noEmit` exit 0 (incl. a regex codepoint fix in safeJsonLd).
- **REMAINING minor SEO polish (cosmetic / low — not breaking, not user-trust):**
  #41 (replace the ~8 hardcoded "2,000+" literals with the `TOOL_COUNT_DISPLAY` constant — purely
  centralization; the string is currently accurate at ~1,994 published), #45 (add rel=next/prev +
  noindex on filtered category views — canonical already strips filter params, so duplicate risk is
  already mitigated), #48 (make `lib/env.ts` validation real at boot or delete it — left as-is to
  avoid a boot-throw risk; it's dead-but-harmless). Recommend folding these into a future copy/SEO edit.

### 2026-06-10 — S8: Live data cleanup — COMPLETE (live DB; no code commit)
- **#57 data — 9 duplicate slug-variants merged.** Set `merged_into=<canonical>` + `is_published=false`
  for: ai-flashcard-maker→…by-coursebox, galileo-ai-design→galileo-ai, genspark-ai→genspark,
  qodo-ai→qodo, spellbook-legal→spellbook, undermind-ai→undermind, v0→v0-by-vercel, writer-ai→writer,
  skyline-ai-proptech→skyline-ai. Middleware 308-redirects the dup slugs to canonical; dups drop from
  sitemap (is_published=false). Re-ran `refresh_top_tools()`. **Verified: live dup pairs 11→2,
  published 1994→1985.**
  - **FLAGGED for operator (NOT merged — genuinely different products sharing a name):**
    `lex` (lex.page writing) vs `lex-markets` (Lex Markets fintech); `synthesis-ai` (synthetic-data
    co.) vs `synthesis-tutor` (education). These need a rename/disambiguation, not a merge.
- **#68 data — broken comparisons noindexed.** Set `noindex=true` on every `tool_comparisons` row now
  referencing <2 published tools (incl. any newly broken by the merges). **Verified: 0 indexable
  broken comparisons remain** (the new code also 404s them).
- **#12 data — 195 stuck pipeline rows:** already cleared in S4 (verified 0).
- **Resolves automatically once this branch DEPLOYS (no manual action):**
  - **#62 — 262 mislabeled "contact" prices:** the S6 enrich fix re-classifies them on the next
    refresh of each tool; the S5 ≤3-day cycle clears the catalog within ~3 days of deploy.
  - **#4 — 2,830-row freshness backlog:** the revived cascade-hubs (S4) drains it hourly post-deploy.
  - **#61 — 398 missing logos:** the nightly `backfill-logos` cron is missing-only and chips away at
    the fetchable ones; the rest fall back to letter-avatars (graceful, not broken).
- **OPERATOR ACTIONS (optional):** enable Supabase PITR before future destructive cleanups (the
  merges here are reversible: `merged_into=null, is_published=true`); run `npm run resubmit:merged` to
  re-ping the 9 merged URLs to Bing/IndexNow (or let cascade-hubs handle it).
- **#11/#59 viability — FLAGGED (product decision):** scores still have low variance (8 distinct
  values) because 4 of 6 signals are constants. The honest fix is either implementing the real
  signals (separate project) OR correcting the public copy on `/viability` + the tool page to match
  what's actually measured. Recommend the copy fix as the minimum; not done here (editorial call).

### 2026-06-10 — S9: UX / journeys / components — COMPLETE (commits 7010115, ff9b5df)
- **#63** wrapped the `useSearchParams` analytics capture in `<Suspense>` so content pages regain
  STATIC rendering (was de-opting the whole site to dynamic). Verify via `next build` (○ vs ƒ) in S10.
- **#18** pagination clamped — `?page=abc/-5/huge` no longer throws a PostgREST error / blank page.
- **#17** saveStack bounds the stages/summary blob (≤20 stages, ≤100KB) — no more unbounded payloads.
- **#31** save-stack button now surfaces failures instead of silently resetting.
- **#32** `incrementStackView` no longer falls back to `update({view_count:1})` (which reset the count).
- **#21** the inline "what users report" block now reads the REAL cache schema (per-source positivity,
  `{theme,sources}`, `{skill_level,time_to_start}`) — fixes the permanent 0% bars / blank theme cards.
- **#29** review/question forms: max-length caps + opaque DB errors (no internal leak).
- **#72** `ToolLogo` now falls back to the letter avatar if the image errors (new client
  `ToolLogoImage` wrapper) — defends against a future non-whitelisted logo host.
- **#76** suppressed the harmless relative-time hydration diff at the day boundary.
- **Verification:** `tsc --noEmit` exit 0 at both commits.
- **REMAINING minor (latent / cosmetic — not breaking):** #30 (saved-stack tool links can 404 if a
  tool was later unpublished — LATENT: `saved_stacks` has 0 rows, so nothing to fix yet; the same
  `notFound()` that protects tool pages applies), #49 (chat may show ≤5 "related" tool cards not
  explicitly referenced in the prose — graceful, arguably useful), #50 (planner shows an empty shell
  if the model returns 0 stages despite the prompt forbidding it — rare). Recommend folding into a
  future UX pass.

### 2026-06-10 — S10: Global verification & integration
- **Build gate:** `tsc --noEmit` exit 0; **`next build` exit 0** (all 156 routes compile for
  production). ESLint: 114 problems, but all PRE-EXISTING repo debt in untouched `scripts/`; the
  Phase-10-touched files are clean. Build is the gate — it passes.
- **Live-DB re-audit (metrics moved):** published 1985; **duplicate pairs 11→2** (intentional
  Synthesis/Lex); **0 stuck pipeline rows**; **0 indexable broken comparisons**; **daily tier=150**;
  **RLS on tracked_niche_pages = true**; **7 pg_cron jobs live**. (pub-no-logo 392 & contact-no-data
  258 only edge down now; they clear post-deploy as the new refresh cycle runs.)
- **RLS policy review:** every table RLS-enabled; the 13 RLS-on/no-policy tables are internal
  (service-role only — correct, unchanged). No table over-exposed.
- **Browser run-through (next start + fetch):** home, /tools, tool pages, /recommend, /viability,
  /stacks, /best, /compare, /unsubscribe, /search all 200. **#18 verified** (`?page=abc/-5` → 200, no
  crash). **Caught & fixed a real issue:** the S8 merges weren't redirecting (build-time
  `MERGED_TOOL_REDIRECTS` map was stale) → regenerated it (73→82); middleware now **308-redirects**
  v0→v0-by-vercel, qodo-ai→qodo, writer-ai→writer (verified); real/canonical pages 200.
- **KNOWN pre-existing issue (NOT a Phase 10 regression):** `notFound()` on `/tools/[slug]` &
  `/u/[username]` returns 200 (soft-404) for a genuinely-nonexistent slug under `next start`, while
  every other route 404s — an ISR/streaming interaction. Low impact (no backlinks to such URLs;
  merged/deleted slugs handled by middleware 308/410). Verify on a Vercel preview before any fix; the
  force-dynamic / remove-not-found experiments were reverted (no effect).
- **Integration:** 14 commits on `phase10-bugfix`; DB migrations 138–147 ALREADY applied to prod.
  Final squash-merge → `main` (the Vercel production go-live) **held for explicit operator go-ahead.**

## ✅ PHASE 10 COMPLETE — MERGED & DEPLOYED (2026-06-10)
All 77 audit findings addressed (a few cosmetic items documented as optional) + the real-time data
SOP (≤3-day refresh, daily top-150 hybrid 75/75, strict pg_cron monitors). tsc + production build
green. Squash-merged to main (PR #10, sha 6013a34) → Vercel production deploy.

### Post-merge follow-ups (2026-06-10)
- **Resend alerts VERIFIED working** — dispatched alert-failed-pipelines via the GH API; operator
  received the emails. (Test row cleaned up.) The run delivered 4: the test, plus 3 REAL monitoring
  catches — `freshness-sla` (118 daily >24h / 935 >3d = the expected post-deploy catch-up, self-clears
  as the 2×/day refresh cycles), `poll-gh-actions-heartbeat` (see below), and `submit-urls-bing`
  (Bing's own daily quota — benign).
- **#11/#59 viability — Path A done & deployed** (sha c1c50ac): rewrote `/viability` + tool-page copy
  to describe what's truly measured (wrapper status, GitHub stars, pricing-model proxy) and flag the
  category baselines (hyperscaler/mortality) as roadmap; dropped the false claims (commit-frequency,
  funding-runway lookup, per-tool hyperscaler detection, uptime). Building the real signals = future.
- **lex/synthesis renames done** — `Lex Markets` + `Synthesis Tutor` now distinct; **live duplicate
  pairs = 0**.
- **PITR — skipped** per operator (Supabase Pro daily backups suffice for now).
- **⚠ KEY OPERATIONAL FINDING — GitHub Actions scheduled crons are NOT firing reliably.** The
  poll-gh-actions heartbeat fired ("no run in 2h") and the alerter itself hadn't auto-run in ~3h.
  This matters because the **nightly freshness refresh (freshness-batch.yml) also runs on GH Actions
  cron** — if schedules are disabled, the 3-day SOP won't run. Likely cause: GitHub auto-disables
  scheduled workflows after ~60 days of repo inactivity. ACTION: GitHub → Actions → re-enable the
  workflows (today's merge may have re-armed them; the heartbeat will keep watching). Stronger fix
  (OPT-2): move the sub-daily crons (poll-gh-actions, alert) to native Vercel Pro crons for
  reliability; the nightly batch must stay on GH (runtime) but is now heartbeat-monitored.
