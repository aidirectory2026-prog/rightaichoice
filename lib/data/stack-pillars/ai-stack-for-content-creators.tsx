import type { StackConfig } from '../stacks'

/**
 * Phase 9 (2026-05-28) — second decision-engine pillar stack.
 *
 * Doc 07 pillar table queues this as the next pillar after
 * /stacks/ai-stack-for-early-stage-saas. Target query family:
 * "ai stack for content creators" / "ai tools for creators" /
 * "ai workflow for youtubers". High-intent and underserved — most
 * creator-tool roundups are SEO listicles, not opinionated stacks.
 *
 * Persona: solo or 2-3 person creator economy operation. Newsletter,
 * YouTube, podcast, social — usually some combination. Revenue from
 * subscriptions, sponsorships, courses, or all three.
 */
export const aiStackForContentCreators: StackConfig = {
  slug: 'ai-stack-for-content-creators',
  title: 'The AI Stack for Content Creators (2026)',
  goal: 'Run a one-person content business on AI',
  description:
    'The hand-picked AI tools we recommend for a creator running newsletter + YouTube + social. Writing, image, video, audio, scheduling, monetization — with monthly cost rolled up.',
  stages: [
    {
      name: 'Idea Research & Outlines',
      description:
        'Where ideas come from. The model you ask "what should I make next?" — answers with citations, not vibes.',
      bestPick: {
        name: 'Perplexity',
        slug: 'perplexity',
        reason:
          'Real-time cited search makes it the safest research surface — outlines come back with sources you can verify and link. Pro at $20/mo is the only paid tier worth it.',
        pricing: '$20/mo',
        tags: ['research', 'search'],
      },
      alternatives: [
        {
          name: 'Claude',
          slug: 'claude',
          reason:
            'Better for synthesis once you have the raw inputs — turning a transcript or 5 articles into a structured outline.',
          pricing: '$20/mo',
        },
        {
          name: 'ChatGPT',
          slug: 'chatgpt',
          reason:
            'Best if you want voice mode for hands-free brainstorming on a walk. GPT-5.5 search results have caught up to Perplexity for casual research.',
          pricing: '$20/mo',
        },
      ],
      costEstimate: '$20/mo',
    },
    {
      name: 'Long-Form Writing',
      description:
        'Newsletter posts, YouTube scripts, blog drafts. The model that handles your voice the best — not the one with the loudest marketing.',
      bestPick: {
        name: 'Claude',
        slug: 'claude',
        reason:
          'Best long-form writing model in 2026 by a meaningful margin. Holds voice across 2,000+ word drafts and refuses less often than ChatGPT for borderline-edgy creator topics.',
        pricing: '$20/mo (Pro)',
        tags: ['writing', 'editorial'],
      },
      alternatives: [
        {
          name: 'ChatGPT',
          slug: 'chatgpt',
          reason:
            'Cheaper if you already have ChatGPT Plus for other things. GPT-5.5 is fine for first drafts, weaker for matching a specific voice.',
          pricing: '$20/mo',
        },
        {
          name: 'Jasper',
          slug: 'jasper',
          reason:
            'Worth it once you have a defined brand voice and want repeatable templates. Overkill for a solo creator.',
          pricing: 'From $49/mo',
        },
      ],
      costEstimate: '$20/mo',
    },
    {
      name: 'Thumbnails & Social Graphics',
      description:
        'YouTube thumbnails, IG carousels, X visuals, newsletter headers. One tool for templates, one model for custom imagery.',
      bestPick: {
        name: 'Canva',
        slug: 'canva',
        reason:
          'Pro ($13/mo) covers brand kit, AI background removal, Magic Resize across platforms, and a library of templates that beats anything custom for 90% of creator output.',
        pricing: '$13/mo',
        tags: ['design', 'thumbnails'],
      },
      alternatives: [
        {
          name: 'Midjourney',
          slug: 'midjourney',
          reason:
            'Custom hero imagery when a template won&apos;t do — esp. for thumbnails that need to stand out in a feed.',
          pricing: '$10/mo',
        },
        {
          name: 'Ideogram',
          slug: 'ideogram',
          reason:
            'When the graphic has to include text — Ideogram renders typography correctly more often than any other model.',
          pricing: '$7/mo',
        },
      ],
      costEstimate: '$13–30/mo',
    },
    {
      name: 'Short-Form Video (TikTok / Reels / Shorts)',
      description:
        'The repurposing layer — turn one long video into 5–15 short clips with captions, hooks, and platform-specific framing.',
      bestPick: {
        name: 'Opus Clip',
        slug: 'opus-clip',
        reason:
          'Best automatic clip selection — picks moments worth posting, not just random 30s windows. ClipAnything search means you can also pull specific topics on demand.',
        pricing: 'From $9.50/mo (annual)',
        tags: ['video', 'shorts'],
      },
      alternatives: [
        {
          name: 'Submagic',
          slug: 'submagic',
          reason:
            'Better captions and B-roll auto-insert. Pick this if the per-clip polish matters more than picking which clips to post.',
          pricing: 'From $16/mo',
        },
        {
          name: 'Klap',
          slug: 'klap',
          reason:
            'Cheaper entry pricing and decent virality scoring. Good if Opus is over budget.',
          pricing: 'From $29/mo',
        },
      ],
      costEstimate: '$10–29/mo',
    },
    {
      name: 'Long-Form Video & Podcast Editing',
      description:
        'The main edit. Where the polish actually happens before the short-form layer slices it up.',
      bestPick: {
        name: 'Descript',
        slug: 'descript',
        reason:
          'Edit video by editing the transcript — for talking-head and podcast content this is 10x faster than a traditional NLE. Studio Sound and AI overdub close the loop on bad audio.',
        pricing: 'From $24/mo',
        tags: ['video', 'podcast'],
      },
      alternatives: [
        {
          name: 'CapCut',
          slug: 'capcut',
          reason:
            'Free, mobile-first, and the standard inside the TikTok ecosystem. Pick this if you mostly cut on a phone.',
          pricing: 'Free / $7.99/mo Pro',
        },
        {
          name: 'Captions',
          slug: 'captions',
          reason:
            'Studio-style AI cuts and eye-contact correction. Best for selfie-camera creators who film vertically.',
          pricing: 'From $9.99/mo',
        },
      ],
      costEstimate: '$0–24/mo',
    },
    {
      name: 'Voice & Music',
      description:
        'Narration for explainer cuts, voiceovers for B-roll, and theme music for intros/outros without licensing headaches.',
      bestPick: {
        name: 'ElevenLabs',
        slug: 'elevenlabs',
        reason:
          'The voice quality and language coverage that won the market. Instant Voice Cloning means a 1-minute sample of your voice gives you a usable narrator clone.',
        pricing: 'From $5/mo',
        tags: ['voice', 'audio'],
      },
      alternatives: [
        {
          name: 'Suno',
          slug: 'suno',
          reason:
            'Original music for intros, outros, and underscore — fully owned, no royalty calls later. Pro tier required for commercial use.',
          pricing: '$10/mo (Pro)',
        },
        {
          name: 'HeyGen',
          slug: 'heygen',
          reason:
            'If you want a visual avatar on top of the voice — for translated versions of your videos or quick explainers in your own face.',
          pricing: 'From $29/mo',
        },
      ],
      costEstimate: '$5–29/mo',
    },
    {
      name: 'Social Scheduling & Posting',
      description:
        'Cross-posting across X, LinkedIn, Instagram, TikTok, Threads. The unglamorous layer that decides whether you actually ship consistently.',
      bestPick: {
        name: 'Publer',
        slug: 'publer',
        reason:
          'Cheapest serious cross-poster with AI assist (caption rewrites, hashtag suggestions, optimal-time scheduling) and the widest platform coverage at the entry tier.',
        pricing: 'From $12/mo',
        tags: ['scheduling', 'social'],
      },
      alternatives: [
        {
          name: 'Taplio',
          slug: 'taplio',
          reason:
            'LinkedIn-only specialist. Pick this in addition to Publer if LinkedIn is a primary channel — its inspiration library and analytics are better.',
          pricing: '$52/mo',
        },
        {
          name: 'Hypefury',
          slug: 'hypefury',
          reason:
            'X (Twitter) specialist with thread tools, auto-DM-on-engagement, and retweet rotation. Add it to Publer if X is core.',
          pricing: 'From $19/mo',
        },
      ],
      costEstimate: '$12–52/mo',
    },
    {
      name: 'Newsletter & Audience Ops',
      description:
        'Where the actual audience lives — separate from any algorithm you don&apos;t control. Pick one platform early and stay there.',
      bestPick: {
        name: 'Beehiiv',
        slug: 'beehiiv',
        reason:
          'Best growth tooling (boosts, referral program, recommendations network) and the cleanest free tier. Monetization built in once you cross 1k subs.',
        pricing: 'Free up to 2,500 subs',
        tags: ['newsletter', 'audience'],
      },
      alternatives: [
        {
          name: 'Kit (formerly ConvertKit)',
          slug: 'kit',
          reason:
            'Best automation and product-selling features. Pick this if you sell courses or digital products alongside the newsletter.',
          pricing: 'Free up to 10k subs',
        },
        {
          name: 'Notion AI',
          slug: 'notion-ai',
          reason:
            'Not a sender — but it&apos;s where the content calendar, transcript notes, and idea backlog live for most creators.',
          pricing: '$10/user/mo add-on',
        },
      ],
      costEstimate: '$0–49/mo',
    },
  ],
  summary: {
    freePath: '~$40/mo (Claude Pro + Canva Pro + Beehiiv free + CapCut)',
    paidPath: '$150–250/mo (all picks paid, single creator)',
    skillLevel: 'Beginner',
    setupTime: '1 weekend',
  },
  pillar: {
    metaTitle: 'The AI Stack for Content Creators (2026) | RightAIChoice',
    metaDescription:
      'The exact AI tools we recommend for a creator running newsletter + YouTube + social in 2026. Writing, image, video, audio, scheduling, monetization — with monthly cost.',
    publishedISO: '2026-05-28',
    lastReviewedISO: '2026-05-28',
    lastReviewed: 'May 28, 2026',
    intro: (
      <div className="space-y-4 text-zinc-300 leading-relaxed">
        <p>
          If you&apos;re a creator — newsletter, YouTube, podcast,
          social, or some combination of those — and you keep getting
          asked which AI tools actually deserve a place in your monthly
          spend, this is the answer. Eight stages, one tool we&apos;d
          default to in each, two alternatives, monthly cost rolled up
          at the bottom.
        </p>
        <p>
          We deliberately don&apos;t list every tool in every category.
          The point of a stack page is to make a decision, not to push
          the decision back to you. If you want to compare any of the
          picks head-to-head, each one links through to its{' '}
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
          You ship content. Probably a newsletter, definitely some
          social, often a podcast or YouTube channel. Revenue comes
          from subscriptions, sponsorships, courses, or some mix.
          You&apos;re solo or 2–3 people deep. You don&apos;t have an
          editor on staff, you don&apos;t have a designer on staff, and
          you don&apos;t have a video team. The whole point of going
          AI-first is that you don&apos;t have to.
        </p>
        <p>
          If you&apos;re running a marketing function inside a company
          rather than your own creator business, the better-fit stack
          is the (forthcoming){' '}
          <strong className="font-semibold text-white">
            AI Stack for Marketing Teams
          </strong>
          {' '}— same tools, different decision weights.
        </p>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          How we picked
        </h2>
        <p>
          Three rules.{' '}
          <strong className="font-semibold text-white">One</strong>: every
          tool has to pull its weight on a $200/month creator budget. No
          enterprise pricing, no &quot;contact sales.&quot;{' '}
          <strong className="font-semibold text-white">Two</strong>: every
          pick has to save at least one hour per week of work you would
          otherwise do by hand. If the time saved is &quot;some&quot; or
          &quot;maybe&quot;, the tool didn&apos;t make the list.{' '}
          <strong className="font-semibold text-white">Three</strong>: no
          tool that locks you to a platform. Your newsletter, your audio,
          your video files all have to be exportable in standard formats
          on day one.
        </p>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          When to swap a pick out
        </h2>
        <ul className="ml-5 list-disc space-y-2 marker:text-zinc-500">
          <li>
            <strong className="font-semibold text-white">
              You&apos;re a YouTube-first creator (not newsletter-first)
            </strong>{' '}
            → keep Descript for the main edit, but move Opus Clip to the
            top of the stack and pair it with Submagic for caption
            polish.
          </li>
          <li>
            <strong className="font-semibold text-white">
              You&apos;re a podcaster, not a video creator
            </strong>{' '}
            → drop short-form video entirely; double down on Descript
            and add a transcription-driven repurposing flow (newsletter
            from each episode).
          </li>
          <li>
            <strong className="font-semibold text-white">
              You write in a very specific brand voice
            </strong>{' '}
            → swap Claude for Jasper; the brand-voice training is worth
            the extra $30/mo at scale.
          </li>
          <li>
            <strong className="font-semibold text-white">
              You&apos;re LinkedIn-primary
            </strong>{' '}
            → keep Publer as the cross-poster but add Taplio. The
            LinkedIn-specific tooling beats anything in a general
            scheduler.
          </li>
          <li>
            <strong className="font-semibold text-white">
              You sell courses or digital products
            </strong>{' '}
            → move from Beehiiv to Kit. Beehiiv is better for pure
            newsletter growth; Kit is better once monetization gets
            non-trivial.
          </li>
        </ul>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          Total cost: free path vs paid path
        </h2>
        <p>
          The free path runs about{' '}
          <strong className="font-semibold text-white">$40/month</strong>{' '}
          (Claude Pro + Canva Pro + Beehiiv free tier + CapCut free) and
          gets a brand-new creator surprisingly far. Most of the &quot;AI
          creator stack&quot; YouTube videos you&apos;ll see are
          basically variations of this minus one or two items.
        </p>
        <p>
          The paid path — every pick on this page paid at the entry tier
          for a single creator — lands at{' '}
          <strong className="font-semibold text-white">$150–250/month</strong>{' '}
          all-in. That replaces something like $4,000–6,000/month worth
          of freelance editing, design, copywriting, and VA time
          you&apos;d otherwise pay for. The math is not close.
        </p>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          The 8-stage stack
        </h2>
        <p>
          Stages below in the order content actually flows through:
          research, write, design, cut short-form, cut long-form,
          voice/music, schedule, capture audience. Each stage has our
          default pick, two alternatives, and a per-stage cost. Use the
          sidebar to save the stack to your dashboard or export it as a
          PDF.
        </p>
      </div>
    ),
    faqs: [
      {
        question: 'What is the best AI stack for content creators in 2026?',
        answer:
          "For a solo creator running newsletter + YouTube + social, the default we'd run is: Perplexity for research ($20/mo), Claude Pro for writing ($20/mo), Canva Pro for graphics ($13/mo), Opus Clip for short-form video (~$10/mo annual), Descript for long-form editing ($24/mo), ElevenLabs for voice ($5–22/mo), Publer for scheduling ($12/mo), and Beehiiv free until 2,500 subs. Total: $150–250/mo depending on tiers.",
      },
      {
        question: 'How much does an AI content creator stack cost?',
        answer:
          "On the free path (Claude Pro + Canva Pro + Beehiiv free + CapCut), about $40/month. On the paid path for a single creator at entry tiers across all 8 stages, $150–250/month. That replaces $4,000–6,000/month of freelance editing, design, copywriting, and VA time — the math is heavily in favor of the AI stack.",
      },
      {
        question: 'Claude or ChatGPT for content creators?',
        answer:
          "Claude for long-form writing — it holds voice across 2,000-word drafts and refuses less often on creator-adjacent topics. ChatGPT if you want voice mode for hands-free brainstorming. Most creators end up with both at $20/mo each because the use cases are different enough.",
      },
      {
        question: 'What is the best AI tool for YouTube short-form clips?',
        answer:
          'Opus Clip is the default — its automatic clip selection is the best in the category, and ClipAnything search means you can pull specific topics on demand. Submagic is the alternative if per-clip caption and B-roll polish matters more than picking the right clips. Klap is the cheaper entry option.',
      },
      {
        question: 'Do I need Descript and Opus Clip both?',
        answer:
          "Yes if you produce long-form video. Descript handles the main edit (talking head, podcast, multi-camera). Opus Clip handles repurposing the long-form into 5–15 short clips for TikTok/Reels/Shorts. They serve different stages of the workflow.",
      },
      {
        question: 'Should I use Beehiiv or Substack for my newsletter?',
        answer:
          "Beehiiv if growth and monetization matter more than community feel — the boost network, referral program, and recommendations engine are best in class. Substack if you want a built-in audience and don't mind the platform owning the relationship. We chose Beehiiv as the default because it doesn't compete with your brand for the reader's attention.",
      },
      {
        question: 'How often should I re-evaluate the stack?',
        answer:
          "Every 6 months. The video and short-form tooling moves fastest — Opus, Submagic, Captions all ship significant capability jumps quarterly. Writing tools and scheduling are more stable. Don't lock annual contracts on anything in the video/audio category — go monthly until the dust settles.",
      },
    ],
  },
}
