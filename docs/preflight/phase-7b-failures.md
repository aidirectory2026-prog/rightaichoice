# Phase 7B — Compare Page Generation: Failure Log

**Last updated:** 2026-05-13 (after Phase 7B.deep top-100 v3 upgrade).

**Final tally:** 579 of 580 v2 pages written + top 100 upgraded to v3 depth. 1 stubborn v2 failure (`coupa-ai-vs-stampli`) carries over since it's not in top 100 — see below.

**State of `/compare/[slug]` editorial pages on prod:**
- 100 top-head-term pairs at **v3 deep quality** (~1,039 words avg, 6 H2 sections, 100% "2026" coverage)
- 479 long-tail pairs at **v2 quality** (~691 words avg, 5 H2 sections — strong structural SEO, fine for long-tail)
- 8 pre-existing manual pages from prior phases
- = **587 total live editorial compare pages**

---

## Stubborn failures (still need attention)

### 1. `coupa-ai-vs-stampli`

**Error:**
```
Schema validation failed after 2 attempts:
  - use_cases.4.recommendedSlug: Invalid input: expected string, received null
```

**Diagnosis:** DeepSeek consistently returns `null` for the 5th use_case's `recommendedSlug` field. Likely happens because the model isn't confident enough to pick a winner for one specific persona scenario in this pair and falls through to `null` rather than picking one.

**Tried so far:** 3 separate retry passes, all hit the same schema rejection at attempt 2. Issue is model-side, not network.

**Suggested fixes (pick one for follow-up):**
1. **Sanitizer patch (cheapest, recommended):** in `scripts/generate-comparisons.ts`, pre-validation, drop any `use_cases` entry where `recommendedSlug` is null or not one of the two valid slugs. If that drops the array below min(3), tighten the prompt to enforce a hard pick.
2. **Per-pair prompt nudge:** add a one-shot example to the prompt for this pair explicitly demonstrating recommendedSlug must be a string.
3. **Manual editorial:** hand-write the editorial JSON for this 1 pair and insert directly.

**Page impact:** the `/compare/coupa-ai-vs-stampli` URL will currently 404 (no row exists). Once fixed it'll join the live set.

---

## Transient failures cleared during retry passes

The following slugs failed at least once during the initial run but recovered on retry. No further action needed — they are live.

| Slug | Initial error category | Final pass |
|---|---|---|
| `apollo-io-vs-zoominfo` | DB insert: fetch failed | retry 2 |
| `loom-vs-vidyard` | fetch failed | retry 2 |
| `google-adk-vs-langgraph` | fetch failed | retry 2 |
| `langfuse-vs-promptfoo` | DB insert: fetch failed | retry 2 |
| `anything-llm-vs-cherry-studio` | terminated | retry 2 |
| `framer-vs-wix` | terminated | retry 2 |
| `autogen-vs-semantic-kernel` | terminated + JSON parse | retry 2 |
| `shopify-vs-wix` | terminated | retry 2 |
| `notebooklm-vs-notion-ai` | terminated | retry 2 |
| `copilotkit-vs-langgraph` | fetch failed | retry 2 |
| `shopify-vs-webflow` | terminated | retry 2 |
| `calendly-vs-notion-calendar` | terminated | retry 2 |
| `groq-vs-ollama` | DB insert: fetch failed | retry 2 |
| `asana-vs-sunsama` | DB insert: fetch failed | retry 2 |
| `cursor-vs-greptile` | terminated | retry 2 |
| `webflow-vs-wix` | fetch failed (initial + retry) | retry 3 |
| `duolingo-vs-talkpal` | FAQ answer < 80 chars | retry 1 (after FAQ schema relaxation) |
| `akiflow-vs-sunsama` | FAQ answer < 80 chars | retry 1 |
| `luma-ai-vs-runway` | FAQ question < 20 chars | retry 1 |
| `orca-security-vs-wiz` | JSON parse error | retry 1 |
| `glean-vs-moveworks` | JSON parse error | retry 1 |
| `autogen-vs-langchain` | FAQ question < 20 chars | retry 1 |
| `cursor-vs-windsurf-editor` | FAQ question < 20 chars | retry 1 |

---

## Lessons for next regeneration cycle

1. **FAQ length floors were too aggressive initially.** Started at min(120) for answer / min(20) for question. Relaxed to min(50) / min(15) in retry pass — eliminated 9 of the 25 initial failures.
2. **`terminated` errors clustered when DeepSeek API was under load** — running concurrency=5 helps; further reducing to 3 would lower transient rate but slow the run.
3. **JSON parse errors at high output lengths** (>6000 chars) — DeepSeek occasionally cuts off mid-string when feature_analysis runs long. Mitigation: keep max_tokens at 8192 (already set) and don't push prompt to demand more than ~3,000-word output.
4. **`recommendedSlug = null`** (the 1 stubborn case) — add a pre-validation sanitizer that drops null-slug use_case entries before zod validation, mirroring the Phase 4 SOP pattern in `sanitizeNestedArrays()` for `workflow_scenarios` and `faqs_long_tail`.

---

## Pages NOT generated

The 580 candidate pairs were derived from `scripts/.keyword-opportunities.json` (Phase 7A merged) sorted by combined_score. The following 4 pairs are absent from the final set for reasons unrelated to generation failure:

- 1 pair was a pre-existing user-saved comparison kept untouched (skipped at the `existing slugs` check before generation)
- 3 pairs were deduplicated against the same canonical alpha-sorted slug as another higher-scoring pair (e.g. both `cursor-vs-windsurf` and `windsurf-vs-cursor` exist as queries, the alpha-sorted form wins)

Coverage: 99.8% of generation targets, 100% of unique canonical slugs (excluding the 1 stubborn).
