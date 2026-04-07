# Tracking & Monitoring

## Where to Check Pipeline Health

### 1. GitHub Actions — Run History
**URL:** `github.com/<your-username>/rightaichoice/actions`

Shows:
- Green checkmark = pipeline returned HTTP 200
- Red X = pipeline returned non-200 or timed out
- Click any run to see the curl output and HTTP status code

### 2. Supabase Dashboard — Log Tables
**URL:** `supabase.com/dashboard/project/<project-id>/editor`

Two dedicated log tables track everything:

#### `ingestion_logs` — Tool Ingestion History
```sql
-- See all runs, newest first
SELECT run_id, COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'inserted') as inserted,
  COUNT(*) FILTER (WHERE status = 'duplicate') as duplicates,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  MIN(created_at) as started_at
FROM ingestion_logs
GROUP BY run_id
ORDER BY started_at DESC
LIMIT 10;
```

```sql
-- See failures for a specific run
SELECT tool_name, error_message, created_at
FROM ingestion_logs
WHERE run_id = '<run_id>' AND status = 'failed'
ORDER BY created_at;
```

```sql
-- See all tools ingested today
SELECT tool_name, tool_slug, source, status, created_at
FROM ingestion_logs
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC;
```

#### `refresh_logs` — Tool Refresh History
```sql
-- See refresh run summaries
SELECT run_id,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'refreshed') as refreshed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(duration_ms) as avg_duration_ms,
  MIN(created_at) as started_at
FROM refresh_logs
GROUP BY run_id
ORDER BY started_at DESC
LIMIT 10;
```

```sql
-- See which fields were updated for each tool
SELECT tool_slug, fields_updated, duration_ms, status
FROM refresh_logs
WHERE run_id = '<run_id>'
ORDER BY created_at;
```

### 3. Tools Table — Freshness Indicators

```sql
-- Tools that haven't been refreshed in over 30 days
SELECT name, slug, last_verified_at,
  now() - last_verified_at as stale_for
FROM tools
WHERE is_published = true
ORDER BY last_verified_at ASC NULLS FIRST
LIMIT 20;
```

```sql
-- Tools missing editorial content
SELECT name, slug FROM tools
WHERE is_published = true AND our_views IS NULL;
```

```sql
-- Tools missing tutorials
SELECT name, slug FROM tools
WHERE is_published = true
  AND (tutorial_videos IS NULL OR tutorial_videos = '[]'::jsonb);
```

```sql
-- Tools missing FAQs
SELECT t.name, t.slug
FROM tools t
LEFT JOIN tool_faqs f ON f.tool_id = t.id
WHERE t.is_published = true
GROUP BY t.id, t.name, t.slug
HAVING COUNT(f.id) = 0;
```

### 4. Vercel Logs — Real-time Function Logs
**URL:** `vercel.com/dashboard` -> Your project -> **Logs** tab

Shows:
- All `console.log` and `console.error` output from the pipeline functions
- Filter by: `/api/cron/` to see only pipeline logs
- Look for lines like: `[ingest:abc123] Discovered 150 tools`
- Error stack traces for debugging

## Quick Health Dashboard Queries

Run these in Supabase SQL Editor for a complete health overview:

```sql
-- PIPELINE HEALTH DASHBOARD
-- Last run of each pipeline type
WITH ingestion AS (
  SELECT 'ingest-tools' as pipeline,
    MAX(created_at) as last_run,
    COUNT(*) FILTER (WHERE status = 'inserted') as success_count
  FROM ingestion_logs
  WHERE created_at > now() - interval '7 days'
),
refresh AS (
  SELECT 'refresh-tools' as pipeline,
    MAX(created_at) as last_run,
    COUNT(*) FILTER (WHERE status = 'refreshed') as success_count
  FROM refresh_logs
  WHERE created_at > now() - interval '7 days'
),
faqs AS (
  SELECT 'refresh-faqs' as pipeline,
    MAX(updated_at) as last_run,
    COUNT(*) as success_count
  FROM tool_faqs
  WHERE updated_at > now() - interval '7 days'
),
editorials AS (
  SELECT 'generate-editorials' as pipeline,
    MAX(our_views_generated_at) as last_run,
    COUNT(*) as success_count
  FROM tools
  WHERE our_views_generated_at > now() - interval '7 days'
)
SELECT * FROM ingestion
UNION ALL SELECT * FROM refresh
UNION ALL SELECT * FROM faqs
UNION ALL SELECT * FROM editorials;
```

## Alerting

GitHub Actions sends email notifications for failed workflow runs by default. To customize:

1. Go to GitHub -> Settings -> Notifications
2. Under "Actions", configure when to receive alerts
3. You'll get an email whenever a pipeline returns non-200

For more advanced alerting, you could add a Slack webhook step to the GitHub Actions workflow:
```yaml
- name: Notify on failure
  if: failure()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -H "Content-Type: application/json" \
      -d '{"text": "Pipeline failed: ${{ github.job }}"}'
```

## Cleanup — Managing Log Table Size

Over time, log tables will grow. Run these periodically to clean up old entries:

```sql
-- Delete ingestion logs older than 90 days
DELETE FROM ingestion_logs WHERE created_at < now() - interval '90 days';

-- Delete refresh logs older than 90 days
DELETE FROM refresh_logs WHERE created_at < now() - interval '90 days';
```

Consider setting up a monthly cleanup cron if log volume becomes significant.
