'use client'

// Phase 9 S6 (round 3) — dedicated Market Sentiment page for a tool.
// Distinct from the tool page: leads with a sentiment "pulse" dashboard + a
// real-time LIVE MENTIONS feed (actual scraped posts with links + dates), then
// reframed praise/gripes/quotes/themes/red-flags. Sign-up gates 3 free scans;
// then ₹20 (Razorpay) / $1 (PayPal). Full report is downloadable.

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Sparkles, Loader2, ShieldCheck, Zap, Lock, Download, ArrowLeft, ArrowRight,
  MessageSquareText, Flame, ThumbsUp, ThumbsDown, Quote, AlertTriangle, Radar, ExternalLink,
  Gauge, TrendingUp, TrendingDown, Activity, Users, UserMinus, BookOpen, ShieldAlert,
  HelpCircle, Database,
} from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { signInWithOAuthClient } from '@/lib/auth/oauth-client'
import { GoogleIcon } from '@/components/shared/google-icon'
import { analytics } from '@/lib/analytics'
import { SourceIcon } from '@/components/tools/source-icon'
import { SentimentDonut, SourceSentimentBars, ThemeBars, MomentumSparkline } from '@/components/tools/sentiment-charts'
import { overallPositivity } from '@/lib/sentiment/chart-geometry'
import type { SentimentPdfData } from '@/components/tools/sentiment-report-pdf'

type Pricing = { currency: 'INR' | 'USD'; gateway: 'razorpay' | 'paypal'; amountMinor: number; amountDisplay: string; country: string }
type Mention = { source: string; title: string; snippet: string; date: string | null; url: string | null; score: number | null }
type SourceBreak = { source: string; label: string; count: number; positivity: number | null }
type Report = {
  ai_verdict: string
  bottom_line?: string
  standout_quotes?: { text: string; source: string; sentiment?: 'positive' | 'critical' | 'mixed'; date?: string }[]
  scorecard?: { overall: number; value: number; ease_of_use: number; support: number; reliability: number; performance: number }
  red_flags?: { title: string; detail: string; severity: 'low' | 'medium' | 'high' }[]
  momentum?: { direction: 'rising' | 'steady' | 'cooling'; summary: string; drivers: string[] }
  pros: string[]
  cons: string[]
  sentiment_score: 'positive' | 'mixed' | 'negative'
  sentiment_breakdown?: Record<string, number>
  themes?: { theme: string; sources: string[]; sentiment?: 'positive' | 'mixed' | 'critical' }[]
  faqs?: { q: string; a: string }[]
  best_for?: string[]
  not_for?: string[]
  learning_curve?: { time_to_start?: string; skill_level?: string; hurdles?: string[] }
  community_buzz?: { volume?: string; trend?: string; topics?: string[] }
  pricing_analysis?: { hidden_costs?: string[]; verdict?: string }
  source_breakdown?: SourceBreak[]
  mentions?: Mention[]
}
type Status = {
  authed: boolean
  pricing: Pricing
  paymentsLive?: boolean
  freeLimit?: number
  quota?: { freeRemaining: number; freeLimit: number; paidBalance: number; canScanFree: boolean }
  lastResult?: { report: Report; sources: string[]; mention_count: number; created_at: string } | null
}
type Phase = 'idle' | 'signin' | 'scanning' | 'report' | 'paywall' | 'paying'

const SCAN_STAGES = [
  'Sweeping social platforms & communities',
  'Collecting reviews, ratings & complaints',
  'Reading real user discussions',
  'Analyzing video & written opinions',
  'Synthesizing your report',
]

