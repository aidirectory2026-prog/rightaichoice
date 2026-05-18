// Phase 8.d.3 — Pipeline logging wrapper.
//
// Wrap every /api/cron/* Route Handler and every GH-Actions-invoked
// script so each execution writes one row to public.pipeline_runs.
// Single source of truth for Knowledge Room's run lists, drilldown,
// cost tracker, freshness map, health score, and failure-alert dedup.
//
// Fail-loud policy: if the pipeline_runs insert fails, the wrapper
// throws — a Supabase outage takes crons offline, which is the
// intended signal. Silent logging failures = invisible drift, which
// violates the data-quality-is-the-business rule.

import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { validateCronSecret } from '@/lib/cron/auth'
import {
  estimateTokenCostUsd,
  type AnthropicModel,
  type DeepSeekModel,
} from './pricing'

type Source = 'vercel_cron' | 'gh_actions'
type Status = 'running' | 'success' | 'failure' | 'timeout' | 'partial'
type ErrorClass = 'timeout' | 'api_error' | 'db_error' | 'validation' | 'unknown'

export type PipelineCtx = {
  recordItems: (counts: { processed?: number; succeeded?: number; failed?: number }) => void
  recordTokens: (
    provider: 'deepseek' | 'anthropic',
    model: DeepSeekModel | AnthropicModel,
    counts: { in: number; out: number },
  ) => void
  recordApifyUsd: (usd: number) => void
  recordMetadata: (extras: Record<string, unknown>) => void
  setStatus: (status: 'success' | 'partial') => void
}

type WrapperOptions = {
  source: Source
  pipelineKey: string
  // GH Actions injects GITHUB_RUN_ID into the runner env. The script
  // variant reads it; the Vercel route variant ignores it.
  externalId?: string | null
}

export function withPipelineLogging<TResult>(
  options: WrapperOptions,
  handler: (ctx: PipelineCtx, request: Request) => Promise<TResult>,
): (request: Request) => Promise<NextResponse> {
  return async function wrapped(request: Request) {
    const result = await runWithLogging(options, (ctx) => handler(ctx, request))
    if (result.threw) {
      return NextResponse.json(
        { error: result.errorMessage, error_class: result.errorClass },
        { status: 500 },
      )
    }
    return NextResponse.json(result.handlerResult ?? { ok: true })
  }
}

// Convenience for the standard Vercel cron pattern: bearer-token auth
// followed by withPipelineLogging. Pre-auth failures (401) are NOT logged
// as pipeline runs — they're abuse attempts, not pipeline executions.
export function cronRoute<TResult>(
  options: { pipelineKey: string },
  handler: (ctx: PipelineCtx, request: Request) => Promise<TResult>,
): (request: Request) => Promise<NextResponse> {
  const wrapped = withPipelineLogging(
    { source: 'vercel_cron', pipelineKey: options.pipelineKey },
    handler,
  )
  return async (request: Request) => {
    const authError = validateCronSecret(request)
    if (authError) return authError
    return wrapped(request)
  }
}

// Same logging logic, callable from plain scripts (refresh-tools-batch,
// ingest-tools-batch, etc.) where there's no Request to wrap.
export async function runScriptedPipeline<TResult>(
  options: Omit<WrapperOptions, 'externalId'>,
  scriptedHandler: (ctx: PipelineCtx) => Promise<TResult>,
): Promise<TResult> {
  const externalId = process.env.GITHUB_RUN_ID ?? null
  const result = await runWithLogging({ ...options, externalId }, (ctx) =>
    scriptedHandler(ctx),
  )
  if (result.threw) {
    // Re-throw so script exits non-zero and GH Actions marks the job failed.
    throw result.thrown
  }
  return result.handlerResult as TResult
}

// ── Internal ───────────────────────────────────────────────────────

type RunResult<TResult> =
  | { threw: false; handlerResult: TResult | undefined }
  | { threw: true; thrown: unknown; errorMessage: string; errorClass: ErrorClass; handlerResult?: undefined }

