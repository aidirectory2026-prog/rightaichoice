# Full Site Bug Audit — rightaichoice.com (2026-06-07)

Deep audit across 6 domains by parallel specialist passes: tool pages, cron/pipelines,
payments+auth+secrets, user journeys+AI routes, SEO/content/schema, shared libs/data layer.
Every finding was confirmed by opening the actual code. Cross-confirmed items (found by
multiple passes) are noted — those are highest confidence.

**Totals:** 4 Critical · 14 High · 16 Medium · 16 Low = 50 findings.
Money path core (idempotent credit grants, refunds, ownership checks, admin auth, service-role
isolation) is largely SOUND — see the bottom section.

---

## 🔴 CRITICAL

**1. The free AI report generator is wide open — anyone can burn your scraping + AI budget.**
Any visitor (no login) can trigger a full 6-site scrape + paid AI synthesis, just by loading
`/tools/<slug>/report`, which even auto-fires generation. A crawler indexing those pages would
generate reports for the whole ~2,000-tool catalog on your dime. Only a weak per-IP cap (3/min)
that resets on every server restart stands in the way. *Confirmed by 3 separate passes.*
`app/api/tools/[slug]/report/generate/route.ts` (no auth check) + `components/report/report-client.tsx` (auto-trigger).

**2. No timeout on any AI feature — users get stuck on a spinner forever.**
Chat, the planner, and the recommender all call an external AI with no time limit. If the
provider hangs, our code waits indefinitely: the user stares at a spinner that never resolves,
and we keep paying for the hung server function.
`app/api/chat/route.ts:60`, `app/api/plan/route.ts:610`, `lib/data/recommendations.ts:89`; clients have no AbortController either.

**3. The `/recommend` page runs a paid AI call on every unique URL — uncapped and crawlable.**
The recommendations page generates results server-side on every load, calling the paid AI
directly (bypassing the rate-limited API). It's not blocked from Google and has no limit, so a
crawler or attacker hitting `/recommend?usecase=anything-1,-2,-3…` triggers unlimited AI spend.
`app/recommend/page.tsx:75` + `app/robots.ts` (not disallowed, page not noindex).

**4. The freshness cascade (`cascade-hubs`) is completely dead — broken three ways.**
The job that pushes freshly-changed pages back into cache and pings search engines never runs:
(a) it's not on any schedule, (b) it only answers POST but Vercel calls jobs with GET, and
(c) its core query is written in a way the database can't execute. Updated tool pages can stay
stale in cache and uncrawled indefinitely.
`app/api/cron/cascade-hubs/route.ts` — see High #13 and #14 for (b) and (c).

---

## 🟠 HIGH

**5. Razorpay payments aren't bound to the order we created — pay-less exploit.**
On the Indian payment path, the server only checks the signature is valid for whatever order/
payment IDs the browser sends back — never that they match the order we created or that the
right amount was paid. A technical customer could pay ₹1 on a different order and submit those
validly-signed IDs to claim a ₹20 scan.
`app/api/payments/razorpay/verify/route.ts:36-50` (never compares to `gateway_order_id`).

**6. No payment webhook safety net — paid-but-tab-closed = money taken, no credit.**
Confirmation depends entirely on the customer's browser making a second call after paying. If
the tab closes or the network drops (common on mobile), money leaves their account but no scan
credit is granted. There's no server-to-server fallback. A refund/chargeback generator.
No webhook route exists; `verifyRazorpayWebhook` is defined but never called; `RAZORPAY_WEBHOOK_SECRET` unused.

**7. Stored-XSS risk in saved public stacks.**
A logged-in user can save a stack with any title/description; the public stack page writes those
straight into a `<script>` tag without escaping. A malicious title could break out and run code
in other visitors' browsers.
`app/stacks/saved/[id]/page.tsx:321-324` (`dangerouslySetInnerHTML` + `JSON.stringify` of user fields).

**8. Three SEO sitemaps lie about freshness — poisoning your freshness signal.**
The best-of, stacks, and use-case sitemaps stamp *every* page "modified right now" on every
rebuild. Google learns the dates are meaningless and starts ignoring them, killing the freshness
boost for genuinely-updated pages. Every other sitemap in the repo deliberately avoids this.
`app/best/sitemap.ts:11`, `app/stacks/sitemap.ts:11`, `app/for/sitemap.ts:11`.

