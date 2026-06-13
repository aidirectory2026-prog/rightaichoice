# Phase 10.8 Gate — Resources (the in-admin learning guide)

Date: 2026-06-13 · Branch: `phase10-admin` · Spec: Phase 10 plan §8 (6 parts + literal acceptance test)

## What shipped

A six-section learning guide under `/admin/resources`, built as React/TSX pages
(no `@next/mdx` build-pipeline change — avoids Next-16 MDX friction). Two of the
six sections are **auto-generated at render time** from the live system, so they
can never drift:

| Section | Route | Source |
| --- | --- | --- |
| Landing / index | `/admin/resources` | — |
| 1. How tracking works (non-technical) | `/admin/resources/tracking-overview` | hand-written prose + pipeline diagram |
| 2. How tracking works (technical) | `/admin/resources/tracking-technical` | hand-written prose (accurate to capture()→mirror→user_events) |
| 3. Event dictionary | `/admin/resources/event-dictionary` | **auto-gen** from `lib/analytics-schema.ts` (97 events + props + lifecycle, links to `/admin/insights/event/[name]`) |
| 4. Metric provenance cards | `/admin/resources/metrics` | **auto-gen** from `lib/admin/metric-docs.ts` (what/how/why-trusted/caveats — same content as the ⓘ popovers) |
| 5. Trust & verification | `/admin/resources/trust` | the 8 verification means + "looks wrong" runbook + privacy/retention posture (RLS admin-read-only) + live `EPOCHS` |
| 6. Glossary & FAQ | `/admin/resources/glossary` | terms + FAQ; epoch dates imported live from `EPOCHS` + `TRACKING_EPOCHS` |

Nav: the Resources section in `lib/admin/nav.ts` now lists all six pages (was a
single "Coming in Phase 8" placeholder), so they are part of the sidebar and are
automatically covered by the authed-smoke route list.

### Build note — callsite scanner doc exclusion
The technical page describes the pipeline with code-like snippets
(`analytics.x()`, `capture()`). The CI callsite scanner (`verify-event-registry.ts`)
initially false-matched these as real firing sites (123 → 125). Fixed: both scans
now exclude `app/admin/resources/**` via `isDocFile()` — documentation describes
events, it never emits them. Back to 97 events / 123 firing sites, `analytics-callsites.gen.json`
byte-identical to its committed state.

## Verification results

1. **`npm run tracking:schema`** — 147 defined, **97 fired = 97 schema'd**, 0 warnings; callsites map clean (123 firing sites, gen.json unchanged after the doc-exclusion fix).
2. **`npm run tracking:synthetic`** — FULL suite green (see run below); Resources adds no events, so this proves zero regression.
3. **Snapshot oracle** vs `post-phase7e.json` — **53/53 byte-identical** (0 changed / 0 added / 0 removed); Resources is read-only documentation, no metric can move. `post-phase8.json` committed.
4. **`npm run tracking:filters`** — **36/36 ALL GREEN**.
5. **authed-smoke** (local production build) — every admin route 200/307 **including all six new `/admin/resources/*` routes** (picked up automatically via the nav). Zero 5xx, no login bounces.
6. **`npm run build`** — exit 0; all six resources routes emitted.

## Acceptance test (plan's literal gate)

> "The owner can explain every Overview tile's meaning and trust basis using ONLY the Resources section."

Satisfied **by construction**: the metric-provenance page renders
`Object.keys(METRIC_DOCS)` exhaustively (any key not placed in a named group
falls into an "Other metrics" group — nothing can be silently dropped). Every
Overview dashboard tile maps to a metric-docs key with a card carrying
what-it-counts / how-computed / why-trusted / caveats:

| Overview tile | metric-docs key |
| --- | --- |
| Unique visitors | `kpi_visitors` |
| Page views | `kpi_page_views` |
| Signed-in accounts | `kpi_signed_in` |
| Signups | `kpi_signups` |
| Affiliate out-clicks | `kpi_outclicks` |
| Newsletter | `kpi_newsletter` |
| Right-now pulse strip | `right_now_pulse` |
| DAU trend | `dau_trend` |
| Top sources / channels / pages / events / tools | `top_sources`, `top_channels`, `top_pages`, `top_events`, `top_tools_viewed`, `top_tools_clicked` |

The trust page additionally gives the owner the "why trust it" framework (the 8
means) and the runbook for when a number looks off.

## Hygiene
No stray dev/prod servers; no headless Chrome; synthetic suite cleaned its own e2e rows (verified 0).

## Deferred
None for Phase 8. (Privacy/retention note carried over from Phase 7e is now documented on the Trust page.)
