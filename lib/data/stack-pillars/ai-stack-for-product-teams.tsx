import type { StackConfig } from '../stacks'

/**
 * Phase 9 — decision-engine pillar stack #5.
 *
 * Target query family: "ai stack for product teams" / "ai tools for product
 * managers" / "product team ai workflow". Buildable as a true end-to-end stack
 * after the catalog gap-fill added the PM/collab/BI platforms (Linear, Jira,
 * Notion, Miro, Airtable, Amplitude…). All picks verified present.
 *
 * Persona: a product manager / small product team running discovery → specs →
 * roadmap → design → ship → measure, using AI across the loop.
 */
export const aiStackForProductTeams: StackConfig = {
  slug: 'ai-stack-for-product-teams',
  title: 'The AI Stack for Product Teams (2026)',
  goal: 'Run the product loop — discovery to data — on AI',
  description:
    'The hand-picked AI stack we recommend for a product manager or small product team in 2026 — discovery, specs, roadmap, design, testing, analytics, ops, and stakeholder comms — with monthly cost rolled up.',
  stages: [
    {
      name: 'Discovery & Research',
      description:
        'Market scans, competitor teardowns, and synthesizing user signals into "what should we build?" — grounded in sources, not opinion.',
      bestPick: {
        name: 'Perplexity',
        slug: 'perplexity',
        reason:
          'Cited, live-web research is the safest surface for market and competitor work — every claim links to a source you can put in a doc.',
        pricing: '$20/mo',
        tags: ['research', 'discovery'],
      },
      alternatives: [
        {
          name: 'Claude',
          slug: 'claude',
          reason:
            'Best for synthesis — turning interviews, reviews, and tickets into themes and opportunity areas.',
          pricing: '$20/mo',
        },
        {
          name: 'ChatGPT',
          slug: 'chatgpt',
          reason:
            'Strong all-rounder; voice mode is handy for talking through problem framing.',
          pricing: '$20/mo',
        },
      ],
      costEstimate: '$20/mo',
    },
    {
      name: 'PRDs, Specs & Docs',
      description:
        'Where the requirement actually gets written and aligned on — the single source of truth the team builds from.',
      bestPick: {
        name: 'Notion',
        slug: 'notion',
        reason:
          'The PM home base — PRDs, wikis, and meeting notes in one place, with Notion AI to draft specs and summarize threads.',
        pricing: 'Free / $10/mo AI',
        tags: ['docs', 'specs'],
      },
      alternatives: [
        {
          name: 'Claude',
          slug: 'claude',
          reason:
            'Best for drafting the actual PRD prose and pressure-testing edge cases before it goes in the doc.',
          pricing: '$20/mo',
        },
        {
          name: 'ChatGPT',
          slug: 'chatgpt',
          reason:
            'Fine alternative for spec drafting and turning bullet notes into structured requirements.',
          pricing: '$20/mo',
        },
      ],
      costEstimate: '$10–20/mo',
    },
    {
      name: 'Roadmap & Issue Tracking',
      description:
        'The backlog, the sprint, and the roadmap — where work is planned, prioritized, and tracked to done.',
      bestPick: {
        name: 'Linear',
        slug: 'linear',
        reason:
          'The fastest, cleanest issue tracker — and its AI (Product Intelligence / triage) summarizes, drafts, and routes work. The default for modern product teams.',
        pricing: 'Free / from $8/user/mo',
        tags: ['roadmap', 'issues'],
      },
      alternatives: [
        {
          name: 'Jira',
          slug: 'jira',
          reason:
            'The enterprise standard; pick it when the org already runs on Atlassian and Rovo (Atlassian Intelligence) is in play.',
          pricing: 'Free / from $8/user/mo',
        },
        {
          name: 'Monday.com',
          slug: 'monday-com',
          reason:
            'More flexible work-OS for cross-functional teams that aren&apos;t purely engineering-led.',
          pricing: 'From $9/user/mo',
        },
      ],
      costEstimate: '$8–9/user/mo',
    },
    {
      name: 'Design & Prototyping',
      description:
        'Wireframes, prototypes, and design review — the shared canvas between product, design, and engineering.',
      bestPick: {
        name: 'Figma',
        slug: 'figma',
        reason:
          'The design standard, and Figma AI / Make now generate and edit designs and first drafts — so PMs can prototype without blocking on design.',
        pricing: 'Free / from $12/mo',
        tags: ['design', 'prototyping'],
      },
      alternatives: [
        {
          name: 'Miro',
          slug: 'miro',
          reason:
            'Best for whiteboarding, journey maps, and workshops; its AI clusters sticky notes and drafts diagrams.',
          pricing: 'Free / from $8/user/mo',
        },
        {
          name: 'Maze',
          slug: 'maze',
          reason:
            'Turns prototypes into testable studies — bridge into the next stage.',
          pricing: 'Free / from $99/mo',
        },
      ],
      costEstimate: '$8–12/user/mo',
    },
    {
      name: 'User Testing & Feedback',
      description:
        'Validating ideas with real users — usability tests, surveys, and watching what people actually do.',
      bestPick: {
        name: 'Maze',
        slug: 'maze',
        reason:
          'AI-assisted usability testing and surveys on prototypes or live products — fast, unmoderated, with auto-synthesized insights.',
        pricing: 'Free / from $99/mo',
        tags: ['testing', 'research'],
      },
      alternatives: [
        {
          name: 'PostHog',
          slug: 'posthog',
          reason:
            'Session replay + surveys + flags — watch real sessions and ship gated experiments.',
          pricing: 'Free / usage-based',
        },
        {
          name: 'Miro',
          slug: 'miro',
          reason:
            'Best for synthesizing research into affinity maps and sharing insights with the team.',
          pricing: 'Free / from $8/user/mo',
        },
      ],
      costEstimate: '$0–99/mo',
    },
    {
      name: 'Product Analytics',
      description:
        'The behavioral truth — funnels, retention, and feature adoption that tell you if it worked.',
      bestPick: {
        name: 'Amplitude',
        slug: 'amplitude',
        reason:
          'Deepest product analytics with AI-assisted querying (ask in plain English) — the standard for funnels, retention, and experimentation at scale.',
        pricing: 'Free / from $49/mo',
        tags: ['analytics', 'data'],
      },
      alternatives: [
        {
          name: 'Mixpanel',
          slug: 'mixpanel',
          reason:
            'Leaner and often cheaper; great event analytics with a friendly query builder and AI insights.',
          pricing: 'Free / from $28/mo',
        },
        {
          name: 'PostHog',
          slug: 'posthog',
          reason:
            'All-in-one (analytics + replay + flags + surveys) — best when you want one tool and a generous free tier.',
          pricing: 'Free / usage-based',
        },
      ],
      costEstimate: '$0–49/mo',
    },
    {
      name: 'Structured Data & Ops',
      description:
        'The flexible database behind launches, research repos, vendor trackers, and anything a doc can&apos;t hold.',
      bestPick: {
        name: 'Airtable',
        slug: 'airtable',
        reason:
          'Spreadsheet-database hybrid with AI fields — research repos, launch trackers, and lightweight internal tools without engineering.',
        pricing: 'Free / from $20/user/mo',
        tags: ['database', 'ops'],
      },
      alternatives: [
        {
          name: 'Notion',
          slug: 'notion',
          reason:
            'If everything already lives in Notion, its databases cover most of this without a second tool.',
          pricing: 'Free / $10/mo AI',
        },
        {
          name: 'Monday.com',
          slug: 'monday-com',
          reason:
            'Better for cross-functional operational workflows with automations.',
          pricing: 'From $9/user/mo',
        },
      ],
      costEstimate: '$0–20/user/mo',
    },
    {
      name: 'Stakeholder Decks & Async Updates',
      description:
        'Communicating decisions, launches, and progress — to leadership and the wider company.',
      bestPick: {
        name: 'Gamma',
        slug: 'gamma',
        reason:
          'Generates polished decks and docs from a prompt or your notes — the fastest way to a stakeholder-ready update without fighting slides.',
        pricing: 'Free / from $10/mo',
        tags: ['presentations', 'comms'],
      },
      alternatives: [
        {
          name: 'Loom',
          slug: 'loom',
          reason:
            'Async video updates with AI summaries and chapters — often beats a meeting for sharing context.',
          pricing: 'Free / from $12.50/mo',
        },
        {
          name: 'Notion',
          slug: 'notion',
          reason:
            'For written launch docs and weekly updates that live alongside the specs.',
          pricing: 'Free / $10/mo AI',
        },
      ],
      costEstimate: '$0–12/mo',
    },
  ],
  summary: {
    freePath: '~$60/mo (Claude + Notion free + Linear free + Figma free + PostHog free)',
    paidPath: '$300–500/mo (all picks paid, small team)',
    skillLevel: 'Intermediate',
    setupTime: '1–2 weeks',
  },
  pillar: {
    metaTitle: 'The AI Stack for Product Teams (2026) | RightAIChoice',
    metaDescription:
      'The exact AI stack we recommend for a product manager or team in 2026 — discovery, specs, roadmap, design, testing, analytics, ops, comms — with monthly cost.',
    publishedISO: '2026-06-01',
    lastReviewedISO: '2026-06-01',
    lastReviewed: 'June 1, 2026',
    intro: (
      <div className="space-y-4 text-zinc-300 leading-relaxed">
        <p>
          If you run product and keep getting asked which AI tools actually
          deserve a place in the workflow, this is the answer. Eight stages
          across the full product loop, one tool we&apos;d default to in each,
          two alternatives, monthly cost rolled up at the bottom.
        </p>
        <p>
          We don&apos;t list every option — a stack page exists to make a
          decision. Each pick links to its{' '}
          <a href="/compare" className="text-emerald-400 no-underline hover:underline">
            head-to-head comparisons
          </a>{' '}
          for the close calls.
        </p>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          Who this stack is for
        </h2>
        <p>
          A product manager or small product team running the loop end-to-end:
          discovery, specs, roadmap, design partnership, shipping, and
          measuring impact. If you&apos;re a solo developer building a product
          yourself, the better fit is the{' '}
          <a href="/stacks/ai-stack-for-solo-developers" className="text-emerald-400 no-underline hover:underline">
            AI Stack for Solo Developers
          </a>
          ; if you run marketing, see the{' '}
          <a href="/stacks/ai-stack-for-marketing-teams" className="text-emerald-400 no-underline hover:underline">
            AI Stack for Marketing Teams
          </a>
          .
        </p>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          How we picked
        </h2>
        <p>
          Three rules.{' '}
          <strong className="font-semibold text-white">One</strong>: a material
          AI feature that removes PM busywork — drafting specs, summarizing
          research, querying analytics in plain English.{' '}
          <strong className="font-semibold text-white">Two</strong>: it has to
          fit how teams actually work (seats, sharing, integrations), not just a
          single-user demo.{' '}
          <strong className="font-semibold text-white">Three</strong>: it earns
          its seat against the alternative of more meetings or more headcount.
        </p>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          When to swap a pick out
        </h2>
        <ul className="ml-5 list-disc space-y-2 marker:text-zinc-500">
          <li>
            <strong className="font-semibold text-white">You&apos;re on Atlassian</strong>{' '}
            → use Jira (+ Confluence) instead of Linear; Rovo covers the AI.
          </li>
          <li>
            <strong className="font-semibold text-white">Everything lives in Notion</strong>{' '}
            → let Notion databases cover the structured-data stage instead of
            Airtable.
          </li>
          <li>
            <strong className="font-semibold text-white">You want one tool for analytics + testing</strong>{' '}
            → PostHog covers analytics, replay, flags, and surveys together.
          </li>
          <li>
            <strong className="font-semibold text-white">You&apos;re research-heavy</strong>{' '}
            → lean on Maze + Miro and add a dedicated research repo.
          </li>
        </ul>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          Total cost: lean path vs full team
        </h2>
        <p>
          A lean setup — Claude, Notion free, Linear free, Figma free, PostHog
          free — runs about{' '}
          <strong className="font-semibold text-white">$60/month</strong> for a
          PM getting started. The full stack with every pick paid at entry tiers
          for a small team lands around{' '}
          <strong className="font-semibold text-white">$300–500/month</strong>,
          driven by analytics (Amplitude) and per-seat tools. It scales with
          usage and seats rather than requiring extra headcount.
        </p>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          The 8-stage stack
        </h2>
        <p>
          Stages below follow the product loop: discover, spec, plan, design,
          test, measure, operate, communicate. Each has our default pick, two
          alternatives, and a per-stage cost. Save or export the stack from the
          sidebar.
        </p>
      </div>
    ),
    faqs: [
      {
        question: 'What is the best AI stack for a product team in 2026?',
        answer:
          "Our default: Perplexity for discovery, Notion for specs, Linear for roadmap/issues, Figma for design, Maze for user testing, Amplitude for analytics, Airtable for structured ops data, and Gamma for stakeholder decks. Lean path ~$60/mo; full paid team stack $300–500/mo. Swap Linear→Jira if you're on Atlassian, or consolidate analytics+testing into PostHog.",
      },
      {
        question: 'How much does an AI product-team stack cost?',
        answer:
          'A lean path (Claude + Notion free + Linear free + Figma free + PostHog free) is about $60/month. The full stack with all eight stages paid at entry tiers for a small team is $300–500/month, with product analytics (Amplitude) and per-seat tools the biggest line items.',
      },
      {
        question: 'Linear or Jira for product teams?',
        answer:
          'Linear is the default for modern, engineering-led product teams — faster, cleaner, with AI triage and summaries. Jira is the enterprise standard and the right choice when the org already runs on Atlassian and uses Rovo (Atlassian Intelligence). Monday.com fits cross-functional teams that aren’t purely engineering.',
      },
      {
        question: 'What is the best AI tool for product analytics?',
        answer:
          'Amplitude for depth and scale — funnels, retention, and AI-assisted plain-English querying. Mixpanel is leaner and often cheaper. PostHog is the all-in-one (analytics + session replay + flags + surveys) with a generous free tier — best when you want one tool instead of three.',
      },
      {
        question: 'What AI tools help with PRDs and specs?',
        answer:
          'Notion is the home base (PRDs, wikis, notes) with Notion AI to draft and summarize. Claude is the strongest for drafting the actual requirement prose and pressure-testing edge cases before it goes in the doc. Most PMs use both — Claude to draft, Notion to store and share.',
      },
      {
        question: 'How do AI tools help with user research and testing?',
        answer:
          'Maze runs AI-assisted usability tests and surveys on prototypes or live products and auto-synthesizes the insights. PostHog adds session replay so you can watch real behavior. Miro helps cluster and synthesize findings into affinity maps the team can act on.',
      },
      {
        question: 'How often should a product team re-evaluate its AI stack?',
        answer:
          'Every quarter. Discovery, design, and analytics AI features move fastest; issue trackers and docs are more stable. Avoid annual contracts in fast-moving categories until the leader is clear, and revisit whether a consolidated tool (e.g., PostHog) can replace two point solutions.',
      },
    ],
  },
}
