// Phase 11 — Resources §7: How the catalog stays fresh. The data-layer companion
// to the tracking guides: how ~2,000 tools stay accurate on their own, how a change
// propagates everywhere, how the Viability Score works, and what it all costs. Plain
// English first, then the mechanics. Canonical deep-dive lives in
// docs/automated-pipelines/README.md (kept in sync with every pipeline change).

import { RefreshCw, Newspaper, GitBranch, ShieldAlert, DollarSign, Workflow } from 'lucide-react'
import { GuideHeader, Section, Callout, Code } from '../_components'

export const metadata = { title: 'How the catalog stays fresh — Learning guide' }

const STAGES = [
  {
    icon: Newspaper,
    title: '1 · We watch the whole web for each tool',
    body: 'Every night a job sweeps changelogs, tech press, Hacker News and Reddit for each tool and records what changed into a "latest news" feed. This is the freshness signal everything else builds on.',
  },
  {
    icon: RefreshCw,
    title: '2 · We rewrite each tool’s profile from that news',
    body: 'A light refresh re-writes the 9 core fields (description, verdict, features, pricing, etc.) every 2–3 days; a deep refresh rewrites all 22 fields (FAQs, pricing tiers, migration notes…) every ~7 days. Both are told: when the news contradicts the vendor’s own (often dated) website, the news wins.',
  },
  {
    icon: GitBranch,
    title: '3 · One change updates every page that mentions the tool',
    body: 'When a tool’s data changes, every page that references it — its own page, comparisons, category and best-of pages, and articles — re-renders automatically within the hour, so nothing across the site contradicts itself.',
  },
  {
    icon: ShieldAlert,
    title: '4 · We score how likely each tool is to survive',
    body: 'The Viability Score (0–100) flags tools at risk of shutting down so we can warn buyers off them.',
  },
] as const

export default function DataPipelinesPage() {
  return (
    <div>
      <GuideHeader
        icon={<Workflow className="h-6 w-6 text-emerald-500" />}
        title="How the catalog stays fresh"
        subtitle="The plain-English version of the machine that keeps ~2,000 tool profiles accurate on their own, with almost no one touching them day to day. The full technical playbook — every scheduled job in order — lives in docs/automated-pipelines/README.md."
      />

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STAGES.map((s) => (
          <div key={s.title} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <s.icon className="h-5 w-5 text-emerald-400 mb-2" />
            <h3 className="text-sm font-semibold text-white mb-1">{s.title}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>

      <Section title="Why this matters (the freshness fix)">
        <p>
          Stale data is the fastest way to lose trust on a discovery site. For a long time some flagship
          tools (Claude, Gemini, Perplexity, Grok) showed outdated facts — the classic example was Claude’s
          page claiming a &ldquo;100k context window&rdquo; long after the real number had moved on. The root cause
          was twofold: the refresh never fed the fresh news into the rewrite, and those vendors’ sites block
          our scraper (Cloudflare / JavaScript-only pages), so the old code quietly <em>kept</em> the stale text
          rather than risk rewriting from nothing. Both are now fixed — the refresh always sees the news, and
          when a site can’t be read it rewrites from the existing profile + the news + the model’s own
          knowledge (and, crucially, never restates a specific number it can’t confirm).
        </p>
      </Section>

      <Section title="The Viability Score, in detail">
        <p>It combines four real signals into a single 0–100 number (≥70 safe, 40–69 moderate, &lt;40 at-risk):</p>
        <ul className="mt-2 ml-5 list-disc space-y-1 text-zinc-400">
          <li><strong className="text-zinc-300">Momentum (40%)</strong> — how recently the tool actually shipped or was covered, from the news feed. A launch last quarter = alive; newest signal 2+ years old = abandonment risk.</li>
          <li><strong className="text-zinc-300">Wrapper dependency (30%)</strong> — is it a thin wrapper over someone else’s model with no moat? Judged per tool by the deep refresh.</li>
          <li><strong className="text-zinc-300">Revenue model (20%)</strong> — a paid/freemium tier signals a real revenue path.</li>
          <li><strong className="text-zinc-300">Website presence (10%)</strong> — a live site + pricing page.</li>
        </ul>
        <p className="mt-2">
          The wrapper flag fills in as the deep refresh cycles the whole catalog (~7 days), so the at-risk
          list populates over that window. (Per-category mortality and automated big-platform-overlap
          detection are on the roadmap — we ship the four signals we can stand behind rather than padding it.)
        </p>
      </Section>

      <Callout tone="good" title="It all logs itself — and we know what it costs">
        <p>
          Every scheduled job writes one row to <Code>pipeline_runs</Code> (what it did, how long, how many
          tokens, and the real dollar cost) and is visible at <Code>/admin/health</Code>. Total AI spend is
          roughly <strong>$130–200/month</strong> — the synthesis runs on DeepSeek, ~8–10× cheaper than the big
          model names. If something looks stale, <Code>/admin/health</Code> + <Code>pipeline_runs</Code> are the
          first place to look. The complete operator runbook is{' '}
          <span className="text-zinc-300">docs/automated-pipelines/</span> in the repo.
        </p>
      </Callout>

      <div className="mt-8 flex items-center gap-2 text-sm text-zinc-500">
        <DollarSign className="h-4 w-4" />
        Canonical, always-current source: <Code>docs/automated-pipelines/README.md</Code>
      </div>
    </div>
  )
}
