# Phase 9 Smart SEO — RESUME CHECKPOINT

> **Updated: 2026-06-03.** Single source of truth for resuming the *Smart SEO*
> track. **To resume, one prompt is enough:** _"Resume Phase 9 Smart SEO from
> RESUME-CHECKPOINT.md."_ Read top-to-bottom, then act on §5 (Open threads).
>
> **Scope note:** the **Market Sentiment Checker** (paid, on-demand feature on the
> `phase9-sentiment-checker` branch) is a **separate, operator-owned track** and is
> deliberately out of scope for this checkpoint and the SEO BUILD-LOG. Don't touch
> it when resuming SEO work.

---

## 1. One-line state
Every **non-rank-gated** Phase 9 lever is now shipped: the doc-07 spine (5
cornerstones + 5 pillars), the measurement loop (`/seo-impact`, `/admin/health`),
the structural compare-indexation fix (crawlable pagination), Dataset JSON-LD,
and (2026-06-03) **AEO/GEO citation tracking** (`/admin/ai-citations`, mig 137).
The remaining named threads (snippets, Tier-2) turned out **rank-gated** — they
pay off only once Google recrawls/re-ranks the shipped changes. **Phase 9 is now
in a measure-and-wait phase**; the next dated action is the Tier-1 lift readout
~2026-06-24. See §5.

## 2. Shipped since the last checkpoint (all on `main`)
- **Stack pillars complete (5):** added `solo-developers` + `product-teams`
  (`3aacaf7`) once the catalog gap-fill landed the infra/PM/design platforms.
  Earlier: `marketing-teams` (`3b17f55`). Queue from doc 07 is done.
- **Cornerstones complete (5):** added `writing-content` (`8c50d80`),
  `research-education` + `marketing-seo` (`aaaad0d`). Doubled-`<title>` bug fixed
  across all cornerstones + pillars via `title.absolute`.
- **`/seo-impact`** — 4-week lift measurement (migs 128–129, cron Mon 08:30,
  `/admin/seo-impact`). Approve freezes the pre-recrawl baseline. **103 active
  overrides baselined** (avg pos 18.9, CTR 0.126% — the number to beat).
- **Compare-indexation fix** — root cause was **un-crawlable pagination**
  (`<button>` not `<a href>`); fixed `ComparePagination` + `ToolPagination` to
  `<Link href>`; submitted **553 URLs** (530 compares + 23 hubs) to IndexNow.
- **`/admin/health`** — `pipeline_health()` (mig 130) one-pane cron health.
  Surfaced + fixed `submit-urls-bing` (graceful skip when `BING_WEBMASTER_API_KEY`
  unset).
- **Dataset JSON-LD** on the homepage (`schema.org/Dataset`, Wikidata `sameAs`,
  `llms-full.txt` as `DataDownload`) — AEO/GEO citability (`071cd3f` + `0161e05`).
- **Catalog hygiene:** LlamaIndex dedup → 73-entry merged-redirects map (`5307055`).
- Full detail in BUILD-LOG (entries dated 2026-05-30 → 2026-06-02).

## 3. Key state facts (for collision-safety on resume)
- **Next Supabase migration number = 137.** Always re-check the live max on disk
  first — parallel tracks (Opus 4.8 Review; the sentiment feature, which took
  **136** `sentiment_checker`) create migrations on the same tree.
- New events → register in `lib/analytics-registry.ts` (CI guard).
- New tables → RLS-on, service-role-only by default.
- Shared files (`vercel.json`, `admin/layout.tsx`, `proxy.ts`, `data-audit.ts`,
  `lib/seo/json-ld.ts`) → append-only; expect parallel-track edits; rebase carefully.
- Cornerstone/pillar `metaTitle` uses `title.absolute` (already wired) — it
  already includes "| RightAIChoice"; the root layout adds the template.
- **Work on a branch off `main`** (e.g. `phase9-seo-<topic>`) so SEO commits don't
  entangle with the active sentiment feature branch.

## 4. ✅ Old blocker (catalog gap) — RESOLVED
The 2026-05-31 checkpoint paused pillars on 29 missing high-traffic infra/design/
PM/BI platforms. The operator's ops-AI gap-fill landed them; `solo-developers` +
`product-teams` shipped as true end-to-end stacks (`3aacaf7`). No catalog blocker
remains for the doc-07 spine.

## 5. ▶️ OPEN THREADS — status after the 2026-06-03 session
The four threads from the prior checkpoint have all been actioned or assessed:

1. ✅ **AEO/GEO citation tracking** (doc 08/11) — **DONE 2026-06-03.** `ai_citations`
   (mig 137, applied to prod) + `/admin/ai-citations` (KPIs vs the 10-citation
   target, log form, recent table). Manual-first; programmatic capture can append
   later. *Operator: run ~20–30 representative queries weekly and log hits.*
2. ⏳ **Tier-1 lift measurement** (doc 03) — **time-gated.** 103 overrides
   baselined, approved 2026-05-27→29 (only ~7d in). `run_seo_impact()` fills
   outcomes at ≥28d, so the first pages become eligible **~2026-06-24**; the cron
   (Mon 08:30) auto-fills. *Action: after June 24, read `/admin/seo-impact`, revert
   losers, double down on winners.*
3. ⛔ **Snippets / PAA** (doc 09) — **rank-gated, deferred.** Only 5 question
   queries sit in pos 2–10 (7 impr); the FAQ/table/schema half is already shipped.
   Nothing to win until rankings climb into the snippet band. See doc-09 reframe.
4. ⛔ **Tier-2 content depth** (doc 04) — **rank-gated, deferred.** Buried pages are
   already content-complete; the lever is internal links (shipped) + recrawl, not
   more content. See doc-04 reframe.

**What's actually next (no buildable rank-independent lever remains):**
- **Wait + measure** — the Tier-1 lift readout (~June 24) + the weekly GSC loop
  (`/admin/seo-pulse`) tell us whether the shipped rank work is moving pages. Act
  on what they surface (revert losers, re-rank by binding constraint).
- **Operator distribution levers** (doc 10) — backlinks/HARO, Reddit cadence,
  press kit. These earn authority (which lifts rankings) and aren't rank-gated, but
  they're human-driven, not code. Highest-leverage *non-waiting* option.
- When rankings climb, **doc 09 snippet reformatting** + **doc 04 thin-hub edits**
  reopen — re-run the cohort SQL in each doc's reframe to confirm opportunity first.

## 6. Operator (human) to-dos outstanding
- Confirm `BING_WEBMASTER_API_KEY` on Vercel **Production** (cron flips green on
  `/admin/health` next run).
- GSC → Request Indexing on `/compare` + `?page=2…23` (accelerates compare
  re-discovery after the pagination fix) and the top changed-title pages (optional).
- Re-run the indexation audit (`npm run audit:indexation`) on a Monday to watch
  compare "unknown to Google" → "indexed" after the pagination fix.

## 7. How to resume in one prompt
> "Resume Phase 9 Smart SEO from RESUME-CHECKPOINT.md."
Then: pick the next §5 thread (default: AEO/GEO citation tracking) → branch off
`main` → keep committing small, verified changes → log each ship in BUILD-LOG.
