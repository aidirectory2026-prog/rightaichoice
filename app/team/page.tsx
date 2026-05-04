import Image from 'next/image'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ExternalLink, Mail, ShieldCheck, Compass, FileText } from 'lucide-react'
import { jsonLdScriptProps } from '@/lib/seo/json-ld'

const PAGE_URL = 'https://rightaichoice.com/team'
const LINKEDIN_URL = 'https://www.linkedin.com/in/tanmayverma99'
// Placeholder SVG — Tanmay can drop a real photo at /public/team/tanmay.jpg
// and swap PHOTO_URL to '/team/tanmay.jpg' (Next.js <Image> handles either extension).
const PHOTO_URL = '/team/tanmay.svg'

export const metadata = {
  title: 'Team — Tanmay Verma, Founder & Editor-in-Chief',
  description:
    'Meet the team behind RightAIChoice. Tanmay Verma is the Founder and Editor-in-Chief — every editorial decision on the platform has a public byline.',
  alternates: { canonical: PAGE_URL },
}

const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Tanmay Verma',
  jobTitle: 'Founder & Editor-in-Chief',
  url: PAGE_URL,
  image: `https://rightaichoice.com${PHOTO_URL}`,
  worksFor: {
    '@type': 'Organization',
    name: 'RightAIChoice',
    url: 'https://rightaichoice.com',
  },
  sameAs: [LINKEDIN_URL],
  email: 'mailto:hello@rightaichoice.com',
  knowsAbout: [
    'AI tools',
    'editorial methodology',
    'creator-economy software',
    'developer tooling',
    'product discovery',
  ],
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://rightaichoice.com' },
    { '@type': 'ListItem', position: 2, name: 'Team', item: PAGE_URL },
  ],
}

export default function TeamPage() {
  return (
    <>
      <Navbar />
      <script {...jsonLdScriptProps([personSchema, breadcrumbSchema])} />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-3xl font-bold text-white mb-2">The team behind RightAIChoice</h1>
          <p className="text-sm text-zinc-500 mb-10">
            Every editorial decision on RightAIChoice has a public byline. The platform is small, the standards are
            not.
          </p>

          {/* Tanmay block */}
          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:gap-8">
              <div className="shrink-0 mb-5 sm:mb-0">
                <div className="relative h-32 w-32 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-800">
                  <Image
                    src={PHOTO_URL}
                    alt="Tanmay Verma — Founder of RightAIChoice"
                    fill
                    sizes="128px"
                    className="object-cover"
                    priority
                  />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-semibold text-white">Tanmay Verma</h2>
                <p className="mt-1 text-sm text-emerald-400 font-medium">Founder &amp; Editor-in-Chief</p>

                <div className="mt-4 space-y-4 text-sm text-zinc-300 leading-relaxed">
                  <p>
                    The catalyst was personal. While building his last venture, Tanmay ran into a problem now familiar
                    to anyone shipping with AI: he could not tell which tool to use for which job. Every category had
                    a dozen &ldquo;best AI for X&rdquo; listicles ranking different products in different orders, most
                    of them paid for placement. Vendor pages all promised the same things — faster, smarter, cheaper.
                    The honest comparisons lived inside private Slack groups and forum threads. He watched himself,
                    and then his peers, lose entire weeks to a decision that should have taken twenty minutes. Pick
                    wrong and you eat the switching cost; pick right and you ship faster than the competition. There
                    was no neutral ground in between.
                  </p>
                  <p>
                    The recognition matched the work he had been doing for years. His background sits at the
                    intersection of product, editorial, and engineering — building consumer products end-to-end,
                    writing about software for audiences that paid for clarity, and shipping the kind of internal
                    tooling that only exists because public versions do not. The blend RightAIChoice demands is the
                    blend he had already been forced to build: someone who can ship the platform, write the verdict,
                    and own the methodology in one head.
                  </p>
                  <p>
                    The decision was to build the missing layer himself. Not another directory and not another
                    listicle — a decision-making engine: structured tool data, independent editorial verdicts, and
                    AI-powered recommendations under one roof, where every signal serves the user&apos;s decision
                    rather than a vendor&apos;s marketing budget. Tool vendors do not edit verdicts before
                    publication, do not pay for inclusion, and do not influence the comparison framework. Tanmay
                    personally owns the editorial verdicts, the inclusion gates that decide which tools enter the
                    catalog, the comparison-page framework, and the affiliate-disclosure standard. That line is
                    non-negotiable, and it starts here.
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <a
                    href={LINKEDIN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" /> LinkedIn
                  </a>
                  <a
                    href="mailto:hello@rightaichoice.com"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
                  >
                    <Mail className="h-4 w-4" /> hello@rightaichoice.com
                  </a>
                  <a
                    href="mailto:editorial@rightaichoice.com"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors"
                  >
                    <Mail className="h-4 w-4" /> Editorial corrections
                  </a>
                </div>
              </div>
            </div>
          </article>

          {/* Editorial responsibilities */}
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-white mb-4">Editorial responsibilities</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <Compass className="h-5 w-5 text-emerald-400 mb-2" />
                <p className="text-sm font-semibold text-white">Inclusion gates</p>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  AI-native filter, traction threshold, editorial fit. Documented in our{' '}
                  <Link href="/methodology" className="text-emerald-400 hover:text-emerald-300">
                    methodology
                  </Link>
                  .
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <FileText className="h-5 w-5 text-emerald-400 mb-2" />
                <p className="text-sm font-semibold text-white">Editorial verdicts</p>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  Every tool page&apos;s &ldquo;Our Take&rdquo; section. Independent of affiliate status.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                <ShieldCheck className="h-5 w-5 text-emerald-400 mb-2" />
                <p className="text-sm font-semibold text-white">Disclosure standard</p>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  FTC-compliant, inline above the primary CTA on every affiliate-bearing page.
                </p>
              </div>
            </div>
          </section>

          {/* Footer links */}
          <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 text-sm text-zinc-400">
            <p className="leading-relaxed">
              Curious how a tool ended up on RightAIChoice or want to flag an inaccuracy? Read the{' '}
              <Link href="/methodology" className="text-emerald-400 hover:text-emerald-300">
                methodology
              </Link>{' '}
              or email{' '}
              <a href="mailto:editorial@rightaichoice.com" className="text-emerald-400 hover:text-emerald-300">
                editorial@rightaichoice.com
              </a>
              . Reader-flagged corrections are triaged within 72 hours.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
