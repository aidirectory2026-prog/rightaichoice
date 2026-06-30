/**
 * Seed TOMORROW's manual-posting set: 2 number-free, platform-tailored posts per
 * platform (LinkedIn / X / Instagram / Reddit), each with a branded graphic + a
 * "reason". Cancels any existing draft/approved posts first for a clean slate.
 * Run: npm run social:seed-launch
 */
export {}

import { getAdminClient } from '../../lib/cron/supabase-admin'
import { contentHash } from '../../lib/social/sops'
import { withUtm } from '../../lib/social/util'
import type { Platform } from '../../lib/social/types'

const SITE = 'https://rightaichoice.com'
const REPORT = 'https://rightaichoice.com/state-of-ai-tools'

function tomorrowAt(hourUTC: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  d.setUTCHours(hourUTC, 0, 0, 0)
  return d.toISOString()
}

const QUOTE_HYPE = { quote: 'The right AI tool isn’t the most hyped — it’s the one that still works next month.', attribution: 'RightAIChoice' }
const QUOTE_DIE = { quote: 'Don’t build your workflow on an AI tool that’s about to die.', attribution: 'RightAIChoice' }
const ROUNDUP_3Q = { headline: '3 questions before you pick an AI tool', items: ['Will it still exist in a year?', 'What does it really cost at your usage?', 'Does it nail the one job you need?'], date: 'rightaichoice.com' }
const QUOTE_FREE = { quote: '“Free” AI tools are rarely the cheapest once you hit the limits.', attribution: 'RightAIChoice' }

type Seed = {
  platform: Platform; body: string; link: string; template: string; data: Record<string, unknown>
  reason: string; hashtags: string[]; hour: number; subreddit?: string; title?: string
}

const SEEDS: Seed[] = [
  // ── LinkedIn (professional, insight-first, <=3 hashtags) ──
  {
    platform: 'linkedin', hour: 13,
    body: `Most "best AI tools" lists are scraped once and never touched again. We re-verify every tool we track — every week. In a space moving this fast, stale data isn't a small problem; it's the whole problem. That's the gap we exist to close.`,
    link: SITE, template: 'quote', data: QUOTE_HYPE, hashtags: ['#AITools', '#AI'],
    reason: 'Leads with our core credibility (freshness) — the #1 trust signal for a decision engine, and the perfect first impression on a professional feed.',
  },
  {
    platform: 'linkedin', hour: 15,
    body: `Before you adopt an AI tool, three questions save months of regret: 1) Will it still exist in a year? 2) What does it really cost at your usage? 3) Does it nail the one job you need? We score every tool against exactly these.`,
    link: SITE, template: 'news_roundup', data: ROUNDUP_3Q, hashtags: ['#AITools'],
    reason: 'A save-able decision framework — value-first content that earns shares and positions us as the layer people decide with.',
  },
  // ── X (punchy, <=280, link counts as 23) ──
  {
    platform: 'x', hour: 13,
    body: `A lot of AI tools trending today won't exist next year. We score every tool on survival risk — so you don't build your stack on one that's about to disappear.`,
    link: REPORT, template: 'quote', data: QUOTE_DIE, hashtags: ['#AITools'],
    reason: 'Contrarian, punchy hook with high shareability; states our unique viability angle in one line.',
  },
  {
    platform: 'x', hour: 17,
    body: `The most-hyped AI tool is rarely the right one for you. We rank on what actually matters: does it last, does it deliver, and what does it really cost.`,
    link: SITE, template: 'quote', data: QUOTE_HYPE, hashtags: ['#AITools'],
    reason: 'Sharp positioning line — memorable and defines exactly what we stand against (hype).',
  },
  // ── Instagram (image-first, more hashtags, link -> first comment) ──
  {
    platform: 'instagram', hour: 16,
    body: `Most "best AI tools" lists are scraped once and left to rot. We re-verify every tool we track, every week — so you pick what actually works, not what's loudest. 🔎 Link in the first comment.`,
    link: SITE, template: 'quote', data: QUOTE_HYPE,
    hashtags: ['#AITools', '#ArtificialIntelligence', '#productivity', '#SaaS', '#techtools', '#AInews', '#toolstack', '#startups'],
    reason: 'Visual credibility post; IG scans images first, so the branded quote card carries it while the caption builds context.',
  },
  {
    platform: 'instagram', hour: 18,
    body: `"Free" AI tools can quietly cost more than paid ones once you hit the limits and the upsells. We break down what each tool really costs — before you commit. 🔎 Link in the first comment.`,
    link: SITE, template: 'quote', data: QUOTE_FREE,
    hashtags: ['#AITools', '#ArtificialIntelligence', '#productivity', '#SaaS', '#pricing', '#techtools', '#AInews'],
    reason: 'Relatable money angle — high save/share intent on IG; the card makes the point scannable.',
  },
  // ── Reddit (value-first DISCUSSION, no hashtags, allowlisted sub) ──
  {
    platform: 'reddit', hour: 14, subreddit: 'artificial',
    title: 'After testing a lot of AI tools, I keep coming back to 3 questions before adopting any',
    body: `1) Will it still exist in a year? 2) What does it really cost at my actual usage? 3) Does it nail the one job I need?\n\nCurious how others here decide — what's your filter before you commit to a tool? (I've been building something that scores AI tools on exactly this: rightaichoice.com)`,
    link: SITE, template: 'news_roundup', data: ROUNDUP_3Q, hashtags: [],
    reason: 'Framed as genuine discussion, not an ad — Reddit-safe. Invites replies and only softly mentions the brand at the end.',
  },
  {
    platform: 'reddit', hour: 16, subreddit: 'SaaS',
    title: 'How do you avoid building your workflow on an AI tool that dies 6 months later?',
    body: `Half the tools trending now probably won't exist next year. I've started scoring tools on survival risk (momentum, real adoption, wrapper-vs-original) before committing anything to them.\n\nHow do you all de-risk this? Curious what signals you look at.`,
    link: SITE, template: 'quote', data: QUOTE_DIE, hashtags: [],
    reason: 'Pain-point discussion that fits r/SaaS; positions our viability score without selling.',
  },
]

