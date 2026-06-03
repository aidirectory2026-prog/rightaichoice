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
The doc-07 spine is **complete**: 5 cornerstones + 5 stack pillars are live, the
old catalog-gap blocker is **resolved**, and the measurement loop (`/seo-impact`,
`/admin/health`) + the structural compare-indexation fix (crawlable pagination) +
Dataset JSON-LD are all **shipped to `main`**. No active blocker. The next move is
a free pick from §5 — the highest-ceiling being **AEO/GEO citation tracking**.

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

## 5. ▶️ OPEN THREADS — pick the next one (no blocker)
Recommended order (highest leverage first):

1. **AEO/GEO citation tracking** (doc 08, doc 11) — **missing entirely.**
   No `/admin/ai-citations` exists. Doc 08: "you can't optimize what you can't
   measure"; the 30-day KPI target is 10 logged AI-Overview citations. Build the
   tracking schema + admin log (manual entry first, programmatic later). Clean,
   self-contained, unblocks a KPI. **Top pick.**
2. **Tier-1 lift measurement** (doc 03) — the 39 title overrides (approved
   ~2026-05-29) reach the 28-day window around **late June**. Check `/seo-impact`,
   revert losers, double down on winners. Mostly analysis.
3. **Snippets / PAA** (doc 09) — direct-question H2s + featured-snippet targeting
   on pos 2–10 question queries. Overlaps AEO.
4. **Tier-2 content depth** (doc 04) — *premise was mostly killed by the data:*
   buried pos-31–50 tool pages are already content-complete (avg 9.1 FAQs); their
   lever was internal links (shipped: buried-tool boost). Remaining Tier-2 value is
   narrow — scope carefully before investing.

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
