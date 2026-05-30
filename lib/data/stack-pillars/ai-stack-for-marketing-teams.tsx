import type { StackConfig } from '../stacks'

/**
 * Phase 9 — decision-engine pillar stack #3.
 *
 * Target query family: "ai stack for marketing teams" / "ai marketing tools
 * stack" / "marketing team ai workflow". Distinct from the content-creators
 * stack (solo, owned audience) and the marketing-seo cornerstone (tool
 * roundup): this is the opinionated stack for a small in-house marketing
 * team running demand gen + content + outbound. All picks verified in catalog.
 */
export const aiStackForMarketingTeams: StackConfig = {
  slug: 'ai-stack-for-marketing-teams',
  title: 'The AI Stack for Marketing Teams (2026)',
  goal: 'Run a full-funnel marketing team on AI',
  description:
    'The hand-picked AI tools we recommend for a small in-house marketing team in 2026 — research, SEO content, copy, ad creative, video, social, prospecting, and outreach, with monthly cost rolled up.',
  stages: [
    {
      name: 'Strategy & Research',
      description:
        'Market research, positioning, competitor teardowns, and the "what should we say?" layer — answered with sources, not vibes.',
      bestPick: {
        name: 'Perplexity',
        slug: 'perplexity',
        reason:
          'Cited, live-web research is the safest surface for competitor and market work — every claim links to a source you can verify before it goes in a deck.',
        pricing: '$20/mo',
        tags: ['research', 'strategy'],
      },
      alternatives: [
        {
          name: 'Claude',
          slug: 'claude',
          reason:
            'Best for synthesis — turning a pile of transcripts, reviews, and data into positioning and messaging.',
          pricing: '$20/mo',
        },
        {
          name: 'ChatGPT',
          slug: 'chatgpt',
          reason:
            'Strong all-rounder; pick it if the team already standardizes on it for analysis and data work.',
          pricing: '$20/mo',
        },
      ],
      costEstimate: '$20/mo',
    },
    {
      name: 'SEO Content',
      description:
        'Briefs and on-page optimization for content that has to rank — scored against the pages already winning the SERP.',
      bestPick: {
        name: 'Surfer SEO',
        slug: 'surfer-seo',
        reason:
          'The category standard for writing to a data-backed SERP brief. Content Editor scoring keeps writers (and AI drafts) on-target for the keyword.',
        pricing: 'From $99/mo',
        tags: ['seo', 'content'],
      },
      alternatives: [
        {
          name: 'Frase',
          slug: 'frase',
          reason:
            'Cheaper brief-and-optimize workflow; the budget pick for teams publishing a few briefs a week.',
          pricing: 'From $45/mo',
        },
        {
          name: 'Clearscope',
          slug: 'clearscope',
          reason:
            'Premium pick for content agencies — cleaner reports and the most trusted relevance scoring, at a higher price.',
          pricing: 'From $189/mo',
        },
      ],
      costEstimate: '$45–189/mo',
    },
    {
      name: 'Marketing Copy',
      description:
        'On-brand ads, emails, and landing-page copy at volume — with a trained brand voice the raw models lack.',
      bestPick: {
        name: 'Jasper',
        slug: 'jasper',
        reason:
          'Brand-voice training, campaign workflows, and team collaboration. The default once "stay on brand across 100 assets" is the real requirement.',
        pricing: 'From $49/mo',
        tags: ['copywriting', 'brand'],
      },
      alternatives: [
        {
          name: 'Copy.ai',
          slug: 'copy-ai',
          reason:
            'Workflow-first GTM plays (outbound, landing pages) and a more generous free tier — a better starting point for small teams.',
          pricing: 'From $49/mo',
        },
        {
          name: 'Anyword',
          slug: 'anyword',
          reason:
            'Performance-prediction scoring on copy — pick it when you A/B test ad and email copy heavily.',
          pricing: 'From $49/mo',
        },
      ],
      costEstimate: '$49/mo',
    },
    {
      name: 'Ad Creative',
      description:
        'Conversion-focused visual creative and variants for paid social and display — generated and scored, not designed from scratch.',
      bestPick: {
        name: 'AdCreative.ai',
        slug: 'adcreative-ai',
        reason:
          'Purpose-built for performance ad creative — generates on-brand variants at scale with a conversion score, then feeds your ad accounts directly.',
        pricing: 'From $39/mo',
        tags: ['ads', 'creative'],
      },
      alternatives: [
        {
          name: 'Canva',
          slug: 'canva',
          reason:
            'The design all-rounder — brand kit, templates, and Magic tools cover 90% of non-ad visual output a team needs.',
          pricing: '$13/mo',
        },
        {
          name: 'Predis.ai',
          slug: 'predis-ai',
          reason:
            'Social-first creative with caption + hashtag generation; good for organic social teams.',
          pricing: 'From $32/mo',
        },
      ],
      costEstimate: '$13–39/mo',
    },
    {
      name: 'Marketing Video',
      description:
        'Explainers, product demos, localized ads, and webinar repurposing — without a video team.',
      bestPick: {
        name: 'Synthesia',
        slug: 'synthesia',
        reason:
          'The enterprise standard for AI avatar video — script to studio-quality presenter video in 140+ languages, ideal for training, demos, and localized ads.',
        pricing: 'From $29/mo',
        tags: ['video', 'avatar'],
      },
      alternatives: [
        {
          name: 'HeyGen',
          slug: 'heygen',
          reason:
            'Faster, more creator-friendly avatars and best-in-class video translation/lip-sync for localizing existing footage.',
          pricing: 'From $29/mo',
        },
        {
          name: 'Descript',
          slug: 'descript',
          reason:
            'Edit recorded video/webinars by editing the transcript — the fastest path for talking-head and demo content.',
          pricing: 'From $24/mo',
        },
      ],
      costEstimate: '$24–29/mo',
    },
    {
      name: 'Social Scheduling & Listening',
      description:
        'Cross-posting across channels plus monitoring what people say about you — the consistency-and-awareness layer.',
      bestPick: {
        name: 'Publer',
        slug: 'publer',
        reason:
          'Cheapest serious cross-poster with AI assist (caption rewrites, optimal-time scheduling) and the widest platform coverage at the entry tier.',
        pricing: 'From $12/mo',
        tags: ['social', 'scheduling'],
      },
      alternatives: [
        {
          name: 'Vista Social',
          slug: 'vista-social',
          reason:
            'More analytics and listening built in; better fit if reporting to stakeholders matters as much as posting.',
          pricing: 'From $39/mo',
        },
        {
          name: 'Brandwatch',
          slug: 'brandwatch',
          reason:
            'Enterprise social listening and consumer intelligence — add it (not replace Publer) when brand monitoring becomes a real function.',
          pricing: 'Custom',
        },
      ],
      costEstimate: '$12–39/mo',
    },
    {
      name: 'Prospecting & Enrichment',
      description:
        'Building and enriching target account/lead lists — the GTM data layer that feeds outbound and ABM.',
      bestPick: {
        name: 'Clay',
        slug: 'clay',
        reason:
          'Combines 50+ data sources with AI to build and enrich lists no single provider can. The modern data layer that powers everything downstream.',
        pricing: 'From $149/mo',
        tags: ['prospecting', 'data'],
      },
      alternatives: [
        {
          name: 'Apollo.io',
          slug: 'apollo-io',
          reason:
            'All-in-one database + sequencing + dialer. The pragmatic pick when you want prospecting and outreach without stitching tools together.',
          pricing: 'From $49/user/mo',
        },
        {
          name: 'HubSpot',
          slug: 'hubspot',
          reason:
            'The CRM most marketing teams already live in — its AI (Breeze) handles enrichment and lifecycle if you want one platform.',
          pricing: 'From $20/user/mo',
        },
      ],
      costEstimate: '$49–149/mo',
    },
    {
      name: 'Outreach & Sequencing',
      description:
        'Turning enriched lists into personalized outbound at scale — deliverability-first, not spray-and-pray.',
      bestPick: {
        name: 'Smartlead',
        slug: 'smartlead',
        reason:
          'Best deliverability tooling — unlimited mailboxes, auto-rotation, and warmup keep cold email landing in the inbox at scale.',
        pricing: 'From $39/mo',
        tags: ['outreach', 'email'],
      },
      alternatives: [
        {
          name: 'Lemlist',
          slug: 'lemlist',
          reason:
            'Stronger personalization (images, video, liquid variables) and a built-in lead database; pick it for higher-touch, lower-volume outbound.',
          pricing: 'From $39/mo',
        },
        {
          name: 'Apollo.io',
          slug: 'apollo-io',
          reason:
            'If you chose Apollo for prospecting, its native sequencing avoids a second tool — fine for teams under ~5k sends/mo.',
          pricing: 'From $49/user/mo',
        },
      ],
      costEstimate: '$39/mo',
    },
  ],
  summary: {
    freePath: '~$90/mo (Claude + Frase + Copy.ai free + Canva + Publer)',
    paidPath: '$400–700/mo (all picks paid, small team)',
    skillLevel: 'Intermediate',
    setupTime: '1–2 weeks',
  },
  pillar: {
    metaTitle: 'The AI Stack for Marketing Teams (2026) | RightAIChoice',
    metaDescription:
      'The exact AI tools we recommend for a small in-house marketing team in 2026 — research, SEO, copy, ad creative, video, social, prospecting, outreach — with monthly cost.',
    publishedISO: '2026-05-30',
    lastReviewedISO: '2026-05-30',
    lastReviewed: 'May 30, 2026',
    intro: (
      <div className="space-y-4 text-zinc-300 leading-relaxed">
        <p>
          If you run a small in-house marketing team and keep getting asked
          which AI tools actually deserve budget, this is the answer. Eight
          stages across the full funnel, one tool we&apos;d default to in each,
          two alternatives, monthly cost rolled up at the bottom.
        </p>
        <p>
          We deliberately don&apos;t list every tool in every category — a
          stack page exists to make a decision, not push it back to you. Each
          pick links to its{' '}
          <a href="/compare" className="text-emerald-400 no-underline hover:underline">
            head-to-head comparisons
          </a>{' '}
          if you want to drill into a close call.
        </p>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          Who this stack is for
        </h2>
        <p>
          A 2–10 person marketing team that owns demand gen, content, and some
          outbound — inside a company, not a solo creator business. You have a
          budget to defend, stakeholders to report to, and a brand to keep
          consistent across a lot of output. If you&apos;re a solo creator with
          an owned audience, the better fit is the{' '}
          <a href="/stacks/ai-stack-for-content-creators" className="text-emerald-400 no-underline hover:underline">
            AI Stack for Content Creators
          </a>
          ; if you just want a roundup of the best tools per category, see the{' '}
          <a href="/categories/marketing-seo" className="text-emerald-400 no-underline hover:underline">
            AI Marketing &amp; SEO tools
          </a>{' '}
          cornerstone.
        </p>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          How we picked
        </h2>
        <p>
          Three rules.{' '}
          <strong className="font-semibold text-white">One</strong>: every pick
          has to do something the raw model can&apos;t — score against live
          SERPs, enrich from many data sources, generate performance-tested
          creative, or protect deliverability. Generic &quot;write a blog
          post&quot; tools didn&apos;t make it.{' '}
          <strong className="font-semibold text-white">Two</strong>: it has to
          scale to a team — shared brand voice, seats, and reporting, not just a
          single-user toy.{' '}
          <strong className="font-semibold text-white">Three</strong>: it has to
          earn its line item against the alternative of hiring or agency spend.
        </p>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          When to swap a pick out
        </h2>
        <ul className="ml-5 list-disc space-y-2 marker:text-zinc-500">
          <li>
            <strong className="font-semibold text-white">You&apos;re content/SEO-led, not paid-led</strong>{' '}
            → drop AdCreative.ai, put Surfer and Jasper at the top, and add a
            second SEO seat instead.
          </li>
          <li>
            <strong className="font-semibold text-white">You&apos;re outbound/sales-led</strong>{' '}
            → Clay + Smartlead become the core; content tooling moves to
            support. Consider Apollo as the single all-in-one.
          </li>
          <li>
            <strong className="font-semibold text-white">You already live in HubSpot</strong>{' '}
            → use Breeze for enrichment and lifecycle before adding Clay; only
            add Clay when HubSpot&apos;s data coverage isn&apos;t enough.
          </li>
          <li>
            <strong className="font-semibold text-white">You localize heavily</strong>{' '}
            → swap Synthesia&apos;s emphasis to HeyGen for its translation and
            lip-sync on existing footage.
          </li>
        </ul>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          Total cost: lean path vs full team
        </h2>
        <p>
          A lean setup — Claude, Frase, Copy.ai free tier, Canva, Publer — runs
          about <strong className="font-semibold text-white">$90/month</strong>{' '}
          and covers research, content, and social for a one-or-two person team.
          The full stack with every pick paid at entry tiers for a small team
          lands around{' '}
          <strong className="font-semibold text-white">$400–700/month</strong>,
          driven mostly by Clay (enrichment credits) and Surfer/Clearscope. That
          replaces a meaningful slice of agency retainer and freelance spend —
          and unlike a retainer, it scales with usage, not headcount.
        </p>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          The 8-stage stack
        </h2>
        <p>
          Stages below follow the funnel: research, SEO content, copy, ad
          creative, video, social, prospecting, outreach. Each has our default
          pick, two alternatives, and a per-stage cost. Save the stack to your
          dashboard or export it from the sidebar.
        </p>
      </div>
    ),
    faqs: [
      {
        question: 'What is the best AI stack for a marketing team in 2026?',
        answer:
          "For a small in-house team we'd default to: Perplexity for research, Surfer SEO for content, Jasper for copy, AdCreative.ai for ads, Synthesia for video, Publer for social, Clay for prospecting, and Smartlead for outreach. Lean path ~$90/mo; full paid team stack $400–700/mo. Swap based on whether you're content-led, paid-led, or outbound-led.",
      },
      {
        question: 'How much does an AI marketing stack cost for a team?',
        answer:
          'A lean path (Claude + Frase + Copy.ai free + Canva + Publer) is about $90/month. The full stack with all eight stages paid at entry tiers for a small team is $400–700/month, with Clay enrichment credits and premium SEO tools (Surfer/Clearscope) the biggest line items. It scales with usage rather than headcount, which is the advantage over agency retainers.',
      },
      {
        question: 'Is this different from the AI tools for content creators?',
        answer:
          "Yes. The content-creators stack is for a solo operator building an owned audience (newsletter/YouTube/social) and optimizes for one person's time. This marketing-teams stack is for an in-house team running demand gen and outbound — it weights brand consistency at scale, prospecting/outreach, and reporting, and includes tools (Clay, Smartlead, Surfer) a solo creator usually wouldn't need.",
      },
      {
        question: 'What is the best AI tool for SEO content for teams?',
        answer:
          'Surfer SEO is the team standard — it scores drafts against live SERP data so writers and AI stay on-target. Frase is the budget alternative; Clearscope is the premium agency pick with the most trusted relevance scoring. See the Frase vs Surfer SEO and Clearscope vs Surfer SEO comparisons.',
      },
      {
        question: 'Clay or Apollo for prospecting?',
        answer:
          'Clay is the more powerful data layer — it enriches from 50+ sources and powers downstream tools, but it has a learning curve and credit-based pricing. Apollo.io is the pragmatic all-in-one (database + sequencing + dialer) for teams that want one tool. Many teams use Clay for enrichment and a dedicated sender (Smartlead/Lemlist) for outreach.',
      },
      {
        question: 'What is the best AI video tool for marketing?',
        answer:
          'Synthesia is the enterprise standard for avatar video (training, demos, localized ads in 140+ languages). HeyGen is stronger for video translation and lip-sync on existing footage. Descript is best for editing recorded webinars and talking-head content by editing the transcript.',
      },
      {
        question: 'How often should a marketing team re-evaluate its AI stack?',
        answer:
          'Every quarter. Ad creative, video, and AI-visibility tooling move fastest; SEO and CRM are more stable. Avoid annual contracts in the fast-moving categories until the leader is clear, and re-check the AI-answer-visibility space (getting cited in ChatGPT/Perplexity/Google AI Overviews) — it is becoming a real marketing channel.',
      },
    ],
  },
}
