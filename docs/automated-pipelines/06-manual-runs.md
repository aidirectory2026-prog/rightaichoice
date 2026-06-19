# Manual Runs — How to Trigger Workflows On-Demand

## Via GitHub Actions UI (Recommended)

1. Go to your GitHub repo: `github.com/<your-username>/rightaichoice`
2. Click **Actions** tab
3. In the left sidebar, click **Automation Pipelines**
4. Click **Run workflow** (dropdown button, top right)
5. Select which pipeline to run:
   - `ingest-tools` — Discover and add new tools
   - `refresh-tools` — Refresh existing tool data
   - `refresh-faqs` — Regenerate FAQs from social sources
   - `generate-editorials` — Generate "Our Views" editorials
   - `discover-tutorials` — Find YouTube tutorials
   - `all` — Runs ALL pipelines simultaneously
6. Click the green **Run workflow** button

## Via GitHub CLI

If you have the `gh` CLI installed:

```bash
# Run a specific pipeline
gh workflow run "Automation Pipelines" -f pipeline=ingest-tools

# Run all pipelines
gh workflow run "Automation Pipelines" -f pipeline=all

# Check status of recent runs
gh run list --workflow="Automation Pipelines" --limit=5
```

## Via curl (Direct API Call)

You can call the Vercel API routes directly:

```bash
# Set your secret
export CRON_SECRET="your-secret-here"

# Ingest new tools
curl -X POST https://rightaichoice.com/api/cron/ingest-tools \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"

# Refresh tools
curl -X POST https://rightaichoice.com/api/cron/refresh-tools \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"

# Refresh FAQs
curl -X POST https://rightaichoice.com/api/cron/refresh-faqs \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"

# Generate editorials
curl -X POST https://rightaichoice.com/api/cron/generate-editorials \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"

# Discover tutorials
curl -X POST https://rightaichoice.com/api/cron/discover-tutorials \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

Each endpoint returns a JSON response with the run results:

```json
{
  "runId": "a1b2c3d4-...",
  "discovered": 150,
  "deduplicated": 12,
  "enriched": 12,
  "inserted": 10,
  "failed": 2
}
```

## Via curl (Verbose — See Full Response)

To debug issues, use verbose output:

```bash
curl -s -X POST https://rightaichoice.com/api/cron/ingest-tools \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  | python3 -m json.tool
```

## Common Scenarios

### "I just added CRON_SECRET and want to test"
```bash
curl -s -w "\nHTTP %{http_code}" -X POST \
  https://rightaichoice.com/api/cron/ingest-tools \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json"
```
Expected: HTTP 200 with JSON body. If HTTP 401, the secret doesn't match Vercel's env var.

### "I want to quickly populate all tools with editorials"
Run the editorial pipeline multiple times (each run processes 20 tools):
```bash
for i in {1..5}; do
  echo "Run $i..."
  curl -s -X POST https://rightaichoice.com/api/cron/generate-editorials \
    -H "Authorization: Bearer $CRON_SECRET" \
    -H "Content-Type: application/json"
  echo ""
  sleep 10  # Wait between runs to avoid overlap
done
```

### "I want to run everything right now"
Use the GitHub Actions UI and select `all`, or run each curl command in sequence.

## Important Notes

- Each pipeline has a **300-second (5-minute) timeout** on Vercel. If it times out, it processes whatever it could and stops — no data corruption.
- Running the same pipeline twice in a row is safe. Dedup prevents duplicate tools. FAQs are fully replaced. Editorials and tutorials are idempotent.
- The `runId` in the response lets you trace exactly what happened in the database logs.
