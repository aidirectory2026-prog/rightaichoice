'use client'

// Phase 9 S6 — Market Sentiment Checker: persuasive card + modal that runs a
// real-time, multi-source sentiment scan on demand. First 3 scans free per
// account (login required), then ₹20 (Razorpay, India) / $1 (PayPal, intl).
// Auto-opens once per user per tool on first visit; a card otherwise.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Sparkles, X, Loader2, ShieldCheck, Zap, Globe, Star } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { signInWithOAuthClient } from '@/lib/auth/oauth-client'
import { GoogleIcon } from '@/components/shared/google-icon'
import { analytics } from '@/lib/analytics'

type Pricing = { currency: 'INR' | 'USD'; gateway: 'razorpay' | 'paypal'; amountMinor: number; amountDisplay: string; country: string }
type Report = {
  ai_verdict: string
  pros: string[]
  cons: string[]
  sentiment_score: 'positive' | 'mixed' | 'negative'
  themes?: { theme: string; sources: string[] }[]
  best_for?: string[]
  not_for?: string[]
}
type Status = {
  authed: boolean
  pricing: Pricing
  quota?: { freeRemaining: number; freeLimit: number; paidBalance: number; canScanFree: boolean }
  lastResult?: { report: Report; sources: string[]; mention_count: number; created_at: string } | null
}
type Phase = 'intro' | 'signin' | 'scanning' | 'result' | 'paywall' | 'paying'

const SOURCES = ['Reddit', 'Hacker News', 'App Store reviews', 'YouTube', 'Product Hunt', 'Trustpilot']

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve(true)
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

