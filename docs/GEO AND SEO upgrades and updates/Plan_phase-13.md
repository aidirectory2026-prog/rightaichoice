# Plan — Phase 13 (GEO & SEO Upgrades) · Opus 4.8 (1M)

> Authoritative plan for Phase 13. Progress is tracked in `build-log.md` (same folder).
> CODE changes are made in the isolated worktree `../rac-phase13` (branch `phase13-geo-seo`) and
> integrated to `main` via a squash PR. These DOCS live in the main repo so they're easy to read.
> Every new automation also gets a deep-dive in `docs/automated-pipelines/` (the playbook) and a
> changelog line in that folder's `README.md`.

---

## Objective

Two outcomes, pursued in parallel, both measured against a hard baseline:

1. **SEO — recover and break onto page 1.** Reverse the May-2026 Core-Update demotion that is
   actively eroding our impressions, lift average position off page 4–5, fix the indexation gaps
   (compares at 34%), and finally attack **off-site authority** — the single missing ingredient that
   keeps a technically-excellent site buried.
2. **GEO — become the most-cited AI-tools reference on the web.** Engineer the cross-source
   "consensus signal" so ChatGPT, Perplexity, Gemini, and Claude name `rightaichoice.com` in answers,
   and make our always-fresh dataset legible and irresistible to LLMs — with GSC-grade measurement so
   citation gains are provable, not vibes.

Plus a third, smaller track: **fix the conversion path** so the traffic we win actually converts
(baseline: 5 signups / 30d, 70 affiliate clicks / 30d).

---

## Why now — the diagnosis (data-grounded, see baseline in build-log)

- **Rank is the binding constraint.** In the latest 28-day GSC snapshot, **94% of our 6,787 ranked
  query-rows sit at position 21+**; only **3.2% are on page 1**. Google shows us ~43k times/month →
  ~39 clicks. CTR (~0.09%) is a *symptom of rank*, not a titles problem.
- **We are sliding.** 28-day impressions peaked ~56k (Jun 8) → ~43k (Jun 22); clicks 66 → 60 → 39.
  This tracks the **May 2026 Core Update** (rolled May 21–Jun 2), which specifically demotes/deindexes
  **thin programmatic directory pages** — exactly our ~2,000-page shape.
- **Indexation gaps** (1,996 URLs inspected, 2026-05-27): 1,258 indexed · 540 discovered-not-indexed ·
  171 unknown · 16 dup-canonical. **Compares 34/100 indexed**; tools strong but 530 discovered-not-indexed.
- **Authority ≈ 0.** Median page-1 site ≈ 900 referring domains; we have almost none. #1 blocker.
- **Pre-traction:** ~110 human pageviews/day, 5 signups/30d, 70 affiliate clicks/30d, ~62% bots.
- **No LLM cites us** despite good plumbing (llms.txt, AI-crawler allowances, Dataset/Org schema,
  Wikidata `Q139970688`). LLMs cite **consensus entities**; we have no cross-source footprint.

---

## Locked decisions (founder)

1. **Authority via automation; operator approves every send.** Build directory-submission, PR/outreach,
   and brand-mention/entity engines. **Each automation is verified multiple times and iteratively
   upgraded to a better version**, wrapped in `pipeline_runs` + `/admin/health` + failure alerts, and
   **documented in `docs/automated-pipelines/` in the same depth/format** before it counts as shipped.
2. **Data-driven consolidation** — keep + enrich pages earning impressions; merge/308-redirect
   zero-impression thin pages into rich hubs (preserve link equity); then deindex the corpses.
3. **SEO recovery + GEO + conversion run in parallel.**

---

## Governing SOP (every step — non-negotiable)

**Isolate → Implement → Verify → Re-verify → Upgrade → Log → Report → Commit.** A step is "done" only
after a `build-log.md` entry with verification evidence (query result / live check / repeated run).
Per founder: every automation is verified **multiple times** and **re-upgraded to a better version**;
each ships with `pipeline_runs` logging, `/admin/health` visibility, failure alerting, a playbook
deep-dive, and a README/changelog line. Report each step in plain language and ask before moving on.
Every migration ships with its reverse. Stage only explicit paths; commit each unit immediately;
rebase before push; never `git add -A`.

---

## The five departments

### D1 — Core-Update Recovery & On-Site Depth
Make pages **genuinely original** using the proprietary live data we already generate (this is what
survives the core update: "real data per page, not variable substitution").

| Step | What | Reuse |
|---|---|---|
| D1.1 | **Originality-density audit engine** — score every published URL on proprietary-data richness (live pricing, viability, sentiment, latest-updates, freshness), fact density, 28d impressions, indexation. Output keep / enrich / consolidate buckets. | `gsc_snapshots`, `scripts/audit-gsc-indexation.ts`, `pages_freshness` |
| D1.2 | **Data-driven consolidation** — merge zero-impression thin compare/niche pages into rich hubs via 308 redirects; deindex corpses. | `scripts/build-merged-redirects.ts`, `blast-deleted-urls-indexnow.ts`, `resubmit-merged-tool-urls.ts` |
| D1.3 | **Originality injection** — each survivor carries unique per-page facts/tables (pricing deltas, viability+momentum, sentiment, "what changed since last review", freshness stamp). | `lib/seo/json-ld.ts`, `lib/seo/freshness.ts`, `<ToolFact>` |
| D1.4 | **Indexation recovery** — depth + internal links + dedupe + canonical hygiene; re-ping; track recovery. | `lib/seo/internal-links.ts`, `best-page-links.ts`, IndexNow scripts |