// TEMP admin-only `?paytest=` passthrough: if the page URL carries it, forward
// it to the status + scan calls so the server-side admin override can force a
// gateway/region for testing. No-op for normal visitors (param absent).
function payTestSuffix(): string {
  if (typeof window === 'undefined') return ''
  const p = new URLSearchParams(window.location.search).get('paytest')
  return p ? `?paytest=${encodeURIComponent(p)}` : ''
}

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve(true)
    const s = document.createElement('script')
    s.src = src; s.onload = () => resolve(true); s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (!t) return ''
  const d = Math.floor((Date.now() - t) / 1000)
  if (d < 3600) return `${Math.max(1, Math.floor(d / 60))}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  if (d < 2592000) return `${Math.floor(d / 86400)}d ago`
  return `${Math.floor(d / 2592000)}mo ago`
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

function buildReportHtml(report: Report, toolName: string, meta: { mention_count: number } | null): string {
  const li = (arr?: string[]) => (arr ?? []).map((x) => `<li>${esc(x)}</li>`).join('')
  const date = new Date().toLocaleString()
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(toolName)} — Market Sentiment Report</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:780px;margin:40px auto;padding:0 24px;color:#18181b;line-height:1.6}
h1{font-size:26px;margin:0 0 4px}h2{font-size:16px;margin:26px 0 8px;border-bottom:2px solid #10b981;padding-bottom:4px;color:#065f46}
.muted{color:#71717a;font-size:13px}.badge{display:inline-block;background:#10b981;color:#fff;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600;text-transform:uppercase}
.bl{background:#ecfdf5;border-left:4px solid #10b981;padding:12px 16px;border-radius:8px;margin:12px 0;font-weight:600}
ul{margin:6px 0;padding-left:20px}.q{border-left:3px solid #d4d4d8;padding-left:12px;color:#3f3f46;font-style:italic;margin:10px 0}
.m{border:1px solid #e4e4e7;border-radius:8px;padding:10px 12px;margin:8px 0}.m .src{font-size:11px;color:#059669;font-weight:600}
.grid{display:flex;gap:20px}.grid>div{flex:1}footer{margin-top:40px;color:#a1a1aa;font-size:11px;border-top:1px solid #e4e4e7;padding-top:12px}</style></head><body>
<h1>${esc(toolName)} — Market Sentiment Report</h1>
<div class="muted">Live synthesis of real user opinion across the web · <span class="badge">${esc(report.sentiment_score)}</span> · ${meta ? esc(meta.mention_count) + ' data points' : ''} · ${date}</div>
${report.bottom_line ? `<div class="bl">${esc(report.bottom_line)}</div>` : ''}
<h2>Executive summary</h2><p>${esc(report.ai_verdict)}</p>
<div class="grid"><div><h2>The praise</h2><ul>${li(report.pros)}</ul></div><div><h2>The gripes</h2><ul>${li(report.cons)}</ul></div></div>
${report.standout_quotes?.length ? `<h2>In their words</h2>${report.standout_quotes.map((q) => `<div class="q">"${esc(q.text)}" <span class="muted">— ${esc(q.source)}</span></div>`).join('')}` : ''}
${report.themes?.length ? `<h2>Recurring themes</h2><ul>${li(report.themes.map((t) => t.theme))}</ul>` : ''}
${report.pricing_analysis?.hidden_costs?.length ? `<h2>Red flags &amp; hidden costs</h2><ul>${li(report.pricing_analysis.hidden_costs)}</ul>` : ''}
${report.mentions?.length ? `<h2>Live mentions (${report.mentions.length})</h2>${report.mentions.map((m) => `<div class="m"><div class="src">${esc(m.source)}${m.date ? ' · ' + esc(new Date(m.date).toLocaleDateString()) : ''}</div>${m.title ? `<strong>${esc(m.title)}</strong><br>` : ''}${esc(m.snippet)}${m.url ? `<br><a href="${esc(m.url)}">${esc(m.url)}</a>` : ''}</div>`).join('')}` : ''}
<footer>Generated by RightAIChoice — Market Sentiment Checker. Synthesized from public user opinion; provided as-is for research.</footer></body></html>`
}