export function SentimentChecker({ toolSlug, toolName }: { toolSlug: string; toolName: string }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('intro')
  const [status, setStatus] = useState<Status | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [resultMeta, setResultMeta] = useState<{ sources: string[]; mention_count: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stepIdx, setStepIdx] = useState(0)
  const paypalRef = useRef<HTMLDivElement>(null)

  const refreshStatus = useCallback(async () => {
    try {
      const r = await fetch(`/api/tools/${toolSlug}/sentiment-checker/status`)
      if (r.ok) setStatus((await r.json()) as Status)
    } catch { /* ignore */ }
  }, [toolSlug])

  // Card view + status on mount; auto-open once per user per tool.
  useEffect(() => {
    analytics.sentimentCardViewed(toolSlug)
    // refreshStatus only setState()s asynchronously (after a fetch) — a
    // legitimate external-system sync, not a synchronous cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshStatus()
    try {
      const key = `rac_sentiment_seen_${toolSlug}`
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1')
        setTimeout(() => { setOpen(true); analytics.sentimentModalOpened(toolSlug, 'auto') }, 1200)
      }
    } catch { /* ignore */ }
  }, [toolSlug, refreshStatus])

  // Animate the scanning stepper (stepIdx is reset to 0 in runScan).
  useEffect(() => {
    if (phase !== 'scanning') return
    const t = setInterval(() => setStepIdx((i) => Math.min(i + 1, SOURCES.length)), 5500)
    return () => clearInterval(t)
  }, [phase])

  function openModal() {
    setOpen(true)
    setPhase(status?.lastResult ? 'result' : 'intro')
    if (status?.lastResult) {
      setReport(status.lastResult.report)
      setResultMeta({ sources: status.lastResult.sources, mention_count: status.lastResult.mention_count })
    }
    analytics.sentimentModalOpened(toolSlug, 'manual')
  }

  function close() { setOpen(false) }

  const runScan = useCallback(async () => {
    if (!user) { setPhase('signin'); return }
    setError(null)
    setStepIdx(0)
    setPhase('scanning')
    analytics.sentimentScanStarted(toolSlug, status?.quota?.canScanFree ? 'free' : 'paid')
    try {
      const r = await fetch(`/api/tools/${toolSlug}/sentiment-checker/scan`, { method: 'POST' })
      if (r.status === 401) { setPhase('signin'); return }
      if (r.status === 402) {
        const data = (await r.json()) as { pricing: Pricing }
        setStatus((s) => (s ? { ...s, pricing: data.pricing } : s))
        setPhase('paywall')
        return
      }
      if (!r.ok) { setError('The scan could not complete. Please try again.'); setPhase('result'); return }
      const data = (await r.json()) as { report: Report; sources: string[]; mention_count: number }
      setReport(data.report)
      setResultMeta({ sources: data.sources, mention_count: data.mention_count })
      setPhase('result')
      analytics.sentimentResultViewed(toolSlug, data.report.sentiment_score, 'fresh')
      void refreshStatus()
    } catch {
      setError('Network error. Please try again.')
      setPhase('result')
    }
  }, [user, toolSlug, status, refreshStatus])

  // ── Payments ──────────────────────────────────────────────────────────────
  const payRazorpay = useCallback(async () => {
    analytics.sentimentPayClicked(toolSlug, 'razorpay')
    setPhase('paying')
    const ok = await loadScript('https://checkout.razorpay.com/v1/checkout.js')
    if (!ok) { setError('Could not load the payment widget.'); setPhase('paywall'); return }
    try {
      const order = await fetch('/api/payments/razorpay/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tool_slug: toolSlug }),
      }).then((r) => r.json())
      if (order.error) { setError('Payment could not be started.'); setPhase('paywall'); return }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay({
        key: order.key_id, amount: order.amount_minor, currency: order.currency, order_id: order.order_id,
        name: 'RightAIChoice', description: `Market Sentiment Scan — ${toolName}`,
        theme: { color: '#10b981' },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const v = await fetch('/api/payments/razorpay/verify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_id: order.payment_id, ...resp }),
          }).then((r) => r.json())
          if (v.ok) { await refreshStatus(); void runScan() }
          else { setError('Payment verification failed.'); setPhase('paywall') }
        },
        modal: { ondismiss: () => setPhase('paywall') },
      })
      rzp.open()
    } catch {
      setError('Payment failed to start.'); setPhase('paywall')
    }
  }, [toolSlug, toolName, refreshStatus, runScan])

  // PayPal buttons render into the container when on the paywall (intl).
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
        style: { color: 'gold', shape: 'pill', height: 40, label: 'pay' },
        createOrder: async () => {
          analytics.sentimentPayClicked(toolSlug, 'paypal')
          const o = await fetch('/api/payments/paypal/order', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tool_slug: toolSlug }),
          }).then((r) => r.json())
          paypalRef.current?.setAttribute('data-payment-id', o.payment_id)
          return o.order_id
        },
        onApprove: async (data: { orderID: string }) => {
          const paymentId = paypalRef.current?.getAttribute('data-payment-id')
          const c = await fetch('/api/payments/paypal/capture', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_id: paymentId, order_id: data.orderID }),
          }).then((r) => r.json())
          if (c.ok) { await refreshStatus(); void runScan() }
          else setError('Payment could not be captured.')
        },
      }).render(paypalRef.current)
    })()
    return () => { cancelled = true }
  }, [phase, status?.pricing.gateway, toolSlug, refreshStatus, runScan])

  const freeLeft = status?.quota?.freeRemaining ?? null
  const price = status?.pricing.amountDisplay ?? ''

  return (
    <>
      {/* ── Card ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-emerald-900/40 bg-gradient-to-br from-emerald-950/40 to-zinc-950 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-emerald-500/10 p-2"><Sparkles className="h-5 w-5 text-emerald-400" /></div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">What does the internet really think about {toolName}?</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Run a <span className="text-zinc-200">live scan</span> across Reddit, Hacker News, App Store reviews, YouTube,
              Product Hunt &amp; review sites — real opinions, complaints, and praise, synthesized into one honest report.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-emerald-400" /> Real-time</span>
              <span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5 text-emerald-400" /> 6 sources</span>
              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Unbiased</span>
              <span>Takes 30s–1 min</span>
            </div>
            <button
              onClick={openModal}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              {status?.lastResult ? 'View / refresh report' : 'Run live sentiment scan'}
            </button>
            <p className="mt-2 text-xs text-zinc-500">
              {freeLeft !== null
                ? freeLeft > 0 ? `${freeLeft} free scan${freeLeft === 1 ? '' : 's'} left` : `${price} per scan`
                : `First 3 scans free · then ${price || '₹20 / $1'}`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Modal ────────────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={close}>
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={close} className="absolute right-4 top-4 text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>

            {phase === 'intro' && (
              <div className="space-y-4">
                <div className="rounded-lg bg-emerald-500/10 p-2 w-fit"><Sparkles className="h-6 w-6 text-emerald-400" /></div>
                <h2 className="text-xl font-semibold text-white">Get the real verdict on {toolName}</h2>
                <p className="text-sm text-zinc-400">
                  Marketing pages won&apos;t tell you what actually breaks, what users love, or whether it&apos;s worth the price.
                  We scan <span className="text-zinc-200">live discussions, reviews, and complaints</span> across the web right
                  now and synthesize them into a clear, honest report — pros, cons, hidden costs, and who it&apos;s really for.
                </p>
                <ul className="space-y-2 text-sm text-zinc-300">
                  {SOURCES.map((s) => (
                    <li key={s} className="flex items-center gap-2"><Star className="h-3.5 w-3.5 text-emerald-400" /> {s}</li>
                  ))}
                </ul>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-400">
                  Takes 30 seconds to a minute · {freeLeft !== null && freeLeft > 0
                    ? `${freeLeft} of ${status?.quota?.freeLimit ?? 3} free scans left`
                    : `${price || '₹20 / $1'} per scan`}
                </div>
                <button onClick={runScan} className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 transition-colors">
                  {freeLeft !== null && freeLeft <= 0 ? `Scan now — ${price}` : 'Run my free live scan'}
                </button>
                {!user && <p className="text-center text-xs text-zinc-500">A free account is required — sign in on the next step.</p>}
              </div>
            )}

            {phase === 'signin' && (
              <div className="space-y-4 text-center">
                <h2 className="text-lg font-semibold text-white">Sign in to run your scan</h2>
                <p className="text-sm text-zinc-400">Create a free account to get 3 free sentiment scans. Takes a few seconds.</p>
                <button
                  onClick={() => signInWithOAuthClient('google', typeof window !== 'undefined' ? window.location.pathname : null)}
                  className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
                >
                  <GoogleIcon /> Continue with Google
                </button>
                <button
                  onClick={() => signInWithOAuthClient('linkedin_oidc', typeof window !== 'undefined' ? window.location.pathname : null)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
                >
                  Continue with LinkedIn
                </button>
              </div>
            )}

            {phase === 'scanning' && (
              <div className="space-y-5 py-2">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                  <h2 className="text-lg font-semibold text-white">Scanning the web for {toolName}…</h2>
                </div>
                <p className="text-sm text-zinc-400">Pulling real opinions across sources and synthesizing them. This takes up to a minute.</p>
                <ul className="space-y-2">
                  {SOURCES.map((s, i) => (
                    <li key={s} className={`flex items-center gap-2 text-sm ${i < stepIdx ? 'text-emerald-400' : i === stepIdx ? 'text-white' : 'text-zinc-600'}`}>
                      {i < stepIdx ? <span className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">✓</span>
                        : i === stepIdx ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <span className="h-4 w-4 rounded-full border border-zinc-700" />}
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {phase === 'result' && (
              <ResultView toolName={toolName} report={report} meta={resultMeta} error={error} onRescan={runScan} canRescan={!!user} freeLeft={freeLeft} price={price} />
            )}

            {(phase === 'paywall' || phase === 'paying') && status && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">You&apos;ve used your 3 free scans</h2>
                <p className="text-sm text-zinc-400">
                  Unlock another live, multi-source sentiment scan of {toolName} for <span className="text-white font-semibold">{price}</span>.
                  One-time — no subscription.
                </p>
                {status.pricing.gateway === 'razorpay' ? (
                  <button onClick={payRazorpay} disabled={phase === 'paying'} className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-60 transition-colors">
                    {phase === 'paying' ? 'Opening payment…' : `Pay ${price} with Razorpay`}
                  </button>
                ) : (
                  <div ref={paypalRef} className="min-h-[44px]" />
                )}
                {error && <p className="text-xs text-red-400">{error}</p>}
                <p className="text-center text-[11px] text-zinc-600">Secure payment · {status.pricing.gateway === 'razorpay' ? 'UPI, cards & netbanking' : 'PayPal & cards'}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function ResultView({
  toolName, report, meta, error, onRescan, canRescan, freeLeft, price,
}: {
  toolName: string; report: Report | null; meta: { sources: string[]; mention_count: number } | null
  error: string | null; onRescan: () => void; canRescan: boolean; freeLeft: number | null; price: string
}) {
  if (error && !report) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-lg font-semibold text-white">Scan didn&apos;t complete</h2>
        <p className="text-sm text-zinc-400">{error}</p>
        <button onClick={onRescan} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400">Try again</button>
      </div>
    )
  }
  if (!report) return null
  const tone = report.sentiment_score === 'positive' ? 'text-emerald-400' : report.sentiment_score === 'negative' ? 'text-red-400' : 'text-amber-400'
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">What users really say about {toolName}</h2>
        <span className={`text-xs font-semibold uppercase ${tone}`}>{report.sentiment_score}</span>
      </div>
      {meta && <p className="text-xs text-zinc-500">{meta.mention_count} mentions across {meta.sources.join(', ') || 'public sources'}</p>}
      <p className="text-sm text-zinc-300">{report.ai_verdict}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3">
          <h3 className="text-xs font-semibold text-emerald-400 mb-2">Pros</h3>
          <ul className="space-y-1 text-sm text-zinc-300">{report.pros.slice(0, 5).map((p, i) => <li key={i}>+ {p}</li>)}</ul>
        </div>
        <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-3">
          <h3 className="text-xs font-semibold text-red-400 mb-2">Cons</h3>
          <ul className="space-y-1 text-sm text-zinc-300">{report.cons.slice(0, 5).map((c, i) => <li key={i}>− {c}</li>)}</ul>
        </div>
      </div>
      {report.themes && report.themes.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-zinc-400 mb-1">Recurring themes</h3>
          <ul className="space-y-1 text-sm text-zinc-300">{report.themes.slice(0, 4).map((t, i) => <li key={i}>• {t.theme}</li>)}</ul>
        </div>
      )}
      {canRescan && (
        <button onClick={onRescan} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors">
          Run a fresh scan{freeLeft !== null && freeLeft <= 0 ? ` — ${price}` : freeLeft !== null ? ` (${freeLeft} free left)` : ''}
        </button>
      )}
    </div>
  )
}