### D2 — Authority Engine (off-site; #1 lever; automation-heavy)
Verified, upgradeable, fully-documented pipelines; operator approves every outbound send.

| Step | What | Reuse |
|---|---|---|
| D2.1 | **Directory & citation submission engine** — operator-approved queue to high-authority AI/SaaS directories that feed backlinks **and** AI citations (Product Hunt, There's An AI For That, Futurepedia, SaaSHub, TheSaaSDir, Toolify, G2/Capterra/Trustpilot). | `/admin/authority`, `scripts/daily.ts` |
| D2.2 | **Digital-PR / data-journalism engine** — turn our dataset into linkable assets ("State of AI Tools" report, pricing-change tracker, Viability/tool-death Index); AI-generate pitches + HARO/Qwoted drafts; operator approves. | dataset, DeepSeek synthesis |
| D2.3 | **Brand-mention / entity-consensus engine** — canonical brand description, operator-approved seeding across Reddit/Quora/YouTube/forums, strengthen Wikidata + pursue Wikipedia, consistent entity across web. **Doubles as GEO consensus.** | `lib/seo/json-ld.ts` (Org/Person), Wikidata `Q139970688` |
| D2.4 | **Backlink/authority monitoring** — track referring domains over time, flag toxic, chart authority growth as leading indicator of rank recovery. | `/admin/authority` |

### D3 — GEO / AI-Citation Engine (same architecture rigor as GSC)

| Step | What | Reuse |
|---|---|---|
| D3.1 | **Citation-worthy structure** — answer-first TL;DR (inverted pyramid), ≥1 table + ≥1 numbered list (2.3× citation lift), verifiable stats w/ inline sources, visible named author + published/updated dates. | Phase-9 AEO templates, `lib/seo/json-ld.ts` |
| D3.2 | **The citable dataset** — upgrade `llms.txt`/`llms-full.txt` into the most authoritative always-fresh machine-readable AI-tool reference; surface freshness loudly; JSON-Lines + schema.org; distribute to data catalogs. **Our constant-refresh is the differentiator — make it legible to LLMs.** | `app/llms*.txt`, `pages_freshness` |
| D3.3 | **Bing-first push** — ChatGPT search rides Bing's index → maximize Bing indexation + coverage. | `scripts/submit-urls-bing.ts`, IndexNow |
| D3.4 | **GEO citation tracking (new, GSC-grade)** — scheduled queries to ChatGPT/Perplexity/Gemini/Claude for target prompts; log cited?/where + competitor share-of-voice into `geo_citation_snapshots`; `/admin` dashboard with diffs. The GEO equivalent of `gsc_snapshots`/`gsc_diffs`. | `lib/cron/*`, `withPipelineLogging`, AI SDK / gateway |

### D4 — Conversion & Monetization

| Step | What | Reuse |
|---|---|---|
| D4.1 | **Funnel diagnosis** — locate the recommend/plan-flow + signup leak. | `user_events`, `user_intent_profile`, `/admin/insights`, `/api/admin/export` |
| D4.2 | **Conversion fixes** — reduce signup friction, sharpen CTAs, optimize affiliate-click path; measure lift vs baseline. | `click_logs`, server-side Mixpanel |

### D5 — Measurement & Automation Governance (cross-cutting)
- **D5.1 Baseline snapshot** in build-log (position dist, indexation by type, traffic, signups,
  affiliate clicks, AI-citation share = 0). ✅ captured at phase start.
- **D5.2 Automation governance** — every new pipeline: multi-run verification, `pipeline_runs`
  logging, `/admin/health`, failure alerts, a playbook deep-dive, README/changelog. Re-verify and
  **upgrade to a better version** as a standing requirement.

---

## Sequencing
1. **Setup (D0):** worktree `../rac-phase13`, this docs folder, baseline snapshot.
2. **Urgent parallel start:** D1 recovery (impressions falling) + D2.1 directory engine (authority is
   the long pole — start compounding now) + D3.4 GEO tracker (start the citation baseline now).
3. **Then:** D3.1–D3.3 structure/dataset/Bing, D2.2–D2.4 PR/entity/monitoring, D4 conversion.
4. Each unit: build → verify ×N → upgrade → document → log → report → commit.

## Verification (end-to-end)
- **SEO:** weekly `snapshot-gsc` + `diff-gsc-snapshots` show position-distribution shift toward page 1
  and impression/click recovery; `audit-gsc-indexation` shows discovered-not-indexed shrinking and
  compare-indexation rising from 34%.
- **Authority:** referring-domain count rises in `/admin/authority`; directory listings live.
- **GEO:** `geo_citation_snapshots` shows us appearing in AI answers for target prompts where we were
  absent at baseline; competitor share-of-voice tracked.
- **Conversion:** signups + affiliate clicks rise vs the 5/30d & 70/30d baseline.
- **Automations:** each shows repeated successful runs in `pipeline_runs` + green `/admin/health` + a
  playbook doc.

## Key files to reuse (not rebuild)
`scripts/snapshot-gsc.ts`, `diff-gsc-snapshots.ts`, `audit-gsc-indexation.ts`, `build-merged-redirects.ts`,
`blast-deleted-urls-indexnow.ts`, `submit-urls-bing.ts`, `submit-indexnow.ts`; `lib/seo/json-ld.ts`,
`freshness.ts`, `internal-links.ts`, `best-page-links.ts`; `lib/cron/*`, `withPipelineLogging`/`cronRoute`;
`/admin/authority`, `/admin/insights`, `/admin/health`; tables `gsc_snapshots`/`gsc_diffs`/
`pages_freshness`/`click_logs`/`user_events`; `app/llms*.txt`.
