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
} from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { signInWithOAuthClient } from '@/lib/auth/oauth-client'
import { GoogleIcon } from '@/components/shared/google-icon'
import { analytics } from '@/lib/analytics'

type Pricing = { currency: 'INR' | 'USD'; gateway: 'razorpay' | 'paypal'; amountMinor: number; amountDisplay: string; country: string }
type Mention = { source: string; title: string; snippet: string; date: string | null; url: string | null; score: number | null }
type Report = {
  ai_verdict: string
  bottom_line?: string
  standout_quotes?: { text: string; source: string }[]
  pros: string[]
  cons: string[]
  sentiment_score: 'positive' | 'mixed' | 'negative'
  sentiment_breakdown?: Record<string, number>
  themes?: { theme: string; sources: string[] }[]
  community_buzz?: { volume?: string; trend?: string; topics?: string[] }
  pricing_analysis?: { hidden_costs?: string[]; verdict?: string }
  mentions?: Mention[]
}
type Status = {
  authed: boolean
  pricing: Pricing
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
      const r = await fetch(`/api/tools/${toolSlug}/sentiment-checker/status`)
      if (r.ok) setStatus((await r.json()) as Status)
    } catch { /* ignore */ }
  }, [toolSlug])

  useEffect(() => {
    analytics.sentimentCardViewed(toolSlug)
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      const r = await fetch(`/api/tools/${toolSlug}/sentiment-checker/scan`, { method: 'POST' })
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

  const download = useCallback(() => {
    if (!report) return
    const blob = new Blob([buildReportHtml(report, toolName, resultMeta)], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${toolSlug}-sentiment-report.html`
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
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
    if (phase !== 'paywall' || status?.pricing.gateway !== 'paypal') return
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
  }, [phase, status?.pricing.gateway, toolSlug, refreshStatus, runScan])

  const freeLeft = status?.quota?.freeRemaining ?? null
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
              {!user ? 'Sign up free — unlock 3 scans' : phase === 'report' ? 'Run a fresh scan' : freeLeft !== null && freeLeft <= 0 ? `Run a scan — ${price}` : 'Run my free sentiment scan'}
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

      {phase === 'idle' && <IdleLanding toolName={toolName} onScan={runScan} authed={!!user} freeLeft={freeLeft} price={price} />}

      {phase === 'signin' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Create a free account to unlock your 3 scans</h2>
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
        <div className="rounded-2xl border border-emerald-500/30 bg-zinc-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">You&apos;ve used your 3 free scans 🎉</h2>
          <p className="mt-1 text-sm text-zinc-400">Unlock another full, downloadable report of {toolName} for <span className="font-semibold text-white">{price}</span> — one-time, no subscription.</p>
          <div className="mt-4">
            {status.pricing.gateway === 'razorpay'
              ? <button onClick={payRazorpay} disabled={phase === 'paying'} className="rounded-lg bg-emerald-500 px-5 py-3 text-sm font-bold text-emerald-950 hover:bg-emerald-400 disabled:opacity-60">{phase === 'paying' ? 'Opening payment…' : `Pay ${price} & scan`}</button>
              : <div ref={paypalRef} className="min-h-[44px] max-w-xs" />}
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <p className="mt-3 text-[11px] text-zinc-600">Secure checkout · {status.pricing.gateway === 'razorpay' ? 'UPI, cards & netbanking' : 'PayPal & cards'}</p>
        </div>
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

function ReportBody({ report, toolName, meta, onDownload }: {
  report: Report; toolName: string; meta: { sources: string[]; mention_count: number } | null; onDownload: () => void
}) {
  const tone = report.sentiment_score === 'positive' ? 'from-emerald-500 to-emerald-400'
    : report.sentiment_score === 'negative' ? 'from-red-500 to-red-400' : 'from-amber-500 to-emerald-500'
  const breakdown = report.sentiment_breakdown ? Object.values(report.sentiment_breakdown).filter((v) => typeof v === 'number') : []
  const positivity = breakdown.length ? Math.round((breakdown.reduce((a, b) => a + b, 0) / breakdown.length) * 100) : null
  const mentions = report.mentions ?? []

  return (
    <div className="space-y-5">
      {/* Sentiment pulse dashboard */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Sentiment pulse</p>
            <p className={`text-3xl font-extrabold capitalize ${report.sentiment_score === 'positive' ? 'text-emerald-400' : report.sentiment_score === 'negative' ? 'text-red-400' : 'text-amber-400'}`}>{report.sentiment_score}</p>
          </div>
          <div className="flex gap-6 text-center">
            <div><p className="text-2xl font-bold text-white">{meta?.mention_count ?? mentions.length}</p><p className="text-[11px] text-zinc-500">data points</p></div>
            <div><p className="text-2xl font-bold text-white">{report.community_buzz?.volume ?? '—'}</p><p className="text-[11px] text-zinc-500">buzz volume</p></div>
            <div><p className="text-2xl font-bold capitalize text-white">{report.community_buzz?.trend ?? '—'}</p><p className="text-[11px] text-zinc-500">trend</p></div>
          </div>
          <button onClick={onDownload} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800"><Download className="h-3.5 w-3.5" /> Download report</button>
        </div>
        {positivity !== null && (
          <div className="mt-4"><div className="mb-1 flex justify-between text-[11px] text-zinc-500"><span>Overall positivity</span><span>{positivity}%</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800"><div className={`h-full rounded-full bg-gradient-to-r ${tone}`} style={{ width: `${positivity}%` }} /></div></div>
        )}
        {report.bottom_line && <div className="mt-4 rounded-lg border-l-4 border-emerald-500 bg-emerald-950/30 px-4 py-3 text-sm font-medium text-emerald-100">{report.bottom_line}</div>}
      </div>

      <Block icon={<Flame className="h-4 w-4" />} title="The verdict">
        <p className="text-sm leading-relaxed text-zinc-300">{report.ai_verdict}</p>
      </Block>

      {/* Live mentions feed — the real-time, data-rich, distinct section */}
      {mentions.length > 0 && (
        <Block icon={<MessageSquareText className="h-4 w-4" />} title={`Live mentions (${mentions.length})`}>
          <div className="space-y-3">
            {mentions.map((m, i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
                <div className="mb-1 flex items-center gap-2 text-[11px]">
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-300">{m.source}</span>
                  {m.date && <span className="text-zinc-500">{timeAgo(m.date)}</span>}
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Block icon={<ThumbsUp className="h-4 w-4" />} title="The praise">
          <ul className="space-y-2 text-sm text-zinc-300">{report.pros.map((p, i) => <li key={i} className="flex gap-2"><span className="text-emerald-400">+</span>{p}</li>)}</ul>
        </Block>
        <Block icon={<ThumbsDown className="h-4 w-4" />} title="The gripes" accent="text-red-400">
          <ul className="space-y-2 text-sm text-zinc-300">{report.cons.map((c, i) => <li key={i} className="flex gap-2"><span className="text-red-400">−</span>{c}</li>)}</ul>
        </Block>
      </div>

      {report.standout_quotes && report.standout_quotes.length > 0 && (
        <Block icon={<Quote className="h-4 w-4" />} title="In their words">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {report.standout_quotes.map((q, i) => (
              <blockquote key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm italic text-zinc-300">&ldquo;{q.text}&rdquo;<span className="mt-1 block not-italic text-xs text-zinc-500">— {q.source}</span></blockquote>
            ))}
          </div>
        </Block>
      )}

      {report.themes && report.themes.length > 0 && (
        <Block icon={<Radar className="h-4 w-4" />} title="Recurring themes">
          <div className="flex flex-wrap gap-2">{report.themes.slice(0, 8).map((t, i) => <span key={i} className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300">{t.theme}</span>)}</div>
        </Block>
      )}

      {report.pricing_analysis?.hidden_costs && report.pricing_analysis.hidden_costs.length > 0 && (
        <Block icon={<AlertTriangle className="h-4 w-4" />} title="Red flags & hidden costs" accent="text-amber-400">
          <ul className="space-y-2 text-sm text-amber-200/90">{report.pricing_analysis.hidden_costs.map((h, i) => <li key={i} className="flex gap-2"><span>⚠</span>{h}</li>)}</ul>
        </Block>
      )}

      <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
        <button onClick={onDownload} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-emerald-950 hover:bg-emerald-400"><Download className="h-4 w-4" /> Download full report</button>
        <p className="text-xs text-zinc-500">Save this {toolName} sentiment report as a shareable file.</p>
      </div>
    </div>
  )
}

// ── Idle landing (shown before a scan; sells the value, fills the page) ─────
function IdleLanding({ toolName, onScan, authed, freeLeft, price }: {
  toolName: string; onScan: () => void; authed: boolean; freeLeft: number | null; price: string
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
    { n: '1', title: 'Sign up free', desc: 'Create an account in seconds — get 3 free scans, no card.' },
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
          {authed ? 'Run my free sentiment scan' : 'Sign up free — unlock 3 scans'}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}
