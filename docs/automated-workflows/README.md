# Automated Workflows — RightAIChoice

This directory contains complete documentation for every automated pipeline that keeps the RightAIChoice platform alive and fresh without manual intervention.

## Overview

RightAIChoice runs **5 automated workflows** that handle tool discovery, data freshness, content generation, and community intelligence. They run on a schedule via GitHub Actions, which call protected API routes on the Vercel-hosted Next.js app.

## Architecture

```
GitHub Actions (scheduler)
    |
    | curl -X POST with Bearer token
    v
Vercel API Routes (/api/cron/*)
    |
    | validates CRON_SECRET
    v
Pipeline Logic (lib/cron/*)
    |
    | reads/writes data
    v
Supabase (PostgreSQL) + Anthropic Claude API + External Sources
```

## The 5 Workflows

| # | Workflow | Schedule | What It Does | Batch Size |
|---|---------|----------|-------------|-----------|
| 1 | [Ingest Tools](./01-ingest-tools.md) | Daily 2:00 AM UTC | Discovers and adds new AI tools | 15 tools/run |
| 2 | [Refresh Tools](./02-refresh-tools.md) | Every 3 days 4:00 AM UTC | Re-analyzes existing tool data | 15 tools/run |
| 3 | [Refresh FAQs](./03-refresh-faqs.md) | Every 2 days 6:00 AM UTC | Generates FAQs from real user pain points | 20 tools/run |
| 4 | [Generate Editorials](./04-generate-editorials.md) | Mondays 5:00 AM UTC | Writes "Our Views" editorial content | 20 tools/run |
| 5 | [Discover Tutorials](./05-discover-tutorials.md) | Tue + Fri 7:00 AM UTC | Finds YouTube tutorials for tools | 30 tools/run |

## Quick Reference

- **How to run manually:** [Manual Runs](./06-manual-runs.md)
- **How to monitor:** [Tracking & Monitoring](./07-tracking-and-monitoring.md)
- **How it was set up:** [Setup Guide](./08-setup-guide.md)
- **Shared infrastructure:** [Shared Modules](./09-shared-modules.md)

## File Map

```
.github/workflows/cron-pipelines.yml    <- GitHub Actions scheduler
lib/cron/auth.ts                         <- CRON_SECRET validation
lib/cron/supabase-admin.ts               <- Service-role Supabase client
lib/cron/scrape.ts                       <- Web scraping utility
lib/cron/discover.ts                     <- Tool discovery sources
lib/cron/dedup.ts                        <- Deduplication logic
lib/cron/enrich.ts                       <- Claude AI enrichment
lib/cron/ingest.ts                       <- Ingestion orchestrator
lib/cron/refresh.ts                      <- Tool refresh logic
lib/cron/faq-sources.ts                  <- Reddit/PH/G2 data fetching
lib/cron/faq-generator.ts               <- FAQ generation with Claude
lib/cron/editorial.ts                    <- Editorial content generation
lib/cron/tutorials.ts                    <- YouTube tutorial discovery
app/api/cron/ingest-tools/route.ts       <- API endpoint
app/api/cron/refresh-tools/route.ts      <- API endpoint
app/api/cron/refresh-faqs/route.ts       <- API endpoint
app/api/cron/generate-editorials/route.ts <- API endpoint
app/api/cron/discover-tutorials/route.ts <- API endpoint
supabase/migrations/023_ingestion_pipeline.sql <- Ingestion logs table
supabase/migrations/024_refresh_logs.sql       <- Refresh logs table
supabase/migrations/025_tutorials_and_faqs.sql <- FAQs + tutorial columns
```

## Environment Variables Required

| Variable | Where | Purpose |
|----------|-------|---------|
| `CRON_SECRET` | Vercel + GitHub Secrets | Authenticates workflow requests |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel | Bypasses RLS for DB writes |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | Database connection |
| `ANTHROPIC_API_KEY` | Vercel | Claude AI for enrichment/generation |

## Cost Estimate (Monthly)

| Service | Usage | Estimated Cost |
|---------|-------|---------------|
| GitHub Actions | ~60 runs/month, <1 min each | Free (2000 min/month free tier) |
| Vercel Serverless | ~60 function invocations | Free (100K/month free tier) |
| Anthropic Claude API | ~2500 calls/month (Sonnet) | ~$15-30/month |
| Supabase | Database reads/writes | Free tier covers this |
| **Total** | | **~$15-30/month** (Claude API only) |
