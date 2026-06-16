# Full Site-Health Audit — 2026-06-15

Triggered by: "many pages crashing, site very slow, warnings in GSC / Bing / Supabase / Vercel." Method: live crawl of all 2,856 sitemap URLs + response timing + Supabase security & performance advisors + Postgres logs + GSC snapshot analysis. Severity: 🔴 critical · 🟠 high · 🟡 medium · ⚪ low/info.

---

## 1. Crashing pages (crawl of all 2,856 live URLs)

| Finding | Severity | Status |
|---|---|---|
| **6 compare pages HARD 500** — LLM text with `<` before a number (`<20 reps`) broke MDX render. gong-vs-outreach, botpress-vs-voiceflow, gorgias-vs-zendesk, krea-ai-vs-magnific-ai, quizlet-ai-vs-praktika, synthesia-vs-tavus | 🔴 | ✅ FIXED (PR #33 — render-time MDX sanitizer covers all current + future) |
| **15 compare pages 404** — editorial compares referencing an UNPUBLISHED tool, but still in the sitemap → Google crawls 15 dead URLs | 🟠 | ✅ FIXED (PR audit-sitemap-fixes — sitemap now filters to all-tools-published) |
| Tool pages (1,998): 0× 500, 0× 404; 16× 308 (expected merged-tool redirects) | — | healthy |
| best/for/stacks/blog (815): 0 crashes after the MDX fix | — | healthy |

**Net: there are no remaining 500-crash pages once both PRs deploy.**

## 2. Performance — the real "site is slow" root cause 🔴

- Measured: most pages **1–2 s TTFB**; two pages hit **32 s and 45 s** (cold renders that look like a crash/hang in the browser).
- Header proof on `/tools/chatgpt`: `x-vercel-cache: MISS`, `cache-control: private, no-cache, no-store`. **Despite `revalidate=300` (ISR), every page renders fresh on every request with ZERO edge caching.**
- **Root cause:** the root layout (`app/layout.tsx`) reads `cookies()` for the auth check. In Next.js, any route that reads cookies is forced dynamic — so **all ~2,800 pages opt out of static/ISR caching** and render server-side on every hit. The compare route is even explicitly `force-dynamic` for the same reason.
- Consequence: 1–2 s on every page (should be <200 ms from edge cache); cold renders pile DB queries → the 30–45 s spikes; Google measures this as poor Core Web Vitals (LCP/TTFB) → ranking drag.
- **Fix (architectural, highest-leverage):** decouple auth from the static render path so anonymous content pages are edge-cached. Approaches: move the auth-cookie read out of the server layout into the existing client `AuthProvider` (or middleware), drop `force-dynamic` on compare, and let tool/compare/best/category pages be ISR/PPR-cached. This is the single biggest win for speed AND SEO. Needs careful auth testing (logged-in header state must still work) → do on its own branch with verification.

## 3. Supabase — security advisor

| Finding | Severity | Action |
|---|---|---|
| `event_rollup_daily`, `dau_rollup_daily` — **public tables with RLS disabled** (anon can read analytics rollups via the API) | 🔴 ERROR | Enable RLS (deny-all; service-role only) |
| Dangerous RPCs callable by **anon/authenticated**: `refresh_top_tools()`, `compute_event_rollups()`, `check_freshness_sla()` (expensive admin/cron ops — abuse/DoS surface) | 🟠 WARN | `REVOKE EXECUTE ... FROM anon, authenticated` (keep service_role) |
| RPCs that are *intentionally* anon (increment_counter, upsert_user_intent, claim_sentiment_scan, rate_limit_check, adjust_counter) | ⚪ | Review & keep — these power view counts, tracking, paid scan |
| `pages_freshness_needs_isr` view is SECURITY DEFINER | 🟡 | Recreate as SECURITY INVOKER or restrict |
| `v_field_freshness` materialized view selectable by anon | 🟡 | Revoke anon/authenticated SELECT |
| 2 functions with mutable `search_path` (niche_tool_ids, insights_apply_filters) | 🟡 | `SET search_path = ''` hardening |
| `pg_trgm`, `unaccent` extensions in `public` schema | ⚪ | Move to `extensions` schema (low priority) |
| **Leaked-password protection disabled** (Auth) | 🟡 | Toggle ON in Supabase dashboard → Auth → Policies (1 click, OPERATOR) |
| 13 tables "RLS enabled, no policy" (ai_citations, deleted_tools, etc.) | ⚪ INFO | Safe (deny-all by default) — no action |

## 4. Supabase — performance advisor (86 lints)

| Finding | Count | Action |
|---|---|---|
| `unused_index` | 40 | ⚪ minor storage/write waste — drop the clearly-dead ones later |
| `multiple_permissive_policies` (multiple RLS policies evaluated per query on a table/role) | 40 | 🟡 consolidate policies — speeds up authed/admin queries |
| `auth_rls_initplan` (RLS re-evaluates `auth.*()` per row instead of once) | 3 | 🟠 wrap in `(select auth.uid())` — classic Supabase perf bug, can be O(rows) |
| `unindexed_foreign_keys` (ai_citations) | 2 | 🟡 add covering index |
| Postgres logs: no slow-query entries; one `permission denied for function insights_live_sessions` (admin RPC grant gap) | — | 🟡 fix grant |

Note: tool/compare page reads use the **service-role admin client** (bypasses RLS), so the RLS perf lints mainly affect the admin panel & authed flows, not anonymous page speed. Anonymous page speed is the caching issue in §2.

## 5. GSC — indexation & ranking metrics (from stored snapshots, latest 2026-06-08)

- 28-day: **55,725 impressions → 66 clicks (0.12% CTR), avg position 45.8.** Impressions are *growing* fast (25k→55k in 2 weeks) but clicks are flat (~2/day).
- Position distribution: **93% of impressions sit at position 21+ (pages 3-10), zero clicks.** Only ~268 query-rows in the clickable pos 1-10 band.
- Diagnosis: **indexed but buried** — an authority/ranking problem (new domain, no backlinks), NOT an indexation or crawl problem. The dead/crashed pages above were actively *hurting* this (500s/404s signal low quality to Google).
- 0 rows in `ai_citations` and only ~20 AI-referrer visits/30d → the AEO/AI-search opportunity is wide open (separate strategy track).

## 6. Vercel (CLI access — confirmed 2026-06-16)

- **Builds are healthy:** all recent deployments `● Ready`, ~1min build, zero failed builds. Only warning in build logs: a `@sentry/nextjs` `disableLogger` deprecation (cosmetic — rename to `webpack.treeshake.removeDebugLogging`).
- **Build-level proof of the §2 caching problem:** the route table shows **152 routes `ƒ` (dynamic / server-rendered on demand) vs only 11 `○` (static).** Every content page — `/`, `/tools/[slug]`, `/compare/[slug]`, `/categories/[slug]`, `/best/[slug]`, `/for/[slug]`, `/stacks/[slug]`, `/blog/[slug]` — is `ƒ`. Nothing is prerendered/edge-cached. This is the definitive confirmation that the whole site server-renders on every request → the 1-2s baseline + cold-render spikes. **Fixing §2 flips these to static/ISR and is the top performance win.**

## 6b. GSC indexation + Bing + admin metrics (pulled 2026-06-16)

**Google index coverage (gsc_url_inspections, ~2,000 inspected):**
| State | Count | Meaning |
|---|---|---|
| Submitted and indexed | **1,258** | ✅ in Google's index |
| **Discovered – currently not indexed** | **540** | 🔴 Google knows them but *chose not to* index — low-authority + crawl-budget signal |
| URL is unknown to Google | 171 | not discovered yet → needs submission (IndexNow/sitemap) |
| Duplicate without user-selected canonical | 16 | 🟡 canonical config — Google picked a different canonical |
| Crawled – not indexed | 9 | quality-gated |
| Server error (5xx) | 2 | the MDX crashes Google caught (now fixed) |

→ ~45% of the catalog is indexed. The **540 "discovered-not-indexed"** is the real indexation ceiling, and it is **authority/age-gated**, not a code bug (see below).

**The decisive context — domain age:** `rightaichoice.com` is **80 days old** (Vercel domain age). A new domain with ~zero backlinks is *expected* to have hundreds of discovered-not-indexed pages and rankings buried at position 40+. Google sandboxes new sites. **No code change fixes this — it needs time + authority (backlinks) + the AEO/AI-search angle.** Everything we fix below removes *drag* on that process; it doesn't replace it.

**Bing:** 1,023 URLs submitted lifetime; cron healthy but capped at **100/day** → ~28 days to cover the catalog once. IndexNow supplements it.

**Admin panel metrics:** nightly tracking-health verification GREEN (latest run 2026-06-15, 0 fail). The admin numbers themselves are trustworthy post Phase-10 rebuild. (Vercel **Speed Insights + Web Analytics are installed and mounted** in `app/layout.tsx` → real Core Web Vitals data exists in the Vercel dashboard to confirm the §2 caching win after it ships.)

## 7. Still need operator unblock

- **GSC UI warnings** (Coverage "why pages aren't indexed", Core Web Vitals report, Enhancements, Manual actions): not in our stored data. → Paste/screenshot the GSC "Pages → Why pages aren't indexed" list + the Core Web Vitals report.
- **Bing Webmaster UI** (SEO analyzer warnings, crawl info): → paste/screenshot. (We control Bing submission via the submit-urls-bing cron + IndexNow.)

---

## CONCLUSION — what to fix, why, and in what order

**Frame:** the site has **no remaining crash bugs** (all fixed). The two real problems are **(A) it's slow** and **(B) it's young + low-authority**. (A) is 100% fixable now. (B) is time/authority-gated — we remove drag, but traffic ultimately needs backlinks + AEO, not more code.

### 🔴 P0 — must fix (speed + the drag on indexing)
1. **Caching architecture** — *why:* 152/163 routes render dynamically, every page 1-2s with cold spikes to 30-45s, zero edge cache. This is THE speed problem and it hurts Core Web Vitals → rankings, AND slow rendering throttles Googlebot's crawl rate (feeds the 540 not-indexed). Fix: take `cookies()` out of the static render path so anonymous pages are static/ISR. *Highest leverage on the board.* (own branch, auth verification)
2. ✅ **MDX crashes (6 pages)** — done (PR #33). *Why it mattered:* Google logged 2 of these as 5xx; crashes signal low quality and suppress indexing.
3. ✅ **Sitemap: empty categories + 15 dead 404 compares** — done. *Why:* feeding Google dead URLs wastes crawl budget and erodes trust while the site is trying to earn indexing.

### 🔴🟠 P1 — security + correctness (one migration + one toggle)
4. **Lock 2 public analytics tables** (`event_rollup_daily`, `dau_rollup_daily`, RLS off) — *why:* anyone can read your analytics via the API.
5. **Revoke public EXECUTE on 3 admin RPCs** (`refresh_top_tools`, `compute_event_rollups`, `check_freshness_sla`) — *why:* anon can trigger expensive ops (abuse/DoS surface).
6. **Enable leaked-password protection** (Supabase dashboard toggle, OPERATOR) — *why:* blocks known-compromised passwords at signup.
7. **16 duplicate-canonical pages** — *why:* Google indexes a different URL than intended, splitting signals. Investigate the canonical tags on the affected set.

### 🟠 P2 — performance polish (admin panel + crawl)
8. **`auth_rls_initplan` (3) + consolidate 40 permissive RLS policies** — *why:* RLS re-evaluates auth per-row, slowing authed/admin queries.
9. **171 "unknown to Google" URLs** — *why:* not yet discovered; once caching lands and crawl speeds up, push them via IndexNow + confirm sitemap coverage.

### ⚪ P3 — low / cosmetic
10. Sentry `disableLogger` deprecation; 40 unused indexes; `pg_trgm`/`unaccent` in public schema; SECURITY DEFINER view + 2 mutable-search_path functions.

### Not a "fix" — the actual traffic lever (separate track)
- **Domain is 80 days old, ~no backlinks.** The 540 discovered-not-indexed and the position-40+ rankings are *authority/age-gated*. The durable traffic plan = (a) the caching fix above so the site is fast enough to crawl/rank, (b) backlinks/digital-PR (operator), (c) the **AEO/AI-search** play (be cited in ChatGPT/Perplexity/AI-Overviews — where a fresh, structured directory can win without domain authority). This is the SEO strategy track, not a bug list.

### Recommended execution
**Batch 1 (now):** caching fix (P0 #1) + Supabase security migration (#4–6) — biggest speed win + closes the real security holes in one pass.
**Batch 2:** canonical fix (#7) + RLS perf (#8).
**Operator:** enable leaked-password toggle (#6); paste GSC/Bing UI screenshots to close §7; start backlink/AEO track.
