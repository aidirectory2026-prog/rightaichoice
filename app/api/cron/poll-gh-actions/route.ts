// Phase 8.d.4 (2026-05-18) — GH Actions → pipeline_runs sync.
//
// Every 10 min: pulls workflow_runs for both freshness-batch.yml and
// cron-pipelines.yml since the last sync checkpoint and upserts into
// pipeline_runs keyed by (source='gh_actions', external_id=run_id).
// For failed runs also fetches /runs/{id}/jobs to capture failed-step
// name + log URL into metadata, so Knowledge Room drilldown shows it
// without leaving the admin.
//
// Requires GITHUB_REPO_TOKEN — fine-grained PAT with `actions:read`
// scope only, on aidirectory2026-prog/rightaichoice. Set in Vercel env
// (Production + Preview). Without it the cron exits cleanly with a
// no-op status (visible in pipeline_runs as items_processed=0).
//
// Idempotency: this body is safe under concurrent execution WITHOUT an
// advisory lock. Every write is an UPSERT keyed by the unique index
// pipeline_runs_external_id_uniq (source, external_id) with
// onConflict: 'source,external_id'. If two poller fires overlap (the
// 10-min Vercel cron vs a manual trigger), both converge to the same
// row per GH run_id — last-write-wins on identical data, never a
// double-insert. No pg_try_advisory_lock needed. (Verified 2026-05-31.)

import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'

export const maxDuration = 60

const REPO_OWNER = 'aidirectory2026-prog'
const REPO_NAME = 'rightaichoice'
// H7 (Cowork QA): poll ALL workflows, not just two. nightly-verify,
// retry-failed-tools, sync-mentions and tracking-watchdog previously had no
// failure visibility in pipeline_runs / alerting.
const WORKFLOWS = [
  'freshness-batch.yml',
  'cron-pipelines.yml',
  'nightly-verify.yml',
  'retry-failed-tools.yml',
  'sync-mentions.yml',
  'tracking-watchdog.yml',
] as const
const PER_WORKFLOW_LIMIT = 50

type GhRun = {
  id: number
  name: string
  status: string
  conclusion: string | null
  display_title: string
  event: string
  created_at: string
  updated_at: string
  run_started_at: string
  html_url: string
  path: string
}

type GhJob = {
  id: number
  name: string
  conclusion: string | null
  html_url: string
  steps?: Array<{ name: string; conclusion: string | null }>
}

