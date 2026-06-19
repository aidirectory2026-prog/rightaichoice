import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ShieldCheck, Search, Filter, RefreshCw, FileText, Mail, Users, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { jsonLdScriptProps } from '@/lib/seo/json-ld'

const PUBLISHED = '2026-05-01'
const MODIFIED = '2026-05-01'
const PAGE_URL = 'https://rightaichoice.com/methodology'

export const metadata = {
  title: 'Methodology — How RightAIChoice Picks, Reviews, and Discloses',
  description:
    'How RightAIChoice selects tools, writes editorial verdicts, discloses affiliate relationships, and re-verifies pricing and features.',
  alternates: { canonical: PAGE_URL },
}

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Methodology — How RightAIChoice Picks, Reviews, and Discloses',
  description:
    'How RightAIChoice selects tools, writes editorial verdicts, discloses affiliate relationships, and re-verifies pricing and features.',
  url: PAGE_URL,
  datePublished: PUBLISHED,
  dateModified: MODIFIED,
  author: {
    '@type': 'Person',
    name: 'Tanmay Verma',
    url: 'https://rightaichoice.com/team',
    jobTitle: 'Founder & Editor-in-Chief',
  },
  publisher: {
    '@type': 'Organization',
    name: 'RightAIChoice',
    url: 'https://rightaichoice.com',
  },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'RightAIChoice',
  url: 'https://rightaichoice.com',
  description:
    'RightAIChoice is the decision-making engine for the AI ecosystem — independent editorial verdicts, structured tool data, and AI-powered recommendations.',
  founder: {
    '@type': 'Person',
    name: 'Tanmay Verma',
    url: 'https://rightaichoice.com/team',
  },
}

