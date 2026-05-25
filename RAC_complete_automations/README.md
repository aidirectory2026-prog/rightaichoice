# RAC Complete Automations — Skill & Automation Specifications

Design workspace for every skill and automation in the 30-day roadmap. Each item is structured here as a `SPEC.md` *before* it gets built in the actual code locations.

## Structure

```
RAC_complete_automations/
├── 01-catalog/      Tool ingestion, refresh, freshness cascade, dedup
├── 02-seo/          GSC pulse, audit, plan, fix, publish, impact, noindex
├── 03-content/      Newsletter, blog, page generation
├── 04-affiliate/    Enrich, research, click tracking, monthly rescan
├── 05-outreach/     Founder, followup, badge, HARO, Reddit replies
├── 06-social/       X, LinkedIn, Reddit organic, mentions
├── 07-authority/    Backlink import, competitor scrape, badge analytics
├── 08-analytics/    KPI anomaly, cost tracker, weekly report, ops pulse
```

## Where things actually live after build

- **Manager-invoked skills** → `.claude/skills/<name>/SKILL.md`
- **Vercel Cron routes** → `app/api/cron/<name>/route.ts` (+ entry in `vercel.json`)
- **GitHub Actions** → `.github/workflows/<name>.yml`
- **Cloudflare Workers** → `cloudflare/<name>/`
- **Supabase jobs** → `supabase/migrations/NNN_<name>.sql` (pg_cron) or `supabase/functions/<name>/` (edge functions)
- **Helper scripts** → `scripts/<name>.ts`

This folder holds the *design*, not the runtime code.

## Spec template

Each skill/automation folder contains a `SPEC.md` covering:

1. **Purpose** — what problem this solves, why it matters
2. **Trigger** — manual `/skill`, cron schedule, DB trigger, webhook
3. **Runtime** — Claude Code / Vercel Cron / GH Actions / Cloudflare Worker / Supabase
4. **Inputs** — DB tables read, APIs called, user approvals required
5. **Outputs** — DB writes, emails sent, files written, notifications
6. **Dependencies** — upstream skills/automations, env vars, third-party services
7. **Manager decisions** — what the manager approves/edits/rejects
8. **Failure modes** — how to detect a broken run, recovery steps
9. **Files to create/modify** — exact paths
10. **Acceptance test** — how we know the first run worked

## Workflow

For each department, one at a time:
1. Open department README → review skill list
2. Spec out every skill/automation in that department, one at a time
3. Review + iterate each `SPEC.md` until approved
4. Build it in the actual code location
5. Add `IMPLEMENTATION.md` next to `SPEC.md` linking to the built code
6. Move to next item, then next department

## Status legend

- **NEW** — not built yet
- **EXISTING (tune)** — code exists, needs configuration/extension
- **EXISTING (stable)** — code exists, no change needed (specced for documentation)