export const POST = cronRoute({ pipelineKey: 'poll-gh-actions' }, async (ctx) => {
  const token = process.env.GITHUB_REPO_TOKEN
  if (!token) {
    ctx.recordMetadata({ skipped: 'GITHUB_REPO_TOKEN not set' })
    return { ok: true, skipped: 'GITHUB_REPO_TOKEN not set' }
  }

  const db = getAdminClient()

  // Find latest synced GH run so we don't refetch the world every 10 min.
  const { data: latest } = await db
    .from('pipeline_runs')
    .select('created_at')
    .eq('source', 'gh_actions')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const sinceISO =
    (latest as { created_at: string } | null)?.created_at ??
    // First-ever sync: pull the last 24 hours of runs.
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const headers = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  let totalProcessed = 0
  let totalUpserted = 0
  let totalFailedRuns = 0
  const synced: Array<{ run_id: number; status: string; conclusion: string | null }> = []

  for (const workflowFile of WORKFLOWS) {
    const runsUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${workflowFile}/runs?per_page=${PER_WORKFLOW_LIMIT}&created=>${sinceISO}`
    const res = await fetch(runsUrl, { headers })
    if (!res.ok) {
      throw new Error(`GH API HTTP ${res.status} on ${workflowFile}`)
    }
    const json = (await res.json()) as { workflow_runs?: GhRun[] }
    const runs = json.workflow_runs ?? []
    totalProcessed += runs.length

    for (const run of runs) {
      const status =
        run.status !== 'completed'
          ? 'running'
          : run.conclusion === 'success'
            ? 'success'
            : run.conclusion === 'failure'
              ? 'failure'
              : run.conclusion === 'cancelled'
                ? 'failure'
                : 'success'

      const startedAt = run.run_started_at ?? run.created_at
      const finishedAt = run.status === 'completed' ? run.updated_at : null
      const durationMs =
        finishedAt && startedAt
          ? new Date(finishedAt).getTime() - new Date(startedAt).getTime()
          : null

      const metadata: Record<string, unknown> = {
        workflow_file: workflowFile,
        display_title: run.display_title,
        event: run.event,
        html_url: run.html_url,
      }

      // For failed runs, fetch jobs to capture the failed step + log URL.
      if (status === 'failure') {
        totalFailedRuns++
        try {
          const jobsRes = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs/${run.id}/jobs`,
            { headers },
          )
          if (jobsRes.ok) {
            const jobsJson = (await jobsRes.json()) as { jobs?: GhJob[] }
            const failedJob = (jobsJson.jobs ?? []).find((j) => j.conclusion === 'failure')
            if (failedJob) {
              const failedStep = (failedJob.steps ?? []).find((s) => s.conclusion === 'failure')
              metadata.failed_job = failedJob.name
              metadata.failed_step = failedStep?.name ?? null
              metadata.log_url = failedJob.html_url
            }
          }
        } catch {
          // Job fetch is best-effort; missing detail shouldn't kill the sync.
        }
      }

      // pipeline_key shape: `<workflow_base>/<job_name_or_run>` — we don't
      // know the per-job split here (one workflow can have N jobs); use
      // the workflow filename as the key and stash job names in metadata.
      const pipelineKey = workflowFile.replace('.yml', '')

      const upsertRow: Record<string, unknown> = {
        source: 'gh_actions',
        pipeline_key: pipelineKey,
        external_id: String(run.id),
        started_at: startedAt,
        finished_at: finishedAt,
        duration_ms: durationMs,
        status,
        error_message: status === 'failure' ? (metadata.failed_step as string | null) ?? 'workflow run failed' : null,
        error_class: status === 'failure' ? 'unknown' : null,
        items_processed: 1,
        items_succeeded: status === 'success' ? 1 : 0,
        items_failed: status === 'failure' ? 1 : 0,
        metadata,
      }

      const { error } = await db
        .from('pipeline_runs')
        .upsert(upsertRow as never, { onConflict: 'source,external_id' })

      if (error) {
        throw new Error(`upsert run ${run.id}: ${error.message}`)
      }
      totalUpserted++
      synced.push({ run_id: run.id, status, conclusion: run.conclusion })
    }
  }

  // Phase 10 #4.3 — reconcile rows still 'running' from earlier polls. The
  // checkpoint (created>sinceISO) only pulls NEW runs, so a run that was
  // 'running' when first synced and completed AFTER the checkpoint advanced past
  // it would never be updated — the root cause of the stuck-row leak. Re-fetch
  // each still-running run by id and settle it to its terminal state. (The
  // pg_cron sweeper is the backstop for runs GH no longer returns.)
  let reconciled = 0
  const { data: stillRunning } = await db
    .from('pipeline_runs')
    .select('external_id')
    .eq('source', 'gh_actions')
    .eq('status', 'running')
    .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(50)
  for (const r of (stillRunning ?? []) as Array<{ external_id: string }>) {
    if (!r.external_id) continue
    try {
      const rr = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs/${r.external_id}`,
        { headers },
      )
      if (!rr.ok) continue
      const run = (await rr.json()) as GhRun
      if (run.status !== 'completed') continue
      const settled =
        run.conclusion === 'success' ? 'success'
          : run.conclusion === 'failure' || run.conclusion === 'cancelled' ? 'failure'
            : 'success'
      const finishedAt = run.updated_at
      await db
        .from('pipeline_runs')
        .update({
          status: settled,
          finished_at: finishedAt,
          duration_ms: run.run_started_at
            ? new Date(finishedAt).getTime() - new Date(run.run_started_at).getTime()
            : null,
          items_succeeded: settled === 'success' ? 1 : 0,
          items_failed: settled === 'failure' ? 1 : 0,
        } as never)
        .eq('source', 'gh_actions')
        .eq('external_id', String(run.id))
      reconciled++
    } catch {
      // best-effort; the pg_cron sweeper backstops anything missed
    }
  }

  ctx.recordItems({
    processed: totalProcessed,
    succeeded: totalUpserted,
    failed: totalProcessed - totalUpserted,
  })
  ctx.recordMetadata({
    since: sinceISO,
    failed_runs: totalFailedRuns,
    reconciled_running: reconciled,
    synced_run_ids: synced.slice(0, 10),
  })

  return {
    ok: true,
    since: sinceISO,
    processed: totalProcessed,
    upserted: totalUpserted,
    failed_runs: totalFailedRuns,
    reconciled_running: reconciled,
  }
})

// Phase 10 OPT-2 — moved to a NATIVE Vercel cron (vercel.json) because GitHub
// Actions silently throttles/drops frequent schedules. Vercel fires GET.
export const GET = POST
