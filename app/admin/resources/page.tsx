// Phase 10.8 — Resources landing / learning-guide index. Replaces the
// "Coming in Phase 8" placeholder. One card per guide section; the two
// auto-generated sections (event dictionary, metric provenance) are derived
// at render time from lib/analytics-schema.ts and lib/admin/metric-docs.ts so
// they can never drift from the live system.

import {
  BookOpen,
  Workflow,
  Cpu,
  ListTree,
  ShieldCheck,
  GanttChartSquare,
  BookMarked,
  RefreshCw,
  Search,
  Share2,
} from 'lucide-react'
import { GuideCard, GuideHeader, Callout } from './_components'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'
import { METRIC_DOCS } from '@/lib/admin/metric-docs'

export const metadata = { title: 'Learning guide — Admin' }

export default function ResourcesIndexPage() {
  const eventCount = SCHEMA_EVENT_NAMES.length
  const metricCount = Object.keys(METRIC_DOCS).length

  return (
    <div>
      <GuideHeader
        icon={<BookOpen className="h-6 w-6 text-emerald-500" />}
        title="Learning guide"
        subtitle="Everything this admin panel knows about the website's visitors — what we capture, how it travels from a browser to these screens, and why every number here can be trusted. Written for two readers at once: the owner (plain English) and a future engineer (the exact mechanics). The event dictionary and metric cards are generated live from the system itself, so they always describe reality, not a stale doc."
      />

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <GuideCard
          href="/admin/resources/tracking-overview"
          step="1 · the story"
          title="How tracking works"
          blurb="The non-technical version: a visitor's browser → our tracking code → Mixpanel + our own database → these admin screens. With a simple pipeline diagram."
          icon={<Workflow className="h-5 w-5" />}
        />
        <GuideCard
          href="/admin/resources/tracking-technical"
          step="2 · under the hood"
          title="How tracking works, technically"
          blurb="capture() → queue → /api/track-mirror → user_events + intent profile. Identity stitching, sessions, bot detection, dedup, the outage retry queue, and tag-don't-drop schema validation."
          icon={<Cpu className="h-5 w-5" />}
        />
        <GuideCard
          href="/admin/resources/event-dictionary"
          step="3 · reference"
          title="Event dictionary"
          blurb={`Every one of the ${eventCount} events we fire — plain-English meaning, every property, lifecycle status, and a link to its live detail page. Generated from the schema registry.`}
          icon={<ListTree className="h-5 w-5" />}
        />
        <GuideCard
          href="/admin/resources/metrics"
          step="4 · reference"
          title="Metric provenance cards"
          blurb={`For each of the ${metricCount} headline metrics: what it counts, how it's computed, why it's trusted, and its caveats — the same content behind every ⓘ popover.`}
          icon={<GanttChartSquare className="h-5 w-5" />}
        />
        <GuideCard
          href="/admin/resources/trust"
          step="5 · trust"
          title="Trust & verification"
          blurb="The eight independent ways we keep these numbers honest, a 'this number looks wrong' runbook, and our data-privacy / retention posture."
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <GuideCard
          href="/admin/resources/glossary"
          step="6 · reference"
          title="Glossary & FAQ"
          blurb="distinct_id vs user, session, bot flag, UTM, first touch, IST windows, data epochs — every term that appears on these screens, defined once."
          icon={<BookMarked className="h-5 w-5" />}
        />
        <GuideCard
          href="/admin/resources/data-pipelines"
          step="7 · the catalog"
          title="How the catalog stays fresh"
          blurb="The data-layer machine: how ~2,000 tools refresh themselves from live news, how one change propagates to every page, how the Viability Score works, and what it costs. Plain English + the link to the full pipelines playbook."
          icon={<RefreshCw className="h-5 w-5" />}
        />
        <GuideCard
          href="/admin/resources/geo-seo"
          step="8 · growth"
          title="GEO & SEO upgrades"
          blurb="How we get found by Google AND by AI answer engines: the citation scoreboard, the machine-readable citable dataset, and the authority + digital-PR engines that earn the links and mentions."
          icon={<Search className="h-5 w-5" />}
        />
        <GuideCard
          href="/admin/resources/social"
          step="9 · growth"
          title="Social media automation"
          blurb="The in-house tool that researches, writes, designs, and posts to LinkedIn / X / Instagram / Reddit on schedule — pending your one-tap approval. Smart SOPs, branded graphics, a hard X budget cap."
          icon={<Share2 className="h-5 w-5" />}
        />
      </div>

      <Callout tone="good" title="The promise behind this guide">
        Two of these sections — the <strong>event dictionary</strong> and the{' '}
        <strong>metric provenance cards</strong> — are not written by hand. They are generated at
        page-load time from the same source files that power the live tracking code and the ⓘ
        popovers on the dashboard. If an event or a metric changes, this guide changes with it on
        the next page view. There is no second copy to keep in sync.
      </Callout>
    </div>
  )
}