export function SentimentReportPage({ toolSlug, toolName }: { toolSlug: string; toolName: string }) {
  const { user } = useAuth()
  const [phase, setPhase] = useState<Phase>('idle')
  const [status, setStatus] = useState<Status | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [resultMeta, setResultMeta] = useState<{ sources: string[]; mention_count: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stageIdx, setStageIdx] = useState(0)
  const paypalRef = useRef<HTMLDivElement>(null)

  const refreshStatus = useCallback(async () => {
    try {
      const r = await fetch(`/api/tools/${toolSlug}/sentiment-checker/status${payTestSuffix()}`)
      if (r.ok) setStatus((await r.json()) as Status)
    } catch { /* ignore */ }
  }, [toolSlug])

  useEffect(() => {
    analytics.sentimentCardViewed(toolSlug)
    void refreshStatus()
  }, [toolSlug, refreshStatus])

  useEffect(() => {
    if (phase !== 'scanning') return
    const t = setInterval(() => setStageIdx((i) => Math.min(i + 1, SCAN_STAGES.length - 1)), 7000)
    return () => clearInterval(t)
  }, [phase])

  const runScan = useCallback(async () => {
    if (!user) { setPhase('signin'); return }
    // Don't tease a scan we already know the server will refuse for payment.
    // If the user has no free scans left and no paid balance, go straight to
    // the paywall instead of playing the scanning animation for a couple of
    // seconds and then yanking it away (which reads as a bug).
    const q = status?.quota
    if (q && !q.canScanFree && q.paidBalance <= 0) { setError(null); setPhase('paywall'); return }
    setError(null); setStageIdx(0); setPhase('scanning')
    analytics.sentimentScanStarted(toolSlug, status?.quota?.canScanFree ? 'free' : 'paid')
    try {
      const r = await fetch(`/api/tools/${toolSlug}/sentiment-checker/scan${payTestSuffix()}`, { method: 'POST' })
      if (r.status === 401) { setPhase('signin'); return }
      if (r.status === 402) {
        const data = (await r.json()) as { pricing: Pricing }
        setStatus((s) => (s ? { ...s, pricing: data.pricing } : s)); setPhase('paywall'); return
      }
      if (!r.ok) { setError('The scan could not complete. Please try again.'); setPhase('idle'); return }
      const data = (await r.json()) as { report: Report; sources: string[]; mention_count: number }
      setReport(data.report); setResultMeta({ sources: data.sources, mention_count: data.mention_count })
      setPhase('report')
      analytics.sentimentResultViewed(toolSlug, data.report.sentiment_score, 'fresh')
      void refreshStatus()
    } catch { setError('Network error. Please try again.'); setPhase('idle') }
  }, [user, toolSlug, status, refreshStatus])

  const download = useCallback(async () => {
    if (!report) return
    try {
      // react-pdf is heavy → dynamic-import only on click (keeps it out of the bundle).
      const { downloadSentimentPdf } = await import('@/components/tools/sentiment-report-pdf')
      await downloadSentimentPdf(report as unknown as SentimentPdfData, toolName, toolSlug)
    } catch {
      // Never leave the user empty-handed — fall back to the standalone HTML file.
      const blob = new Blob([buildReportHtml(report, toolName, resultMeta)], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${toolSlug}-sentiment-report.html`
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    }
  }, [report, toolName, resultMeta, toolSlug])

  const payRazorpay = useCallback(async () => {
    analytics.sentimentPayClicked(toolSlug, 'razorpay'); setPhase('paying')
    const ok = await loadScript('https://checkout.razorpay.com/v1/checkout.js')
    if (!ok) { setError('Could not load the payment widget.'); setPhase('paywall'); return }
    try {
      const order = await fetch('/api/payments/razorpay/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tool_slug: toolSlug }) }).then((r) => r.json())
      if (order.error) { setError('Payment could not be started.'); setPhase('paywall'); return }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay({
        key: order.key_id, amount: order.amount_minor, currency: order.currency, order_id: order.order_id,
        name: 'RightAIChoice', description: `Sentiment scan — ${toolName}`, theme: { color: '#10b981' },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const v = await fetch('/api/payments/razorpay/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payment_id: order.payment_id, ...resp }) }).then((r) => r.json())
          if (v.ok) { await refreshStatus(); void runScan() } else { setError('Payment verification failed.'); setPhase('paywall') }
        },
        modal: { ondismiss: () => setPhase('paywall') },
      })
      rzp.open()
    } catch { setError('Payment failed to start.'); setPhase('paywall') }
  }, [toolSlug, toolName, refreshStatus, runScan])

  useEffect(() => {
    if (phase !== 'paywall' || status?.pricing.gateway !== 'paypal' || !status?.paymentsLive) return
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    if (!clientId || !paypalRef.current) return
    let cancelled = false
    void (async () => {
      const ok = await loadScript(`https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paypal = (window as any).paypal
      if (!ok || !paypal || cancelled || !paypalRef.current) return
      paypalRef.current.replaceChildren()
      paypal.Buttons({
        style: { color: 'gold', shape: 'pill', height: 44, label: 'pay' },
        createOrder: async () => {
          analytics.sentimentPayClicked(toolSlug, 'paypal')
          const o = await fetch('/api/payments/paypal/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tool_slug: toolSlug }) }).then((r) => r.json())
          paypalRef.current?.setAttribute('data-payment-id', o.payment_id)
          return o.order_id
        },
        onApprove: async (data: { orderID: string }) => {
          const paymentId = paypalRef.current?.getAttribute('data-payment-id')
          const c = await fetch('/api/payments/paypal/capture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payment_id: paymentId, order_id: data.orderID }) }).then((r) => r.json())
          if (c.ok) { await refreshStatus(); void runScan() } else setError('Payment could not be captured.')
        },
      }).render(paypalRef.current)
    })()
    return () => { cancelled = true }
  }, [phase, status?.pricing.gateway, status?.paymentsLive, toolSlug, refreshStatus, runScan])

  const freeLeft = status?.quota?.freeRemaining ?? null
  const freeLimit = status?.quota?.freeLimit ?? status?.freeLimit ?? 5
  const price = status?.pricing.amountDisplay ?? '₹20 / $1'
  const lastResult = status?.lastResult

  return (
    <div className="space-y-6">
      <Link href={`/tools/${toolSlug}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to {toolName}</Link>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/50 via-zinc-950 to-zinc-950 p-7 shadow-[0_0_50px_-12px_rgba(16,185,129,0.3)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <span className="relative inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
          <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" /></span>
          LIVE MARKET SENTIMENT
        </span>
        <h1 className="relative mt-3 text-3xl font-bold tracking-tight text-white">What people really think about {toolName}</h1>
        <p className="relative mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          A real-time sweep of the open web — social media, forums, review sites, video reviews and live community
          discussions — distilled into one honest verdict with the actual mentions behind it.
        </p>
        <div className="relative mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-emerald-400" /> Real-time</span>
          <span className="inline-flex items-center gap-1.5"><Radar className="h-3.5 w-3.5 text-emerald-400" /> Live mentions</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Unbiased</span>
          <span className="inline-flex items-center gap-1.5"><Download className="h-3.5 w-3.5 text-emerald-400" /> Downloadable</span>
        </div>

        {(phase === 'idle' || phase === 'report') && (
          <div className="relative mt-6 flex flex-wrap items-center gap-3">
            <button onClick={runScan} className="group inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-emerald-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400">
              {!user ? <Lock className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {!user ? `Sign up free — unlock ${freeLimit} scans` : phase === 'report' ? 'Run a fresh scan' : freeLeft !== null && freeLeft <= 0 ? `Run a scan — ${price}` : 'Run my free sentiment scan'}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </button>
            {freeLeft !== null && freeLeft > 0 && <span className="text-xs text-zinc-400">{freeLeft} free {freeLeft === 1 ? 'scan' : 'scans'} left · then {price}</span>}
            {!user && <span className="text-xs text-zinc-500">No card needed</span>}
            {phase === 'idle' && lastResult && (
              <button onClick={() => { setReport(lastResult.report); setResultMeta({ sources: lastResult.sources, mention_count: lastResult.mention_count }); setPhase('report') }} className="text-sm font-medium text-emerald-300 hover:text-emerald-200">View last report →</button>
            )}
          </div>
        )}
        {error && phase === 'idle' && <p className="relative mt-3 text-xs text-red-400">{error}</p>}
      </div>

      {phase === 'idle' && <IdleLanding toolName={toolName} onScan={runScan} authed={!!user} freeLeft={freeLeft} freeLimit={freeLimit} price={price} />}

      {phase === 'signin' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Create a free account to unlock your {freeLimit} scans</h2>
          <p className="mt-1 text-sm text-zinc-400">Takes a few seconds — no card, no spam.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:max-w-md">
            <button onClick={() => signInWithOAuthClient('google', typeof window !== 'undefined' ? window.location.pathname : null)} className="flex flex-1 items-center justify-center gap-2.5 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"><GoogleIcon /> Continue with Google</button>
            <button onClick={() => signInWithOAuthClient('linkedin_oidc', typeof window !== 'undefined' ? window.location.pathname : null)} className="flex flex-1 items-center justify-center gap-2.5 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800">Continue with LinkedIn</button>
          </div>
        </div>
      )}

      {phase === 'scanning' && (
        <div className="rounded-2xl border border-emerald-500/20 bg-zinc-900/60 p-6">
          <div className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-emerald-400" /><h2 className="text-lg font-semibold text-white">Scanning the web for honest opinions…</h2></div>
          <div className="mt-4 space-y-2.5">
            {SCAN_STAGES.map((s, i) => (
              <div key={s} className={`flex items-center gap-2.5 text-sm transition ${i < stageIdx ? 'text-emerald-400' : i === stageIdx ? 'text-white' : 'text-zinc-600'}`}>
                {i < stageIdx ? <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] text-emerald-400">✓</span> : i === stageIdx ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="h-4 w-4 rounded-full border border-zinc-700" />}{s}
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-zinc-500">Hang tight — usually 30–60 seconds.</p>
        </div>
      )}

      {phase === 'report' && report && <ReportBody report={report} toolName={toolName} meta={resultMeta} onDownload={download} />}

      {(phase === 'paywall' || phase === 'paying') && status && (
        status.paymentsLive ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-zinc-900/60 p-6">
            <h2 className="text-lg font-semibold text-white">You&apos;ve used your {status.quota?.freeLimit ?? freeLimit} free scans 🎉</h2>
            <p className="mt-1 text-sm text-zinc-400">Unlock another full, downloadable report of {toolName} for <span className="font-semibold text-white">{price}</span> — one-time, no subscription.</p>
            <div className="mt-4">
              {status.pricing.gateway === 'razorpay'
                ? <button onClick={payRazorpay} disabled={phase === 'paying'} className="rounded-lg bg-emerald-500 px-5 py-3 text-sm font-bold text-emerald-950 hover:bg-emerald-400 disabled:opacity-60">{phase === 'paying' ? 'Opening payment…' : `Pay ${price} & scan`}</button>
                : <div ref={paypalRef} className="min-h-[44px] max-w-xs" />}
            </div>
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            <p className="mt-3 text-[11px] text-zinc-600">Secure checkout · {status.pricing.gateway === 'razorpay' ? 'UPI, cards & netbanking' : 'PayPal & cards'}</p>
          </div>
        ) : (
          // Payments not live yet for this region (e.g. Razorpay pre-KYC) — show a
          // friendly "coming soon" instead of a dead payment box. Auto-replaced by
          // the real paywall the moment live keys are configured (status.paymentsLive).
          <div className="rounded-2xl border border-emerald-600/40 bg-gradient-to-br from-emerald-950/40 to-zinc-950 p-7 text-center">
            <h2 className="text-lg font-semibold text-white">You&apos;ve used your {status.quota?.freeLimit ?? freeLimit} free scans 🎉</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">Paid scans are <span className="font-medium text-emerald-300">coming soon</span> — we&apos;re just finishing checkout. Every report you ran is saved, and you&apos;ll be first to know the moment more scans unlock.</p>
            <p className="mt-3 text-xs text-zinc-600">Thanks for trying the live sentiment on {toolName}.</p>
          </div>
        )
      )}
    </div>
  )
}

// ── Report body (distinct from the tool page) ───────────────────────────────
function Block({ icon, title, accent, children }: { icon: ReactNode; title: string; accent?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 sm:p-6">
      <h3 className={`mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide ${accent ?? 'text-emerald-400'}`}>{icon}{title}</h3>
      {children}
    </div>
  )
}

// ── Verdict scorecard (overall ring + sub-score bars) ───────────────────────
const SCORE_AXES: { key: keyof NonNullable<Report['scorecard']>; label: string }[] = [
  { key: 'value', label: 'Value for money' },
  { key: 'ease_of_use', label: 'Ease of use' },
  { key: 'reliability', label: 'Reliability' },
  { key: 'performance', label: 'Performance' },
  { key: 'support', label: 'Support' },
]
const scoreColor = (n: number) => (n >= 75 ? 'bg-emerald-500' : n >= 50 ? 'bg-amber-500' : 'bg-red-500')
const scoreText = (n: number) => (n >= 75 ? 'text-emerald-400' : n >= 50 ? 'text-amber-400' : 'text-red-400')

function Scorecard({ s }: { s: NonNullable<Report['scorecard']> }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 sm:p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-400"><Gauge className="h-4 w-4" />Verdict scorecard</h3>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center self-center sm:self-auto">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" className="fill-none stroke-zinc-800" strokeWidth="10" />
            <circle cx="50" cy="50" r="42" className={`fill-none ${scoreText(s.overall)}`} stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(s.overall / 100) * 264} 264`} />
          </svg>
          <div className="absolute text-center">
            <div className={`text-2xl font-extrabold ${scoreText(s.overall)}`}>{s.overall}</div>
            <div className="text-[9px] uppercase tracking-wide text-zinc-500">overall</div>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
          {SCORE_AXES.map(({ key, label }) => {
            const n = s[key]
            return (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between text-[11px]"><span className="text-zinc-400">{label}</span><span className={`font-semibold ${scoreText(n)}`}>{n}</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className={`h-full rounded-full ${scoreColor(n)}`} style={{ width: `${n}%` }} /></div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Sentiment momentum helpers ──────────────────────────────────────────────
type Momentum = 'rising' | 'steady' | 'cooling'
const momentumIcon = (d: Momentum): ReactNode => (d === 'rising' ? <TrendingUp className="h-4 w-4" /> : d === 'cooling' ? <TrendingDown className="h-4 w-4" /> : <Activity className="h-4 w-4" />)
const momentumAccent = (d: Momentum) => (d === 'rising' ? 'text-emerald-400' : d === 'cooling' ? 'text-red-400' : 'text-amber-400')
const momentumPill = (d: Momentum) => (d === 'rising' ? 'bg-emerald-500/15 text-emerald-300' : d === 'cooling' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300')
const momentumLabel = (d: Momentum) => (d === 'rising' ? '↑ Buzz rising' : d === 'cooling' ? '↓ Buzz cooling' : '→ Holding steady')
const SEVERITY_PILL: Record<'low' | 'medium' | 'high', string> = {
  high: 'bg-red-500/15 text-red-300 border-red-500/30',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  low: 'bg-zinc-700/40 text-zinc-300 border-zinc-600/40',
}

function ReportBody({ report, toolName, meta, onDownload }: {
  report: Report; toolName: string; meta: { sources: string[]; mention_count: number } | null; onDownload: () => void
}) {
  const mentions = report.mentions ?? []
  const positivity = overallPositivity(report.sentiment_breakdown, report.sentiment_score)
  const sourceBreak = report.source_breakdown ?? []
  const mentionDates = mentions.map((m) => m.date)
  const datedTs = mentionDates.map((d) => (d ? Date.parse(d) : NaN)).filter((t) => !Number.isNaN(t))
  const latest = datedTs.length ? new Date(Math.max(...datedTs)) : null
  const oldest = datedTs.length ? new Date(Math.min(...datedTs)) : null
  const sourcesCount = sourceBreak.length || (meta?.sources?.length ?? 0)
  const dataPoints = meta?.mention_count ?? mentions.length
  const fmt = (d: Date | null) => (d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null)
  const fmtStr = (s?: string | null) => { if (!s) return null; const t = Date.parse(s); return Number.isNaN(t) ? null : fmt(new Date(t)) }
  const scoreColorText = report.sentiment_score === 'positive' ? 'text-emerald-400' : report.sentiment_score === 'negative' ? 'text-red-400' : 'text-amber-400'

  // The order below is engagement-first AND mobile-first: on phones it reads
  // top-to-bottom as verdict → score → themes → praise/gripes → quotes →
  // mentions, so the visual hook always leads.
  return (
    <div className="space-y-5">
      {/* 1 · Verdict hero — donut + sentiment + bottom line + key stats + PDF */}
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <SentimentDonut positivity={positivity} />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-xs uppercase tracking-wide text-zinc-500">The verdict on {toolName}</p>
            <p className={`text-2xl font-extrabold capitalize sm:text-3xl ${scoreColorText}`}>{report.sentiment_score} sentiment</p>
            {report.bottom_line && <p className="mt-2 text-sm font-medium leading-relaxed text-emerald-100">{report.bottom_line}</p>}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-zinc-500 sm:justify-start">
              <span><span className="font-semibold text-white">{dataPoints}</span> mentions analysed</span>
              <span><span className="font-semibold text-white">{sourcesCount}</span> sources</span>
              {latest && <span>latest <span className="font-semibold text-white">{fmt(latest)}</span></span>}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-center sm:justify-end">
          <button onClick={onDownload} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-emerald-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"><Download className="h-4 w-4" /> Download PDF</button>
        </div>
      </div>

      {/* 2 · Scorecard + sentiment by source (per-source bars = provenance) */}
      {report.scorecard && <Scorecard s={report.scorecard} />}
      {sourceBreak.length > 0 && (
        <Block icon={<Database className="h-4 w-4" />} title="Sentiment by source">
          <p className="-mt-1 mb-3 text-xs text-zinc-500">How positive each platform&apos;s chatter is — and how much of it there is.</p>
          <SourceSentimentBars items={sourceBreak} />
        </Block>
      )}

      {/* 3 · The honest verdict */}
      <Block icon={<Flame className="h-4 w-4" />} title="The honest verdict">
        <p className="text-sm leading-relaxed text-zinc-300">{report.ai_verdict}</p>
      </Block>

      {/* 4 · Recurring themes (moved up) — frequency bars */}
      {report.themes && report.themes.length > 0 && (
        <Block icon={<Radar className="h-4 w-4" />} title="What everyone keeps saying">
          <p className="-mt-1 mb-3 text-xs text-zinc-500">The points that keep coming up — wider bar = raised across more platforms.</p>
          <ThemeBars themes={report.themes} />
        </Block>
      )}

      {/* 5 · Momentum + sparkline from real mention dates */}
      {report.momentum && (
        <Block icon={momentumIcon(report.momentum.direction)} title="Where the buzz is heading" accent={momentumAccent(report.momentum.direction)}>
          <div className="flex flex-wrap items-center gap-4">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${momentumPill(report.momentum.direction)}`}>{momentumLabel(report.momentum.direction)}</span>
            {datedTs.length >= 3 && <div className="min-w-[160px] flex-1"><MomentumSparkline dates={mentionDates} /></div>}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">{report.momentum.summary}</p>
          {report.momentum.drivers && report.momentum.drivers.length > 0 && (
            <ul className="mt-3 space-y-1.5">{report.momentum.drivers.map((d, i) => <li key={i} className="flex gap-2 text-sm text-zinc-400"><span className="text-zinc-600">›</span>{d}</li>)}</ul>
          )}
        </Block>
      )}

      {/* 6 · Praise / Gripes */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Block icon={<ThumbsUp className="h-4 w-4" />} title="What users love">
          <ul className="space-y-2 text-sm text-zinc-300">{report.pros.map((p, i) => <li key={i} className="flex gap-2"><span className="text-emerald-400">+</span>{p}</li>)}</ul>
        </Block>
        <Block icon={<ThumbsDown className="h-4 w-4" />} title="What frustrates them" accent="text-red-400">
          <ul className="space-y-2 text-sm text-zinc-300">{report.cons.map((c, i) => <li key={i} className="flex gap-2"><span className="text-red-400">−</span>{c}</li>)}</ul>
        </Block>
      </div>

      {/* 7 · In their words — quote wall with source icon + date */}
      {report.standout_quotes && report.standout_quotes.length > 0 && (
        <Block icon={<Quote className="h-4 w-4" />} title="In their words">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {report.standout_quotes.map((q, i) => {
              const tone = q.sentiment === 'positive' ? 'border-emerald-900/50 bg-emerald-950/10' : q.sentiment === 'critical' ? 'border-red-900/50 bg-red-950/10' : 'border-zinc-800 bg-zinc-900/40'
              return (
                <blockquote key={i} className={`rounded-xl border ${tone} p-4 text-sm italic text-zinc-300`}>
                  &ldquo;{q.text}&rdquo;
                  <span className="mt-2.5 flex items-center gap-1.5 not-italic text-xs text-zinc-500">
                    <SourceIcon source={q.source} size={14} withLabel />
                    {fmtStr(q.date) && <span>· {fmtStr(q.date)}</span>}
                  </span>
                </blockquote>
              )
            })}
          </div>
        </Block>
      )}

      {/* 8 · Live mentions — relevance-filtered, recency, icon + date + link */}
      {mentions.length > 0 && (
        <Block icon={<MessageSquareText className="h-4 w-4" />} title="Straight from the community">
          <div className="space-y-3">
            {mentions.map((m, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
                <div className="mb-1 flex items-center gap-2 text-[11px]">
                  <SourceIcon source={m.source} size={16} withLabel />
                  {m.date && <span className="text-zinc-500">· {timeAgo(m.date)}</span>}
                  {typeof m.score === 'number' && m.score > 0 && <span className="text-zinc-600">▲ {m.score}</span>}
                  {m.url && <a href={m.url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300">view <ExternalLink className="h-3 w-3" /></a>}
                </div>
                {m.title && <p className="text-sm font-medium text-white">{m.title}</p>}
                {m.snippet && <p className="mt-0.5 line-clamp-3 text-sm text-zinc-400">{m.snippet}</p>}
              </div>
            ))}
          </div>
        </Block>
      )}

      {/* 9 · Watch-outs */}
      {report.red_flags && report.red_flags.length > 0 && (
        <Block icon={<ShieldAlert className="h-4 w-4" />} title="Watch-outs before you commit" accent="text-red-400">
          <div className="space-y-3">
            {report.red_flags.map((f, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SEVERITY_PILL[f.severity] ?? SEVERITY_PILL.low}`}>{f.severity}</span>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{f.detail}</p>
              </div>
            ))}
          </div>
        </Block>
      )}

      {/* 10 · Who it's for / who should skip */}
      {((report.best_for && report.best_for.length > 0) || (report.not_for && report.not_for.length > 0)) && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {report.best_for && report.best_for.length > 0 && (
            <Block icon={<Users className="h-4 w-4" />} title="Who it's for">
              <ul className="space-y-2 text-sm text-zinc-300">{report.best_for.map((b, i) => <li key={i} className="flex gap-2"><span className="text-emerald-400">✓</span>{b}</li>)}</ul>
            </Block>
          )}
          {report.not_for && report.not_for.length > 0 && (
            <Block icon={<UserMinus className="h-4 w-4" />} title="Who should skip it" accent="text-red-400">
              <ul className="space-y-2 text-sm text-zinc-300">{report.not_for.map((b, i) => <li key={i} className="flex gap-2"><span className="text-red-400">✗</span>{b}</li>)}</ul>
            </Block>
          )}
        </div>
      )}

      {/* 11 · Learning curve + hidden costs */}
      {report.learning_curve && (report.learning_curve.time_to_start || report.learning_curve.skill_level || (report.learning_curve.hurdles && report.learning_curve.hurdles.length > 0)) && (
        <Block icon={<BookOpen className="h-4 w-4" />} title="Learning curve" accent="text-blue-400">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {report.learning_curve.skill_level && <span className="rounded-full border border-blue-900/40 bg-blue-950/30 px-2.5 py-0.5 capitalize text-blue-300">{report.learning_curve.skill_level}</span>}
            {report.learning_curve.time_to_start && <span className="text-zinc-400">Up &amp; running in ~{report.learning_curve.time_to_start}</span>}
          </div>
          {report.learning_curve.hurdles && report.learning_curve.hurdles.length > 0 && (
            <ul className="mt-3 space-y-1.5">{report.learning_curve.hurdles.map((h, i) => <li key={i} className="flex gap-2 text-sm text-zinc-400"><span className="text-zinc-600">›</span>{h}</li>)}</ul>
          )}
        </Block>
      )}

      {report.pricing_analysis?.hidden_costs && report.pricing_analysis.hidden_costs.length > 0 && (
        <Block icon={<AlertTriangle className="h-4 w-4" />} title="Hidden costs people mention" accent="text-amber-400">
          <ul className="space-y-2 text-sm text-amber-200/90">{report.pricing_analysis.hidden_costs.map((h, i) => <li key={i} className="flex gap-2"><span>⚠</span>{h}</li>)}</ul>
          {report.pricing_analysis.verdict && <p className="mt-3 text-sm text-zinc-400">{report.pricing_analysis.verdict}</p>}
        </Block>
      )}

      {/* 12 · Dynamic, in-depth FAQs */}
      {report.faqs && report.faqs.length > 0 && (
        <Block icon={<HelpCircle className="h-4 w-4" />} title="Real questions, real answers">
          <div className="space-y-2.5">
            {report.faqs.map((f, i) => (
              <details key={i} className="group rounded-xl border border-zinc-800 bg-zinc-900/40 p-4" {...(i === 0 ? { open: true } : {})}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-white marker:content-['']">
                  {f.q}
                  <span className="shrink-0 text-zinc-600 transition group-open:rotate-180">⌄</span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.a}</p>
              </details>
            ))}
          </div>
        </Block>
      )}

      {/* 13 · Where this came from — sources footer (provenance + recency) */}
      {sourceBreak.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-500"><Database className="h-3.5 w-3.5" /> Where this came from</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sourceBreak.map((s) => (
              <span key={s.source} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">
                <SourceIcon source={s.source} size={14} /> {s.label} <span className="text-zinc-600">· {s.count}</span>
              </span>
            ))}
          </div>
          {(oldest || latest) && <p className="mt-3 text-[11px] text-zinc-600">Mentions dated {fmt(oldest)}–{fmt(latest)} · synthesized {new Date().toLocaleDateString()}</p>}
        </div>
      )}

      {/* Download CTA */}
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-600/30 bg-gradient-to-br from-emerald-950/30 to-zinc-950 p-5 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm text-zinc-300">Keep the full <span className="font-semibold text-white">{toolName}</span> sentiment report — a polished, shareable PDF.</p>
        <button onClick={onDownload} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-emerald-950 hover:bg-emerald-400"><Download className="h-4 w-4" /> Download PDF</button>
      </div>
    </div>
  )
}

