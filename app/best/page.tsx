import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, Sparkles, ChevronDown } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { BEST_PAGES } from '@/lib/data/best-pages'
import { itemListJsonLd, faqPageJsonLd, jsonLdScriptProps } from '@/lib/seo/json-ld'

export const revalidate = 3600

// Phase 9 (2026-06-04) advanced SEO — added canonical, ItemList + FAQPage +
// Breadcrumb schema, and an FAQ. See doc 19-hub-pages-seo.md.
export const metadata: Metadata = {
  title: 'Best AI Tools by Use Case (2026) — Curated Guides',
  description:
    'Curated, regularly-updated rankings of the best AI tools for every use case — writing, coding, design, SEO, productivity, and more. Independent picks, no pay-for-placement.',
  alternates: { canonical: '/best' },
  openGraph: {
    title: 'Best AI Tools by Use Case (2026)',
    description: 'Curated rankings of the best AI tools by use case — independent, no pay-for-placement.',
    url: 'https://rightaichoice.com/best',
    type: 'website',
  },
}

const BEST_FAQS: { question: string; answer: string; links?: { label: string; href: string }[] }[] = [
  {
    question: 'What are the best AI tools?',
    answer:
      'It depends on the job. We publish a ranked, hand-tested guide for each use case below — coding, writing, image generation, SEO, and more — so you can see the current top picks and exactly why each one wins.',
  },
  {
    question: 'How are these rankings chosen?',
    answer:
      'Each guide ranks tools on independent criteria — features, pricing, integrations, and real-world signals — never pay-for-placement. Picks are re-checked as tools and pricing change.',
    links: [{ label: 'How we rank tools', href: '/methodology' }],
  },
  {
    question: 'Are the best-of lists kept up to date?',
    answer:
      'Yes. Guides are reviewed and refreshed regularly so the picks reflect current pricing, features, and new entrants — the AI tool market moves fast.',
  },
  {
    question: 'How do I choose between the top tools?',
    answer:
      'Read the guide for your use case for the head-to-head reasoning, or describe your goal in the planner and we’ll match a complete stack to it.',
    links: [{ label: 'Plan my AI stack', href: '/plan' }],
  },
]

export default function BestIndexPage() {
  return (
    <>
      <script
        {...jsonLdScriptProps([
          itemListJsonLd(
            'Best AI Tools Guides',
            'Curated, ranked guides to the best AI tools for every use case.',
            '/best',
            BEST_PAGES.map((p) => ({ name: p.title, url: `/best/${p.slug}` })),
          ),
          faqPageJsonLd(BEST_FAQS.map(({ question, answer }) => ({ question, answer }))),
        ])}
      />
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs crumbs={[{ name: 'Home', url: '/' }, { name: 'Best AI Tools', url: '/best' }]} />

          <div className="mb-10 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
                Curated guides
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white">Best AI Tools by Use Case</h1>
            <p className="mt-3 text-zinc-400 max-w-2xl leading-relaxed">
              Hand-tested, ranked, and updated regularly — find the best AI tools for what you&apos;re building.
              Every guide ranks tools on features, price, and real-world signals, with a clear pick for each use case.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {BEST_PAGES.map((page) => (
              <Link
                key={page.slug}
                href={`/best/${page.slug}`}
                className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 hover:border-zinc-700 hover:bg-zinc-800/50 transition-colors"
              >
                <div>
                  <div className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    {page.title}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500 line-clamp-1">
                    {page.description.split('—')[0].trim()}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
              </Link>
            ))}
          </div>

          {/* FAQ */}
          <section className="mt-16">
            <h2 className="text-xl font-semibold text-white mb-6">Frequently asked questions</h2>
            <div className="divide-y divide-zinc-800/70 rounded-xl border border-zinc-800 bg-zinc-900/20">
              {BEST_FAQS.map((faq) => (
                <details key={faq.question} className="group px-5">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-sm font-medium text-zinc-200 marker:content-['']">
                    {faq.question}
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="pb-5 text-sm text-zinc-400 leading-relaxed">
                    <p>{faq.answer}</p>
                    {faq.links && (
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                        {faq.links.map((l) => (
                          <Link key={l.href} href={l.href} className="text-emerald-400 hover:text-emerald-300">
                            {l.label} →
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  )
}
