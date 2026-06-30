// Phase 13 R2 — Resources §9: Social media automation. Plain-English + technical
// tour of the in-house social tool, for the owner and a future engineer. The live
// tool is at /admin/social; full deep-dive at docs/automated-pipelines/13-social-automation.md.

import { Share2, Bot, ImageIcon, ShieldCheck, Clock, BarChart3 } from 'lucide-react'
import { GuideHeader, Section, Callout, Code, GuideFooterNav } from '../_components'

export const metadata = { title: 'Social media automation — Learning guide' }

export default function SocialGuidePage() {
  return (
    <div>
      <GuideHeader
        icon={<Share2 className="h-6 w-6 text-emerald-500" />}
        title="Social media automation"
        subtitle="Our in-house tool that researches what to post, writes it, designs a branded image, and posts on schedule from the cloud across LinkedIn, X, Instagram and Reddit — all pending your one-tap approval. Like Buffer/Hootsuite, but built in, free, and wired to our own live data."
      />

      <Section title="The newsroom that runs itself" audience="everyone">
        <p>Think of it as a small newsroom with a strict editor:</p>
        <ol className="ml-4 list-decimal space-y-1">
          <li><strong>Researcher</strong> reads our live tool data each day and finds what&rsquo;s worth posting.</li>
          <li><strong>Writer</strong> drafts a proper post per platform — punchy for X, professional for LinkedIn — using only true facts.</li>
          <li><strong>Designer</strong> makes an on-brand image (free, rendered from code).</li>
          <li><strong>Safety editor</strong> checks every draft against strict rules before it can be queued.</li>
          <li><strong>You</strong> approve, edit, reschedule, or reject in <Code>/admin/social</Code> — one tap.</li>
          <li><strong>Dispatch desk</strong> (cloud cron) posts approved items at the right time — laptop can be off.</li>
          <li><strong>Analyst</strong> watches engagement and tells the writer what to make more of.</li>
        </ol>
        <p><strong>Nothing posts without your approval, and no platform posts at all until you connect its account.</strong></p>
      </Section>

      <Section title="What makes it smart" audience="everyone">
        <ul className="ml-4 list-disc space-y-2">
          <li><Clock className="mr-1 inline h-3.5 w-3.5" /><strong>Best-time posting</strong> — schedules each post in the hour that has historically performed best.</li>
          <li><BarChart3 className="mr-1 inline h-3.5 w-3.5" /><strong>UTM tracking</strong> — tags every link so Google Analytics shows exactly what social drives.</li>
          <li><ImageIcon className="mr-1 inline h-3.5 w-3.5" /><strong>Branded image on every platform</strong> — plus X/Reddit threads and an Instagram first-comment link.</li>
          <li><ShieldCheck className="mr-1 inline h-3.5 w-3.5" /><strong>Guardrails</strong> — truth-only sourcing, banned-buzzword voice gate, no-repeat dedup, no-burst spacing, a hard X budget cap, and strict Reddit anti-ban rules.</li>
          <li><Bot className="mr-1 inline h-3.5 w-3.5" /><strong>Recycling &amp; A/B</strong> — can rephrase a top performer into a fresh post, or test two versions.</li>
        </ul>
      </Section>

      <Section title="Per-platform views + this week's strategy" audience="everyone">
        <p>
          The dashboard has a tab for each network (plus an Overview). On each platform tab you&rsquo;ll see
          <strong> this week&rsquo;s strategy</strong> — a short plan the AI writes every Monday from how last
          week actually performed: the week&rsquo;s focus, content themes, recommended formats, posting cadence,
          and why — always pointed at the two goals (<strong>brand awareness</strong> and{' '}
          <strong>more engagement &amp; users</strong>). It&rsquo;s not just a card to read: that plan is fed
          into the writer, so the week&rsquo;s drafts actually follow the strategy. Hit{' '}
          <strong>Regenerate</strong> any time to rebuild it from the latest results.
        </p>
      </Section>

      <Section title="The steps every post goes through" audience="everyone">
        <p>Whatever the platform, a post travels the same seven steps:</p>
        <ol className="ml-4 list-decimal space-y-1">
          <li><strong>Monday — the weekly plan.</strong> Per platform, the AI reviews how last week performed and writes that week&rsquo;s strategy (focus, themes, formats, cadence), aimed at the two goals.</li>
          <li><strong>Each morning — drafting.</strong> It researches our live tool data, picks what&rsquo;s worth posting, and writes a post tailored to that platform&rsquo;s style — steered by the week&rsquo;s strategy — and chooses a branded image.</li>
          <li><strong>Safety gate.</strong> Before anything is queued: truth-only (must cite real data), brand-voice (no buzzwords), the platform&rsquo;s format rules, and no-repeat. Anything that fails is dropped, not queued.</li>
          <li><strong>Smart scheduling.</strong> It books a good time slot — the hour that historically performs best for that platform, respecting the daily cap and minimum spacing (no bursts).</li>
          <li><strong>You approve.</strong> It appears in that platform&rsquo;s tab as a draft with its image; you approve, edit, reschedule, or reject. <strong>Nothing posts unapproved.</strong></li>
          <li><strong>Auto-post from the cloud</strong> at the scheduled time (laptop can be off), with the branded image and a tracked link.</li>
          <li><strong>Measure &amp; learn.</strong> It collects engagement, which feeds next week&rsquo;s plan and the best-time scheduling.</li>
        </ol>
      </Section>

      <Section title="Each platform's rules (SOPs)" audience="everyone">
        <p><strong>LinkedIn</strong> — company-page posts. Professional, data-led, opens with the insight (not &ldquo;Hi everyone&rdquo;); aim for 3&ndash;6 tight sentences (≤3,000 chars), <strong>≤3 hashtags</strong>, a link is fine (LinkedIn shows a preview card), branded image attached. <strong>Max 1/day</strong>, ≥4h apart, weekday business hours (~9am&ndash;12pm US-Eastern). Goal: credibility &amp; awareness.</p>
        <p><strong>X / Twitter</strong> — <strong>≤280 characters</strong> (a link only counts as 23), ≤2 hashtags, can post threads, image attached. <strong>Paid</strong> — protected by a hard monthly budget cap; the pricier link-posts are blocked first as the cap nears. Up to 3/day, ≥2h apart.</p>
        <p><strong>Instagram</strong> — <strong>image is mandatory</strong>; caption up to 2,200 chars with curated hashtags. Instagram doesn&rsquo;t allow links in captions, so the link is posted as the <strong>first comment</strong> automatically. Max 1/day.</p>
        <Callout tone="warn" title="Reddit — the strictest by design">
          Reddit punishes anything that smells like an ad. So: <strong>value-first, framed as data/discussion</strong>,
          <strong> no hashtags</strong>, only <strong>approved subreddits</strong>, only from an <strong>aged account</strong>
          (≥30 days, ≥50 karma), <strong>never the same link across multiple subreddits</strong>, max 1 post per
          subreddit per week, and <strong>always your manual approval</strong>. These rules are enforced in code and
          re-checked again right before posting.
        </Callout>
        <p className="text-zinc-500">Across all four: truth-only sourcing, the brand-voice gate, no-repeat/dedup, the mandatory approval gate, and an hourly login-refresh so connections never silently expire.</p>
      </Section>

      <Section title="How it works, technically" audience="technical">
        <p>
          Six Vercel crons: <Code>social-strategy</Code> (weekly Mon, crafts each platform&rsquo;s plan →{' '}
          <Code>social_strategies</Code>, feeds the brain), <Code>social-draft</Code> (daily, research→draft),{' '}
          <Code>social-publish</Code> (every 15 min, posts approved+due with an atomic claim so overlapping
          runs can&rsquo;t double-post), <Code>social-metrics</Code> (6-hourly), <Code>social-approval-digest</Code>{' '}
          (daily email), and <Code>social-token-refresh</Code> (daily). Copy via DeepSeek (~$0.001/draft);
          graphics via <Code>next/og</Code> ($0). Platform-agnostic publishers light up only when{' '}
          <Code>{'<PLATFORM>_ENABLED=1'}</Code> and a connected, non-paused account exist. The SOP rulebook
          (<Code>lib/social/sops.ts</Code>) is pure + unit-tested (123 tests). Tables: <Code>social_posts</Code>,{' '}
          <Code>social_accounts</Code>, <Code>social_metrics</Code>, <Code>social_strategies</Code>. Full deep-dive:{' '}
          <Code>docs/automated-pipelines/13-social-automation.md</Code>.
        </p>
      </Section>

      <Section title="The one paid lever: X" audience="everyone">
        <p>
          LinkedIn, Instagram and Reddit are free. X charges per post, so the tool tracks spend against a{' '}
          <strong>hard monthly cap you set</strong> (<Code>X_MONTHLY_CAP_USD</Code>), blocks the pricier
          link-posts first as it nears the cap, and shows a live budget meter in <Code>/admin/social</Code>.
        </p>
      </Section>

      <Callout tone="warn" title="To go live: connect the accounts">
        The engine is built, tested, and <strong>safe-off</strong>. The only step left to actually post is
        connecting each platform&rsquo;s account — the click-by-click is in{' '}
        <Code>docs/Phase 13 Social Media Automation/operator-setup.md</Code> (Reddit &amp; X take minutes;
        LinkedIn &amp; Instagram need a 2–4 week app review).
      </Callout>

      <GuideFooterNav prev={{ href: '/admin/resources/geo-seo', label: 'GEO & SEO upgrades' }} />
    </div>
  )
}