// ── Idle landing (shown before a scan; sells the value, fills the page) ─────
function IdleLanding({ toolName, onScan, authed, freeLeft, freeLimit, price }: {
  toolName: string; onScan: () => void; authed: boolean; freeLeft: number | null; freeLimit: number; price: string
}) {
  const features = [
    { icon: <MessageSquareText className="h-5 w-5" />, title: 'Live mentions', desc: `The actual posts, reviews & complaints about ${toolName} — with links and dates.` },
    { icon: <Flame className="h-5 w-5" />, title: 'Honest verdict', desc: 'A straight answer on whether it lives up to the hype — and who it’s really for.' },
    { icon: <ThumbsUp className="h-5 w-5" />, title: 'Praise & gripes', desc: 'What users genuinely love and the frustrations that keep coming up.' },
    { icon: <Quote className="h-5 w-5" />, title: 'Real quotes', desc: 'Representative voices from real users, not marketing copy.' },
    { icon: <Radar className="h-5 w-5" />, title: 'Recurring themes', desc: 'The patterns across hundreds of opinions, surfaced at a glance.' },
    { icon: <AlertTriangle className="h-5 w-5" />, title: 'Red flags', desc: 'Hidden costs and dealbreakers people only discover after signing up.' },
  ]
  const steps = [
    { n: '1', title: 'Sign up free', desc: `Create an account in seconds — get ${freeLimit} free scans, no card.` },
    { n: '2', title: 'We sweep the web', desc: 'Live social media, forums, reviews & video opinions — in ~30–60s.' },
    { n: '3', title: 'Get your report', desc: 'An honest, downloadable verdict with the real mentions behind it.' },
  ]
  return (
    <div className="space-y-8">
      {/* What's inside */}
      <div>
        <h2 className="text-lg font-semibold text-white">What&apos;s inside your {toolName} report</h2>
        <p className="mt-1 text-sm text-zinc-500">Everything you need to decide — distilled from real, current user opinion.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 transition hover:border-emerald-500/30">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30">{f.icon}</div>
              <h3 className="mt-3 text-sm font-semibold text-white">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div>
        <h2 className="text-lg font-semibold text-white">How it works</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-emerald-950">{s.n}</div>
              <h3 className="mt-3 text-sm font-semibold text-white">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-600/40 bg-gradient-to-br from-emerald-950/40 to-zinc-950 p-7 text-center">
        <h2 className="text-xl font-bold text-white">Ready to see the real verdict on {toolName}?</h2>
        <p className="max-w-md text-sm text-zinc-400">{freeLeft !== null && freeLeft > 0 ? `You have ${freeLeft} free ${freeLeft === 1 ? 'scan' : 'scans'} — no card needed.` : `Your scan is ready in under a minute · ${price}.`}</p>
        <button onClick={onScan} className="group inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-emerald-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400">
          {authed ? <Sparkles className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          {authed ? 'Run my free sentiment scan' : `Sign up free — unlock ${freeLimit} scans`}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}
