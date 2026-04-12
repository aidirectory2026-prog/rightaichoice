'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, Search, ArrowRight, RefreshCw } from 'lucide-react'
import { SentimentBlockRender } from './sentiment-block-render'

type Status = 'idle' | 'generating' | 'ready' | 'failed'

type Props = {
  slug: string
  toolName: string
  autoGenerate: boolean
  initialStatus: Status
}

const POLL_INTERVAL_MS = 4000
const MAX_POLL_MS = 150_000

export function SentimentBlockClient({ slug, toolName, autoGenerate, initialStatus }: Props) {
  const [status, setStatus] = useState<Status>(initialStatus)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reportData, setReportData] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!autoGenerate) return
    if (startedRef.current) return
    if (status === 'ready' || status === 'failed') return
    startedRef.current = true
    void kickOff()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function kickOff() {
    setStatus('generating')
    setErrorMsg(null)
    try {
      await fetch(`/api/tools/${slug}/report/generate`, { method: 'POST' })
    } catch {
      // Ignore — polling will surface the final state
    }
    void pollUntilDone()
  }

  async function pollUntilDone() {
    const start = Date.now()
    while (Date.now() - start < MAX_POLL_MS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      try {
        const res = await fetch(`/api/tools/${slug}/report`)
        const json = await res.json()
        if (json.status === 'ready' && json.report) {
          setReportData(json.report)
          setStatus('ready')
          return
        }
        if (json.status === 'not_generated') {
          // Not triggered yet somehow — stop
          setStatus('idle')
          return
        }
      } catch {
        // Transient — keep polling
      }
    }
    setStatus('failed')
    setErrorMsg('Generation timed out. Please try again.')
  }

  // Cache ready — render the full block
  if (status === 'ready' && reportData) {
    return (
      <SentimentBlockRender
        data={{
          ai_verdict: reportData.ai_verdict,
          pros: reportData.pros,
          cons: reportData.cons,
          sentiment_score: reportData.sentiment_score,
          sentiment_breakdown: reportData.sentiment_breakdown,
          themes: reportData.themes,
          learning_curve: reportData.learning_curve,
          pricing_analysis: reportData.pricing_analysis,
          mention_count: reportData.mention_count,
          sources_scraped: reportData.sources_scraped,
        }}
        slug={slug}
        toolName={toolName}
      />
    )
  }

  // Generating state
  if (status === 'generating') {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />
          <div>
            <div className="text-sm font-semibold text-white">
              Gathering community sentiment for {toolName}…
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Scraping Reddit · X · Quora · G2 and synthesizing — usually ~60–90 seconds.
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Failed state
  if (status === 'failed') {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">Couldn&apos;t gather community data</div>
            <div className="text-xs text-zinc-500 mt-0.5">{errorMsg ?? 'Something went wrong.'}</div>
          </div>
          <button
            onClick={() => {
              startedRef.current = false
              void kickOff()
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      </section>
    )
  }

  // Idle state — manual CTA (low-traffic tools)
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Search className="h-5 w-5 text-cyan-400 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-white">What people are saying about {toolName}</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              See synthesized pros/cons, sentiment, themes and hidden costs from Reddit, X, Quora & G2.
            </div>
          </div>
        </div>
        <button
          onClick={() => void kickOff()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:border-emerald-600 transition-colors"
        >
          Generate <ArrowRight className="h-3 w-3" />
        </button>
      </div>
      <div className="mt-3 text-[11px] text-zinc-600">
        Or jump directly to the{' '}
        <Link href={`/tools/${slug}/report`} className="text-emerald-400 hover:text-emerald-300">
          full report page
        </Link>
        .
      </div>
    </section>
  )
}
