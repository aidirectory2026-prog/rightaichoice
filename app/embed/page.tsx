import type { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { EmbedSnippet } from '@/components/embed/embed-snippet'

export const metadata: Metadata = {
  title: 'Embed RightAIChoice — Free Widgets for AI Vendors + Bloggers',
  description:
    'Embed a free "Tool of the Day" widget or a per-tool viability badge on your site. Self-contained iframe, no JS dependencies.',
  alternates: { canonical: '/embed' },
}

const TOOL_OF_DAY_SNIPPET = `<iframe
  src="https://rightaichoice.com/embed/tool-of-day"
  width="380" height="240"
  frameborder="0" scrolling="no"
  title="Tool of the Day — RightAIChoice"
  loading="lazy">
</iframe>`

const VIABILITY_BADGE_SNIPPET = `<iframe
  src="https://rightaichoice.com/embed/viability-badge/YOUR-TOOL-SLUG"
  width="260" height="60"
  frameborder="0" scrolling="no"
  title="Viability badge — RightAIChoice"
  loading="lazy">
</iframe>`

export default function EmbedPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-white mb-3">Embed RightAIChoice</h1>
          <p className="text-zinc-400 max-w-2xl mb-10">
            Free, self-contained widgets you can drop into any site. No JS bundle,
            no tracking pixels, no subscription. Each widget renders a card backed
            by our live editorial data and links back to the full review on
            RightAIChoice.
          </p>

          <section className="mb-12 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Tool of the Day</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Rotates once per day across our top-viability picks. Perfect for AI
              newsletters, blog sidebars, indie-hacker portfolios.
            </p>
            <div className="grid gap-6 md:grid-cols-[1fr,360px] md:items-start">
              <EmbedSnippet code={TOOL_OF_DAY_SNIPPET} />
              <iframe
                src="/embed/tool-of-day"
                width={360}
                height={240}
                frameBorder={0}
                scrolling="no"
                title="Tool of the Day preview"
                loading="lazy"
                className="rounded-lg border border-zinc-800"
              />
            </div>
          </section>

          <section className="mb-12 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Viability Badge</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Tools scoring ≥ 70 viability get a "Top-Viability" badge. All other
              published tools get a neutral "Reviewed by RightAIChoice" badge. Drop
              it on your homepage, pricing page, or "as featured in" strip.
            </p>
            <p className="text-sm text-zinc-300 mb-4">
              Replace <code className="text-emerald-300">YOUR-TOOL-SLUG</code> with your
              tool's slug (the URL fragment from{' '}
              <Link href="/tools" className="underline hover:text-emerald-300">
                /tools
              </Link>
              ).
            </p>
            <EmbedSnippet code={VIABILITY_BADGE_SNIPPET} />
          </section>

          <section className="text-sm text-zinc-500">
            <h3 className="text-white font-semibold mb-2">FAQ</h3>
            <p className="mb-2">
              <strong className="text-zinc-300">Can I customize the styling?</strong>{' '}
              Not yet. Widgets ship with our brand styles to keep attribution clear.
            </p>
            <p className="mb-2">
              <strong className="text-zinc-300">Are there usage limits?</strong> No
              rate limits today. Please use{' '}
              <code className="text-emerald-300">loading="lazy"</code> so the widget
              loads only when in viewport.
            </p>
            <p className="mb-2">
              <strong className="text-zinc-300">Why doesn&apos;t my tool have a badge?</strong>{' '}
              Tools are added editorially. If we haven&apos;t covered yours yet, email
              hello@rightaichoice.com.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
