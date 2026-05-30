# 01 — Catalog (Data Foundation)

The freshness cascade engine. Every other department reads from the catalog. If catalog breaks, SEO/content/affiliate/outreach all degrade.

## Skills & automations

| # | Name | Type | Runtime | Schedule | Status |
|---|---|---|---|---|---|
| 1.1 | `freshness-cascade` | DB trigger + cron | Supabase + Vercel | on tools.UPDATE + every 2h | **NEW** (core) |
| 1.2 | `refresh-tools` | Cron | Vercel | `*/30 * * * *` | EXISTING (tune cadence) |
| 1.3 | `ingest-tools` | Cron | Vercel | `0 */6 * * *` | EXISTING (stable) |
| 1.4 | `auto-promote-candidates` | Cron | Vercel | `0 */4 * * *` | **NEW** |
| 1.5 | `cascade-comparisons` | Cron | Vercel | `0 */2 * * *` | EXISTING (rename + tune) |
| 1.6 | `cascade-hubs` | Cron | Vercel | `15 */2 * * *` | **NEW** |
| 1.7 | `auto-dedup-candidates` | pg_cron | Supabase | `*/10 * * * *` | **NEW** |
| 1.8 | `producthunt-listener` | Worker | Cloudflare | hourly | **NEW** |
| 1.9 | `sentiment-discovery` | Cron + on-demand + UI | Vercel + Worker | every 7d + on click | **NEW** (parked — see `_NOTES.md`) |

## Build order

1. `freshness-cascade` — must land Day 1; everything downstream depends on it
2. `cascade-hubs` — Day 1 (consumes freshness)
3. `cascade-comparisons` tune — Day 1
4. `refresh-tools` cadence tune — Day 2
5. `auto-promote-candidates` + `auto-dedup-candidates` — Day 10 (paired)
6. `producthunt-listener` — Week 2

## Cross-department cascades originating here

- Any tool field update → `pages_freshness` → SEO (sitemap), Content (newsletter eligibility), Affiliate (refresh eligibility re-evaluation), Authority (badge embed re-render)
- New candidate promoted → SEO (new URL in sitemap), Content (newsletter feature pool), Outreach (founder added to `outreach_queue`)

---

## Implementation log — Phase 9 (Automations & Catalog)

> Real-state changelog (timestamps in IST). The tables above are the original *design*; entries below record what's actually shipped.

### 2026-05-31 — Catalog taxonomy expanded: +3 categories (D1)
- **What:** Added 3 categories the catalog was missing for mainstream clusters — `developer-infrastructure` (⚙️), `project-management` (📋), `business-intelligence` (🧮). Total categories 15 → 18.
- **Why:** The catalog over-indexed on niche AI startups and had nowhere to place mainstream platforms (Vercel/Netlify/Figma/Notion/Linear/Jira/Tableau/Power BI…) that now ship real AI features — costing branded search traffic and blocking `/stacks` decision pages.
- **How:** `supabase/migrations/127_new_categories.sql` (DB-driven — no code enum). The ingest/categorization step (`lib/cron/curate.ts` → `predictCategories`, automation **1.3 ingest-tools**) reads category slugs at runtime, so new tools can be classified into these immediately. Icons added in `lib/icons/category-icon.ts` (Server, PieChart; project-management already mapped).
- **Empty-page guard:** categories with 0 published tools are hidden from the public `/categories` listing (`app/categories/page.tsx`, via `category_published_counts()` RPC) so the new categories don't surface as thin pages until the P0 tools (D2) populate them.
- **Follow-up:** when D2 lands the seed tools, confirm the 3 categories auto-appear in the listing; add zero-count guard to `app/categories/sitemap.ts` if not already (SEO-coordinated).
