import type { StackConfig } from '../stacks'

/**
 * Phase 9 (2026-05-28) — first decision-engine pillar stack.
 *
 * Why this slug: the "ai stack for saas" / "ai stack for startups"
 * query family is high-intent (someone has already decided to use
 * AI; they're looking for the specific recommended stack). Doc 07
 * marks this as the first pillar to ship.
 *
 * Distinct from /stacks/launch-saas-mvp (which is for no-coders
 * building a SaaS from scratch). This pillar is for early-stage SaaS
 * COMPANIES — they already have a product, now they need to decide
 * which AI tools to standardize on across product/eng/growth/ops.
 *
 * Editorial pillar (intro + FAQ) renders ABOVE the stages template
 * via the new `pillar` field on StackConfig. Stages + summary + save
 * + export render as usual underneath.
 */
export const aiStackForEarlyStageSaas: StackConfig = {
  slug: 'ai-stack-for-early-stage-saas',
  title: 'The AI Stack for Early-Stage SaaS (2026)',
  goal: 'Run an early-stage SaaS company on AI',
  description:
    'The hand-picked AI tools we recommend for a 1–10 person SaaS company. Engineering, design, support, growth, and ops — with monthly cost rolled up.',
  stages: [
    {
      name: 'Engineering & Code',
      description:
        'The AI coding assistant your engineers use daily. Standardize early so PRs, code review, and the agent layer all play nicely together.',
      bestPick: {
        name: 'Cursor',
        slug: 'cursor',
        reason:
          'The AI-native IDE most early-stage teams converge on. Pro tier ($20/user/mo) covers daily use; Business tier is overkill at 1–10 people.',
        pricing: '$20/user/mo',
        tags: ['ide', 'agent', 'autocomplete'],
      },
      alternatives: [
        {
          name: 'GitHub Copilot',
          slug: 'github-copilot',
          reason:
            'Cheaper at $10/user/mo and the safest pick if your security review already approved GitHub Enterprise.',
          pricing: '$10/user/mo',
        },
        {
          name: 'Claude Code',
          slug: 'claude',
          reason:
            'Terminal-first agent. Pair it with whichever IDE the team prefers — usage-billed via Anthropic API.',
          pricing: '~$30/user/mo @ moderate use',
        },
      ],
      costEstimate: '$10–30/user/mo',
    },
    {
      name: 'Foundation Model API',
      description:
        'The LLM you build product features against. Your eng pick and your product pick can be different — most early teams use Claude in product and rotate models in engineering.',
      bestPick: {
        name: 'Claude (Anthropic API)',
        slug: 'claude',
        reason:
          'Best frontier model for production product features today. Pay-as-you-go API, no per-seat lock-in, and the prompt-caching pricing covers most early-stage workloads.',
        pricing: 'Pay-as-you-go (typ. $50–500/mo at <10K MAU)',
        tags: ['llm', 'api'],
      },
      alternatives: [
        {
          name: 'OpenAI (GPT-5.5)',
          slug: 'chatgpt',
          reason:
            'Most teams already have credits. Use for tasks where Claude is overpriced or unavailable.',
          pricing: 'Pay-as-you-go',
        },
        {
          name: 'Google Gemini API',
          slug: 'gemini',
          reason:
            'Cheapest frontier model on per-token pricing. Worth pairing with Claude for high-volume background tasks.',
          pricing: 'Pay-as-you-go',
        },
      ],
      costEstimate: '$50–500/mo',
    },
    {
      name: 'Customer Support',
      description:
        'AI-first support is the single biggest cost lever for an early-stage SaaS — it lets a 1-person CS team handle 100x the tickets.',
      bestPick: {
        name: 'Intercom Fin',
        slug: 'intercom',
        reason:
          'Mature AI agent on top of the support inbox you probably already have. Charges per resolution, not per seat.',
        pricing: '~$0.99 per AI resolution',
        tags: ['support', 'agent'],
      },
      alternatives: [
        {
          name: 'Crisp',
          slug: 'crisp',
          reason:
            'Cheaper if you do not have Intercom already. AI bot included on the $95/mo plan.',
          pricing: 'From $95/mo',
        },
      ],
      costEstimate: '$95–300/mo',
    },
    {
      name: 'Sales & Outbound',
      description:
        'The AI assistant for your one (or zero) salesperson. Best ROI when used to keep CRM hygiene + draft personalised outbound.',
      bestPick: {
        name: 'Apollo.io',
        slug: 'apollo-io',
        reason:
          'AI-augmented outbound + contact data. Generous free tier; paid Pro at $59/user/mo covers most early-stage needs.',
        pricing: 'Free / $59/user/mo',
        tags: ['outbound', 'crm'],
      },
      alternatives: [
        {
          name: 'Clay',
          slug: 'clay',
          reason:
            'For data-savvy founders who want to build their own enrichment + outbound workflows.',
          pricing: 'From $149/mo',
        },
      ],
      costEstimate: '$0–149/mo',
    },
    {
      name: 'Content & SEO',
      description:
        'Long-form blog + landing-page copy. Don\'t over-invest here pre-PMF — pay for one writing tool, not three.',
      bestPick: {
        name: 'Claude (via app)',
        slug: 'claude',
        reason:
          'The Pro plan ($20/mo) is the cheapest serious option. Pair with a human editor.',
        pricing: '$20/mo',
        tags: ['writing', 'editorial'],
      },
      alternatives: [
        {
          name: 'Jasper',
          slug: 'jasper',
          reason:
            'Worth it once you have a brand voice locked and a content calendar.',
          pricing: '$49/mo',
        },
      ],
      costEstimate: '$20–49/mo',
    },
    {
      name: 'Analytics & Product Insights',
      description:
        'The instrumentation layer. AI tooling on top of analytics matters more than the tool itself — pick something that exposes raw events.',
      bestPick: {
        name: 'PostHog',
        slug: 'posthog',
        reason:
          'Free up to 1M events/mo. Has the most mature AI feature set (session replay summaries, funnel anomaly detection, in-app SQL agent).',
        pricing: 'Free / usage-based',
        tags: ['analytics', 'product'],
      },
      alternatives: [
        {
          name: 'Mixpanel',
          slug: 'mixpanel',
          reason:
            'Better for hardcore funnel analysis. Free tier is generous, AI features less mature.',
          pricing: 'Free / from $24/mo',
        },
      ],
      costEstimate: '$0–24/mo',
    },
    {
      name: 'Design & Assets',
      description:
        'Marketing site, social, in-product illustrations. One subscription is enough — designers can use Figma AI within their existing Figma seats.',
      bestPick: {
        name: 'Canva',
        slug: 'canva',
        reason:
          'Pro ($13/mo) covers brand kit, AI background remover, Magic Write, and unlimited templates. Best fit for a non-design founder.',
        pricing: '$13/mo',
        tags: ['design', 'brand'],
      },
      alternatives: [
        {
          name: 'Midjourney',
          slug: 'midjourney',
          reason:
            'If you want custom illustration / hero imagery beyond stock and templates.',
          pricing: '$10/mo',
        },
      ],
      costEstimate: '$13–15/mo',
    },
    {
      name: 'Internal Ops & Docs',
      description:
        'The team-wide AI surface for meeting notes, internal Q&A over docs, and async work.',
      bestPick: {
        name: 'Notion AI',
        slug: 'notion-ai',
        reason:
          'Adds search/summarize/write across your existing workspace. $10/user/mo on top of Notion seats — best value if you already use Notion.',
        pricing: '$10/user/mo add-on',
        tags: ['docs', 'workspace'],
      },
      alternatives: [
        {
          name: 'Granola',
          slug: 'granola',
          reason:
            'Best meeting-notes AI for the founder running 8 customer calls a day.',
          pricing: '$18/user/mo',
        },
      ],
      costEstimate: '$10–18/user/mo',
    },
  ],
  summary: {
    freePath: '~$50/mo (free tiers + Cursor + Claude Pro)',
    paidPath: '$400–800/mo (4-person team, all picks paid)',
    skillLevel: 'Intermediate',
    setupTime: '1 week',
  },
  pillar: {
    metaTitle: 'The AI Stack for Early-Stage SaaS (2026) | RightAIChoice',
    metaDescription:
      'The exact AI tools we recommend for a 1–10 person SaaS company in 2026. Engineering, support, growth, ops — with monthly cost rolled up.',
    publishedISO: '2026-05-28',
    lastReviewedISO: '2026-05-28',
    lastReviewed: 'May 28, 2026',
    intro: (
      <div className="space-y-4 text-zinc-300 leading-relaxed">
        <p>
          If you&apos;re running an early-stage SaaS — somewhere between
          first paying customer and 10 employees — and you keep getting
          asked which AI tools you actually use, this is the answer.
          Eight categories, one tool we&apos;d default to in each, two
          alternatives if our default doesn&apos;t fit. Monthly cost
          rolled up at the bottom.
        </p>
        <p>
          We deliberately don&apos;t list every tool in every category.
          The point of a stack page is to make a decision, not to push
          the decision back to you. If you want to compare the picks
          head-to-head, each one links through to its{' '}
          <a
            href="/compare"
            className="text-emerald-400 no-underline hover:underline"
          >
            full comparison
          </a>
          .
        </p>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          Who this stack is for
        </h2>
        <p>
          You ship product. You have a few thousand monthly users or
          you&apos;re close. The team is 1–10 people, the AWS bill is
          three digits not five, and every recurring expense gets
          scrutinized. You&apos;ve already decided to use AI throughout the
          company — what you want now is the shortest path to the right
          set of tools without burning a weekend evaluating each
          category.
        </p>
        <p>
          If you&apos;re still pre-product (no code, no MVP yet), the
          better-fit stack is{' '}
          <a
            href="/stacks/launch-saas-mvp"
            className="text-emerald-400 no-underline hover:underline"
          >
            Best AI Stack for Launching a SaaS MVP
          </a>{' '}
          — same persona, earlier stage.
        </p>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          How we picked
        </h2>
        <p>
          Three rules. <strong className="font-semibold text-white">One</strong>:
          we only listed tools we&apos;d run on our own credit card. No
          enterprise-only picks, no &quot;contact sales for pricing.&quot;{' '}
          <strong className="font-semibold text-white">Two</strong>: the
          monthly bill for the full stack has to come in under $1,000
          for a 4-person team. The whole point of going AI-first
          early is to compress per-employee software spend, not
          inflate it. <strong className="font-semibold text-white">Three</strong>:
          every pick has to be replaceable in under a day if it stops
          working — no platforms that take a quarter to migrate off.
        </p>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          When to swap a pick out
        </h2>
        <ul className="ml-5 list-disc space-y-2 marker:text-zinc-500">
          <li>
            <strong className="font-semibold text-white">
              You&apos;re GitHub-Enterprise locked
            </strong>{' '}
            → swap Cursor for GitHub Copilot Business.
          </li>
          <li>
            <strong className="font-semibold text-white">
              Your product needs voice
            </strong>{' '}
            → swap Intercom Fin for a dedicated voice stack
            (ElevenLabs + Vapi).
          </li>
          <li>
            <strong className="font-semibold text-white">
              You&apos;re a YC-style consumer SaaS with 100K+ MAU
            </strong>{' '}
            → keep PostHog, but layer Mixpanel for the
            cohort/funnel work the AI agent can&apos;t do well yet.
          </li>
          <li>
            <strong className="font-semibold text-white">
              You write code in JetBrains, not VS Code
            </strong>{' '}
            → swap Cursor for JetBrains AI. The agent mode is now
            comparable.
          </li>
          <li>
            <strong className="font-semibold text-white">
              You&apos;re in a regulated industry (health, finance, legal)
            </strong>{' '}
            → swap Notion AI for an on-prem option and avoid sending
            customer data through the Anthropic API.
          </li>
        </ul>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          Total cost: free path vs paid path
        </h2>
        <p>
          The free path runs about{' '}
          <strong className="font-semibold text-white">$50/month</strong>{' '}
          (Cursor or Copilot + Claude Pro + free tiers everywhere
          else) and works fine if you&apos;re a solo founder and not yet
          ringing the cash register.
        </p>
        <p>
          The paid path for a 4-person team — everyone on Cursor,
          Claude API in production, Intercom Fin handling support,
          Apollo Pro for outbound, PostHog past the free tier, Canva
          Pro, and Notion AI seats — lands at{' '}
          <strong className="font-semibold text-white">$400–800/month</strong>{' '}
          all-in. That replaces probably $4,000–6,000/month of human
          labour you&apos;d otherwise need to hire. The math works.
        </p>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          The 8-stage stack
        </h2>
        <p>
          Stages below in the order you&apos;ll adopt them in practice.
          Eng first (because it&apos;s the bottleneck), then support
          (because it scales worst), then growth, then ops. Each stage
          has our default pick, two alternatives, and a per-stage
          cost. Use the sidebar to save the stack to your dashboard
          or export it as a PDF for your co-founder.
        </p>
      </div>
    ),
    faqs: [
      {
        question: 'What is the best AI stack for an early-stage SaaS?',
        answer:
          "For a 1–10 person SaaS company in 2026 the default we'd run is: Cursor for engineering ($20/user/mo), Claude API for product features (usage-billed), Intercom Fin for AI support (~$0.99/resolution), Apollo for outbound ($59/user), PostHog for analytics (free up to 1M events), Canva Pro for design ($13/mo), and Notion AI for docs ($10/user/mo add-on). Total monthly cost for a 4-person team lands at $400–800/mo all-in.",
      },
      {
        question: 'How much does an AI stack cost for a startup?',
        answer:
          'On the free path (solo founder, free tiers only) about $50/month. On the paid path for a 4-person team, $400–800/month all-in. The single biggest cost lever is the support stack — moving from per-seat human-CS pricing to per-resolution AI agent pricing usually saves more than the entire rest of the stack costs.',
      },
      {
        question: 'Cursor or GitHub Copilot for an early-stage SaaS?',
        answer:
          "Default to Cursor — the AI-native IDE wins on agent mode and multi-file edits for greenfield work, which is what early-stage teams do most. Swap to Copilot if your org is already on GitHub Enterprise and your security team won't approve a new SaaS vendor.",
      },
      {
        question: 'Do I need both Claude and ChatGPT?',
        answer:
          "No. Pick one as your production LLM and treat the other as a fallback in the rare case the first is down or refuses a request. Most early-stage SaaS teams default to Claude (Anthropic API) in production because of pricing predictability and Claude 4.6's coding/reasoning performance.",
      },
      {
        question: 'Is this stack right for a consumer app, not B2B SaaS?',
        answer:
          "Mostly yes — the engineering, LLM, support, and analytics picks all transfer. Swap Apollo for a consumer-acquisition tool (Customer.io for lifecycle, Posthog for product-led growth). Skip Notion AI if your team isn't already on Notion.",
      },
      {
        question: 'How is this different from the Launch SaaS MVP stack?',
        answer:
          'The launch-saas-mvp stack is for no-coders building a SaaS for the first time — it includes UI/UX design, no-code builders, and deployment tooling. This stack assumes you already have a working product and are choosing the AI layer to run the business on top of it.',
      },
      {
        question: 'How often should I re-evaluate the stack?',
        answer:
          "Quarterly. The frontier-model providers and IDE/agent tools all ship significant capability jumps every 2-4 months, and what was best in Q1 is often not best in Q3. Cap each tool at a 12-month annual contract — anything longer locks you out of the next wave.",
      },
    ],
  },
}
