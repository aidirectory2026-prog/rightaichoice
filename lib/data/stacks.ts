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
]

export function getStackBySlug(slug: string): StackConfig | undefined {
  return STACKS.find((s) => s.slug === slug)
}

export function getAllStackSlugs(): string[] {
  return STACKS.map((s) => s.slug)
}
