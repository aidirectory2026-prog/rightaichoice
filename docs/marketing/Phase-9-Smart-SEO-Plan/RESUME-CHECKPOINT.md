# Phase 9 Smart SEO — RESUME CHECKPOINT

> **Paused: 2026-05-31.** This file is the single source of truth for resuming.
> **To resume, one prompt is enough:** _"Resume Phase 9 Smart SEO from
> RESUME-CHECKPOINT.md."_ Read this top-to-bottom, then act on §5 (Open
> decisions) — start by re-asking the pillars question.

---

## 1. One-line state
Cornerstones, /seo-impact, compare-discovery fix, /admin/health, and Bing
submission are all **done & deployed**. The next thing — **stack pillars for
solo-developers / product-teams — is BLOCKED** on a catalog gap (missing
high-traffic infra/design/PM/BI tools). An ops prompt to fill that gap was
handed to the operator (§4). Everything is committed; `origin/main` is synced.

## 2. Shipped this work block (all on `main`, pushed)
- **/seo-impact** — 4-week lift measurement closing the loop. migrations
  128 (`gsc_page_metrics` + baseline/outcome cols on `title_overrides`) +
  129 (`run_seo_impact`). Cron `/api/cron/seo-impact` (Mon 08:30) +
  `/admin/seo-impact` dashboard. Approve action freezes pre-recrawl baseline.
  103 active title overrides baselined.
- **Compare-indexation fix** — root cause was **un-crawlable pagination**
  (`<button>` not `<a href>`): Googlebot never got past page 1, so 64% of
  compares were "unknown to Google." Fixed `ComparePagination` +
  `ToolPagination` to crawlable `<Link href>`. Submitted all 530 compares +
  hub pages to IndexNow.
- **/admin/health** — `pipeline_health()` (migration 130) + dashboard. Surfaced
  + we fixed `submit-urls-bing` (was failing on missing `BING_WEBMASTER_API_KEY`;
  now skips gracefully; key since added to Vercel; verified the Bing API works).
- **Cornerstones (now 5 total):** added `writing-content`, `research-education`
  ("AI for Research & Learning"), `marketing-seo`. (Existing: code-development,
  image-generation.)
- **Stack pillars (now 3 total):** added `ai-stack-for-marketing-teams`.
  (Existing: early-stage-saas, content-creators.)
- **Bug fix:** doubled `<title>` ("… | RightAIChoice | RightAIChoice") on ALL
  cornerstones + pillars — fixed via `title.absolute` in
  `app/categories/[slug]/page.tsx` + `app/stacks/[slug]/page.tsx`.
- Earlier in the phase (already logged in BUILD-LOG): freshness cascade →
  sitemap lastmod (content-aware trigger, mig 126), IndexNow hygiene, Tier-1
  ROI engine + 39 live title approvals, buried-tool internal-link boost
  (mig 127 `gsc_tool_positions`), 9.F automation reliability relocated here as
  doc 15.

## 3. Key state facts (for collision-safety on resume)
- **Next Supabase migration number = 131.** Always re-check the live max on
  disk first — the parallel Opus 4.8 Review session creates migrations on the
  same tree (it took 125 concurrently this session; we renumbered ours to 127).
- New events → register in `lib/analytics-registry.ts` (CI guard).
- New tables → RLS-on, service-role-only by default.
- Shared files (vercel.json, admin/layout.tsx, proxy.ts, data-audit.ts) →
  append-only; expect Opus edits; rebase carefully.
- Cornerstone/pillar `metaTitle` must use `title.absolute` (already wired) — it
  already includes "| RightAIChoice"; the root layout adds the template.

## 4. ⛔ BLOCKER — catalog gap (why pillars are paused)
A 60-tool probe found **29 confirmed-missing high-traffic platforms** (never
added; not purged). They have material AI features (so they qualify) and are
needed for complete dev/design/PM/BI stack pages:
- **Dev infra/hosting/DevOps:** vercel, netlify, firebase, railway, render,
  fly-io, neon, planetscale, cloudflare, sentry, datadog, postman
- **Design:** figma, sketch, adobe-express, penpot
- **PM/collab:** notion, linear, jira, monday, airtable, miro
- **BI/analytics:** tableau, power-bi, looker, amplitude
- **AI infra/hubs:** huggingface, llama, lm-studio

There is **no category** for hosting/devops, project-management, or BI — new
categories likely needed. A complete consolidated **operations prompt** to
discover + add these (with AI-relevance gate, dedup vs `deleted_tools`,
automation parity, page-section parity, content-quality bar) was handed to the
operator's ops-head AI on 2026-05-31. **Resume pillars only after these land.**

## 5. ▶️ OPEN DECISIONS — act on these to resume
**FIRST: re-ask the pillars question (the operator asked me to re-ask it):**
> The other 2 pillars (solo-developers, product-teams) fit the AI-tools catalog
> poorly. How to proceed?
> 1. solo-devs (AI-layer framing) + verify product-teams
> 2. Swap to better-fitting personas (customer-support, sales, students)
> 3. Build solo-devs only, skip product-teams
> 4. Stop at 3 pillars, move to another task

**Other available next tasks (if pillars stay blocked):**
- **AEO/GEO** (doc 08) — become the cited default in AI Overviews / Perplexity /
  ChatGPT. The marketing-seo cornerstone teed up "AI visibility." Higher
  ceiling, harder to measure.
- **doc-15 reliability hardening** — advisory locks on cursor crons,
  retry/backoff + error classification in `lib/pipelines/with-logging.ts`.
  Low urgency (no active fires; /admin/health is green except handled items).
- **Tier-1 measurement** — in ~28 days `/admin/seo-impact` will show the lift
  from the 39 title changes; revert losers, double down on winners.

## 6. Operator (human) to-dos outstanding
- Confirm `BING_WEBMASTER_API_KEY` is on Vercel **Production** (cron flips green
  on `/admin/health` next run).
- GSC → Request Indexing on `/compare` + `?page=2…9` (accelerates compare
  re-discovery) and the 6 high-impression changed-title pages (optional).
- Hand the catalog-gap ops prompt to the ops AI; ping when tools are added.

## 7. How to resume in one prompt
> "Resume Phase 9 Smart SEO from RESUME-CHECKPOINT.md."
Then: re-ask the §5 pillars question → if catalog still incomplete, pick an
alternative next task from §5 → keep committing small, verified changes to
`main` and logging them in BUILD-LOG.
