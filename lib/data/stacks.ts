/**
 * Static data for "Best AI Stack for [Goal]" pages.
 * Each stack defines stages with a best pick + alternatives.
 * Tool slugs link to /tools/[slug] pages where they exist.
 */

export type StackTool = {
  name: string
  slug: string
  reason: string
  pricing: string
  tags?: string[]
}

export type StackStage = {
  name: string
  description: string
  bestPick: StackTool
  alternatives: StackTool[]
  costEstimate: string
}

export type StackConfig = {
  slug: string
  title: string
  goal: string
  description: string
  stages: StackStage[]
  summary: {
    freePath: string
    paidPath: string
    skillLevel: 'Beginner' | 'Intermediate' | 'Advanced'
    setupTime: string
  }
}

export const STACKS: StackConfig[] = [
  {
    slug: 'launch-saas-mvp',
    title: 'Best AI Stack for Launching a SaaS MVP',
    goal: 'Launch a SaaS MVP without code',
    description: 'The complete AI-powered toolkit to go from idea to live SaaS product without hiring a dev team. Covers design, development, backend, payments, and launch.',
    stages: [
      {
        name: 'Ideation & Naming',
        description: 'Generate product names, validate ideas, and create brand assets',
        bestPick: { name: 'ChatGPT', slug: 'chatgpt', reason: 'Best for brainstorming product ideas, validating concepts, and generating brand names with GPT-4 reasoning.', pricing: 'Free / $20/mo', tags: ['ideation', 'naming'] },
        alternatives: [
          { name: 'Claude', slug: 'claude', reason: 'Stronger for long-form analysis and market research.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'UI/UX Design',
        description: 'Design screens, prototypes, and user flows',
        bestPick: { name: 'Figma AI', slug: 'figma', reason: 'Industry-standard design tool with new AI features for auto-layout, content generation, and prototyping.', pricing: 'Free / $15/mo', tags: ['design', 'prototyping'] },
        alternatives: [
          { name: 'Uizard', slug: 'uizard', reason: 'Converts hand-drawn sketches to UI — great for non-designers.', pricing: 'Free / $19/mo' },
          { name: 'Framer', slug: 'framer', reason: 'AI-powered website builder with design-to-code.', pricing: 'Free / $15/mo' },
        ],
        costEstimate: '$0–19/mo',
      },
      {
        name: 'Frontend Development',
        description: 'Build the user interface and client-side logic',
        bestPick: { name: 'Cursor', slug: 'cursor', reason: 'AI-native code editor that writes, edits, and debugs code with full codebase context. Best developer experience.', pricing: 'Free / $20/mo', tags: ['coding', 'IDE'] },
        alternatives: [
          { name: 'GitHub Copilot', slug: 'github-copilot', reason: 'Inline code completions inside VS Code — great for experienced devs.', pricing: '$10/mo' },
          { name: 'v0 by Vercel', slug: 'v0', reason: 'Generates React UI components from text prompts.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Backend & Database',
        description: 'Set up authentication, database, storage, and APIs',
        bestPick: { name: 'Supabase', slug: 'supabase', reason: 'All-in-one backend: Postgres database, auth, storage, edge functions, and real-time subscriptions. Generous free tier.', pricing: 'Free / $25/mo', tags: ['backend', 'database'] },
        alternatives: [
          { name: 'Firebase', slug: 'firebase', reason: 'Google-backed BaaS with real-time DB and auth. Better for mobile.', pricing: 'Free / Pay-as-you-go' },
        ],
        costEstimate: '$0–25/mo',
      },
      {
        name: 'Deployment & Hosting',
        description: 'Ship to production with CI/CD and custom domains',
        bestPick: { name: 'Vercel', slug: 'vercel', reason: 'Best deployment platform for Next.js and React. Automatic previews, edge functions, and analytics built in.', pricing: 'Free / $20/mo', tags: ['hosting', 'deployment'] },
        alternatives: [
          { name: 'Railway', slug: 'railway', reason: 'Simple deployment for full-stack apps with database hosting.', pricing: 'Free / $5/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Marketing & Launch',
        description: 'Write launch copy, landing pages, and email sequences',
        bestPick: { name: 'Jasper', slug: 'jasper', reason: 'Enterprise-grade AI copywriting for landing pages, email campaigns, and ad copy with brand voice control.', pricing: '$49/mo', tags: ['copywriting', 'marketing'] },
        alternatives: [
          { name: 'Copy.ai', slug: 'copy-ai', reason: 'More affordable alternative with workflow automations.', pricing: 'Free / $36/mo' },
        ],
        costEstimate: '$0–49/mo',
      },
    ],
    summary: { freePath: '$0/mo (free tiers only)', paidPath: '$100–150/mo', skillLevel: 'Intermediate', setupTime: '2–4 weeks' },
  },
  {
    slug: 'youtube-channel',
    title: 'Best AI Stack for Starting a YouTube Channel',
    goal: 'Start a faceless YouTube channel',
    description: 'Everything you need to script, produce, edit, and grow a YouTube channel using AI — even if you never show your face on camera.',
    stages: [
      {
        name: 'Scriptwriting',
        description: 'Generate video scripts, hooks, and outlines',
        bestPick: { name: 'ChatGPT', slug: 'chatgpt', reason: 'Best for generating video scripts with hooks, outlines, and CTAs. GPT-4 produces broadcast-quality scripts.', pricing: 'Free / $20/mo', tags: ['writing', 'scripts'] },
        alternatives: [
          { name: 'Claude', slug: 'claude', reason: 'Better for longer, more nuanced scripts and research-heavy content.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Voiceover',
        description: 'Generate natural-sounding narration',
        bestPick: { name: 'ElevenLabs', slug: 'elevenlabs', reason: 'Most natural AI voices with voice cloning, multilingual support, and emotion control. Industry leader.', pricing: 'Free / $5/mo', tags: ['voice', 'TTS'] },
        alternatives: [
          { name: 'Murf AI', slug: 'murf-ai', reason: 'Studio-quality voices with a simpler interface. Good for beginners.', pricing: 'Free / $26/mo' },
        ],
        costEstimate: '$0–26/mo',
      },
      {
        name: 'Video Creation',
        description: 'Generate or compile video footage with AI',
        bestPick: { name: 'Synthesia', slug: 'synthesia', reason: 'Create AI avatar videos from text. Perfect for faceless channels that need a presenter without filming.', pricing: '$22/mo', tags: ['video', 'avatars'] },
        alternatives: [
          { name: 'Pictory', slug: 'pictory', reason: 'Converts scripts and articles into videos with stock footage.', pricing: '$23/mo' },
          { name: 'InVideo AI', slug: 'invideo-ai', reason: 'Text-to-video with automated editing and stock media.', pricing: 'Free / $25/mo' },
        ],
        costEstimate: '$0–25/mo',
      },
      {
        name: 'Thumbnail Design',
        description: 'Create click-worthy thumbnails',
        bestPick: { name: 'Canva', slug: 'canva', reason: 'AI-powered design with YouTube thumbnail templates, background remover, and Magic Write for text overlays.', pricing: 'Free / $13/mo', tags: ['design', 'thumbnails'] },
        alternatives: [
          { name: 'Midjourney', slug: 'midjourney', reason: 'Generate custom artwork and eye-catching visuals for thumbnails.', pricing: '$10/mo' },
        ],
        costEstimate: '$0–13/mo',
      },
      {
        name: 'SEO & Growth',
        description: 'Optimize titles, descriptions, and tags for discovery',
        bestPick: { name: 'VidIQ', slug: 'vidiq', reason: 'YouTube-specific SEO tool with keyword research, competitor tracking, and AI title/description generator.', pricing: 'Free / $10/mo', tags: ['SEO', 'YouTube'] },
        alternatives: [
          { name: 'TubeBuddy', slug: 'tubebuddy', reason: 'Similar feature set with A/B testing for thumbnails.', pricing: 'Free / $5/mo' },
        ],
        costEstimate: '$0–10/mo',
      },
    ],
    summary: { freePath: '$0/mo (free tiers)', paidPath: '$47–94/mo', skillLevel: 'Beginner', setupTime: '1–2 weeks' },
  },
  {
    slug: 'solo-marketing-agency',
    title: 'Best AI Stack for Running a Solo Marketing Agency',
    goal: 'Run a solo marketing agency',
    description: 'Handle content, ads, SEO, email, and reporting for multiple clients — all powered by AI. One person, agency-level output.',
    stages: [
      {
        name: 'Content Writing',
        description: 'Blog posts, social copy, ad copy for clients',
        bestPick: { name: 'Jasper', slug: 'jasper', reason: 'Brand voice control lets you switch between client voices. Campaigns feature handles multi-channel content from one brief.', pricing: '$49/mo', tags: ['copywriting', 'content'] },
        alternatives: [
          { name: 'Copy.ai', slug: 'copy-ai', reason: 'Workflow automations for repetitive content tasks. More affordable.', pricing: 'Free / $36/mo' },
        ],
        costEstimate: '$36–49/mo',
      },
      {
        name: 'SEO & Research',
        description: 'Keyword research, content optimization, competitor analysis',
        bestPick: { name: 'Surfer SEO', slug: 'surfer-seo', reason: 'AI content editor that scores articles against top-ranking pages. Integrates with Jasper for write-and-optimize workflow.', pricing: '$89/mo', tags: ['SEO', 'optimization'] },
        alternatives: [
          { name: 'Semrush', slug: 'semrush', reason: 'Full SEO suite with backlink analysis and site audits.', pricing: '$130/mo' },
        ],
        costEstimate: '$89–130/mo',
      },
      {
        name: 'Social Media Management',
        description: 'Schedule, create, and analyze social posts',
        bestPick: { name: 'Buffer', slug: 'buffer', reason: 'Clean scheduling tool with AI caption writer. Supports all major platforms. Affordable for multi-client use.', pricing: 'Free / $6/mo per channel', tags: ['social media', 'scheduling'] },
        alternatives: [
          { name: 'Hootsuite', slug: 'hootsuite', reason: 'More robust analytics and team collaboration features.', pricing: '$99/mo' },
        ],
        costEstimate: '$0–30/mo',
      },
      {
        name: 'Email Marketing',
        description: 'Email sequences, newsletters, and automations',
        bestPick: { name: 'Mailchimp', slug: 'mailchimp', reason: 'AI-powered subject lines, send-time optimization, and content generator. Industry standard with generous free tier.', pricing: 'Free / $13/mo', tags: ['email', 'automation'] },
        alternatives: [
          { name: 'Beehiiv', slug: 'beehiiv', reason: 'Better for newsletter-focused clients with growth tools.', pricing: 'Free / $49/mo' },
        ],
        costEstimate: '$0–49/mo',
      },
      {
        name: 'Design & Visuals',
        description: 'Graphics, social images, presentations',
        bestPick: { name: 'Canva', slug: 'canva', reason: 'Brand kits per client, Magic Design for auto-generated layouts, and a massive template library.', pricing: 'Free / $13/mo', tags: ['design', 'graphics'] },
        alternatives: [
          { name: 'Adobe Firefly', slug: 'adobe-firefly', reason: 'Commercially safe AI image generation within Creative Cloud.', pricing: 'Free / $10/mo' },
        ],
        costEstimate: '$0–13/mo',
      },
      {
        name: 'Reporting & Analytics',
        description: 'Client dashboards and performance reports',
        bestPick: { name: 'Notion AI', slug: 'notion', reason: 'Central hub for client wikis, project tracking, and AI-generated summaries. Databases for reporting dashboards.', pricing: 'Free / $10/mo', tags: ['project management', 'docs'] },
        alternatives: [
          { name: 'Google Looker Studio', slug: 'google-looker-studio', reason: 'Free dashboarding tool that connects to all major ad platforms.', pricing: 'Free' },
        ],
        costEstimate: '$0–10/mo',
      },
      {
        name: 'Automation & Workflows',
        description: 'Connect tools and automate repetitive tasks',
        bestPick: { name: 'Zapier', slug: 'zapier', reason: 'Connect 6000+ apps with no-code automations. AI actions can generate text and make decisions in workflows.', pricing: 'Free / $20/mo', tags: ['automation', 'integration'] },
        alternatives: [
          { name: 'Make', slug: 'make', reason: 'More visual workflow builder with complex branching logic. Cheaper at scale.', pricing: 'Free / $9/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
    ],
    summary: { freePath: '$0/mo (very limited)', paidPath: '$150–300/mo', skillLevel: 'Intermediate', setupTime: '1–2 weeks' },
  },
  {
    slug: 'online-course',
    title: 'Best AI Stack for Building an Online Course',
    goal: 'Build and sell an online course',
    description: 'Plan curriculum, create lessons, produce videos, and sell your course — all accelerated with AI tools.',
    stages: [
      {
        name: 'Course Planning',
        description: 'Outline curriculum, modules, and learning objectives',
        bestPick: { name: 'ChatGPT', slug: 'chatgpt', reason: 'Excellent for structuring course outlines, generating lesson plans, and creating quiz questions from your expertise.', pricing: 'Free / $20/mo', tags: ['planning', 'curriculum'] },
        alternatives: [
          { name: 'Claude', slug: 'claude', reason: 'Better for long, detailed curriculum documents and research synthesis.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Slide & Visual Creation',
        description: 'Design course slides, infographics, and assets',
        bestPick: { name: 'Canva', slug: 'canva', reason: 'Course-specific templates, AI slide generator, and presentation mode. One tool for all visual content.', pricing: 'Free / $13/mo', tags: ['design', 'presentations'] },
        alternatives: [
          { name: 'Gamma', slug: 'gamma', reason: 'AI-first presentation tool that generates beautiful slides from text.', pricing: 'Free / $10/mo' },
        ],
        costEstimate: '$0–13/mo',
      },
      {
        name: 'Video Production',
        description: 'Record and edit video lessons',
        bestPick: { name: 'Descript', slug: 'descript', reason: 'Edit video by editing text. AI removes filler words, generates captions, and creates clips. Perfect for course creators.', pricing: 'Free / $24/mo', tags: ['video editing', 'transcription'] },
        alternatives: [
          { name: 'Synthesia', slug: 'synthesia', reason: 'Create AI presenter videos without filming yourself.', pricing: '$22/mo' },
        ],
        costEstimate: '$0–24/mo',
      },
      {
        name: 'Course Hosting & Sales',
        description: 'Host, price, and sell your course',
        bestPick: { name: 'Teachable', slug: 'teachable', reason: 'All-in-one course platform with payment processing, student management, and marketing tools.', pricing: '$39/mo', tags: ['LMS', 'e-commerce'] },
        alternatives: [
          { name: 'Gumroad', slug: 'gumroad', reason: 'Simpler option for selling digital products with no monthly fee.', pricing: '10% per sale' },
        ],
        costEstimate: '$0–39/mo',
      },
      {
        name: 'Marketing & Launch',
        description: 'Landing pages, email sequences, and promotion',
        bestPick: { name: 'Mailchimp', slug: 'mailchimp', reason: 'Build an email list, create launch sequences, and send automated onboarding emails to students.', pricing: 'Free / $13/mo', tags: ['email', 'marketing'] },
        alternatives: [
          { name: 'ConvertKit', slug: 'convertkit', reason: 'Built specifically for creators. Visual automation builder.', pricing: 'Free / $25/mo' },
        ],
        costEstimate: '$0–25/mo',
      },
    ],
    summary: { freePath: '$0/mo (free tiers + Gumroad)', paidPath: '$80–120/mo', skillLevel: 'Beginner', setupTime: '2–4 weeks' },
  },
  {
    slug: 'automate-lead-generation',
    title: 'Best AI Stack for Automating Lead Generation',
    goal: 'Automate lead generation',
    description: 'Build an AI-powered pipeline that finds prospects, enriches data, personalizes outreach, and books meetings on autopilot.',
    stages: [
      {
        name: 'Prospect Research',
        description: 'Find and identify ideal customer profiles',
        bestPick: { name: 'Apollo.io', slug: 'apollo-io', reason: 'Largest B2B contact database with AI-powered lead scoring and intent signals. Free tier includes 50 credits/mo.', pricing: 'Free / $49/mo', tags: ['prospecting', 'B2B'] },
        alternatives: [
          { name: 'LinkedIn Sales Navigator', slug: 'linkedin-sales-navigator', reason: 'Best for relationship-based selling and warm intros.', pricing: '$80/mo' },
        ],
        costEstimate: '$0–80/mo',
      },
      {
        name: 'Email Outreach',
        description: 'Personalized cold email sequences at scale',
        bestPick: { name: 'Instantly', slug: 'instantly', reason: 'AI-written personalized emails, unlimited sending accounts, and smart rotation to avoid spam filters.', pricing: '$30/mo', tags: ['cold email', 'outreach'] },
        alternatives: [
          { name: 'Lemlist', slug: 'lemlist', reason: 'Personalized images and videos in cold emails. Higher engagement.', pricing: '$39/mo' },
        ],
        costEstimate: '$30–39/mo',
      },
      {
        name: 'Data Enrichment',
        description: 'Enrich prospect data with company info, tech stack, and signals',
        bestPick: { name: 'Clay', slug: 'clay', reason: 'AI-powered data enrichment that pulls from 50+ sources. Build custom lead scoring models with AI.', pricing: '$149/mo', tags: ['enrichment', 'data'] },
        alternatives: [
          { name: 'Clearbit', slug: 'clearbit', reason: 'Real-time data enrichment with strong Salesforce integration.', pricing: 'Contact for pricing' },
        ],
        costEstimate: '$0–149/mo',
      },
      {
        name: 'CRM & Pipeline',
        description: 'Track leads, deals, and follow-ups',
        bestPick: { name: 'HubSpot', slug: 'hubspot', reason: 'Free CRM with AI-powered deal predictions, email tracking, and pipeline automation. Scales with your business.', pricing: 'Free / $45/mo', tags: ['CRM', 'sales'] },
        alternatives: [
          { name: 'Pipedrive', slug: 'pipedrive', reason: 'Simpler CRM focused on pipeline visibility and deal management.', pricing: '$15/mo' },
        ],
        costEstimate: '$0–45/mo',
      },
      {
        name: 'Automation',
        description: 'Connect tools and automate the pipeline',
        bestPick: { name: 'Zapier', slug: 'zapier', reason: 'Glue layer between all tools. Trigger sequences when leads match criteria, sync data across platforms.', pricing: 'Free / $20/mo', tags: ['automation'] },
        alternatives: [
          { name: 'Make', slug: 'make', reason: 'More complex workflow logic at a lower price point.', pricing: 'Free / $9/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
    ],
    summary: { freePath: '$0/mo (very limited)', paidPath: '$150–350/mo', skillLevel: 'Intermediate', setupTime: '1–2 weeks' },
  },
  {
    slug: 'newsletter-business',
    title: 'Best AI Stack for Starting a Newsletter Business',
    goal: 'Start a newsletter business',
    description: 'Write, grow, and monetize a newsletter using AI for content creation, subscriber growth, and revenue optimization.',
    stages: [
      {
        name: 'Writing & Content',
        description: 'Draft, edit, and polish newsletter editions',
        bestPick: { name: 'ChatGPT', slug: 'chatgpt', reason: 'Research topics, draft editions, write subject lines, and generate social snippets from your newsletter content.', pricing: 'Free / $20/mo', tags: ['writing'] },
        alternatives: [
          { name: 'Lex', slug: 'lex', reason: 'AI writing tool designed specifically for long-form writers and publishers.', pricing: '$8/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Newsletter Platform',
        description: 'Send, manage subscribers, and track metrics',
        bestPick: { name: 'Beehiiv', slug: 'beehiiv', reason: 'Built for newsletter businesses: referral program, ad network, paid subscriptions, and growth tools all included.', pricing: 'Free / $49/mo', tags: ['newsletter', 'email'] },
        alternatives: [
          { name: 'Substack', slug: 'substack', reason: 'Simplest option with built-in paid subscriptions. 10% revenue cut.', pricing: 'Free (10% of paid subs)' },
        ],
        costEstimate: '$0–49/mo',
      },
      {
        name: 'Growth & Referrals',
        description: 'Acquire subscribers through referral loops and cross-promotion',
        bestPick: { name: 'SparkLoop', slug: 'sparkloop', reason: 'Newsletter referral platform that rewards subscribers for sharing. Integrates with Beehiiv and ConvertKit.', pricing: '$99/mo', tags: ['growth', 'referrals'] },
        alternatives: [
          { name: 'Beehiiv Boosts', slug: 'beehiiv', reason: 'Built-in cross-promotion marketplace (included with Beehiiv).', pricing: 'Included' },
        ],
        costEstimate: '$0–99/mo',
      },
      {
        name: 'Design & Branding',
        description: 'Newsletter templates, social graphics, and brand assets',
        bestPick: { name: 'Canva', slug: 'canva', reason: 'Design header images, social cards for promotion, and branded templates for consistent visual identity.', pricing: 'Free / $13/mo', tags: ['design'] },
        alternatives: [
          { name: 'Figma', slug: 'figma', reason: 'More control for custom email template design.', pricing: 'Free / $15/mo' },
        ],
        costEstimate: '$0–13/mo',
      },
      {
        name: 'Monetization',
        description: 'Sponsorships, paid subscriptions, and ad revenue',
        bestPick: { name: 'Passionfroot', slug: 'passionfroot', reason: 'Sponsorship marketplace and management tool for newsletter creators. Handle inbound sponsor requests.', pricing: 'Free / 10% fee', tags: ['monetization', 'sponsorships'] },
        alternatives: [
          { name: 'ConvertKit Sponsor Network', slug: 'convertkit', reason: 'Automated sponsor matching for ConvertKit newsletters.', pricing: 'Revenue share' },
        ],
        costEstimate: '$0 (revenue share)',
      },
    ],
    summary: { freePath: '$0/mo (Substack + free tiers)', paidPath: '$80–180/mo', skillLevel: 'Beginner', setupTime: '1 week' },
  },
  {
    slug: 'build-mobile-app',
    title: 'Best AI Stack for Building a Mobile App',
    goal: 'Build a mobile app',
    description: 'Design, develop, test, and ship a mobile app using AI tools — from wireframes to app store submission.',
    stages: [
      {
        name: 'Design & Prototyping',
        description: 'Wireframes, UI design, and interactive prototypes',
        bestPick: { name: 'Figma AI', slug: 'figma', reason: 'Industry-standard for mobile app design with AI features, component libraries, and dev handoff.', pricing: 'Free / $15/mo', tags: ['design', 'mobile'] },
        alternatives: [
          { name: 'Uizard', slug: 'uizard', reason: 'AI converts sketches to mobile app screens. Great for quick prototyping.', pricing: 'Free / $19/mo' },
        ],
        costEstimate: '$0–19/mo',
      },
      {
        name: 'Development',
        description: 'Write app code with AI assistance',
        bestPick: { name: 'Cursor', slug: 'cursor', reason: 'AI-native code editor with full codebase context. Supports React Native, Flutter, and Swift development.', pricing: 'Free / $20/mo', tags: ['coding', 'mobile dev'] },
        alternatives: [
          { name: 'GitHub Copilot', slug: 'github-copilot', reason: 'Best inline completions for experienced mobile developers.', pricing: '$10/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Backend & APIs',
        description: 'Authentication, database, push notifications',
        bestPick: { name: 'Firebase', slug: 'firebase', reason: 'Google-backed mobile backend with real-time database, auth, push notifications, and crashlytics. Best mobile BaaS.', pricing: 'Free / Pay-as-you-go', tags: ['backend', 'mobile'] },
        alternatives: [
          { name: 'Supabase', slug: 'supabase', reason: 'Open-source alternative with Postgres. Better for complex queries.', pricing: 'Free / $25/mo' },
        ],
        costEstimate: '$0–25/mo',
      },
      {
        name: 'Testing & QA',
        description: 'Automated testing and bug detection',
        bestPick: { name: 'Codium AI', slug: 'codiumai', reason: 'AI generates unit tests and integration tests from your code. Catches edge cases humans miss.', pricing: 'Free / $19/mo', tags: ['testing', 'QA'] },
        alternatives: [
          { name: 'Testim', slug: 'testim', reason: 'AI-powered end-to-end testing with visual test builder.', pricing: 'Free trial / Contact' },
        ],
        costEstimate: '$0–19/mo',
      },
      {
        name: 'App Store Assets',
        description: 'Screenshots, descriptions, and ASO',
        bestPick: { name: 'Canva', slug: 'canva', reason: 'App store screenshot templates, feature graphics, and promotional assets with AI-powered design.', pricing: 'Free / $13/mo', tags: ['design', 'ASO'] },
        alternatives: [
          { name: 'ChatGPT', slug: 'chatgpt', reason: 'Generate optimized app store descriptions, keyword lists, and release notes.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–13/mo',
      },
    ],
    summary: { freePath: '$0/mo (free tiers)', paidPath: '$60–100/mo', skillLevel: 'Advanced', setupTime: '4–8 weeks' },
  },
  {
    slug: 'digital-products',
    title: 'Best AI Stack for Creating Digital Products',
    goal: 'Create and sell digital products',
    description: 'Design, create, and sell ebooks, templates, printables, and digital downloads using AI — from creation to storefront.',
    stages: [
      {
        name: 'Product Creation',
        description: 'Write ebooks, create templates, design printables',
        bestPick: { name: 'ChatGPT', slug: 'chatgpt', reason: 'Generate ebook drafts, Notion templates, checklists, and guides. Best general-purpose content generator.', pricing: 'Free / $20/mo', tags: ['writing', 'content'] },
        alternatives: [
          { name: 'Claude', slug: 'claude', reason: 'Superior for long-form ebooks and detailed how-to guides.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Design & Formatting',
        description: 'Visual design for digital products',
        bestPick: { name: 'Canva', slug: 'canva', reason: 'Design ebook covers, printable PDFs, social media templates, and presentation decks. Export in any format.', pricing: 'Free / $13/mo', tags: ['design'] },
        alternatives: [
          { name: 'Midjourney', slug: 'midjourney', reason: 'Generate unique artwork and illustrations for premium products.', pricing: '$10/mo' },
        ],
        costEstimate: '$0–13/mo',
      },
      {
        name: 'Storefront & Sales',
        description: 'Sell and deliver digital products',
        bestPick: { name: 'Gumroad', slug: 'gumroad', reason: 'Simplest way to sell digital products. No monthly fee — just a 10% cut per sale. Instant delivery.', pricing: '10% per sale', tags: ['e-commerce', 'digital'] },
        alternatives: [
          { name: 'Lemonsqueezy', slug: 'lemonsqueezy', reason: 'Modern alternative with subscription support and better checkout UX.', pricing: '5% + 50¢ per sale' },
        ],
        costEstimate: '$0 (revenue share)',
      },
      {
        name: 'Marketing',
        description: 'Promote products and build an audience',
        bestPick: { name: 'Mailchimp', slug: 'mailchimp', reason: 'Build an email list of buyers, send product launch sequences, and automate follow-up upsells.', pricing: 'Free / $13/mo', tags: ['email', 'marketing'] },
        alternatives: [
          { name: 'Buffer', slug: 'buffer', reason: 'Schedule social media posts to promote new products consistently.', pricing: 'Free / $6/mo' },
        ],
        costEstimate: '$0–13/mo',
      },
    ],
    summary: { freePath: '$0/mo (Gumroad + free tiers)', paidPath: '$30–60/mo', skillLevel: 'Beginner', setupTime: '1–2 weeks' },
  },
  {
    slug: 'freelance-design',
    title: 'Best AI Stack for Freelance Design',
    goal: 'Manage a freelance design business',
    description: 'Win clients, create faster, and manage projects — AI tools that multiply a freelance designer\'s output.',
    stages: [
      {
        name: 'Design & Creation',
        description: 'Graphic design, branding, and visual assets',
        bestPick: { name: 'Figma AI', slug: 'figma', reason: 'Industry-standard design tool. AI features accelerate layout, auto-complete designs, and generate content.', pricing: 'Free / $15/mo', tags: ['design'] },
        alternatives: [
          { name: 'Canva', slug: 'canva', reason: 'Faster for social graphics, presentations, and template-based work.', pricing: 'Free / $13/mo' },
        ],
        costEstimate: '$0–15/mo',
      },
      {
        name: 'AI Image Generation',
        description: 'Generate concepts, mockups, and illustrations',
        bestPick: { name: 'Midjourney', slug: 'midjourney', reason: 'Highest quality AI image generation for concept art, mood boards, and visual exploration.', pricing: '$10/mo', tags: ['image generation'] },
        alternatives: [
          { name: 'Adobe Firefly', slug: 'adobe-firefly', reason: 'Commercially safe AI images integrated into Photoshop and Illustrator.', pricing: 'Free / $10/mo' },
        ],
        costEstimate: '$10/mo',
      },
      {
        name: 'Copywriting',
        description: 'Write client-facing copy, proposals, and presentations',
        bestPick: { name: 'ChatGPT', slug: 'chatgpt', reason: 'Draft client proposals, write case studies, and generate copy for design deliverables.', pricing: 'Free / $20/mo', tags: ['writing'] },
        alternatives: [
          { name: 'Jasper', slug: 'jasper', reason: 'Better brand voice control for multi-client copy work.', pricing: '$49/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Project Management',
        description: 'Track projects, deadlines, and client communication',
        bestPick: { name: 'Notion AI', slug: 'notion', reason: 'Client portals, project trackers, invoice logs, and AI-generated meeting summaries all in one workspace.', pricing: 'Free / $10/mo', tags: ['project management'] },
        alternatives: [
          { name: 'ClickUp', slug: 'clickup', reason: 'More structured project management with time tracking.', pricing: 'Free / $7/mo' },
        ],
        costEstimate: '$0–10/mo',
      },
      {
        name: 'Invoicing & Contracts',
        description: 'Send invoices and manage client agreements',
        bestPick: { name: 'HoneyBook', slug: 'honeybook', reason: 'All-in-one client management with proposals, contracts, invoices, and scheduling. Built for creative freelancers.', pricing: '$19/mo', tags: ['invoicing', 'contracts'] },
        alternatives: [
          { name: 'Bonsai', slug: 'bonsai', reason: 'Freelancer-focused with contracts, proposals, and tax prep.', pricing: '$21/mo' },
        ],
        costEstimate: '$19–21/mo',
      },
    ],
    summary: { freePath: '$10/mo (Midjourney minimum)', paidPath: '$55–75/mo', skillLevel: 'Intermediate', setupTime: '1 week' },
  },
  {
    slug: 'ai-chatbot',
    title: 'Best AI Stack for Building an AI Chatbot',
    goal: 'Build an AI-powered chatbot',
    description: 'Build, train, deploy, and monitor a custom AI chatbot for your website, product, or internal team.',
    stages: [
      {
        name: 'LLM & AI Backend',
        description: 'Choose the AI model powering your chatbot',
        bestPick: { name: 'OpenAI API', slug: 'openai-api', reason: 'GPT-4 and GPT-4o models with function calling, vision, and structured outputs. Most mature API ecosystem.', pricing: 'Pay-per-token', tags: ['LLM', 'API'] },
        alternatives: [
          { name: 'Anthropic Claude API', slug: 'claude-api', reason: 'Longer context windows, stronger safety, and better at following complex instructions.', pricing: 'Pay-per-token' },
        ],
        costEstimate: '$5–50/mo (usage-based)',
      },
      {
        name: 'Knowledge Base & RAG',
        description: 'Connect your data for contextual responses',
        bestPick: { name: 'Pinecone', slug: 'pinecone', reason: 'Leading vector database for RAG. Fast similarity search with serverless architecture and generous free tier.', pricing: 'Free / $70/mo', tags: ['vector DB', 'RAG'] },
        alternatives: [
          { name: 'Weaviate', slug: 'weaviate', reason: 'Open-source vector DB with built-in ML modules.', pricing: 'Free (self-hosted) / Cloud pricing' },
        ],
        costEstimate: '$0–70/mo',
      },
      {
        name: 'Chat Interface',
        description: 'Build the conversational UI',
        bestPick: { name: 'Voiceflow', slug: 'voiceflow', reason: 'Visual chatbot builder with no-code dialog design, API integrations, and multi-channel deployment.', pricing: 'Free / $50/mo', tags: ['chatbot builder', 'no-code'] },
        alternatives: [
          { name: 'Botpress', slug: 'botpress', reason: 'Open-source chatbot platform with visual flow builder and LLM integration.', pricing: 'Free / $79/mo' },
        ],
        costEstimate: '$0–79/mo',
      },
      {
        name: 'Deployment & Hosting',
        description: 'Host and serve your chatbot',
        bestPick: { name: 'Vercel', slug: 'vercel', reason: 'Edge functions for low-latency responses, streaming API support, and seamless deployment from Git.', pricing: 'Free / $20/mo', tags: ['hosting'] },
        alternatives: [
          { name: 'Railway', slug: 'railway', reason: 'Simple deployment for custom chatbot backends with persistent storage.', pricing: 'Free / $5/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Monitoring & Analytics',
        description: 'Track conversations, errors, and user satisfaction',
        bestPick: { name: 'Langfuse', slug: 'langfuse', reason: 'Open-source LLM observability. Trace conversations, measure quality, and debug issues in production.', pricing: 'Free (self-hosted) / Cloud', tags: ['monitoring', 'LLM ops'] },
        alternatives: [
          { name: 'Helicone', slug: 'helicone', reason: 'LLM proxy with cost tracking, caching, and rate limiting.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
    ],
    summary: { freePath: '$5/mo (API costs minimum)', paidPath: '$100–250/mo', skillLevel: 'Advanced', setupTime: '2–6 weeks' },
  },
  {
    slug: 'start-podcast',
    title: 'Best AI Stack for Starting a Podcast',
    goal: 'Start a podcast',
    description: 'Plan, record, edit, distribute, and grow a podcast with AI handling the heavy lifting at every stage.',
    stages: [
      {
        name: 'Planning & Research',
        description: 'Episode ideas, outlines, and guest research',
        bestPick: { name: 'ChatGPT', slug: 'chatgpt', reason: 'Generate episode topics, write interview questions, research guests, and outline show notes.', pricing: 'Free / $20/mo', tags: ['research', 'planning'] },
        alternatives: [
          { name: 'Perplexity', slug: 'perplexity', reason: 'Better for fact-checking and sourced research on episode topics.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Recording',
        description: 'Record high-quality audio remotely or locally',
        bestPick: { name: 'Riverside', slug: 'riverside', reason: 'Studio-quality remote recording with local tracks, AI transcription, and automatic highlight clips.', pricing: '$15/mo', tags: ['recording', 'remote'] },
        alternatives: [
          { name: 'Zencastr', slug: 'zencastr', reason: 'Free remote recording with separate audio tracks.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Editing & Production',
        description: 'Edit audio, remove filler words, enhance sound',
        bestPick: { name: 'Descript', slug: 'descript', reason: 'Edit audio by editing text. AI removes filler words and silence, levels audio, and generates show notes.', pricing: 'Free / $24/mo', tags: ['editing', 'audio'] },
        alternatives: [
          { name: 'Adobe Podcast', slug: 'adobe-podcast', reason: 'Free AI-powered audio enhancement and noise removal.', pricing: 'Free' },
        ],
        costEstimate: '$0–24/mo',
      },
      {
        name: 'Distribution',
        description: 'Publish to Apple Podcasts, Spotify, and all platforms',
        bestPick: { name: 'Buzzsprout', slug: 'buzzsprout', reason: 'Easiest podcast hosting with automatic distribution to all platforms, transcriptions, and a built-in website.', pricing: 'Free / $12/mo', tags: ['hosting', 'distribution'] },
        alternatives: [
          { name: 'Anchor (Spotify)', slug: 'anchor', reason: 'Completely free hosting and distribution through Spotify.', pricing: 'Free' },
        ],
        costEstimate: '$0–12/mo',
      },
      {
        name: 'Promotion & Growth',
        description: 'Repurpose episodes into clips, social content, and show notes',
        bestPick: { name: 'Opus Clip', slug: 'opus-clip', reason: 'AI finds the most engaging moments and creates viral short clips for TikTok, Reels, and Shorts.', pricing: 'Free / $19/mo', tags: ['clips', 'social'] },
        alternatives: [
          { name: 'Headliner', slug: 'headliner', reason: 'Audiogram creator that turns audio into shareable video clips.', pricing: 'Free / $15/mo' },
        ],
        costEstimate: '$0–19/mo',
      },
    ],
    summary: { freePath: '$0/mo (Anchor + free tiers)', paidPath: '$50–95/mo', skillLevel: 'Beginner', setupTime: '1 week' },
  },
  {
    slug: 'social-media-management',
    title: 'Best AI Stack for Social Media Management',
    goal: 'Run social media for clients',
    description: 'Manage multiple client accounts, create content at scale, schedule posts, and report results — all AI-powered.',
    stages: [
      {
        name: 'Content Creation',
        description: 'Write captions, scripts, and post copy',
        bestPick: { name: 'ChatGPT', slug: 'chatgpt', reason: 'Generate platform-specific captions, hashtag sets, content calendars, and repurpose long-form into social posts.', pricing: 'Free / $20/mo', tags: ['writing', 'social'] },
        alternatives: [
          { name: 'Copy.ai', slug: 'copy-ai', reason: 'Workflow automations for batch content creation across platforms.', pricing: 'Free / $36/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Visual Design',
        description: 'Graphics, carousels, stories, and reels covers',
        bestPick: { name: 'Canva', slug: 'canva', reason: 'Social media templates for every platform, brand kits per client, and AI-powered Magic Design for instant layouts.', pricing: 'Free / $13/mo', tags: ['design', 'social'] },
        alternatives: [
          { name: 'Adobe Express', slug: 'adobe-express', reason: 'AI-powered quick designs with Adobe stock integration.', pricing: 'Free / $10/mo' },
        ],
        costEstimate: '$0–13/mo',
      },
      {
        name: 'Video & Reels',
        description: 'Create short-form video content',
        bestPick: { name: 'CapCut', slug: 'capcut', reason: 'Free video editor with AI captions, effects, and templates specifically designed for social media formats.', pricing: 'Free / $10/mo', tags: ['video', 'reels'] },
        alternatives: [
          { name: 'InVideo AI', slug: 'invideo-ai', reason: 'Text-to-video for quick social content from scripts.', pricing: 'Free / $25/mo' },
        ],
        costEstimate: '$0–10/mo',
      },
      {
        name: 'Scheduling & Publishing',
        description: 'Schedule and publish across all platforms',
        bestPick: { name: 'Buffer', slug: 'buffer', reason: 'Clean multi-platform scheduling with AI caption suggestions. Affordable per-channel pricing for agencies.', pricing: 'Free / $6/mo per channel', tags: ['scheduling'] },
        alternatives: [
          { name: 'Later', slug: 'later', reason: 'Visual planning calendar with link-in-bio and Instagram-first features.', pricing: '$25/mo' },
        ],
        costEstimate: '$0–30/mo',
      },
      {
        name: 'Analytics & Reporting',
        description: 'Track performance and create client reports',
        bestPick: { name: 'Metricool', slug: 'metricool', reason: 'Unified analytics dashboard across all social platforms with automated PDF reports for clients.', pricing: 'Free / $18/mo', tags: ['analytics', 'reporting'] },
        alternatives: [
          { name: 'Sprout Social', slug: 'sprout-social', reason: 'Enterprise-grade analytics and social listening. Best for larger agencies.', pricing: '$249/mo' },
        ],
        costEstimate: '$0–18/mo',
      },
    ],
    summary: { freePath: '$0/mo (free tiers only)', paidPath: '$50–90/mo', skillLevel: 'Beginner', setupTime: '3–5 days' },
  },
  {
    slug: 'automate-customer-support',
    title: 'Best AI Stack for Automating Customer Support',
    goal: 'Automate customer support with AI',
    description: 'Build an AI-powered support system with chatbots, knowledge bases, ticketing, and smart escalation.',
    stages: [
      {
        name: 'AI Chatbot',
        description: 'First-line automated support',
        bestPick: { name: 'Intercom', slug: 'intercom', reason: 'AI-first customer support platform. Fin AI agent resolves 50%+ of queries using your knowledge base with no training needed.', pricing: '$39/mo per seat', tags: ['chatbot', 'support'] },
        alternatives: [
          { name: 'Zendesk', slug: 'zendesk', reason: 'Enterprise support suite with AI bots and advanced ticketing.', pricing: '$55/mo per agent' },
        ],
        costEstimate: '$39–55/mo',
      },
      {
        name: 'Knowledge Base',
        description: 'Self-serve help center and documentation',
        bestPick: { name: 'Notion AI', slug: 'notion', reason: 'Build a searchable knowledge base with AI-powered Q&A. Publish pages as a public help center.', pricing: 'Free / $10/mo', tags: ['knowledge base', 'docs'] },
        alternatives: [
          { name: 'GitBook', slug: 'gitbook', reason: 'Developer-friendly documentation platform with AI search.', pricing: 'Free / $8/mo' },
        ],
        costEstimate: '$0–10/mo',
      },
      {
        name: 'Ticketing & Escalation',
        description: 'Route complex issues to human agents',
        bestPick: { name: 'Linear', slug: 'linear', reason: 'Fast issue tracker with AI-powered triage, auto-assignment, and clean UX. Better for product-led support.', pricing: 'Free / $8/mo per user', tags: ['ticketing', 'triage'] },
        alternatives: [
          { name: 'Freshdesk', slug: 'freshdesk', reason: 'Traditional helpdesk with AI ticket classification and auto-routing.', pricing: 'Free / $15/mo' },
        ],
        costEstimate: '$0–15/mo',
      },
      {
        name: 'Voice & Phone Support',
        description: 'AI-powered phone support and voice agents',
        bestPick: { name: 'Bland AI', slug: 'bland-ai', reason: 'AI phone agents that handle inbound and outbound calls. Natural conversation with custom scripts.', pricing: '$0.09/min', tags: ['voice', 'phone'] },
        alternatives: [
          { name: 'Air AI', slug: 'air-ai', reason: 'Autonomous AI phone agents for sales and support calls.', pricing: 'Contact for pricing' },
        ],
        costEstimate: '$20–100/mo (usage-based)',
      },
      {
        name: 'Analytics & CSAT',
        description: 'Measure support quality and customer satisfaction',
        bestPick: { name: 'Klaus', slug: 'klaus', reason: 'AI-powered conversation review and quality scoring. Auto-scores 100% of conversations for CSAT prediction.', pricing: 'Contact for pricing', tags: ['QA', 'analytics'] },
        alternatives: [
          { name: 'Intercom Analytics', slug: 'intercom', reason: 'Built-in reporting on resolution rates, CSAT, and AI agent performance.', pricing: 'Included' },
        ],
        costEstimate: '$0–50/mo',
      },
    ],
    summary: { freePath: '$0/mo (limited free tiers)', paidPath: '$100–250/mo', skillLevel: 'Intermediate', setupTime: '1–3 weeks' },
  },
  {
    slug: 'personal-brand',
    title: 'Best AI Stack for Building a Personal Brand',
    goal: 'Build a personal brand',
    description: 'Create content, grow your audience, and establish authority in your niche — all amplified by AI.',
    stages: [
      {
        name: 'Content Writing',
        description: 'LinkedIn posts, Twitter threads, blog articles',
        bestPick: { name: 'ChatGPT', slug: 'chatgpt', reason: 'Ideate content topics, draft posts in your voice, repurpose long-form content into social snippets.', pricing: 'Free / $20/mo', tags: ['writing', 'content'] },
        alternatives: [
          { name: 'Typefully', slug: 'typefully', reason: 'AI-powered Twitter/LinkedIn writing tool with scheduling and analytics.', pricing: 'Free / $15/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Visual Identity',
        description: 'Profile photos, banners, branded graphics',
        bestPick: { name: 'Canva', slug: 'canva', reason: 'Create consistent branded visuals across all platforms. AI-powered headshot enhancer and background remover.', pricing: 'Free / $13/mo', tags: ['design', 'branding'] },
        alternatives: [
          { name: 'Midjourney', slug: 'midjourney', reason: 'Generate unique artwork and visual content that stands out in feeds.', pricing: '$10/mo' },
        ],
        costEstimate: '$0–13/mo',
      },
      {
        name: 'Video & Short-form',
        description: 'Create video content for YouTube, TikTok, and Reels',
        bestPick: { name: 'Descript', slug: 'descript', reason: 'Record, edit, and repurpose video content. AI generates clips, captions, and eye-contact correction.', pricing: 'Free / $24/mo', tags: ['video', 'editing'] },
        alternatives: [
          { name: 'CapCut', slug: 'capcut', reason: 'Quick short-form video editing with trending effects and auto-captions.', pricing: 'Free / $10/mo' },
        ],
        costEstimate: '$0–24/mo',
      },
      {
        name: 'Newsletter & Community',
        description: 'Build direct relationship with your audience',
        bestPick: { name: 'Beehiiv', slug: 'beehiiv', reason: 'Newsletter platform with growth tools, referral system, and monetization built in. Perfect for personal brands.', pricing: 'Free / $49/mo', tags: ['newsletter', 'community'] },
        alternatives: [
          { name: 'Substack', slug: 'substack', reason: 'Simplest option with built-in paid subscriptions and community.', pricing: 'Free (10% of paid subs)' },
        ],
        costEstimate: '$0–49/mo',
      },
      {
        name: 'Scheduling & Analytics',
        description: 'Schedule posts and track what resonates',
        bestPick: { name: 'Buffer', slug: 'buffer', reason: 'Multi-platform scheduling with AI suggestions and engagement analytics to understand what works.', pricing: 'Free / $6/mo per channel', tags: ['scheduling', 'analytics'] },
        alternatives: [
          { name: 'Shield', slug: 'shield', reason: 'LinkedIn-specific analytics for personal brand growth tracking.', pricing: '$8/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
    ],
    summary: { freePath: '$0/mo (free tiers only)', paidPath: '$50–130/mo', skillLevel: 'Beginner', setupTime: '3–5 days' },
  },
  {
    slug: 'ecommerce-store',
    title: 'Best AI Stack for Starting an E-commerce Store',
    goal: 'Start an e-commerce store with AI',
    description: 'Launch and grow an online store with AI handling product descriptions, images, customer service, and marketing.',
    stages: [
      {
        name: 'Store Platform',
        description: 'Set up your online store',
        bestPick: { name: 'Shopify', slug: 'shopify', reason: 'Leading e-commerce platform with Shopify Magic AI for product descriptions, image editing, and store setup.', pricing: '$29/mo', tags: ['e-commerce', 'store'] },
        alternatives: [
          { name: 'WooCommerce', slug: 'woocommerce', reason: 'Free WordPress plugin with more customization. Requires hosting.', pricing: 'Free + hosting costs' },
        ],
        costEstimate: '$0–29/mo',
      },
      {
        name: 'Product Content',
        description: 'Product descriptions, titles, and SEO content',
        bestPick: { name: 'ChatGPT', slug: 'chatgpt', reason: 'Generate product descriptions, meta tags, FAQ sections, and collection page copy at scale.', pricing: 'Free / $20/mo', tags: ['writing', 'product'] },
        alternatives: [
          { name: 'Jasper', slug: 'jasper', reason: 'E-commerce templates for product descriptions with brand voice.', pricing: '$49/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Product Photography',
        description: 'Product images and lifestyle shots',
        bestPick: { name: 'Photoroom', slug: 'photoroom', reason: 'AI background removal and product photo enhancement. Generate lifestyle shots and studio-quality images from phone photos.', pricing: 'Free / $10/mo', tags: ['photography', 'AI images'] },
        alternatives: [
          { name: 'Canva', slug: 'canva', reason: 'Product mockups, social ads, and promotional graphics.', pricing: 'Free / $13/mo' },
        ],
        costEstimate: '$0–13/mo',
      },
      {
        name: 'Marketing & Ads',
        description: 'Email marketing, social ads, and retargeting',
        bestPick: { name: 'Klaviyo', slug: 'klaviyo', reason: 'E-commerce email marketing with AI-powered segmentation, product recommendations, and abandoned cart flows.', pricing: 'Free / $20/mo', tags: ['email', 'e-commerce'] },
        alternatives: [
          { name: 'Mailchimp', slug: 'mailchimp', reason: 'More affordable email marketing with basic e-commerce integrations.', pricing: 'Free / $13/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Customer Support',
        description: 'AI chatbot for order inquiries and FAQs',
        bestPick: { name: 'Tidio', slug: 'tidio', reason: 'E-commerce chatbot with AI that handles order status, returns, and product questions. Shopify integration.', pricing: 'Free / $29/mo', tags: ['chatbot', 'support'] },
        alternatives: [
          { name: 'Gorgias', slug: 'gorgias', reason: 'Shopify-native helpdesk with AI-powered auto-responses.', pricing: '$10/mo' },
        ],
        costEstimate: '$0–29/mo',
      },
    ],
    summary: { freePath: '$29/mo (Shopify minimum)', paidPath: '$80–140/mo', skillLevel: 'Beginner', setupTime: '1–2 weeks' },
  },

  // ─── NEW STACKS (Step 30) ────────────────────────────────────

  {
    slug: 'b2b-sales-team',
    title: 'Best AI Stack for a B2B Sales Team',
    goal: 'Close more B2B deals with AI',
    description: 'Automate prospecting, enrich leads, write outreach sequences, and track pipeline — all AI-powered for a lean sales team.',
    stages: [
      {
        name: 'Lead Prospecting',
        description: 'Find and qualify decision-makers at target companies',
        bestPick: { name: 'Apollo.io', slug: 'apollo-io', reason: 'Largest B2B contact database with AI-powered lead scoring and intent data. 275M+ contacts.', pricing: 'Free / $49/mo', tags: ['prospecting', 'leads'] },
        alternatives: [
          { name: 'Clay', slug: 'clay', reason: 'AI-enriched lead research from 50+ data sources. Best for personalized outreach at scale.', pricing: '$149/mo' },
        ],
        costEstimate: '$0–149/mo',
      },
      {
        name: 'Email Outreach',
        description: 'Write and automate personalized cold email sequences',
        bestPick: { name: 'Instantly', slug: 'instantly', reason: 'AI-written cold emails with unlimited accounts, warmup, and deliverability optimization.', pricing: '$30/mo', tags: ['email', 'outreach'] },
        alternatives: [
          { name: 'Lemlist', slug: 'lemlist', reason: 'Multichannel outreach with AI personalization and LinkedIn automation.', pricing: '$59/mo' },
        ],
        costEstimate: '$30–59/mo',
      },
      {
        name: 'CRM & Pipeline',
        description: 'Track deals, log activities, and forecast revenue',
        bestPick: { name: 'HubSpot', slug: 'hubspot', reason: 'Free CRM with AI-powered deal scoring, email tracking, and pipeline automation. Scales from startup to enterprise.', pricing: 'Free / $20/mo', tags: ['crm', 'pipeline'] },
        alternatives: [
          { name: 'Pipedrive', slug: 'pipedrive', reason: 'Visual pipeline CRM with AI sales assistant. Simpler than HubSpot for small teams.', pricing: '$14/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Meeting & Demo',
        description: 'Schedule meetings, record calls, and extract action items',
        bestPick: { name: 'Fathom', slug: 'fathom', reason: 'AI meeting recorder that auto-generates summaries, action items, and CRM updates. Free forever plan.', pricing: 'Free / $19/mo', tags: ['meetings', 'notes'] },
        alternatives: [
          { name: 'Fireflies.ai', slug: 'fireflies-ai', reason: 'Transcribes and analyzes meetings across Zoom, Teams, and Meet.', pricing: 'Free / $18/mo' },
        ],
        costEstimate: '$0–19/mo',
      },
    ],
    summary: { freePath: '$30/mo (Instantly minimum)', paidPath: '$100–250/mo', skillLevel: 'Intermediate', setupTime: '1 week' },
  },
  {
    slug: 'content-agency',
    title: 'Best AI Stack for Running a Content Agency',
    goal: 'Run a content agency at scale',
    description: 'Produce high-quality content for multiple clients simultaneously — blog posts, social media, video, and reporting all AI-assisted.',
    stages: [
      {
        name: 'Content Writing',
        description: 'Draft blog posts, articles, and landing pages for clients',
        bestPick: { name: 'Claude', slug: 'claude', reason: 'Best long-form writing quality. 200K context window for client briefs and brand guidelines.', pricing: 'Free / $20/mo', tags: ['writing', 'long-form'] },
        alternatives: [
          { name: 'Jasper', slug: 'jasper', reason: 'Marketing-specific AI writer with brand voice, templates, and team collaboration.', pricing: '$49/mo' },
        ],
        costEstimate: '$20–49/mo',
      },
      {
        name: 'SEO & Research',
        description: 'Keyword research, content briefs, and optimization',
        bestPick: { name: 'Surfer SEO', slug: 'surfer-seo', reason: 'AI content editor that scores and optimizes articles in real-time against top-ranking pages.', pricing: '$89/mo', tags: ['seo', 'optimization'] },
        alternatives: [
          { name: 'Semrush', slug: 'semrush', reason: 'All-in-one SEO platform with keyword research, site audit, and competitor analysis.', pricing: '$130/mo' },
        ],
        costEstimate: '$89–130/mo',
      },
      {
        name: 'Social Media Content',
        description: 'Create and schedule social posts across platforms',
        bestPick: { name: 'Canva', slug: 'canva', reason: 'Design social graphics, carousels, and short videos with AI. Brand kits keep client branding consistent.', pricing: 'Free / $13/mo', tags: ['design', 'social'] },
        alternatives: [
          { name: 'Buffer', slug: 'buffer', reason: 'Schedule and publish across platforms with AI caption suggestions.', pricing: 'Free / $6/mo per channel' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Client Management',
        description: 'Track projects, deadlines, and client communication',
        bestPick: { name: 'Notion', slug: 'notion', reason: 'AI-powered workspace for content calendars, client portals, and SOPs. Team wikis keep everyone aligned.', pricing: 'Free / $10/mo', tags: ['project-management', 'wiki'] },
        alternatives: [
          { name: 'ClickUp', slug: 'clickup', reason: 'Project management with AI writing, task automation, and time tracking.', pricing: 'Free / $7/mo' },
        ],
        costEstimate: '$0–10/mo',
      },
    ],
    summary: { freePath: '$89/mo (Surfer minimum)', paidPath: '$150–300/mo', skillLevel: 'Intermediate', setupTime: '1 week' },
  },
  {
    slug: 'legal-practice',
    title: 'Best AI Stack for a Legal Practice',
    goal: 'Modernize a legal practice with AI',
    description: 'Automate legal research, draft contracts, manage documents, and streamline client intake — all with AI designed for legal professionals.',
    stages: [
      {
        name: 'Legal Research',
        description: 'Research case law, statutes, and precedents',
        bestPick: { name: 'CoCounsel', slug: 'cocounsel', reason: 'AI legal research assistant by Thomson Reuters. Searches case law, analyzes contracts, and drafts memos.', pricing: 'Contact sales', tags: ['legal', 'research'] },
        alternatives: [
          { name: 'ChatGPT', slug: 'chatgpt', reason: 'General-purpose AI for initial research and brainstorming legal arguments. Verify all outputs.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$50–200/mo',
      },
      {
        name: 'Contract Drafting',
        description: 'Draft, review, and redline contracts',
        bestPick: { name: 'Spellbook', slug: 'spellbook', reason: 'AI contract drafting trained on legal data. Suggests clauses, flags risks, and accelerates review.', pricing: 'Contact sales', tags: ['contracts', 'drafting'] },
        alternatives: [
          { name: 'Claude', slug: 'claude', reason: '200K context analyzes entire contracts. Good for clause extraction and plain-language summaries.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$20–150/mo',
      },
      {
        name: 'Document Management',
        description: 'Organize, search, and manage legal documents',
        bestPick: { name: 'Clio', slug: 'clio', reason: 'Legal practice management with AI-powered document search, time tracking, and billing.', pricing: '$49/mo', tags: ['documents', 'practice-management'] },
        alternatives: [
          { name: 'Notion', slug: 'notion', reason: 'Flexible workspace for case files, templates, and internal wikis.', pricing: 'Free / $10/mo' },
        ],
        costEstimate: '$10–49/mo',
      },
    ],
    summary: { freePath: '$20/mo (Claude only)', paidPath: '$200–500/mo', skillLevel: 'Intermediate', setupTime: '2–3 weeks' },
  },
  {
    slug: 'real-estate-agent',
    title: 'Best AI Stack for a Real Estate Agent',
    goal: 'Close more real estate deals with AI',
    description: 'Generate listings, follow up with leads, create virtual tours, and market properties — all automated with AI.',
    stages: [
      {
        name: 'Lead Generation & CRM',
        description: 'Capture, nurture, and follow up with buyer and seller leads',
        bestPick: { name: 'Follow Up Boss', slug: 'follow-up-boss', reason: 'Real estate CRM with AI-powered lead routing, automated follow-up sequences, and smart lists.', pricing: '$58/mo', tags: ['crm', 'leads'] },
        alternatives: [
          { name: 'HubSpot', slug: 'hubspot', reason: 'Free CRM that works for real estate with custom deal stages and email automation.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–58/mo',
      },
      {
        name: 'Listing Content',
        description: 'Write property descriptions, social posts, and email campaigns',
        bestPick: { name: 'ChatGPT', slug: 'chatgpt', reason: 'Generate compelling listing descriptions, neighborhood guides, and buyer emails in seconds.', pricing: 'Free / $20/mo', tags: ['writing', 'listings'] },
        alternatives: [
          { name: 'Jasper', slug: 'jasper', reason: 'Real estate templates for listings, ads, and social media posts.', pricing: '$49/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Visual Marketing',
        description: 'Create property videos, virtual staging, and social graphics',
        bestPick: { name: 'Canva', slug: 'canva', reason: 'Real estate templates for Instagram, flyers, and virtual tours. AI background remover and Magic Design.', pricing: 'Free / $13/mo', tags: ['design', 'marketing'] },
        alternatives: [
          { name: 'Matterport', slug: 'matterport', reason: '3D virtual tours and digital twins for properties. Premium but high-converting.', pricing: '$10/mo' },
        ],
        costEstimate: '$0–13/mo',
      },
    ],
    summary: { freePath: '$0/mo (free tiers)', paidPath: '$80–150/mo', skillLevel: 'Beginner', setupTime: '3–5 days' },
  },
  {
    slug: 'e-learning-creator',
    title: 'Best AI Stack for Creating Online Courses',
    goal: 'Create and sell e-learning courses',
    description: 'Build professional online courses from scripting to filming to marketing — AI handles the heavy lifting at every stage.',
    stages: [
      {
        name: 'Course Planning',
        description: 'Outline curriculum, modules, and learning objectives',
        bestPick: { name: 'Claude', slug: 'claude', reason: 'Structure entire course outlines, generate quizzes, and write lesson scripts with deep reasoning.', pricing: 'Free / $20/mo', tags: ['planning', 'curriculum'] },
        alternatives: [
          { name: 'ChatGPT', slug: 'chatgpt', reason: 'Brainstorm topics, create assessments, and draft student-facing materials.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Video Production',
        description: 'Record, edit, and produce course videos',
        bestPick: { name: 'Descript', slug: 'descript', reason: 'Edit video by editing text. AI removes filler words, generates captions, and clones your voice for corrections.', pricing: 'Free / $24/mo', tags: ['video', 'editing'] },
        alternatives: [
          { name: 'Synthesia', slug: 'synthesia', reason: 'AI avatars present your course content — no camera needed.', pricing: '$22/mo' },
        ],
        costEstimate: '$0–24/mo',
      },
      {
        name: 'Course Platform',
        description: 'Host and sell your course',
        bestPick: { name: 'Teachable', slug: 'teachable', reason: 'All-in-one course platform with built-in payments, landing pages, and student management.', pricing: '$39/mo', tags: ['platform', 'hosting'] },
        alternatives: [
          { name: 'Kajabi', slug: 'kajabi', reason: 'Premium all-in-one: courses, website, email, and community.', pricing: '$149/mo' },
        ],
        costEstimate: '$39–149/mo',
      },
      {
        name: 'Marketing & Sales',
        description: 'Drive enrollments with email, social, and ads',
        bestPick: { name: 'Beehiiv', slug: 'beehiiv', reason: 'Newsletter platform to build an audience and promote courses. Growth tools and referral system.', pricing: 'Free / $49/mo', tags: ['newsletter', 'marketing'] },
        alternatives: [
          { name: 'ConvertKit', slug: 'convertkit', reason: 'Creator-focused email marketing with visual automations and landing pages.', pricing: 'Free / $15/mo' },
        ],
        costEstimate: '$0–49/mo',
      },
    ],
    summary: { freePath: '$39/mo (Teachable minimum)', paidPath: '$100–250/mo', skillLevel: 'Beginner', setupTime: '2–4 weeks' },
  },
  {
    slug: 'game-studio',
    title: 'Best AI Stack for an Indie Game Studio',
    goal: 'Build an indie game with AI',
    description: 'Accelerate game development with AI for code, art, music, and narrative — ship your indie game faster without a large team.',
    stages: [
      {
        name: 'Game Code & Logic',
        description: 'Write game mechanics, systems, and debugging',
        bestPick: { name: 'Cursor', slug: 'cursor', reason: 'AI code editor with full project context. Excellent for game logic, shader code, and debugging.', pricing: 'Free / $20/mo', tags: ['coding', 'IDE'] },
        alternatives: [
          { name: 'GitHub Copilot', slug: 'github-copilot', reason: 'Inline completions for Unity C# and Unreal C++.', pricing: '$10/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Art & Assets',
        description: 'Generate concept art, sprites, textures, and environments',
        bestPick: { name: 'Midjourney', slug: 'midjourney', reason: 'Highest quality AI art generation. Create concept art, character designs, and environment references.', pricing: '$10/mo', tags: ['art', 'generation'] },
        alternatives: [
          { name: 'Stable Diffusion', slug: 'stable-diffusion', reason: 'Open-source and fully local. Fine-tune on your art style for consistent game assets.', pricing: 'Free (local)' },
        ],
        costEstimate: '$0–10/mo',
      },
      {
        name: 'Music & Sound',
        description: 'Generate background music, sound effects, and ambiance',
        bestPick: { name: 'Suno', slug: 'suno', reason: 'AI music generation from text prompts. Create game soundtracks, battle themes, and ambient tracks.', pricing: 'Free / $10/mo', tags: ['music', 'audio'] },
        alternatives: [
          { name: 'ElevenLabs', slug: 'elevenlabs', reason: 'AI voice acting for NPCs, narration, and dialogue. 29+ languages.', pricing: 'Free / $5/mo' },
        ],
        costEstimate: '$0–15/mo',
      },
      {
        name: 'Narrative & Dialogue',
        description: 'Write storylines, quests, and NPC dialogue',
        bestPick: { name: 'ChatGPT', slug: 'chatgpt', reason: 'Generate branching dialogues, lore documents, quest chains, and character backstories.', pricing: 'Free / $20/mo', tags: ['writing', 'narrative'] },
        alternatives: [
          { name: 'Claude', slug: 'claude', reason: 'Better for long, coherent narratives and world-building documents.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
    ],
    summary: { freePath: '$0/mo (free tiers + local)', paidPath: '$50–80/mo', skillLevel: 'Advanced', setupTime: 'Ongoing' },
  },
  {
    slug: 'consulting-firm',
    title: 'Best AI Stack for a Consulting Firm',
    goal: 'Scale a consulting practice with AI',
    description: 'Deliver more client value with fewer hours — AI for research, deliverables, proposals, and knowledge management.',
    stages: [
      {
        name: 'Research & Analysis',
        description: 'Market research, competitive analysis, and data synthesis',
        bestPick: { name: 'Perplexity', slug: 'perplexity', reason: 'AI search with real-time sources and citations. Perfect for quick market research and fact-checking.', pricing: 'Free / $20/mo', tags: ['research', 'analysis'] },
        alternatives: [
          { name: 'Claude', slug: 'claude', reason: '200K context for analyzing long reports, earnings calls, and industry whitepapers.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Deliverables & Reports',
        description: 'Create client presentations, strategy decks, and reports',
        bestPick: { name: 'Gamma', slug: 'gamma', reason: 'AI-generated presentations and reports. Paste data, get polished slides in minutes.', pricing: 'Free / $10/mo', tags: ['presentations', 'reports'] },
        alternatives: [
          { name: 'Canva', slug: 'canva', reason: 'Design professional slide decks with brand templates and AI layout suggestions.', pricing: 'Free / $13/mo' },
        ],
        costEstimate: '$0–13/mo',
      },
      {
        name: 'Knowledge Management',
        description: 'Store frameworks, templates, and institutional knowledge',
        bestPick: { name: 'Notion', slug: 'notion', reason: 'AI-powered workspace for templates, SOPs, and project documentation. Q&A searches your entire wiki.', pricing: 'Free / $10/mo', tags: ['wiki', 'knowledge'] },
        alternatives: [
          { name: 'Confluence', slug: 'confluence', reason: 'Enterprise knowledge base with AI search and page suggestions.', pricing: '$6/mo per user' },
        ],
        costEstimate: '$0–10/mo',
      },
      {
        name: 'Client Communication',
        description: 'Proposals, follow-ups, and meeting management',
        bestPick: { name: 'Fathom', slug: 'fathom', reason: 'AI meeting recorder with summaries and action items. Never miss a client ask.', pricing: 'Free / $19/mo', tags: ['meetings', 'notes'] },
        alternatives: [
          { name: 'ChatGPT', slug: 'chatgpt', reason: 'Draft proposals, executive summaries, and client emails.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
    ],
    summary: { freePath: '$0/mo (free tiers)', paidPath: '$50–80/mo', skillLevel: 'Intermediate', setupTime: '3–5 days' },
  },
  {
    slug: 'solopreneur',
    title: 'Best AI Stack for a Solopreneur',
    goal: 'Run a one-person business with AI',
    description: 'Do the work of a 10-person team alone. AI handles writing, design, admin, sales, and customer support so you can focus on strategy.',
    stages: [
      {
        name: 'Writing & Content',
        description: 'Blog posts, emails, social media, and copywriting',
        bestPick: { name: 'ChatGPT', slug: 'chatgpt', reason: 'Your all-in-one writing assistant. Emails, blog posts, ad copy, social content — handles everything.', pricing: 'Free / $20/mo', tags: ['writing', 'content'] },
        alternatives: [
          { name: 'Claude', slug: 'claude', reason: 'Better for nuanced long-form writing and strategic thinking.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Design & Branding',
        description: 'Social graphics, presentations, and brand assets',
        bestPick: { name: 'Canva', slug: 'canva', reason: 'Design everything from social posts to pitch decks with AI-powered templates and brand kit.', pricing: 'Free / $13/mo', tags: ['design', 'branding'] },
        alternatives: [
          { name: 'Looka', slug: 'looka', reason: 'AI logo maker and brand kit generator for new businesses.', pricing: '$20 one-time' },
        ],
        costEstimate: '$0–13/mo',
      },
      {
        name: 'Automation',
        description: 'Connect apps and automate repetitive workflows',
        bestPick: { name: 'Zapier', slug: 'zapier', reason: 'Connect 6,000+ apps with AI-powered automation. Automate invoicing, lead routing, and data entry.', pricing: 'Free / $20/mo', tags: ['automation', 'workflow'] },
        alternatives: [
          { name: 'Make', slug: 'make', reason: 'Visual automation builder with more complex branching logic. Cheaper at scale.', pricing: 'Free / $9/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Finance & Admin',
        description: 'Invoicing, bookkeeping, and expense tracking',
        bestPick: { name: 'QuickBooks', slug: 'quickbooks', reason: 'AI-categorized expenses, automatic invoice reminders, and tax-ready reports.', pricing: '$15/mo', tags: ['finance', 'accounting'] },
        alternatives: [
          { name: 'Wave', slug: 'wave', reason: 'Free invoicing and accounting for small businesses.', pricing: 'Free' },
        ],
        costEstimate: '$0–15/mo',
      },
    ],
    summary: { freePath: '$0/mo (free tiers only)', paidPath: '$50–70/mo', skillLevel: 'Beginner', setupTime: '2–3 days' },
  },
  {
    slug: 'seo-agency',
    title: 'Best AI Stack for an SEO Agency',
    goal: 'Scale an SEO agency with AI',
    description: 'Audit sites, research keywords, produce optimized content, and report results — AI accelerates every step of the SEO workflow.',
    stages: [
      {
        name: 'Site Audit & Technical SEO',
        description: 'Crawl sites, find issues, and prioritize fixes',
        bestPick: { name: 'Ahrefs', slug: 'ahrefs', reason: 'Best-in-class site auditor, backlink checker, and keyword explorer. AI-powered content gap analysis.', pricing: '$99/mo', tags: ['seo', 'audit'] },
        alternatives: [
          { name: 'Semrush', slug: 'semrush', reason: 'All-in-one SEO platform with site audit, position tracking, and competitor research.', pricing: '$130/mo' },
        ],
        costEstimate: '$99–130/mo',
      },
      {
        name: 'Content Production',
        description: 'Write SEO-optimized blog posts, landing pages, and metadata',
        bestPick: { name: 'Surfer SEO', slug: 'surfer-seo', reason: 'AI content editor that scores articles in real-time. NLP analysis matches top-ranking competitors.', pricing: '$89/mo', tags: ['content', 'optimization'] },
        alternatives: [
          { name: 'Jasper', slug: 'jasper', reason: 'AI writer with SEO integration and team brand voice settings.', pricing: '$49/mo' },
        ],
        costEstimate: '$49–89/mo',
      },
      {
        name: 'Link Building',
        description: 'Find prospects, write outreach emails, and track placements',
        bestPick: { name: 'Hunter.io', slug: 'hunter-io', reason: 'Find email addresses for any website. AI-written outreach templates for link building campaigns.', pricing: 'Free / $49/mo', tags: ['outreach', 'email'] },
        alternatives: [
          { name: 'Respona', slug: 'respona', reason: 'All-in-one link building platform with AI-personalized outreach.', pricing: '$99/mo' },
        ],
        costEstimate: '$0–99/mo',
      },
      {
        name: 'Reporting',
        description: 'Client-facing reports with rankings, traffic, and ROI',
        bestPick: { name: 'Looker Studio', slug: 'looker-studio', reason: 'Free dashboards connecting GSC, GA4, and Ahrefs data. Automated client reporting.', pricing: 'Free', tags: ['reporting', 'dashboards'] },
        alternatives: [
          { name: 'AgencyAnalytics', slug: 'agencyanalytics', reason: 'White-label SEO reporting built for agencies. Automated monthly reports.', pricing: '$12/mo per client' },
        ],
        costEstimate: '$0–50/mo',
      },
    ],
    summary: { freePath: '$99/mo (Ahrefs minimum)', paidPath: '$250–400/mo', skillLevel: 'Advanced', setupTime: '1 week' },
  },
  {
    slug: 'video-production',
    title: 'Best AI Stack for Video Production',
    goal: 'Produce professional videos with AI',
    description: 'Script, shoot, edit, and distribute video content — AI handles the tedious parts so you focus on creative direction.',
    stages: [
      {
        name: 'Scripting',
        description: 'Write video scripts, outlines, and talking points',
        bestPick: { name: 'ChatGPT', slug: 'chatgpt', reason: 'Generate scripts, hooks, and CTAs for any video format. GPT-4 understands video structure and pacing.', pricing: 'Free / $20/mo', tags: ['writing', 'scripts'] },
        alternatives: [
          { name: 'Claude', slug: 'claude', reason: 'Better for longer scripts and maintaining consistent tone across episodes.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Editing & Post-Production',
        description: 'Cut, arrange, and polish video footage',
        bestPick: { name: 'Descript', slug: 'descript', reason: 'Edit video by editing text transcripts. AI removes filler, generates clips, and fixes eye contact.', pricing: 'Free / $24/mo', tags: ['editing', 'video'] },
        alternatives: [
          { name: 'Runway', slug: 'runway', reason: 'AI video generation and editing — background removal, inpainting, and Gen-2 video.', pricing: 'Free / $12/mo' },
        ],
        costEstimate: '$0–24/mo',
      },
      {
        name: 'Thumbnails & Graphics',
        description: 'Create eye-catching thumbnails and video overlays',
        bestPick: { name: 'Canva', slug: 'canva', reason: 'YouTube thumbnail templates with AI background removal and text effects. Batch-create for series.', pricing: 'Free / $13/mo', tags: ['design', 'thumbnails'] },
        alternatives: [
          { name: 'Midjourney', slug: 'midjourney', reason: 'Generate unique thumbnail art that stands out in YouTube feeds.', pricing: '$10/mo' },
        ],
        costEstimate: '$0–13/mo',
      },
      {
        name: 'Distribution & Repurposing',
        description: 'Turn long videos into shorts, clips, and social posts',
        bestPick: { name: 'Opus Clip', slug: 'opus-clip', reason: 'AI extracts the best clips from long videos for TikTok, Shorts, and Reels. Virality score prediction.', pricing: 'Free / $19/mo', tags: ['repurposing', 'clips'] },
        alternatives: [
          { name: 'CapCut', slug: 'capcut', reason: 'Quick short-form editing with trending effects and auto-captions.', pricing: 'Free / $10/mo' },
        ],
        costEstimate: '$0–19/mo',
      },
    ],
    summary: { freePath: '$0/mo (free tiers)', paidPath: '$60–100/mo', skillLevel: 'Intermediate', setupTime: '3–5 days' },
  },
  {
    slug: 'music-production',
    title: 'Best AI Stack for Music Production',
    goal: 'Produce music with AI assistance',
    description: 'Compose, produce, mix, and distribute music — AI tools for melody generation, mastering, and marketing.',
    stages: [
      {
        name: 'Composition & Melody',
        description: 'Generate melodies, chord progressions, and song structures',
        bestPick: { name: 'Suno', slug: 'suno', reason: 'Full song generation from text prompts. Create demos, reference tracks, and backing tracks in any genre.', pricing: 'Free / $10/mo', tags: ['music', 'composition'] },
        alternatives: [
          { name: 'Udio', slug: 'udio', reason: 'AI music generation with high audio quality and style control.', pricing: 'Free / $10/mo' },
        ],
        costEstimate: '$0–10/mo',
      },
      {
        name: 'Production & DAW',
        description: 'Record, arrange, and produce in a digital audio workstation',
        bestPick: { name: 'Ableton Live', slug: 'ableton-live', reason: 'Industry-standard DAW with Max for Live AI plugins. Best workflow for electronic and hybrid production.', pricing: '$99 one-time', tags: ['daw', 'production'] },
        alternatives: [
          { name: 'FL Studio', slug: 'fl-studio', reason: 'Beginner-friendly DAW with AI-assisted pattern generation and step sequencer.', pricing: '$99 one-time' },
        ],
        costEstimate: '$99 one-time',
      },
      {
        name: 'Mixing & Mastering',
        description: 'Polish tracks to release quality',
        bestPick: { name: 'LANDR', slug: 'landr', reason: 'AI mastering that analyzes your track and applies genre-appropriate processing. Instant release-ready masters.', pricing: '$4/track', tags: ['mastering', 'audio'] },
        alternatives: [
          { name: 'iZotope Ozone', slug: 'izotope-ozone', reason: 'Professional mastering suite with AI Master Assistant for intelligent processing chains.', pricing: '$50/mo' },
        ],
        costEstimate: '$4–50/mo',
      },
      {
        name: 'Distribution',
        description: 'Get music on Spotify, Apple Music, and all platforms',
        bestPick: { name: 'DistroKid', slug: 'distrokid', reason: 'Unlimited uploads to all streaming platforms. AI-generated social assets and pre-save pages.', pricing: '$23/year', tags: ['distribution', 'streaming'] },
        alternatives: [
          { name: 'TuneCore', slug: 'tunecore', reason: 'Distribution with detailed analytics and publishing administration.', pricing: '$10/year per single' },
        ],
        costEstimate: '$10–23/year',
      },
    ],
    summary: { freePath: '$0/mo (Suno free + free DAW)', paidPath: '$30–80/mo', skillLevel: 'Intermediate', setupTime: 'Ongoing' },
  },
  {
    slug: 'data-analyst',
    title: 'Best AI Stack for a Data Analyst',
    goal: 'Supercharge data analysis with AI',
    description: 'Query databases, visualize insights, build dashboards, and present findings — AI handles the grunt work of data analysis.',
    stages: [
      {
        name: 'Data Querying & Exploration',
        description: 'Write SQL, explore datasets, and clean data',
        bestPick: { name: 'ChatGPT', slug: 'chatgpt', reason: 'Write complex SQL queries, Python pandas code, and data cleaning scripts from natural language.', pricing: 'Free / $20/mo', tags: ['sql', 'python'] },
        alternatives: [
          { name: 'Claude', slug: 'claude', reason: 'Upload CSV/Excel files directly for analysis. Better at multi-step data transformations.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Visualization & Dashboards',
        description: 'Build charts, graphs, and interactive dashboards',
        bestPick: { name: 'Tableau', slug: 'tableau', reason: 'AI-powered analytics with Ask Data natural language queries. Best visualization depth.', pricing: '$70/mo', tags: ['visualization', 'dashboards'] },
        alternatives: [
          { name: 'Looker Studio', slug: 'looker-studio', reason: 'Free Google dashboards connecting to BigQuery, Sheets, and 800+ data sources.', pricing: 'Free' },
        ],
        costEstimate: '$0–70/mo',
      },
      {
        name: 'Notebook & Analysis',
        description: 'Run analysis, build models, and document findings',
        bestPick: { name: 'Jupyter + Copilot', slug: 'github-copilot', reason: 'AI-assisted coding in Jupyter notebooks. Copilot generates pandas, matplotlib, and scikit-learn code inline.', pricing: '$10/mo', tags: ['notebooks', 'python'] },
        alternatives: [
          { name: 'Google Colab', slug: 'google-colab', reason: 'Free cloud notebooks with AI code generation and free GPU access.', pricing: 'Free / $12/mo' },
        ],
        costEstimate: '$0–12/mo',
      },
      {
        name: 'Presentation',
        description: 'Turn analysis into executive-ready presentations',
        bestPick: { name: 'Gamma', slug: 'gamma', reason: 'AI-generated presentations from data. Paste charts and insights, get polished slides.', pricing: 'Free / $10/mo', tags: ['presentations', 'reports'] },
        alternatives: [
          { name: 'Canva', slug: 'canva', reason: 'Data visualization templates and infographic builder for non-technical audiences.', pricing: 'Free / $13/mo' },
        ],
        costEstimate: '$0–13/mo',
      },
    ],
    summary: { freePath: '$0/mo (free tiers + Colab)', paidPath: '$80–120/mo', skillLevel: 'Intermediate', setupTime: '2–3 days' },
  },
  {
    slug: 'journalist',
    title: 'Best AI Stack for a Journalist',
    goal: 'Report faster and deeper with AI',
    description: 'Research stories, transcribe interviews, write drafts, and fact-check — AI accelerates the entire journalism workflow.',
    stages: [
      {
        name: 'Research & OSINT',
        description: 'Find sources, verify facts, and monitor beats',
        bestPick: { name: 'Perplexity', slug: 'perplexity', reason: 'AI search with real-time web sources and citations. Perfect for breaking news research and fact verification.', pricing: 'Free / $20/mo', tags: ['research', 'search'] },
        alternatives: [
          { name: 'ChatGPT', slug: 'chatgpt', reason: 'Analyze documents, summarize reports, and brainstorm story angles.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Interview Transcription',
        description: 'Record and transcribe interviews with speaker labeling',
        bestPick: { name: 'Otter.ai', slug: 'otter-ai', reason: 'Real-time transcription with speaker identification, search, and AI summary. OtterPilot joins meetings automatically.', pricing: 'Free / $17/mo', tags: ['transcription', 'notes'] },
        alternatives: [
          { name: 'Descript', slug: 'descript', reason: 'Transcribe audio with word-level accuracy. Edit by deleting text. Great for podcast journalists.', pricing: 'Free / $24/mo' },
        ],
        costEstimate: '$0–24/mo',
      },
      {
        name: 'Writing & Editing',
        description: 'Draft articles, headlines, and social summaries',
        bestPick: { name: 'Claude', slug: 'claude', reason: 'Best for long-form investigative writing. Upload source documents and transcripts for AI-assisted drafting.', pricing: 'Free / $20/mo', tags: ['writing', 'editing'] },
        alternatives: [
          { name: 'Grammarly', slug: 'grammarly', reason: 'Tone, clarity, and style checks for journalistic writing. AP Style suggestions.', pricing: 'Free / $12/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
    ],
    summary: { freePath: '$0/mo (free tiers)', paidPath: '$40–80/mo', skillLevel: 'Beginner', setupTime: '1–2 days' },
  },
  {
    slug: 'financial-advisor',
    title: 'Best AI Stack for a Financial Advisor',
    goal: 'Scale financial advisory with AI',
    description: 'Automate portfolio analysis, client reporting, compliance checks, and communication — AI for modern financial advisors.',
    stages: [
      {
        name: 'Market Research & Analysis',
        description: 'Research markets, analyze securities, and monitor portfolios',
        bestPick: { name: 'Perplexity', slug: 'perplexity', reason: 'Real-time market research with cited sources. Analyze earnings, macroeconomic data, and regulatory changes.', pricing: 'Free / $20/mo', tags: ['research', 'finance'] },
        alternatives: [
          { name: 'ChatGPT', slug: 'chatgpt', reason: 'Analyze financial statements, build models, and summarize SEC filings.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Client Reporting',
        description: 'Generate portfolio reviews and performance reports',
        bestPick: { name: 'Gamma', slug: 'gamma', reason: 'AI-generated portfolio review presentations. Paste performance data, get client-ready slides.', pricing: 'Free / $10/mo', tags: ['presentations', 'reporting'] },
        alternatives: [
          { name: 'Canva', slug: 'canva', reason: 'Professional report templates for quarterly reviews and financial plans.', pricing: 'Free / $13/mo' },
        ],
        costEstimate: '$0–13/mo',
      },
      {
        name: 'Client Communication',
        description: 'Newsletters, emails, and meeting follow-ups',
        bestPick: { name: 'Claude', slug: 'claude', reason: 'Draft client emails, market commentaries, and compliance-aware communications with careful reasoning.', pricing: 'Free / $20/mo', tags: ['writing', 'compliance'] },
        alternatives: [
          { name: 'Fathom', slug: 'fathom', reason: 'AI meeting notes for client conversations. Auto-generate action items and follow-up emails.', pricing: 'Free / $19/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
    ],
    summary: { freePath: '$0/mo (free tiers)', paidPath: '$40–60/mo', skillLevel: 'Intermediate', setupTime: '2–3 days' },
  },
  {
    slug: 'startup-cto',
    title: 'Best AI Stack for a Startup CTO',
    goal: 'Ship faster as a startup CTO',
    description: 'Accelerate development, automate DevOps, manage a lean engineering team, and make architectural decisions — AI for the technical leader.',
    stages: [
      {
        name: 'Development',
        description: 'Write, review, and debug code across the stack',
        bestPick: { name: 'Cursor', slug: 'cursor', reason: 'AI-native IDE with full codebase context. Fastest way to prototype, refactor, and debug.', pricing: 'Free / $20/mo', tags: ['coding', 'IDE'] },
        alternatives: [
          { name: 'GitHub Copilot', slug: 'github-copilot', reason: 'VS Code integration with Copilot Chat for code explanation and generation.', pricing: '$10/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Architecture & Planning',
        description: 'System design, technical specs, and documentation',
        bestPick: { name: 'Claude', slug: 'claude', reason: '200K context for analyzing entire codebases. Best for system design discussions and RFC writing.', pricing: 'Free / $20/mo', tags: ['architecture', 'planning'] },
        alternatives: [
          { name: 'ChatGPT', slug: 'chatgpt', reason: 'Quick technical Q&A, API design, and architecture brainstorming with web browsing.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'CI/CD & DevOps',
        description: 'Automate testing, deployment, and infrastructure',
        bestPick: { name: 'GitHub Actions', slug: 'github', reason: 'CI/CD built into GitHub. AI-assisted workflow generation and debugging with Copilot.', pricing: 'Free / $4/mo', tags: ['ci-cd', 'devops'] },
        alternatives: [
          { name: 'Vercel', slug: 'vercel', reason: 'Zero-config deployment for Next.js and frontend. Preview deploys on every PR.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Error Monitoring',
        description: 'Track bugs, crashes, and performance issues in production',
        bestPick: { name: 'Sentry', slug: 'sentry', reason: 'AI-powered error grouping and root cause analysis. Traces issues from frontend to backend.', pricing: 'Free / $26/mo', tags: ['monitoring', 'errors'] },
        alternatives: [
          { name: 'LogRocket', slug: 'logrocket', reason: 'Session replay + error tracking. See exactly what users experienced before a crash.', pricing: 'Free / $99/mo' },
        ],
        costEstimate: '$0–26/mo',
      },
    ],
    summary: { freePath: '$0/mo (free tiers)', paidPath: '$60–100/mo', skillLevel: 'Advanced', setupTime: '3–5 days' },
  },
  {
    slug: 'copywriting-business',
    title: 'Best AI Stack for a Copywriting Business',
    goal: 'Scale a copywriting business with AI',
    description: 'Write faster, deliver higher quality copy, and manage more clients — AI as your copywriting co-pilot.',
    stages: [
      {
        name: 'Copywriting',
        description: 'Write ads, landing pages, emails, and sales pages',
        bestPick: { name: 'Claude', slug: 'claude', reason: 'Best AI for nuanced, persuasive copy. Upload brand guides and reference materials for voice-matched output.', pricing: 'Free / $20/mo', tags: ['copywriting', 'content'] },
        alternatives: [
          { name: 'Jasper', slug: 'jasper', reason: 'Marketing-focused AI with ad copy, email, and landing page templates. Brand voice training.', pricing: '$49/mo' },
        ],
        costEstimate: '$20–49/mo',
      },
      {
        name: 'Research & Briefing',
        description: 'Understand client audience, competitors, and messaging',
        bestPick: { name: 'Perplexity', slug: 'perplexity', reason: 'Research target audiences, competitor messaging, and industry trends with cited sources.', pricing: 'Free / $20/mo', tags: ['research', 'strategy'] },
        alternatives: [
          { name: 'ChatGPT', slug: 'chatgpt', reason: 'Create customer personas, analyze competitor copy, and brainstorm angles.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Editing & Quality',
        description: 'Polish copy for clarity, tone, and grammar',
        bestPick: { name: 'Grammarly', slug: 'grammarly', reason: 'AI tone adjustments, clarity improvements, and brand style guide enforcement.', pricing: 'Free / $12/mo', tags: ['editing', 'grammar'] },
        alternatives: [
          { name: 'Hemingway Editor', slug: 'hemingway', reason: 'Highlights complex sentences and passive voice. Makes copy punchier.', pricing: 'Free / $10/mo' },
        ],
        costEstimate: '$0–12/mo',
      },
      {
        name: 'Client & Project Management',
        description: 'Track deliverables, deadlines, and revisions',
        bestPick: { name: 'Notion', slug: 'notion', reason: 'Client portals, content calendars, and revision tracking with AI-powered search and Q&A.', pricing: 'Free / $10/mo', tags: ['project-management', 'clients'] },
        alternatives: [
          { name: 'ClickUp', slug: 'clickup', reason: 'Task management with AI writing assistant and time tracking.', pricing: 'Free / $7/mo' },
        ],
        costEstimate: '$0–10/mo',
      },
    ],
    summary: { freePath: '$0/mo (free tiers)', paidPath: '$50–90/mo', skillLevel: 'Beginner', setupTime: '1–2 days' },
  },
  {
    slug: 'hr-team',
    title: 'Best AI Stack for an HR Team',
    goal: 'Modernize HR with AI',
    description: 'Automate recruiting, onboarding, employee engagement, and compliance — AI tools for every stage of the employee lifecycle.',
    stages: [
      {
        name: 'Recruiting & Sourcing',
        description: 'Find candidates, screen resumes, and manage pipelines',
        bestPick: { name: 'HireVue', slug: 'hirevue', reason: 'AI-powered video interviews with automated candidate scoring and structured interview guides.', pricing: 'Contact sales', tags: ['recruiting', 'screening'] },
        alternatives: [
          { name: 'ChatGPT', slug: 'chatgpt', reason: 'Write job descriptions, screen cover letters, and generate interview questions.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$20–200/mo',
      },
      {
        name: 'Onboarding',
        description: 'Create onboarding materials, handbooks, and training docs',
        bestPick: { name: 'Notion', slug: 'notion', reason: 'Build employee handbooks, onboarding checklists, and team wikis with AI-powered content generation.', pricing: 'Free / $10/mo', tags: ['documentation', 'onboarding'] },
        alternatives: [
          { name: 'Trainual', slug: 'trainual', reason: 'AI-powered SOPs and training documentation platform.', pricing: '$99/mo' },
        ],
        costEstimate: '$0–99/mo',
      },
      {
        name: 'Employee Communication',
        description: 'Internal newsletters, policy updates, and announcements',
        bestPick: { name: 'Claude', slug: 'claude', reason: 'Draft sensitive communications — policy changes, org announcements, performance reviews — with appropriate tone.', pricing: 'Free / $20/mo', tags: ['writing', 'communication'] },
        alternatives: [
          { name: 'Grammarly Business', slug: 'grammarly', reason: 'Consistent professional tone across all HR communications. Style guide enforcement.', pricing: '$15/mo per user' },
        ],
        costEstimate: '$0–20/mo',
      },
    ],
    summary: { freePath: '$0/mo (free tiers)', paidPath: '$100–300/mo', skillLevel: 'Beginner', setupTime: '1–2 weeks' },
  },
  {
    slug: 'academic-researcher',
    title: 'Best AI Stack for Academic Research',
    goal: 'Accelerate academic research with AI',
    description: 'Literature review, data analysis, paper writing, and citation management — AI tools for modern researchers.',
    stages: [
      {
        name: 'Literature Discovery',
        description: 'Find papers, track citations, and stay current on your field',
        bestPick: { name: 'Semantic Scholar', slug: 'semantic-scholar', reason: 'AI-powered paper recommendations, citation analysis, and research trend tracking. Free and comprehensive.', pricing: 'Free', tags: ['papers', 'citations'] },
        alternatives: [
          { name: 'Elicit', slug: 'elicit', reason: 'AI research assistant that finds relevant papers and extracts key findings automatically.', pricing: 'Free / $10/mo' },
        ],
        costEstimate: '$0–10/mo',
      },
      {
        name: 'Reading & Synthesis',
        description: 'Summarize papers, extract key findings, and compare studies',
        bestPick: { name: 'Claude', slug: 'claude', reason: '200K context window processes entire papers. Ask questions about methodology, compare findings across studies.', pricing: 'Free / $20/mo', tags: ['reading', 'analysis'] },
        alternatives: [
          { name: 'ChatGPT', slug: 'chatgpt', reason: 'Summarize papers, explain complex concepts, and brainstorm research directions.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Data Analysis',
        description: 'Statistical analysis, modeling, and visualization',
        bestPick: { name: 'Google Colab', slug: 'google-colab', reason: 'Free cloud notebooks with AI code completion. GPU access for ML experiments. Shareable with collaborators.', pricing: 'Free / $12/mo', tags: ['notebooks', 'analysis'] },
        alternatives: [
          { name: 'GitHub Copilot', slug: 'github-copilot', reason: 'AI-assisted R/Python coding in VS Code or Jupyter.', pricing: '$10/mo' },
        ],
        costEstimate: '$0–12/mo',
      },
      {
        name: 'Writing & Editing',
        description: 'Draft papers, check grammar, and manage citations',
        bestPick: { name: 'Grammarly', slug: 'grammarly', reason: 'Academic writing mode catches passive voice, wordiness, and tone issues. Plagiarism checker included.', pricing: 'Free / $12/mo', tags: ['writing', 'editing'] },
        alternatives: [
          { name: 'Zotero', slug: 'zotero', reason: 'Free citation manager with browser extension. Auto-generates bibliographies.', pricing: 'Free' },
        ],
        costEstimate: '$0–12/mo',
      },
    ],
    summary: { freePath: '$0/mo (all free tiers)', paidPath: '$30–60/mo', skillLevel: 'Intermediate', setupTime: '1–2 days' },
  },
  {
    slug: 'influencer',
    title: 'Best AI Stack for an Influencer',
    goal: 'Grow your influence with AI',
    description: 'Create content, grow followers, manage brand deals, and monetize your audience — AI for the modern creator economy.',
    stages: [
      {
        name: 'Content Creation',
        description: 'Write captions, scripts, and blog posts',
        bestPick: { name: 'ChatGPT', slug: 'chatgpt', reason: 'Generate content ideas, write captions, create scripts, and brainstorm collaboration pitches.', pricing: 'Free / $20/mo', tags: ['writing', 'content'] },
        alternatives: [
          { name: 'Typefully', slug: 'typefully', reason: 'AI-powered Twitter/LinkedIn writer with scheduling and analytics.', pricing: 'Free / $15/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Visual Content',
        description: 'Photos, graphics, and short-form video',
        bestPick: { name: 'CapCut', slug: 'capcut', reason: 'AI-powered video editing with trending effects, auto-captions, and background removal. TikTok-native.', pricing: 'Free / $10/mo', tags: ['video', 'editing'] },
        alternatives: [
          { name: 'Canva', slug: 'canva', reason: 'Instagram stories, carousels, and feed posts with brand templates.', pricing: 'Free / $13/mo' },
        ],
        costEstimate: '$0–13/mo',
      },
      {
        name: 'Scheduling & Analytics',
        description: 'Plan content calendar and track performance',
        bestPick: { name: 'Later', slug: 'later', reason: 'Visual content calendar with AI best-time-to-post and link-in-bio. Instagram-first design.', pricing: 'Free / $25/mo', tags: ['scheduling', 'analytics'] },
        alternatives: [
          { name: 'Buffer', slug: 'buffer', reason: 'Multi-platform scheduling with AI content suggestions and engagement tracking.', pricing: 'Free / $6/mo per channel' },
        ],
        costEstimate: '$0–25/mo',
      },
      {
        name: 'Monetization',
        description: 'Manage brand deals, affiliates, and digital products',
        bestPick: { name: 'Stan Store', slug: 'stan-store', reason: 'All-in-one creator store for digital products, courses, bookings, and memberships. No code needed.', pricing: '$29/mo', tags: ['monetization', 'store'] },
        alternatives: [
          { name: 'Gumroad', slug: 'gumroad', reason: 'Sell digital products directly to your audience. Simple and creator-friendly.', pricing: 'Free (10% fee)' },
        ],
        costEstimate: '$0–29/mo',
      },
    ],
    summary: { freePath: '$0/mo (free tiers)', paidPath: '$50–90/mo', skillLevel: 'Beginner', setupTime: '2–3 days' },
  },
  {
    slug: 'design-studio',
    title: 'Best AI Stack for a Design Studio',
    goal: 'Scale a design studio with AI',
    description: 'Accelerate client work from concept to delivery — AI for ideation, production, client feedback, and project management.',
    stages: [
      {
        name: 'Ideation & Concept',
        description: 'Generate concepts, moodboards, and visual directions',
        bestPick: { name: 'Midjourney', slug: 'midjourney', reason: 'Highest quality AI image generation for concept exploration, moodboards, and client presentations.', pricing: '$10/mo', tags: ['ideation', 'art'] },
        alternatives: [
          { name: 'DALL-E 3', slug: 'dall-e', reason: 'Integrated in ChatGPT. Quick concept art and illustration styles.', pricing: 'Included with ChatGPT Plus' },
        ],
        costEstimate: '$10–20/mo',
      },
      {
        name: 'Design Production',
        description: 'Create final deliverables — UI, branding, print',
        bestPick: { name: 'Figma AI', slug: 'figma', reason: 'AI-powered auto-layout, content generation, and prototyping. Industry standard for collaborative design.', pricing: 'Free / $15/mo', tags: ['design', 'UI'] },
        alternatives: [
          { name: 'Canva', slug: 'canva', reason: 'Quick social, print, and presentation design with AI Magic Studio.', pricing: 'Free / $13/mo' },
        ],
        costEstimate: '$0–15/mo',
      },
      {
        name: 'Asset Management',
        description: 'Organize, tag, and share design assets',
        bestPick: { name: 'Notion', slug: 'notion', reason: 'Design system documentation, asset libraries, and client-facing project portals.', pricing: 'Free / $10/mo', tags: ['organization', 'docs'] },
        alternatives: [
          { name: 'Brandfetch', slug: 'brandfetch', reason: 'AI-powered brand asset finder. Pull logos, colors, and fonts for any client.', pricing: 'Free / $10/mo' },
        ],
        costEstimate: '$0–10/mo',
      },
    ],
    summary: { freePath: '$10/mo (Midjourney minimum)', paidPath: '$40–60/mo', skillLevel: 'Intermediate', setupTime: '2–3 days' },
  },
  {
    slug: 'customer-success-team',
    title: 'Best AI Stack for a Customer Success Team',
    goal: 'Scale customer success with AI',
    description: 'Onboard customers, track health scores, automate check-ins, and reduce churn — AI for proactive customer success.',
    stages: [
      {
        name: 'Helpdesk & Tickets',
        description: 'Manage support tickets, auto-respond, and escalate',
        bestPick: { name: 'Intercom', slug: 'intercom', reason: 'AI chatbot Fin resolves 50%+ of tickets instantly. Knowledge base, inbox, and customer data in one place.', pricing: '$74/mo', tags: ['support', 'chatbot'] },
        alternatives: [
          { name: 'Zendesk', slug: 'zendesk', reason: 'Enterprise helpdesk with AI ticket routing, sentiment analysis, and macro suggestions.', pricing: '$55/mo' },
        ],
        costEstimate: '$55–74/mo',
      },
      {
        name: 'Customer Health Monitoring',
        description: 'Track usage, engagement, and churn risk signals',
        bestPick: { name: 'Vitally', slug: 'vitally', reason: 'Customer success platform with AI health scores, automated playbooks, and revenue forecasting.', pricing: 'Contact sales', tags: ['health-scores', 'analytics'] },
        alternatives: [
          { name: 'HubSpot', slug: 'hubspot', reason: 'CRM with customer health scoring and automated email sequences for at-risk accounts.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–200/mo',
      },
      {
        name: 'Knowledge Base',
        description: 'Self-serve documentation and onboarding guides',
        bestPick: { name: 'Notion', slug: 'notion', reason: 'Public-facing docs, onboarding guides, and FAQ pages. AI search helps customers find answers.', pricing: 'Free / $10/mo', tags: ['docs', 'self-serve'] },
        alternatives: [
          { name: 'GitBook', slug: 'gitbook', reason: 'Clean documentation platform with AI-powered search and versioning.', pricing: 'Free / $8/mo' },
        ],
        costEstimate: '$0–10/mo',
      },
    ],
    summary: { freePath: '$0/mo (HubSpot free + Notion)', paidPath: '$100–300/mo', skillLevel: 'Intermediate', setupTime: '1–2 weeks' },
  },
  {
    slug: 'healthcare-practice',
    title: 'Best AI Stack for a Healthcare Practice',
    goal: 'Modernize a healthcare practice with AI',
    description: 'Automate documentation, patient communication, scheduling, and billing — AI tools designed for healthcare compliance.',
    stages: [
      {
        name: 'Clinical Documentation',
        description: 'Generate visit notes, referrals, and patient summaries',
        bestPick: { name: 'Nuance DAX', slug: 'nuance-dax', reason: 'Ambient AI that listens to patient encounters and auto-generates clinical notes. Integrates with major EHRs.', pricing: 'Contact sales', tags: ['documentation', 'clinical'] },
        alternatives: [
          { name: 'Freed', slug: 'freed', reason: 'AI medical scribe for primary care. Generates SOAP notes from patient conversations.', pricing: '$99/mo' },
        ],
        costEstimate: '$99–300/mo',
      },
      {
        name: 'Patient Communication',
        description: 'Appointment reminders, follow-ups, and patient education',
        bestPick: { name: 'Luma Health', slug: 'luma-health', reason: 'AI-powered patient engagement: automated reminders, waitlist management, and patient intake forms.', pricing: 'Contact sales', tags: ['scheduling', 'communication'] },
        alternatives: [
          { name: 'ChatGPT', slug: 'chatgpt', reason: 'Draft patient education materials, consent forms, and follow-up instructions. Always verify accuracy.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$20–200/mo',
      },
      {
        name: 'Billing & Coding',
        description: 'Automate medical coding and claims processing',
        bestPick: { name: 'Athenahealth', slug: 'athenahealth', reason: 'Cloud-based EHR with AI-assisted coding suggestions, claims scrubbing, and revenue cycle management.', pricing: 'Contact sales', tags: ['billing', 'ehr'] },
        alternatives: [
          { name: 'Kareo', slug: 'kareo', reason: 'Practice management with AI billing assistant for independent practices.', pricing: '$110/mo' },
        ],
        costEstimate: '$110–300/mo',
      },
    ],
    summary: { freePath: 'N/A (healthcare tools require paid plans)', paidPath: '$300–800/mo', skillLevel: 'Intermediate', setupTime: '4–8 weeks' },
  },
  {
    slug: 'non-profit',
    title: 'Best AI Stack for a Non-Profit',
    goal: 'Do more with less using AI',
    description: 'Maximize impact with minimal budget — AI for fundraising, communications, volunteer management, and grant writing.',
    stages: [
      {
        name: 'Grant Writing & Fundraising',
        description: 'Write grant proposals, donor appeals, and campaign copy',
        bestPick: { name: 'Claude', slug: 'claude', reason: 'Best for long-form grant proposals. Upload guidelines and past winning applications for style-matched output.', pricing: 'Free / $20/mo', tags: ['writing', 'grants'] },
        alternatives: [
          { name: 'ChatGPT', slug: 'chatgpt', reason: 'Draft donor emails, event invitations, and social media fundraising campaigns.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Design & Social Media',
        description: 'Create campaign visuals, reports, and social content',
        bestPick: { name: 'Canva', slug: 'canva', reason: 'Free for non-profits (Canva for Nonprofits). AI-powered design for social, print, and presentations.', pricing: 'Free for nonprofits', tags: ['design', 'social'] },
        alternatives: [
          { name: 'Buffer', slug: 'buffer', reason: 'Social media scheduling with nonprofit discounts.', pricing: 'Free / $6/mo per channel' },
        ],
        costEstimate: '$0/mo',
      },
      {
        name: 'Donor Management',
        description: 'Track donors, automate thank-yous, and manage campaigns',
        bestPick: { name: 'HubSpot', slug: 'hubspot', reason: 'Free CRM adapted for donor management. Email automation, contact tracking, and reporting.', pricing: 'Free', tags: ['crm', 'donors'] },
        alternatives: [
          { name: 'Notion', slug: 'notion', reason: 'Free for nonprofits. Track grants, events, volunteers, and board meetings.', pricing: 'Free for nonprofits' },
        ],
        costEstimate: '$0/mo',
      },
    ],
    summary: { freePath: '$0/mo (nonprofit discounts)', paidPath: '$20–50/mo', skillLevel: 'Beginner', setupTime: '3–5 days' },
  },
  {
    slug: 'restaurant-business',
    title: 'Best AI Stack for a Restaurant',
    goal: 'Run a smarter restaurant with AI',
    description: 'Manage online presence, automate marketing, optimize menus, and handle reservations — AI for restaurant operators.',
    stages: [
      {
        name: 'Online Presence & Reviews',
        description: 'Manage Google listing, respond to reviews, and update menus online',
        bestPick: { name: 'ChatGPT', slug: 'chatgpt', reason: 'Write review responses, menu descriptions, and social media posts. Generate seasonal menu ideas and specials.', pricing: 'Free / $20/mo', tags: ['writing', 'reviews'] },
        alternatives: [
          { name: 'Yelp for Business', slug: 'yelp', reason: 'Respond to reviews and manage your listing with AI-suggested responses.', pricing: 'Free' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Social Media & Marketing',
        description: 'Food photography captions, event promotion, and local marketing',
        bestPick: { name: 'Canva', slug: 'canva', reason: 'Restaurant templates for Instagram, menus, flyers, and table cards. AI generates food photography enhancements.', pricing: 'Free / $13/mo', tags: ['design', 'marketing'] },
        alternatives: [
          { name: 'Later', slug: 'later', reason: 'Visual social scheduling optimized for food content and Instagram.', pricing: 'Free / $25/mo' },
        ],
        costEstimate: '$0–13/mo',
      },
      {
        name: 'Reservations & Orders',
        description: 'Online ordering, reservations, and waitlist management',
        bestPick: { name: 'Toast', slug: 'toast', reason: 'All-in-one restaurant POS with AI-powered menu optimization, online ordering, and analytics.', pricing: '$0–69/mo', tags: ['pos', 'ordering'] },
        alternatives: [
          { name: 'OpenTable', slug: 'opentable', reason: 'Reservation management with AI-optimized seating and guest preferences.', pricing: '$39/mo' },
        ],
        costEstimate: '$0–69/mo',
      },
    ],
    summary: { freePath: '$0/mo (free tiers)', paidPath: '$50–100/mo', skillLevel: 'Beginner', setupTime: '1 week' },
  },
  {
    slug: 'personal-finance',
    title: 'Best AI Stack for Personal Finance',
    goal: 'Manage personal finances with AI',
    description: 'Budget, invest, track expenses, and plan for the future — AI tools for individual financial wellness.',
    stages: [
      {
        name: 'Budgeting & Tracking',
        description: 'Track spending, categorize transactions, and set budgets',
        bestPick: { name: 'Copilot Money', slug: 'copilot-money', reason: 'AI-powered personal finance app. Auto-categorizes transactions, tracks subscriptions, and forecasts spending.', pricing: '$10/mo', tags: ['budgeting', 'tracking'] },
        alternatives: [
          { name: 'Monarch Money', slug: 'monarch-money', reason: 'Collaborative budgeting with AI insights, investment tracking, and net worth monitoring.', pricing: '$10/mo' },
        ],
        costEstimate: '$10/mo',
      },
      {
        name: 'Investment Research',
        description: 'Research stocks, ETFs, and market trends',
        bestPick: { name: 'Perplexity', slug: 'perplexity', reason: 'Real-time market research with cited sources. Analyze earnings, compare funds, and track macro trends.', pricing: 'Free / $20/mo', tags: ['research', 'investing'] },
        alternatives: [
          { name: 'ChatGPT', slug: 'chatgpt', reason: 'Explain investment concepts, analyze financial statements, and backtest strategies.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–20/mo',
      },
      {
        name: 'Tax Preparation',
        description: 'Organize documents, estimate taxes, and file returns',
        bestPick: { name: 'TurboTax', slug: 'turbotax', reason: 'AI-guided tax filing with document upload, deduction finder, and audit support.', pricing: '$0–90/filing', tags: ['taxes', 'filing'] },
        alternatives: [
          { name: 'ChatGPT', slug: 'chatgpt', reason: 'Explain tax scenarios, estimate deductions, and organize tax documents. Not a substitute for professional advice.', pricing: 'Free / $20/mo' },
        ],
        costEstimate: '$0–90/year',
      },
    ],
    summary: { freePath: '$0/mo (Perplexity free)', paidPath: '$20–40/mo', skillLevel: 'Beginner', setupTime: '1 day' },
  },
]

export function getStackBySlug(slug: string): StackConfig | undefined {
  return STACKS.find((s) => s.slug === slug)
}

export function getAllStackSlugs(): string[] {
  return STACKS.map((s) => s.slug)
}
