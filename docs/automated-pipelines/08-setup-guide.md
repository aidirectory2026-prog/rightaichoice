# Setup Guide — How This Was Built

This documents exactly how the automation system was set up, so it can be replicated or modified.

## Architecture Decision: Why GitHub Actions?

Vercel's free/Hobby tier only supports **1 cron job**. We have 5 pipelines. Options considered:

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Vercel Crons | Native integration | Only 1 on free tier, $20/mo for Pro | Rejected |
| GitHub Actions | Free (2000 min/month), unlimited crons | External scheduler, adds latency | **Chosen** |
| AWS EventBridge | Flexible, reliable | Requires AWS account, more complex | Rejected |
| cron-job.org | Free tier available | Third-party dependency | Rejected |

**The pattern:** GitHub Actions is purely a scheduler — it runs a `curl` command to hit the Vercel API route. All logic runs on Vercel's serverless functions.

## Step-by-Step Setup

### 1. Create the Shared Infrastructure

#### a) CRON_SECRET Authentication (`lib/cron/auth.ts`)
Every API route validates a Bearer token:
```typescript
export function validateCronSecret(request: Request): NextResponse | null {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  const secret = process.env.CRON_SECRET  // Read at RUNTIME, not build time
  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
```

**Critical lesson learned:** Must use `process.env.CRON_SECRET` directly — NOT import from a centralized env module that evaluates at build time. Vercel caches build-time env vars, so CRON_SECRET (set after build) would be `undefined`.

#### b) Service-Role Supabase Client (`lib/cron/supabase-admin.ts`)
Cron pipelines need to bypass Row Level Security (RLS) to write to log tables and update tools:
```typescript
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,  // NOT the anon key
  { auth: { autoRefreshToken: false, persistSession: false } }
)
```

Same runtime `process.env` pattern — never cache at build time.

#### c) Web Scraping Utility (`lib/cron/scrape.ts`)
Two functions shared across all pipelines:
- `fetchPageText(url)` — Fetches URL, strips HTML/scripts/styles, returns first 8000 chars of text
- `fetchHTML(url)` — Fetches raw HTML

Both use:
- Custom User-Agent (mimics Chrome to avoid bot blocking)
- AbortController with configurable timeout
- `redirect: 'follow'` for 301/302 handling

### 2. Create Database Migrations

Three SQL migration files run in Supabase SQL Editor:

| Migration | What It Creates |
|-----------|----------------|
| `023_ingestion_pipeline.sql` | `ingestion_logs` table + indexes + RLS (service_role only) |
| `024_refresh_logs.sql` | `refresh_logs` table + indexes + RLS (service_role only) |
| `025_tutorials_and_faqs.sql` | `tutorial_videos`, `our_views`, `our_views_generated_at` columns on `tools` + `tool_faqs` table with public read RLS |

### 3. Create API Routes

Each pipeline gets a Next.js API route at `app/api/cron/<name>/route.ts`:

```typescript
export const maxDuration = 300  // 5-minute timeout (Vercel Pro)

export async function POST(request: Request) {
  const authError = validateCronSecret(request)
  if (authError) return authError

  const supabase = getAdminClient()
  const result = await runPipeline(supabase)
  return NextResponse.json(result)
}
```

All 5 routes follow this exact pattern — only the imported pipeline function differs.

### 4. Create GitHub Actions Workflow

**File:** `.github/workflows/cron-pipelines.yml`

The workflow defines:
- 5 cron schedules (one per pipeline)
- `workflow_dispatch` for manual triggering with a pipeline selector dropdown
- Each job has an `if` condition that checks which schedule triggered it
- Each job runs a single `curl` command

### 5. Set Environment Variables

#### Vercel (where the code runs):
```bash
npx vercel env add CRON_SECRET production --value "your-secret" --yes
npx vercel env add CRON_SECRET preview --value "your-secret" --yes
npx vercel env add CRON_SECRET development --value "your-secret" --yes
```

Also needed (should already exist):
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `ANTHROPIC_API_KEY`

#### GitHub Secrets (where the scheduler runs):
1. Go to repo -> Settings -> Secrets and variables -> Actions
2. Add `CRON_SECRET` with the exact same value as Vercel

### 6. Deploy and Verify

```bash
# Push code to GitHub
git add -A && git commit -m "Add automation pipelines" && git push

# Vercel auto-deploys from push

# Test each endpoint
curl -s -X POST https://rightaichoice.com/api/cron/ingest-tools \
  -H "Authorization: Bearer YOUR_SECRET"
```

## Common Setup Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| 401 on all endpoints | CRON_SECRET missing from Vercel env vars | Add via `vercel env add` |
| 401 after adding secret | Secret set for wrong environment (Preview only, not Production) | Re-add for all environments |
| 401 with correct secret | Code imports from cached env module instead of `process.env` | Use `process.env.CRON_SECRET` directly |
| 500 on ingest-tools | Missing `ANTHROPIC_API_KEY` in Vercel | Add the API key |
| 500 on refresh-tools | Missing `SUPABASE_SERVICE_ROLE_KEY` | Add the service role key |
| GitHub Actions says "no matching schedule" | Workflow file not on default branch | Merge to main/master |
| Timeout (504) | Pipeline processing too many tools | Reduce batch size in code |

## Modifying the System

### Add a new pipeline:
1. Create the logic in `lib/cron/new-pipeline.ts`
2. Create the route at `app/api/cron/new-pipeline/route.ts` (copy existing pattern)
3. Add a new job to `.github/workflows/cron-pipelines.yml`
4. Add the option to the `workflow_dispatch` dropdown

### Change a schedule:
Edit the cron expression in `.github/workflows/cron-pipelines.yml` and update the `if` condition on the matching job.

### Change batch size:
Edit the `LIMIT` value in the SQL query within the pipeline's logic file (e.g., `lib/cron/refresh.ts` line 33).
