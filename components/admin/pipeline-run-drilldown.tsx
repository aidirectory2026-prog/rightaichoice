'use client'

// Phase 8.d.5 (2026-05-18) — expandable drilldown for a pipeline_runs row.
// Click anywhere on the row to toggle the detail panel showing
// error_class + error_message + metadata.failed_step / log_url / etc.

import { useState } from 'react'
import { ChevronRight, ExternalLink } from 'lucide-react'

type PipelineRunRow = {
  id: string
  source: 'vercel_cron' | 'gh_actions'
  pipeline_key: string
  status: 'running' | 'success' | 'failure' | 'timeout' | 'partial'
  started_at: string
  duration_ms: number | null
  items_processed: number
  items_succeeded: number
  items_failed: number
  error_message: string | null
  error_class: string | null
  metadata: Record<string, unknown> | null
}

function ago(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const h = Math.floor(diffMin / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function durationLabel(ms: number | null): string {
  if (ms == null) return ''
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
}

export function PipelineRunRow({ run }: { run: PipelineRunRow }) {
  const [open, setOpen] = useState(false)
  const isFailure = run.status === 'failure' || run.status === 'timeout'
  const isPartial = run.status === 'partial'

  const dot =
    run.status === 'running'
      ? 'text-amber-400'
      : run.status === 'success'
        ? 'text-emerald-400'
        : isPartial
          ? 'text-amber-400'
          : 'text-rose-400'

  const meta = run.metadata ?? {}
  const failedStep = (meta as { failed_step?: string }).failed_step
  const logUrl = (meta as { log_url?: string; html_url?: string }).log_url ?? (meta as { html_url?: string }).html_url
  const displayTitle = (meta as { display_title?: string }).display_title

  return (
    <li className="text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 py-1 px-1 -mx-1 rounded hover:bg-zinc-800/30 text-left"
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          <ChevronRight
            className={`h-3 w-3 shrink-0 text-zinc-600 transition-transform ${open ? 'rotate-90' : ''}`}
          />
          <span className={`shrink-0 ${dot}`}>●</span>
          <span className="text-zinc-300 truncate">
            {run.pipeline_key}
            {displayTitle && displayTitle !== run.pipeline_key && (
              <span className="text-zinc-600"> · {displayTitle}</span>
            )}
          </span>
        </span>
        <span className="shrink-0 flex items-center gap-2 text-[11px]">
          <span className="text-zinc-600">{durationLabel(run.duration_ms)}</span>
          <span className="text-zinc-500">{ago(run.started_at)}</span>
        </span>
      </button>

      {open && (
        <div className="ml-6 mt-1 mb-2 px-3 py-2 rounded border border-zinc-800/80 bg-zinc-950/60 space-y-2">
          <div className="grid grid-cols-3 gap-2 text-[11px] text-zinc-400">
            <Stat label="Processed" value={run.items_processed} />
            <Stat label="Succeeded" value={run.items_succeeded} />
            <Stat label="Failed" value={run.items_failed} highlight={run.items_failed > 0} />
          </div>

          {(isFailure || isPartial) && (run.error_message || run.error_class) && (
            <div className="text-[11px]">
              <div className="text-rose-400 font-medium mb-0.5">
                {run.error_class && (
                  <span className="uppercase tracking-wider mr-2 px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-300 text-[10px]">
                    {run.error_class}
                  </span>
                )}
                {failedStep && <span className="text-zinc-400">failed at: {failedStep}</span>}
              </div>
              {run.error_message && (
                <pre className="text-zinc-400 whitespace-pre-wrap font-mono text-[10px] leading-snug max-h-40 overflow-auto">
                  {run.error_message}
                </pre>
              )}
            </div>
          )}

          {logUrl && (
            <a
              href={logUrl}
              target="_blank"
              rel="noopener"
              className="text-[11px] text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
            >
              View logs <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {Object.keys(meta).length > 0 && (
            <details className="text-[10px]">
              <summary className="text-zinc-500 cursor-pointer hover:text-zinc-400">raw metadata</summary>
              <pre className="text-zinc-600 mt-1 font-mono whitespace-pre-wrap max-h-40 overflow-auto">
                {JSON.stringify(meta, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </li>
  )
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded border border-zinc-800/60 px-2 py-1">
      <div className="text-[10px] text-zinc-500">{label}</div>
      <div className={`tabular-nums font-semibold ${highlight ? 'text-rose-300' : 'text-zinc-200'}`}>
        {value.toLocaleString()}
      </div>
    </div>
  )
}