const SIZE: Record<Platform, string> = { linkedin: '1200x675', x: '1200x675', instagram: '1080x1080', reddit: '1200x675' }

async function main() {
  const db = getAdminClient()
  // Clean slate: cancel anything still pending so the page shows only this set.
  const cancelled = (await db.from('social_posts').update({ status: 'cancelled', updated_at: new Date().toISOString() } as never).in('status', ['draft', 'approved', 'scheduled']).select('id')) as { data: { id: string }[] | null }
  console.log(`cancelled ${(cancelled.data ?? []).length} existing pending posts`)

  for (const s of SEEDS) {
    const utm = withUtm(s.link, s.platform)
    const copy = s.platform === 'x' ? `${s.body} ${utm} ${s.hashtags.join(' ')}`.trim() : s.body
    const row = {
      platform: s.platform,
      kind: s.template,
      status: 'draft',
      copy,
      hashtags: s.platform === 'x' ? [] : s.hashtags,
      link_url: utm,
      graphic_template: s.template,
      graphic_data: s.data,
      graphic_size: SIZE[s.platform],
      subreddit: s.subreddit ?? null,
      source_refs: [{ title: 'RightAIChoice', url: s.link }],
      content_hash: contentHash({ platform: s.platform, kind: s.template as never, angle: `tomorrow ${s.reason.slice(0, 30)}` }),
      brain_meta: { angle: s.reason, reason: s.reason, title: s.title ?? null, curated: true },
      scheduled_at: tomorrowAt(s.hour),
    }
    const r = (await db.from('social_posts').insert(row as never).select('id').single()) as { data: { id: string } | null; error: { message: string } | null }
    console.log(r.error ? `✗ ${s.platform}: ${r.error.message}` : `✓ ${s.platform} @${s.hour}:00Z id=${r.data!.id}`)
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
