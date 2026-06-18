import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { TOOL_COUNT_DISPLAY } from '@/lib/copy/tool-count'
import { Download } from 'lucide-react'

// Phase 9 (2026-06-04) — Press & brand kit. A journalist-ready page is a
// backlink/PR enabler (doc 10): a stable URL with boilerplate, fast facts, and
// downloadable assets that writers cite and link when they mention RightAIChoice.
export const metadata: Metadata = {
  title: 'Press & Brand Kit',
  description:
    'RightAIChoice press kit: boilerplate, fast facts, founder bio, and downloadable brand assets (logos). Everything journalists and partners need to write about us.',
  alternates: { canonical: '/press' },
  openGraph: {
    title: 'Press & Brand Kit — RightAIChoice',
    description: 'Boilerplate, fast facts, founder bio, and downloadable brand assets.',
    url: 'https://rightaichoice.com/press',
    type: 'website',
  },
}

const FACTS: { label: string; value: string }[] = [
  { label: 'What it is', value: 'The decision engine for picking the right AI stack' },
  { label: 'Tools tracked', value: `${TOOL_COUNT_DISPLAY}, updated continuously` },
  { label: 'Founded', value: '2026' },
  { label: 'Founder', value: 'Tanmay Verma' },
  { label: 'Model', value: 'Independent & editorial — no pay-for-placement' },
  { label: 'Based in', value: 'India · serves worldwide' },
]

const ASSETS: { name: string; file: string; note: string }[] = [
  { name: 'Logo (SVG)', file: '/logo.svg', note: 'Primary mark, vector' },
  { name: 'Wordmark (SVG)', file: '/logo-wordmark.svg', note: 'Logo + name, vector' },
  { name: 'Logo (PNG 512)', file: '/logo-512.png', note: 'Raster, transparent' },
  { name: 'Icon (PNG)', file: '/icon.png', note: 'App/favicon mark' },
]

export default function PressPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs crumbs={[{ name: 'Home', url: '/' }, { name: 'Press', url: '/press' }]} />

          <header className="mt-4 mb-10">
            <h1 className="text-3xl font-bold text-white">Press &amp; Brand Kit</h1>
            <p className="mt-3 text-zinc-400 leading-relaxed">
              Writing about RightAIChoice? Here&apos;s everything you need — boilerplate, fast facts,
              founder bio, and brand assets. Free to use with a link back to{' '}
              <Link href="/" className="text-emerald-400 hover:text-emerald-300">rightaichoice.com</Link>.
            </p>
          </header>

          {/* Fast facts */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-4">Fast facts</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800">
              {FACTS.map((f) => (
                <div key={f.label} className="bg-zinc-950 p-4">
                  <dt className="text-xs uppercase tracking-wider text-zinc-500">{f.label}</dt>
                  <dd className="mt-1 text-sm text-zinc-200">{f.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Boilerplate */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-4">Boilerplate</h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">One line</p>
                <p className="text-sm text-zinc-300">
                  RightAIChoice is the decision engine for picking the right AI stack — tell it your
                  goal and get the exact AI tools to use, with costs, alternatives, and real-world signals.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Short paragraph</p>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  RightAIChoice (rightaichoice.com) helps founders, builders, and teams choose AI tools
                  without the guesswork. Instead of another listicle, it works as a decision engine:
                  describe your goal and it recommends a complete AI stack — the best-rated tool for each
                  stage of your workflow, with pricing, alternatives, and tradeoffs. It tracks{' '}
                  {TOOL_COUNT_DISPLAY} across every major category, scored independently on features,
                  price, and real-world signals — never pay-for-placement.
                </p>
              </div>
            </div>
          </section>

          {/* Brand assets */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-4">Brand assets</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ASSETS.map((a) => (
                <a
                  key={a.file}
                  href={a.file}
                  download
                  className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 hover:border-emerald-800/50 hover:bg-zinc-900/60 transition-colors"
                >
                  <span>
                    <span className="block text-sm font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors">{a.name}</span>
                    <span className="block text-xs text-zinc-500">{a.note}</span>
                  </span>
                  <Download className="h-4 w-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                </a>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-600">
              Please don&apos;t alter, recolor, or stretch the logo. Use on dark or light backgrounds with clear space.
            </p>
          </section>

          {/* Founder + contact */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-4">Founder &amp; contact</h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              RightAIChoice was founded in 2026 by <strong className="text-zinc-100">Tanmay Verma</strong>.
              For interviews, quotes, data requests, or partnership inquiries, reach out via{' '}
              <a href="https://x.com/rightaichoice" target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300">X</a>{' '}
              or{' '}
              <a href="https://www.linkedin.com/company/rightaichoice" target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300">LinkedIn</a>.
            </p>
            <p className="mt-4 text-sm text-zinc-400">
              Related: <Link href="/methodology" className="text-emerald-400 hover:text-emerald-300">how we rank tools</Link>{' '}
              · <Link href="/about" className="text-emerald-400 hover:text-emerald-300">about</Link>{' '}
              · <Link href="/" className="text-emerald-400 hover:text-emerald-300">the decision engine</Link>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