export default function MethodologyPage() {
  return (
    <>
      <Navbar />
      <script {...jsonLdScriptProps([articleSchema, organizationSchema])} />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-3xl font-bold text-white mb-2">How we evaluate AI tools</h1>
          <p className="text-sm text-zinc-500 mb-8">
            How RightAIChoice picks, reviews, and discloses. Last updated {MODIFIED}. Author:{' '}
            <Link href="/team" className="text-emerald-400 hover:text-emerald-300">
              Tanmay Verma
            </Link>
            , Founder &amp; Editor-in-Chief.
          </p>

          {/* (a) Selection criteria */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Filter className="h-5 w-5 text-emerald-400" />
              How we select which tools to include
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-3">
              We are a decision-making engine, not an exhaustive directory. Inclusion is editorial — every tool in the
              catalog has cleared three explicit gates before it gets a page.
            </p>
            <ol className="space-y-3 text-sm text-zinc-300 leading-relaxed list-decimal pl-5">
              <li>
                <strong className="text-white">AI-native gate.</strong> The tool is either AI-native (the product
                cannot exist without machine learning) or ships AI as a headline feature, not as a bolted-on label.
                Wrappers around third-party APIs that add no real workflow value are rejected. This gate was codified
                on 2026-04-27 after a manual sweep softhid 30+ entries that were AI-adjacent rather than AI-native.
              </li>
              <li>
                <strong className="text-white">Traction gate.</strong> The tool has at least one of: meaningful public
                usage signal (GitHub stars, paying customers named on the site, ProductHunt traction), serious
                financial backing, or a verifiable team behind it. Stealth landing pages without a working product are
                rejected.
              </li>
              <li>
                <strong className="text-white">Editorial-fit gate.</strong> The tool genuinely helps a category of
                user make a better decision than the next-best alternative. Pure clones with no differentiation get
                merged into a comparison page rather than a standalone listing.
              </li>
            </ol>
          </section>

          {/* (b) How verdicts are written */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-400" />
              How editorial verdicts are written
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-3">
              Every tool page carries an independent editorial verdict — our honest assessment of who should and
              should not use it, what failure modes to expect, and what to pilot before committing. The process is the
              same for every tool, regardless of affiliate status:
            </p>
            <ul className="space-y-2 text-sm text-zinc-300 leading-relaxed list-disc pl-5">
              <li>
                <strong className="text-white">Primary-source verification.</strong> Pricing, features, integrations,
                and limitations are pulled directly from the vendor&apos;s site, docs, and changelog — never from
                second-hand reviews.
              </li>
              <li>
                <strong className="text-white">Competitive positioning.</strong> Each verdict explicitly names the
                closest 1–3 alternatives and explains the trade-off, so readers can see where the tool wins and where
                it loses.
              </li>
              <li>
                <strong className="text-white">Failure-mode honesty.</strong> Every verdict includes a &ldquo;not
                ideal for&rdquo; section and a &ldquo;what to pilot&rdquo; section. We do not write verdicts that read
                like marketing copy.
              </li>
              <li>
                <strong className="text-white">No vendor edits.</strong> Tool vendors do not see verdicts before
                publication and cannot request changes to editorial language. Factual corrections (a wrong price, a
                missing integration) are accepted; opinion edits are not.
              </li>
            </ul>
          </section>

          {/* (b.5) How editorial content is produced — model + human disclosure */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              How editorial content is produced
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-3">
              Editorial work on RightAIChoice is not written by a single model in one pass. Page titles, &ldquo;Our
              Take&rdquo; verdicts, comparison framing, and the long-form Founder Review are drafted with a mixture of
              best-in-class language models — Claude Opus 4.5, GPT Codex, and DeepSeek&apos;s strongest reasoning models
              — and then reviewed by a human editor against an explicit quality rubric before anything ships.
            </p>
            <ul className="space-y-2 text-sm text-zinc-300 leading-relaxed list-disc pl-5 mb-3">
              <li>
                <strong className="text-white">Model mixture, not single-model output.</strong> Different models are
                stronger at different tasks — pricing extraction, competitive positioning, voice and tone. Combining
                them lets us cover the catalog at depth without resorting to scraped marketing copy or syndicated
                listicles.
              </li>
              <li>
                <strong className="text-white">Human review is the gate.</strong> A human editor reviews every draft
                against an explicit rubric — factual accuracy, query-intent match, length, brand-suffix, no marketing
                fluff — and is the layer that decides what actually publishes. Models propose; the editor disposes.
              </li>
              <li>
                <strong className="text-white">Grounded in public sentiment.</strong> The same review pass incorporates
                research and public sentiment from across the internet — Reddit threads, ProductHunt discussions, G2
                reviews, X conversations, community forums — so the editorial position reflects what real practitioners
                are saying, not just what vendors claim on their landing pages.
              </li>
              <li>
                <strong className="text-white">One byline, full accountability.</strong> Tanmay Verma (Founder &amp;
                Editor-in-Chief) is accountable for every published verdict regardless of which models contributed to
                the draft. Errors flagged by readers are triaged within 72 hours.
              </li>
            </ul>
            <p className="text-zinc-400 leading-relaxed">
              This disclosure applies equally to the Founder Review feature, comparison pages, and every standalone
              tool page. The combination is intentional: AI-assisted scale, human-owned judgment, and public-sentiment
              grounding — each layer is doing work the other two cannot.
            </p>
          </section>

          {/* (c) Affiliate disclosure */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              How affiliate disclosure works
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-3">
              We disclose affiliate relationships at three layers, in line with the FTC&apos;s 16 CFR Part 255
              endorsement guidelines:
            </p>
            <ul className="space-y-2 text-sm text-zinc-300 leading-relaxed list-disc pl-5">
              <li>
                <strong className="text-white">Page level.</strong> An inline disclosure block appears above the
                primary CTA on every tool page that carries an affiliate link. The disclosure is visible without
                scrolling — not buried in the footer.
              </li>
              <li>
                <strong className="text-white">Sitewide.</strong> This methodology page and the privacy policy both
                disclose the affiliate relationship explicitly, naming the program (PartnerStack, Impact, direct
                vendor programs) where applicable.
              </li>
              <li>
                <strong className="text-white">Editorial separation.</strong> Affiliate revenue does not influence
                inclusion, ranking, or verdict language. Sponsored placements (when they exist) carry a visible
                &ldquo;Sponsored&rdquo; badge and are excluded from organic rankings.
              </li>
            </ul>
          </section>

          {/* (d) Update cadence */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-emerald-400" />
              Update cadence — keeping prices and features honest
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-3">
              Stale data is the single fastest way to lose user trust on a discovery site. We treat data freshness as a
              P0 product concern, not a content-ops afterthought.
            </p>
            <ul className="space-y-2 text-sm text-zinc-300 leading-relaxed list-disc pl-5">
              <li>
                <strong className="text-white">Core profile refresh — every 2–3 days:</strong> each tool&apos;s
                description, editorial verdict, features, integrations, pricing type, and best/not-for are
                re-synthesized on a rolling 2–3 day cycle — grounded in the vendor&apos;s current site <em>plus</em>
                fresh third-party news. When the news contradicts a dated vendor page (a new model version, a price
                change), the news wins. The last-verified timestamp is surfaced on every tool page.
              </li>
              <li>
                <strong className="text-white">Full-depth refresh — every ~7 days:</strong> the complete profile —
                FAQs, pricing-tier guides, workflow scenarios, migration notes, limitations — is regenerated for every
                tool on a weekly cycle.
              </li>
              <li>
                <strong className="text-white">Latest news — daily:</strong> a daily sweep of changelogs, tech press,
                and community signal feeds each tool&apos;s &ldquo;Latest from&rdquo; section, so headline launches and
                pricing moves surface within a day.
              </li>
              <li>
                <strong className="text-white">Propagation everywhere:</strong> when a tool&apos;s data changes, every
                page that mentions it — its own page, comparisons, category and best-of pages, and articles —
                re-renders automatically, so nothing across the site contradicts itself.
              </li>
              <li>
                <strong className="text-white">Spotting our own errors:</strong> every tool page has a
                &ldquo;Report&rdquo; flow. Reader-flagged inaccuracies are triaged within 72 hours.
              </li>
            </ul>
          </section>

          {/* Contact + team link */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-400" />
              Who&apos;s behind this
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-3">
              RightAIChoice is run by{' '}
              <Link href="/team" className="text-emerald-400 hover:text-emerald-300">
                Tanmay Verma
              </Link>{' '}
              (Founder &amp; Editor-in-Chief). Every editorial decision — what to include, how to rank, what to say —
              is owned by a real human with a public byline. Reach out at{' '}
              <a href="mailto:hello@rightaichoice.com" className="text-emerald-400 hover:text-emerald-300">
                hello@rightaichoice.com
              </a>{' '}
              for editorial corrections, partnership inquiries, or feedback.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-zinc-400">
              <Link href="/team" className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300">
                <Users className="h-4 w-4" /> Meet the team
              </Link>
              <a
                href="mailto:editorial@rightaichoice.com"
                className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300"
              >
                <Mail className="h-4 w-4" /> Editorial corrections
              </a>
              <Link href="/tools" className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300">
                <Search className="h-4 w-4" /> Browse the catalog
              </Link>
            </div>
          </section>

          {/* FTC Disclosure block — bottom of page (per spec) */}
          <div className="mt-12 rounded-xl border border-amber-900/40 bg-amber-950/10 p-5 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white mb-1.5">Affiliate disclosure (FTC)</p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                We earn a commission when you use our links. Editorial picks are independent — affiliate status never
                determines whether a tool appears, where it ranks, or what we say about it. Affiliate-bearing links
                are disclosed inline on every tool page above the primary CTA. This complies with the FTC&apos;s 16
                CFR Part 255 endorsement guidelines.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