**9. Empty / broken structured data on zero-result best-of and role pages.**
When a niche page returns 0 tools, it still ships an empty ranked-list and FAQ markup with
sentences like "…include ." and "with as the top pick." Google rejects empty/invalid structured
data, and the broken FAQ text can surface in an AI Overview.
`app/best/[slug]/page.tsx:84-120`, `app/for/[slug]/page.tsx:79-104`.

**10. The AI report can get stuck "generating" forever.**
If the server is killed mid-generation (timeout/deploy/crash), the report is marked "generating"
permanently. Every future visitor sees an infinite spinner and it can never regenerate.
`app/api/tools/[slug]/report/generate/route.ts:46-61` (no staleness check).

**11. Viability scores are mostly fixed numbers, but the site describes them as real measured data.**
The public page claims scores come from commit frequency, contributor counts, funding runway,
hyperscaler-overlap detection, and uptime. In reality four of six signals are hardcoded constants
(hyperscaler always 80, mortality always 70, "health" = 90 if a URL exists, funding = a pricing
proxy). Truth-in-labeling / credibility risk for an honesty-branded site.
`lib/cron/viability.ts:50-88` vs copy in `app/viability/page.tsx:54-60`, `app/tools/[slug]/page.tsx:645`.

**12. The failure-alerter is blind to hung jobs.**
It only emails on jobs that ran and reported failure/timeout. A job that the platform hard-kills
leaves a "running" record forever and is never alerted — you see silence and assume all is well.
This is *why* the dead cascade-hubs (Critical #4) went unnoticed.
`app/api/cron/alert-failed-pipelines/route.ts:123` (watches only failure/timeout).

**13. `cascade-hubs` is POST-only → will 405 the moment it's scheduled.**
Part (b) of Critical #4: even after you put it on a schedule, every fire is rejected because
Vercel calls with GET and the route only answers POST.
`app/api/cron/cascade-hubs/route.ts:28` (no `export const GET = POST`).

**14. `cascade-hubs` query compares two date columns in a way the database API can't.**
Part (c) of Critical #4: `.or('last_revalidated_at.is.null,last_revalidated_at.lt.last_changed_at')`
treats the second column name as plain text, so the query errors or returns the wrong rows.
`app/api/cron/cascade-hubs/route.ts:67` — needs a DB view/RPC.

**15. `/api/plan/intent` is an open, unthrottled, privileged database write.**
Anyone can call it any number of times to flood the database using elevated (service-role)
privileges, and it returns the raw database error text to the caller.
`app/api/plan/intent/route.ts:44-117` (no rate limit; service-role insert; raw error at :117).

**16. AI chat shows users raw internal error messages.**
On failure the chat sends the exact internal error text to the browser ("Sorry, I encountered an
error: <internal detail>"), potentially disclosing provider/billing/auth details.
`app/api/chat/route.ts:148-150` + `components/ai/chat-interface.tsx:88-90`.

**17. "Save stack" accepts unlimited, unvalidated data.**
The save action takes whatever JSON the browser sends for stack contents — no schema, no size
cap. A user can POST a multi-megabyte payload, bloating the database and the public page.
`actions/stacks.ts:6-45` (`stages: unknown[]` inserted directly).

**18. Pagination breaks on bad page numbers.**
Visiting `/search?page=abc`, `page=-5`, or a huge page number produces a database error or a blank
screen with no "no more results" handling — and crawlers will hit these.
`app/search/page.tsx:123` → `lib/data/tools.ts:10-12` (no NaN/clamp).

---

## 🟡 MEDIUM

**19. The rate-limiter protecting every expensive endpoint barely works on Vercel.**
It lives in a single server's memory, resets on cold start, isn't shared across instances, and is
keyed on a spoofable IP header — so the real limit is far higher than configured. Payment
capture/verify routes have no limit at all. This amplifies Critical #1/#3. *Confirmed by 4 passes.*
`lib/rate-limit.ts:20,44-49`.

**20. API keys are stored in plaintext.**
Customer API keys are saved exactly as issued; a database leak or backup exposes every key
instantly. (They aren't used to authenticate anything yet, which lowers urgency but not the risk.)
`app/api/keys/route.ts:48-52`. *Confirmed by 2 passes.*

**21. The inline "what users report" sentiment block reads the wrong data shape.**
It expects an old schema the AI no longer produces, so the bar shows 0% positive/negative and
pattern cards are blank even when a report generated successfully.
`components/tools/sentiment-synthesis.tsx:16-23,53,143` vs `lib/ai/synthesize-report.ts:36,151`.

**22. The AI Panel ("Should you use X?") button is also unauthenticated cost exposure.**
Calls Claude on our key with no login, throttled only by the weak per-IP limit; abusable across
the catalog via IP rotation. Lower blast radius than the report generator but same class.
`app/api/tools/[slug]/ai-panel/route.ts:15-19`.

**23. Free-scan allowance trusts a spoofable country header.**
India gets 25 free scans vs 5 elsewhere, decided by a request header. On any ingress that doesn't
go through Vercel's edge (preview deploys, misconfigured proxy), a caller can fake `IN` and farm
25 free (expensive) scans per account.
`lib/geo/currency.ts:21-34` → `…/sentiment-checker/scan/route.ts:95`.

**24. The scan database function is called with an argument the committed migration doesn't define.**
The live code passes `p_free_limit` but the migration defines a one-argument function. Either
scans are erroring in production, or the database was changed outside the migration history —
which is a hidden risk for the next deploy or restore.
`…/scan/route.ts:96` vs `supabase/migrations/136_sentiment_checker.sql:72`.

**25. Raw user email is sent to Mixpanel — violating your own privacy rule.**
On login the full email is shipped to Mixpanel as a profile property, contradicting the codebase's
stated "email reduced to domain only" policy everywhere else. Privacy/compliance exposure.
`components/providers/auth-provider.tsx:54-57` → `lib/analytics.ts:225-289`.

**26. Two different `slugify()` functions produce different URLs from the same name.**
Depending on which one a piece of code imported, the same tool name can become two different
URLs — causing broken links, duplicate pages, and failed lookups.
`lib/utils.ts:8-14` vs `lib/utils/slugify.ts:1-6`.

**27. `/compare` "Tools Not Found" pages are soft-404s (return 200, stay indexable).**
When a comparison's tools no longer exist, the page shows an error but reports "200 OK." Google
treats these as soft-404s, dragging down crawl trust for the already-weak compare section.
`app/compare/[slug]/page.tsx:86-108` (no `notFound()` / noindex).

**28. Comparison rating structured data isn't clamped to 1–5.**
A garbage `avg_rating` (0, or >5 from a data glitch) emits a schema-invalid rating; repeated
rejection can suppress all rich results on the page.
`lib/seo/json-ld.ts:380-408`.

**29. Review/Question forms leak raw DB errors, have no length caps, don't verify the tool exists, and count reviews racily.**
Public-facing forms return database error text, accept unbounded input, insert against any
`tool_id`, and update counters with a read-then-write that loses counts under concurrency.
`actions/reviews.ts:32-82`, `actions/questions.ts:34-65`.

**30. Saved-stack tool links 404 when a tool is later unpublished.**
A saved stack stores tool slugs as they were; if a tool is later removed, those links lead to a
404. (Curated `/stacks/[slug]` has the same exposure with lower risk.)
`app/stacks/saved/[id]/page.tsx:221,251`.

**31. "Save stack" failures are silent.**
If saving fails, the button just resets with no message; the user assumes it worked or keeps
clicking. The action returns an error the UI ignores.
`components/stacks/save-stack-button.tsx:53-97`.

**32. `incrementStackView` resets views to 1 and is open to anyone.**
A view-counter helper's fallback sets the count to 1 (not +1) and has no auth. Currently unused
(dead code) but a latent data-integrity + abuse bug if wired up.
`actions/stacks.ts:69-83`.

**33. The autocomplete search endpoint has no rate limit.**
It queries the database on essentially every keystroke and is open to anyone with no throttle.
`app/api/tools/search/route.ts:11-33`.

**34. Newsletter unsubscribe has no ownership token and likely fails silently.**
Anyone can unsubscribe anyone by submitting their email, and because the route uses the
non-privileged client against an admin-only update rule, real unsubscribes probably do nothing
while returning "success."
`app/api/newsletter/unsubscribe/route.ts:18-24`.

---

## 🔵 LOW

**35. The report page can white-screen if the AI omits a field.** No error boundary; `report-client` reads `report.pricing_analysis.tiers` etc. unguarded. `components/report/report-client.tsx`.

**36. The alerter has no "no successful run in N hours" staleness check** — the gap that let dead crons go unnoticed. `app/api/cron/alert-failed-pipelines/route.ts`.

**37. The alerter's 35-min lookback barely exceeds its 30-min cadence** — one failed send can age out and never be retried.

**38. The daily dashboard fabricates numbers** — "Bing URLs submitted" is hardcoded to 100 and "IndexNow pings" always 0. `app/api/cron/snapshot-daily-updates/route.ts:66-72,112`.

**39. The nightly viability batch (300/night) may slip past a 7-day cycle** as the catalog grows. `app/api/cron/calculate-viability/route.ts:11`.

**40. Two nightly snapshot crons run 10 min apart near midnight UTC** — a delay can land the day's numbers on the wrong date. `vercel.json` (23:45 + 23:55).

**41. Hardcoded "2,000+ tools" copy in ~8 pages bypasses the single constant and overstates the real count (1,974).** `lib/copy/tool-count.ts` vs literals across `app/`.

**42. Editorial compare pages stamp "published today" when the real date is missing** — dishonest freshness in Article schema. `app/compare/[slug]/page.tsx:193-194`.

**43. JSON-LD builders don't strip angle brackets from tool names** — low XSS risk, inconsistent with the FAQ builder. `lib/seo/json-ld.ts:295-424`.

**44. Best-of and role pages are missing OG image + Twitter card** — bare text cards when shared socially. `app/best/[slug]/page.tsx`, `app/for/[slug]/page.tsx`.

**45. Deep/filtered category pages lack rel next/prev and let filter permutations be indexed** — crawl-budget waste. `app/categories/[slug]/page.tsx`.

**46. `robots.ts` doesn't block the `/mp/[...path]` catch-all** — confirm what it serves before it gets indexed. `app/robots.ts`.

**47. The 404 page has no title or explicit noindex** (cosmetic; HTTP 404 already prevents indexing). `app/not-found.tsx`.

**48. `lib/env.ts` secret-validation is effectively dead and marks every real secret optional** — false confidence; a missing service-role key is only discovered at first use. `lib/env.ts`.

**49. Chat can show tool cards that don't match the prose** (fallback shows first 5 found tools). `components/ai/chat-interface.tsx:101-109`.

**50. A 0-stage planner result shows a confusing empty shell** instead of a "try rephrasing" state. `components/ai/project-planner.tsx`.

---

---
---

# ROUND 2 — Deeper sweeps (pipeline internals, components/scripts, LIVE database)

Added after the first 50. Pipeline-internals and live-data passes. Typecheck (`tsc --noEmit`)
passed clean (exit 0). Live DB queried directly (project `adtznghodbgkvknilfln`, 2,067 tools,
1,994 published).

## 🔴 CRITICAL — content pipeline (silently degrades the catalog at scale)

**51. New tools go live BEFORE the quality gate runs.**
Ingest inserts every discovered tool with `is_published: true`, but the whole quality SOP
(categories, ≥3 alternatives, ≥2 editorial comparisons, ≥9 FAQs, editorial fields, logo) was
designed to run *before* publish. So users and Google can see bare, half-built pages for the
window before the onboard job catches up, and the "publish-on-green" gate never demotes a tool
that fails. `lib/cron/ingest.ts:176-177` vs `lib/cron/onboard.ts:626-643`.

**52. AI enrichment fabricates pricing/skill facts instead of skipping.**
When the AI's tool record has an unrecognized value, the sanitizer silently guesses: unknown
pricing → "contact sales", unknown skill → "intermediate", unknown API → false. These guesses
are stored as facts and feed the viability score and geo-pricing. **Confirmed in live data: 770
tools (38%) are "contact", and 262 of them have zero pricing details** — implausibly high; these
are largely misclassifications. `lib/cron/enrich.ts:188-204`.

**53. Nightly refresh overwrites hand-curated editorial fields with hallucinated text when the vendor site is down.**
If a scrape fails, the code continues with an empty page and asks the AI to write a "baseline from
training knowledge," then writes that over the existing tagline/description/verdict/our_views/etc.
— no "only update if scrape succeeded" guard. Over time, stalest-first across the whole catalog,
this degrades your best pages. `lib/cron/refresh.ts:148-154,173-191`.

## 🟠 HIGH — pipeline + data + security

**54. News-mention matching never matches any tool whose name contains a dot (or #, +).**
A double-escaped regex means "Notion.so", "Make.com", "v0.dev", "C#", "C++"-style names can never
match press articles, so those tools silently get zero news/freshness mentions forever.
`lib/cron/scrape-news.ts:164`.

**55. FAQ regeneration can wipe a tool's FAQs.**
The older FAQ job deletes all existing FAQs then inserts the new set, with no minimum-count guard —
an empty/thin AI response leaves the tool with no FAQs. `lib/cron/faq-generator.ts:56-70`.

**56. The "real buzz" admission gate fails inconsistently when HN/Reddit APIs are down.**
A probe outage flips the gate between rejecting everything and admitting everything, depending on
the failure mode; and the Reddit probe uses a tokenless endpoint that datacenter IPs are blocked
from — so it likely returns 0 for everything, over-rejecting real tools.
`lib/cron/traction-probe.ts`, `lib/cron/curate.ts:150-153`, `lib/cron/ingest.ts:106-127`.

**57. Duplicate tools in the live catalog (dedup is broken).**
**Confirmed: 11 duplicate pairs are both published** — `v0`/`v0-by-vercel`, `qodo`/`qodo-ai`,
`genspark`/`genspark-ai`, `writer`/`writer-ai`, `undermind`/`undermind-ai`,
`galileo-ai`/`galileo-ai-design`, `spellbook`/`spellbook-legal`, `lex`/`lex-markets`, and more.
They cannibalize each other in search and split ranking signals. Root cause: dedup keys on the
discovery/aggregator URL, so aggregator-sourced tools all collide on one domain and legit tools
get dropped, while name variants slip through. `lib/cron/dedup.ts:5-48`, `lib/cron/discover.ts:104-108`.

**58. Tool discovery is silently dead.**
Discovery scrapes ProductHunt/GitHub/aggregators with brittle regexes tied to CSS classes on
JS-rendered SPAs; when they break, the job returns 0 and reports success. **Confirmed: the
discovery queue (`tool_candidates`) has just 1 row** — the intake pipeline is effectively not
finding new tools. `lib/cron/discover.ts:36-100`.

**59. Viability scores are effectively a constant — confirmed in live data.**
**All 1,994 published tools have only 8 distinct scores, all between 72 and 90 (avg 78.2).** A
score with almost no variance is presented site-wide as a real measured signal. This is the
live-data proof of finding #11 — it's not a code smell, it's the actual state. `lib/cron/viability.ts`.

**60. SECURITY: Row-Level Security is DISABLED on `tracked_niche_pages` (64 rows).**
Supabase's own advisor flags this as critical: that table is fully exposed to anyone holding the
public anon key — they can read or modify every row. Every other table has RLS on. Remediation
(review before running — enabling without a policy blocks all access):
`ALTER TABLE public.tracked_niche_pages ENABLE ROW LEVEL SECURITY;` plus an appropriate policy.

## 🟡 MEDIUM — pipeline + data + perf

**61. 20% of published tools have no logo.** **Confirmed: 398 of 1,994 published tools have a null
logo** → they render as plain letter-avatar cards across the directory, best-of lists, and
comparisons. Looks unfinished at scale. (DB-level; the logo cron exists but hasn't filled these.)

**62. ~13% of the catalog is mislabeled "contact sales" with no pricing data** (the live half of
#52): 262 tools. Distorts the free/paid filters, viability funding proxy, and geo-pricing.

**63. The whole site is forced to render dynamically (no static generation).** The site-wide
analytics wrapper reads the URL query string without a Suspense boundary, which de-opts every page
to dynamic rendering — slower pages, more server cost than needed. `app/layout.tsx:161` +
`components/providers/mixpanel-provider.tsx:149,162`. (Confirm via `next build` output.)

**64. GitHub stars refresh has no API token** → after 60 tools/hour GitHub rate-limits, so ~300 of
each 360-tool nightly run get no star update and the run still reports success; popular OSS tools
get under-scored on viability. `lib/cron/refresh.ts:158-186`.

**65. The "fills an under-served category" admission criterion is dead code** — categories aren't
predicted before the gate, so it's always false, quietly lowering the real bar. `lib/cron/ingest.ts` / `curate.ts:228-233`.

**66. A permanently-unscrapeable tool re-runs the full paid onboarding SOP forever** (it's only
marked "onboarded" if refresh succeeds), burning AI/scrape budget on repeat. `lib/cron/onboard.ts:655-718`.

**67. "Latest updates" has two divergent schemas/prompts and no code-level date validation in the
enrich path** — items the editorial rules meant to exclude can be stored, with malformed dates and
timezone drift. `lib/cron/enrich.ts:46-53,228` vs `lib/cron/latest-updates.ts`.

**68. Live confirmation — 14 comparison pages are indexable soft-404s.** 14 of 637 comparisons
reference unpublished/missing tools, would render "Tools Not Found", return HTTP 200, and are NOT
noindexed. This is the live count behind finding #27.

## 🔵 LOW — pipeline + components + scripts

**69.** A third `slugify()` exists (in `producthunt.ts`) and none transliterate Unicode ("Café AI"→"caf-ai") — adds to finding #26. · **70.** Twitter signal silently empty without `APIFY_TOKEN`. · **71.** Trustpilot review timestamps stored raw, no dedup, rating-only sentiment can mislabel. · **72.** `ToolLogo` has no image-error fallback and trusts arbitrary logo hosts (latent; all current logos are on whitelisted hosts). · **73.** `submit-indexnow.ts` reports success even when a batch POST fails (daily run looks healthy while not submitting). · **74.** `approve-tier1-titles.ts` pings IndexNow for titles whose DB write failed. · **75.** A couple of maintenance scripts mutate the DB with no `--dry-run` (against the repo's own convention). · **76.** Relative-time timestamps can cause a hydration warning at the day boundary. · **77.** `mine-suggest.ts` checkpoint can mix stale results across differently-scoped re-runs.

## Live-data confirmations (turned earlier "LIKELY" into "VERIFIED")
- **195 pipeline runs stuck in "running" >1h** (from `cron-pipelines` + `freshness-batch`) — confirms the poll-gh-actions leak + the alerter's blindness to hung jobs (#12).
- **All 2,830 `pages_freshness` rows are unrevalidated** — confirms the freshness cascade (#4) has never run.
- **73 merged + 92 deleted tools**, 0 published-but-merged — the merge/410 bookkeeping itself is clean.
- Community tables (reviews, questions, ratings) are empty — so the rating JSON-LD (correctly gated on >0) isn't emitting bad data today.
- Content fields are otherwise well-populated: 0 thin descriptions, 0 missing editorial verdicts, only 2 tools without FAQs, only 3 with zero features.

## Components/scripts area — mostly SOUND
The component library and ops scripts are unusually disciplined: strong `--dry-run`/`--apply`
conventions, idempotent upserts, scoped deletes (the dangerous `execute-non-ai-delete.ts` is
exemplary — snapshot-before-delete, chunked, scoped), listener cleanup, try/catch around all
localStorage, no secret leakage (only `NEXT_PUBLIC_*` in client), and every nav/footer link maps
to a real route. Findings 63/72/73-77 are the only items here and all are low/latent.

---

## ✅ Verified SOUND (no action needed)
- **Credit grants are idempotent** — paying twice / webhook retries can't double-grant (`grant_sentiment_credit` row-locks + unique index).
- **Failed scans refund** the credit; quota claim/refund is atomic.
- **PayPal capture** re-captures server-side, checks `COMPLETED`, and verifies order ownership + order-id match.
- **Service-role key never reaches the client** — admin Supabase client is server-only; browser uses anon key.
- **Admin auth is real and layered** — every `/admin` page and `/api/admin/*` route checks `is_admin` independently.
- **All cron routes are auth-gated** via `CRON_SECRET` and fail closed when the secret is unset.
- **Search/autocomplete is injection-safe** (`sanitizeLike` before every `.or()`/`ilike`).
- **Open redirects are defended** (`safeNext`).
- **API key ownership (IDOR) is enforced** on delete/list.
- **Scrapers degrade gracefully** (per-source timeouts + catch, never throw).
- **Keystroke/PII capture is properly scrubbed**; `track-mirror` resolves user server-side (anti-spoof).
- **next.config.ts** has a real CSP, no `ignoreBuildErrors`, scoped image domains.
- **Embed / OG / feed routes** escape output correctly and 404 properly.