async function runWithLogging<TResult>(
  options: WrapperOptions,
  handler: (ctx: PipelineCtx) => Promise<TResult>,
): Promise<RunResult<TResult>> {
  const db = getAdminClient()
  const startedAt = new Date()

  // ── Insert running row ─────────────────────────────────────────
  const insertRow = {
    source: options.source,
    pipeline_key: options.pipelineKey,
    external_id: options.externalId ?? null,
    started_at: startedAt.toISOString(),
    status: 'running' as Status,
  }
  const { data: inserted, error: insertErr } = await db
    .from('pipeline_runs')
    .insert(insertRow as never)
    .select('id')
    .single()

  if (insertErr || !inserted) {
    // Fail loud — see header comment.
    throw new Error(
      `withPipelineLogging: failed to insert running row for ${options.pipelineKey}: ${insertErr?.message ?? 'unknown'}`,
    )
  }
  const runId = (inserted as { id: string }).id

  // ── Accumulators populated via ctx.* ───────────────────────────
  const items = { processed: 0, succeeded: 0, failed: 0 }
  const tokens = { deepseekIn: 0, deepseekOut: 0, anthropicIn: 0, anthropicOut: 0 }
  let costUsd = 0
  let apifyUsd = 0
  const metadata: Record<string, unknown> = {}
  let manualStatus: 'success' | 'partial' | null = null

  const ctx: PipelineCtx = {
    recordItems(counts) {
      if (counts.processed !== undefined) items.processed += counts.processed
      if (counts.succeeded !== undefined) items.succeeded += counts.succeeded
      if (counts.failed !== undefined) items.failed += counts.failed
    },
    recordTokens(provider, model, counts) {
      if (provider === 'deepseek') {
        tokens.deepseekIn += counts.in
        tokens.deepseekOut += counts.out
      } else {
        tokens.anthropicIn += counts.in
        tokens.anthropicOut += counts.out
      }
      costUsd += estimateTokenCostUsd(model, counts.in, counts.out)
    },
    recordApifyUsd(usd) {
      apifyUsd += usd
      costUsd += usd
    },
    recordMetadata(extras) {
      Object.assign(metadata, extras)
    },
    setStatus(status) {
      manualStatus = status
    },
  }

  // ── Run the handler ────────────────────────────────────────────
  let handlerResult: TResult | undefined
  let thrown: unknown = null
  try {
    handlerResult = await handler(ctx)
  } catch (err) {
    thrown = err
  }

  // ── Compute final status + finalize ────────────────────────────
  const finishedAt = new Date()
  const durationMs = finishedAt.getTime() - startedAt.getTime()

  const finalStatus: Status = thrown ? 'failure' : (manualStatus ?? 'success')
  const errorMessage = thrown
    ? thrown instanceof Error
      ? thrown.message
      : String(thrown)
    : null
  const errorClass = thrown ? classifyError(thrown) : null

  const update = {
    finished_at: finishedAt.toISOString(),
    duration_ms: durationMs,
    status: finalStatus,
    error_message: errorMessage,
    error_class: errorClass,
    items_processed: items.processed,
    items_succeeded: items.succeeded,
    items_failed: items.failed,
    deepseek_tokens_in: tokens.deepseekIn,
    deepseek_tokens_out: tokens.deepseekOut,
    anthropic_tokens_in: tokens.anthropicIn,
    anthropic_tokens_out: tokens.anthropicOut,
    apify_usd: apifyUsd,
    estimated_cost_usd: Number(costUsd.toFixed(4)),
    metadata,
  }
  const { error: updateErr } = await db.from('pipeline_runs').update(update as never).eq('id', runId)
  if (updateErr) {
    // Fail loud — even if the handler succeeded, missing finish-record
    // means the run is invisible to alerts/health/cost downstream.
    throw new Error(
      `withPipelineLogging: failed to update finish row ${runId} for ${options.pipelineKey}: ${updateErr.message}`,
    )
  }

  if (thrown) {
    return {
      threw: true,
      thrown,
      errorMessage: errorMessage ?? 'unknown',
      errorClass: errorClass ?? 'unknown',
    }
  }
  return { threw: false, handlerResult }
}

function classifyError(err: unknown): ErrorClass {
  const message = err instanceof Error ? err.message : String(err)
  const name = err instanceof Error ? err.name : ''
  const lower = message.toLowerCase()
  if (
    name === 'AbortError' ||
    lower.includes('timeout') ||
    lower.includes('headerstimeouterror') ||
    lower.includes('und_err')
  )
    return 'timeout'
  if (lower.includes('validation') || lower.includes('zod') || lower.includes('parse error'))
    return 'validation'
  if (
    lower.includes('postgres') ||
    lower.includes('pgrst') ||
    lower.includes('row-level security') ||
    lower.includes('relation') ||
    lower.includes('column')
  )
    return 'db_error'
  if (
    lower.includes('fetch failed') ||
    lower.includes('http 4') ||
    lower.includes('http 5') ||
    lower.includes('econnrefused') ||
    lower.includes('socket') ||
    lower.includes('enotfound')
  )
    return 'api_error'
  return 'unknown'
}
