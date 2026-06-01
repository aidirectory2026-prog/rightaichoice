import type { StackConfig } from '../stacks'

/**
 * Phase 9 — decision-engine pillar stack #4.
 *
 * Target query family: "ai stack for solo developers" / "ai tools for
 * developers" / "indie hacker ai stack". Now fully buildable as a TRUE
 * end-to-end stack (not just the AI layer) after the catalog gap-fill added
 * the hosting/db/design/monitoring platforms (Vercel, Firebase, Neon, Figma,
 * Sentry…). All picks verified present + published.
 *
 * Persona: a solo developer / indie hacker shipping a product end-to-end —
 * plan, build, deploy, monitor — leaning on AI to replace a whole team.
 */
export const aiStackForSoloDevelopers: StackConfig = {
  slug: 'ai-stack-for-solo-developers',
  title: 'The AI Stack for Solo Developers (2026)',
  goal: 'Ship a product solo, end-to-end, with AI',
  description:
    'The hand-picked AI-first stack we recommend for a solo developer in 2026 — plan, code, prototype, backend, deploy, design, and monitor — with monthly cost rolled up.',
  stages: [
    {
      name: 'Plan & Spec',
      description:
        'Turn a vague idea into an architecture and a spec before you write code — the thinking layer that saves a week of wrong turns.',
      bestPick: {
        name: 'Claude',
        slug: 'claude',
        reason:
          'Best reasoning for architecture, trade-offs, and writing a clear spec/PRD. Holds the whole design in context and pushes back on bad ideas.',
        pricing: '$20/mo (Pro)',
        tags: ['planning', 'reasoning'],
      },
      alternatives: [
        {
          name: 'ChatGPT',
          slug: 'chatgpt',
          reason:
            'Strong alternative; voice mode is great for talking through a design on a walk.',
          pricing: '$20/mo',
        },
        {
          name: 'Notion',
          slug: 'notion',
          reason:
            'Where the spec, backlog, and docs actually live — with Notion AI to draft and tidy them.',
          pricing: 'Free / $10/mo AI',
        },
      ],
      costEstimate: '$20/mo',
    },
    {
      name: 'AI-Native IDE',
      description:
        'Your day-to-day editor. Tab-completion, multi-file edits, and an in-editor agent — where most of the code actually gets written.',
      bestPick: {
        name: 'Cursor',
        slug: 'cursor',
        reason:
          'The default AI IDE — tab-completion, multi-file edits, and a capable agent mode in a clean VS Code fork. Just works.',
        pricing: 'From $20/mo',
        tags: ['ide', 'coding'],
      },
      alternatives: [
        {
          name: 'Windsurf',
          slug: 'windsurf',
          reason:
            'Lighter-weight VS Code fork with a more aggressive autopilot (Cascade) for longer agentic tasks.',
          pricing: 'From $15/mo',
        },
        {
          name: 'GitHub Copilot',
          slug: 'github-copilot',
          reason:
            'Lowest-friction if you stay in VS Code/JetBrains and are already on GitHub.',
          pricing: 'From $10/mo',
        },
      ],
      costEstimate: '$10–20/mo',
    },
    {
      name: 'Terminal / Agentic Coding',
      description:
        'The heavier lifting — repo-wide refactors, running commands, and autonomous multi-step changes from the shell.',
      bestPick: {
        name: 'Claude Code',
        slug: 'claude-code',
        reason:
          'Best terminal-first agent — reasons about a full repo, edits files, runs commands. The power-user complement to an IDE.',
        pricing: 'Usage / Pro plans',
        tags: ['agent', 'cli'],
      },
      alternatives: [
        {
          name: 'Aider',
          slug: 'aider',
          reason:
            'Open-source, git-native CLI pair-programmer. BYO key; transparent and cheap.',
          pricing: 'Free + API',
        },
        {
          name: 'Cline',
          slug: 'cline',
          reason:
            'Open-source autonomous agent inside VS Code — free, BYO key, very capable on frontier models.',
          pricing: 'Free + API',
        },
      ],
      costEstimate: '$0–20/mo + API',
    },
    {
      name: 'Prototype from a Prompt',
      description:
        'Go from idea to a working UI/app skeleton in minutes — for landing pages, MVPs, and throwaway prototypes.',
      bestPick: {
        name: 'v0',
        slug: 'v0',
        reason:
          'Best prompt-to-UI for React/Next + shadcn — production-quality components you can paste straight into the codebase.',
        pricing: 'From $20/mo',
        tags: ['prototype', 'ui-gen'],
      },
      alternatives: [
        {
          name: 'Lovable',
          slug: 'lovable',
          reason:
            'Prompt-to-full-app (frontend + Supabase backend) — best when you want a working MVP, not just components.',
          pricing: 'From $25/mo',
        },
        {
          name: 'Bolt',
          slug: 'bolt-new',
          reason:
            'In-browser full-stack generation and deploy; great for fast throwaway prototypes.',
          pricing: 'From $20/mo',
        },
      ],
      costEstimate: '$0–25/mo',
    },
    {
      name: 'Backend & Database',
      description:
        'Auth, database, storage, and APIs without standing up infrastructure — the part a solo dev should never hand-roll.',
      bestPick: {
        name: 'Supabase',
        slug: 'supabase',
        reason:
          'Postgres + auth + storage + edge functions with a great DX, generous free tier, and AI-assisted SQL. The default backend for solo builders.',
        pricing: 'Free / $25/mo Pro',
        tags: ['backend', 'database'],
      },
      alternatives: [
        {
          name: 'Firebase',
          slug: 'firebase',
          reason:
            'Pick it for real-time apps and tight Google/Gemini integration; NoSQL-first.',
          pricing: 'Free / pay-as-you-go',
        },
        {
          name: 'Neon',
          slug: 'neon',
          reason:
            'Serverless Postgres with branching — ideal if you want plain Postgres without the rest of a BaaS.',
          pricing: 'Free / from $19/mo',
        },
      ],
      costEstimate: '$0–25/mo',
    },
    {
      name: 'Deploy & Hosting',
      description:
        'Push to git, get a live URL. Preview deploys, edge functions, and zero server management.',
      bestPick: {
        name: 'Vercel',
        slug: 'vercel',
        reason:
          'The default for Next.js and frontend apps — preview deploys, edge/serverless functions, and first-party AI tooling (v0, AI SDK, AI Gateway).',
        pricing: 'Free / $20/mo Pro',
        tags: ['hosting', 'deploy'],
      },
      alternatives: [
        {
          name: 'Netlify',
          slug: 'netlify',
          reason:
            'Strong alternative for static/JAMstack sites; generous free tier and simple DX.',
          pricing: 'Free / from $19/mo',
        },
        {
          name: 'Railway',
          slug: 'railway',
          reason:
            'Best when you need long-running backends, workers, or databases alongside the app — not just frontend.',
          pricing: 'Usage-based, from $5/mo',
        },
      ],
      costEstimate: '$0–20/mo',
    },
    {
      name: 'Design & Assets',
      description:
        'UI design, marketing graphics, and the occasional hero image — without a designer on staff.',
      bestPick: {
        name: 'Figma',
        slug: 'figma',
        reason:
          'The design standard — and Figma AI / Make now generate and edit designs, so a solo dev can produce real UI without learning a separate tool.',
        pricing: 'Free / from $12/mo',
        tags: ['design', 'ui'],
      },
      alternatives: [
        {
          name: 'Canva',
          slug: 'canva',
          reason:
            'Faster for marketing graphics, social, and docs — templates + Magic tools cover 90% of non-UI visual work.',
          pricing: '$13/mo',
        },
        {
          name: 'Midjourney',
          slug: 'midjourney',
          reason:
            'Custom hero/marketing imagery when a template won&apos;t do.',
          pricing: 'From $10/mo',
        },
      ],
      costEstimate: '$0–13/mo',
    },
    {
      name: 'Ship Quality — Monitoring & Docs',
      description:
        'After launch: catch errors before users report them, understand usage, and document the product.',
      bestPick: {
        name: 'Sentry',
        slug: 'sentry',
        reason:
          'Error + performance monitoring with AI-assisted root-cause (Seer/Autofix). The first thing to add the day you have real users.',
        pricing: 'Free / from $26/mo',
        tags: ['monitoring', 'errors'],
      },
      alternatives: [
        {
          name: 'PostHog',
          slug: 'posthog',
          reason:
            'Product analytics + session replay + flags in one — understand what users actually do. Generous free tier.',
          pricing: 'Free / usage-based',
        },
        {
          name: 'GitBook',
          slug: 'gitbook',
          reason:
            'AI-assisted docs for your product/API — pick it (or Mintlify) once you have users or an API to document.',
          pricing: 'Free / from $8/mo',
        },
      ],
      costEstimate: '$0–26/mo',
    },
  ],
  summary: {
    freePath: '~$40/mo (Claude Pro + Cursor + Supabase free + Vercel free + Sentry free)',
    paidPath: '$120–200/mo (all picks paid, single developer)',
    skillLevel: 'Intermediate',
    setupTime: '1 weekend',
  },
  pillar: {
    metaTitle: 'The AI Stack for Solo Developers (2026) | RightAIChoice',
    metaDescription:
      'The exact AI-first stack we recommend for a solo developer in 2026 — plan, code, prototype, backend, deploy, design, monitor — with monthly cost. Build like a team of one.',
    publishedISO: '2026-06-01',
    lastReviewedISO: '2026-06-01',
    lastReviewed: 'June 1, 2026',
    intro: (
      <div className="space-y-4 text-zinc-300 leading-relaxed">
        <p>
          If you&apos;re building a product solo and want the AI-first stack
          that replaces a whole team, this is it. Eight stages from idea to
          monitored production, one tool we&apos;d default to in each, two
          alternatives, monthly cost rolled up at the bottom.
        </p>
        <p>
          We don&apos;t list every option in every category — a stack page
          exists to make a decision, not hand it back to you. Each pick links to
          its{' '}
          <a href="/compare" className="text-emerald-400 no-underline hover:underline">
            head-to-head comparisons
          </a>{' '}
          for the close calls.
        </p>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          Who this stack is for
        </h2>
        <p>
          A solo developer or indie hacker shipping end-to-end — you write the
          code, you deploy it, you answer the support emails. You don&apos;t
          have a designer, a DevOps engineer, or a PM. The point of going
          AI-first is that you don&apos;t need them to ship something real.
          Building inside a company team instead? See the (forthcoming){' '}
          <strong className="font-semibold text-white">AI Stack for Product Teams</strong>.
        </p>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          How we picked
        </h2>
        <p>
          Three rules.{' '}
          <strong className="font-semibold text-white">One</strong>: a usable
          free or cheap tier — this is a solo budget, not an enterprise one.{' '}
          <strong className="font-semibold text-white">Two</strong>: it has to
          remove work you&apos;d otherwise do alone (a backend you don&apos;t
          hand-roll, a deploy you don&apos;t configure, errors you don&apos;t
          find manually).{' '}
          <strong className="font-semibold text-white">Three</strong>: no
          lock-in you can&apos;t escape — your code, data, and content stay
          portable.
        </p>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          When to swap a pick out
        </h2>
        <ul className="ml-5 list-disc space-y-2 marker:text-zinc-500">
          <li>
            <strong className="font-semibold text-white">You live in the terminal</strong>{' '}
            → move Claude Code to the top and lean on Aider; the IDE becomes
            secondary.
          </li>
          <li>
            <strong className="font-semibold text-white">You&apos;re building a real-time app</strong>{' '}
            → swap Supabase for Firebase.
          </li>
          <li>
            <strong className="font-semibold text-white">You need long-running backends/workers</strong>{' '}
            → deploy on Railway instead of Vercel (or alongside it).
          </li>
          <li>
            <strong className="font-semibold text-white">You&apos;re prototyping a full MVP, not components</strong>{' '}
            → start in Lovable instead of v0.
          </li>
        </ul>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          Total cost: free path vs paid path
        </h2>
        <p>
          The free path — Claude Pro + Cursor free tier + Supabase free +
          Vercel free + Sentry free — runs about{' '}
          <strong className="font-semibold text-white">$40/month</strong> and
          genuinely gets a side project to launch. The full paid stack at entry
          tiers for a single developer lands around{' '}
          <strong className="font-semibold text-white">$120–200/month</strong>{' '}
          — which replaces the cost of contract design, DevOps, and a junior
          engineer many times over.
        </p>

        <h2 className="mt-8 mb-2 text-xl font-semibold text-white">
          The 8-stage stack
        </h2>
        <p>
          Stages below follow the build lifecycle: plan, edit, agent, prototype,
          backend, deploy, design, monitor. Each has our default pick, two
          alternatives, and a per-stage cost. Save the stack or export it from
          the sidebar.
        </p>
      </div>
    ),
    faqs: [
      {
        question: 'What is the best AI stack for a solo developer in 2026?',
        answer:
          "Our default: Claude for planning, Cursor as the AI IDE, Claude Code for terminal/agentic work, v0 for prototyping, Supabase for backend, Vercel for hosting, Figma for design, and Sentry for monitoring. Free path ~$40/mo; full paid stack $120–200/mo for one developer. Swap based on whether you're terminal-first, real-time, or backend-heavy.",
      },
      {
        question: 'How much does an AI developer stack cost?',
        answer:
          'On the free path (Claude Pro + Cursor free + Supabase free + Vercel free + Sentry free) about $40/month. With every stage paid at entry tiers for a single developer, $120–200/month — far less than contracting design, DevOps, and engineering help.',
      },
      {
        question: 'Cursor or GitHub Copilot for solo devs?',
        answer:
          'Cursor as the daily driver — its agent mode and multi-file edits are more capable. GitHub Copilot if you want the lowest-friction option inside your existing VS Code/JetBrains setup and you are already on GitHub. Many solo devs run Cursor plus Claude Code for heavier agentic tasks.',
      },
      {
        question: 'Do I need both an AI IDE and a terminal agent?',
        answer:
          'Not strictly, but they complement each other. The IDE (Cursor/Windsurf) is for day-to-day editing with you in the driver seat; the terminal agent (Claude Code/Aider) is for repo-wide refactors and autonomous multi-step changes. Start with the IDE; add the agent when you hit tasks that span many files.',
      },
      {
        question: 'Supabase or Firebase for a solo project?',
        answer:
          'Supabase is the default — Postgres, auth, storage, and a great free tier with AI-assisted SQL, and it pairs naturally with prompt-to-app tools like Lovable. Choose Firebase for real-time-first apps or tight Google/Gemini integration. Neon is the pick if you want plain serverless Postgres without the rest of a backend platform.',
      },
      {
        question: 'What is the best way to deploy a solo project in 2026?',
        answer:
          'Vercel for frontend/Next.js apps — git push to a live URL with preview deploys and edge functions, plus first-party AI tooling. Netlify is a solid alternative for static/JAMstack sites. Use Railway when you need long-running backends, workers, or a database hosted alongside the app.',
      },
      {
        question: 'What should a solo developer add the day they get real users?',
        answer:
          'Error monitoring (Sentry) first — so you hear about bugs before users report them — and product analytics (PostHog) to see what people actually do. Add docs (GitBook or Mintlify) once you have an API or enough users asking the same questions.',
      },
    ],
  },
}
