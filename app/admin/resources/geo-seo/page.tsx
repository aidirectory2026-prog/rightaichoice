// Phase 13 R2 — Resources §8: GEO & SEO upgrades. Plain-English + technical tour
// of the answer-engine-optimisation and authority work, for the owner and a future
// engineer. Content is hand-written; the live systems live under /admin (AI
// Citations, Authority) and docs/GEO AND SEO upgrades and updates/.

import { Globe, Search, Quote, LinkIcon, Sparkles } from 'lucide-react'
import { GuideHeader, Section, Callout, Code, GuideFooterNav } from '../_components'

export const metadata = { title: 'GEO & SEO upgrades — Learning guide' }

export default function GeoSeoGuidePage() {
  return (
    <div>
      <GuideHeader
        icon={<Search className="h-6 w-6 text-emerald-500" />}
        title="GEO & SEO upgrades"
        subtitle="How we get RightAIChoice found — both by Google (SEO) and by AI answer engines like ChatGPT, Perplexity, and Gemini (GEO, 'generative engine optimisation'). This is the growth machine that sits beneath the catalog: making our data citable, measuring whether the AIs actually cite us, and building the authority that makes them trust us."
      />

      <Section title="The two games: SEO and GEO" audience="everyone">
        <p>
          <strong>SEO</strong> is the familiar game: rank on Google so people click through. <strong>GEO</strong> is
          the newer one: when someone asks ChatGPT or Perplexity &ldquo;what&rsquo;s the best free AI image
          tool?&rdquo;, we want our data to be the source the AI quotes. Both matter, and they reinforce each
          other — the same trustworthy, original, well-structured data wins in both.
        </p>
        <p>
          The core insight from our diagnosis: our pages weren&rsquo;t thin and our content was good — the
          gap was <strong>authority</strong> (almost no other sites linked to us) and <strong>citability</strong>{' '}
          (the AIs had no easy, machine-readable way to quote our data). So we built engines for both.
        </p>
      </Section>

      <Section title="What we built" audience="everyone">
        <ul className="ml-4 list-disc space-y-2">
          <li>
            <strong>A citation scoreboard.</strong> A weekly automated check asks the major AI engines real
            buyer questions and records whether they cite RightAIChoice — so we can <em>measure</em> GEO, not
            guess. Surfaced in <Code>/admin/ai-citations</Code>, emailed weekly.
          </li>
          <li>
            <strong>A citable dataset.</strong> Machine-readable feeds of our catalog the AIs can ingest —{' '}
            <Code>/llms.txt</Code>, <Code>/llms-full.txt</Code>, <Code>/llms.jsonl</Code> — plus a public{' '}
            <strong>State of AI Tools</strong> report and per-category breakdowns that give journalists and
            models a concrete, current statistic to quote.
          </li>
          <li>
            <strong>An authority engine.</strong> A directory-submission pipeline + a weekly backlink monitor
            that detects when a listing actually links back to us and records it in the referring-domain
            ledger (<Code>/admin/authority</Code>).
          </li>
          <li>
            <strong>A digital-PR engine.</strong> Turns our live data into newsworthy story angles and drafts
            a tailored pitch per outlet — so we earn links from real coverage, not link schemes.
          </li>
          <li>
            <strong>An originality guard.</strong> Editorial content carries a disclosure (model mixture +
            human review) and is checked so we publish genuinely useful, original analysis.
          </li>
        </ul>
      </Section>

      <Section title="How it works, technically" audience="technical">
        <p>
          The citation tracker runs as a weekly cron (a free Gemini-based engine after the Anthropic-credit
          pivot), querying a fixed question set and logging hits to a Postgres table the admin reads. The
          citable feeds are generated from the same <Code>lib/geo/llms-dataset.ts</Code> that powers the
          report, so they never drift from the live catalog. The authority side reuses the pipeline-logging
          + cron infrastructure (<Code>authority-check</Code>) and the referring-domains schema. Everything is
          documented in <Code>docs/automated-pipelines/11-geo-and-authority.md</Code> and the dated activity
          log under <Code>docs/GEO AND SEO upgrades and updates/</Code>.
        </p>
      </Section>

      <Callout tone="good" title="Why this is the foundation">
        Authority and citability compound. Every earned link and every AI citation makes the next one easier,
        and lifts both Google rankings and answer-engine mentions at once. It&rsquo;s slow at first and then
        accelerates — which is why we measure it weekly rather than waiting for a vanity spike.
      </Callout>

      <Callout tone="note" title="Where to look">
        <span className="flex flex-col gap-1">
          <span><LinkIcon className="mr-1 inline h-3.5 w-3.5" /><Code>/admin/ai-citations</Code> — are the AIs citing us?</span>
          <span><Globe className="mr-1 inline h-3.5 w-3.5" /><Code>/admin/authority</Code> — who links to us?</span>
          <span><Quote className="mr-1 inline h-3.5 w-3.5" /><Code>/state-of-ai-tools</Code> — the public citable report</span>
          <span><Sparkles className="mr-1 inline h-3.5 w-3.5" /><Code>docs/GEO AND SEO upgrades and updates/</Code> — the full activity log</span>
        </span>
      </Callout>

      <GuideFooterNav
        prev={{ href: '/admin/resources/data-pipelines', label: 'How the catalog stays fresh' }}
        next={{ href: '/admin/resources/social', label: 'Social media automation' }}
      />
    </div>
  )
}
