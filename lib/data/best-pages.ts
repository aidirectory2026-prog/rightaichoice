/**
 * Static config for "Best AI tools for X" SEO landing pages.
 * Each entry defines the URL slug, page title, description, and
 * the Supabase category/tag/feature query used to populate the tools.
 */

export type BestPageConfig = {
  slug: string
  title: string
  h1: string
  description: string
  /** Category slugs to include */
  categories?: string[]
  /**
   * Phase 9 (2026-06-05) — niche filter. When set, the page populates its tool
   * list via full-text `search` (websearch_to_tsquery on search_vector) instead
   * of a category dump, so "best AI tools for [niche]" shows niche-RELEVANT
   * tools. Only add a niche page that returns ≥8 relevant tools (quality gate).
   * See doc 22.
   */
  niche?: string
  /** Feature keywords to match (OR logic) */
  featureKeywords?: string[]
  /** Skill level filter */
  skillLevel?: 'beginner' | 'intermediate' | 'advanced'
  /**
   * Phase 9 noindex sweep — keep URL live but exclude from sitemap
   * and emit <meta name="robots" content="noindex,follow">. Used to
   * reclaim crawl budget from pages stuck at pos 51+.
   */
  noindex?: boolean
  /**
   * BUG-06 (Phase 13) — optional authored intro, rendered as 1–2 unique
   * paragraphs above the ranked list. Gives a thin "best of" page genuinely
   * unique prose (split on "\n\n"). Leave unset for pages that rely on the
   * ranked list + interpolated FAQ for their unique content.
   */
  intro?: string
}

/**
 * BUG-06 (Phase 13) — quality gate. A "best/for X" page with fewer than this
 * many ranked tools is too thin to compete and is auto-noindex,follow'd (URL
 * stays live) + dropped from the sitemap, regardless of the manual `noindex`
 * flag. 8 mirrors the long-standing manual rule in the niche-page comment.
 */
export const MIN_INDEXABLE_TOOLS = 8

export const BEST_PAGES: BestPageConfig[] = [
  {
    slug: 'writing',
    title: 'Best AI Writing Tools',
    h1: 'Best AI Tools for Writing',
    description:
      'Discover the top AI writing assistants for content creation, copywriting, long-form articles, and more. Compare features, pricing, and real-world signals.',
    categories: ['writing-content'],
    noindex: true,
  },
  {
    slug: 'coding',
    title: 'Best AI Coding Assistants',
    h1: 'Best AI Tools for Coding & Development',
    description:
      'Find the best AI coding assistants, code completion tools, and developer productivity tools. From GitHub Copilot to Cursor — compare the top options.',
    // Phase 7 Step 52 (BUG-016): was `developer-code` which doesn't exist in
    // the categories table. The canonical seed slug is `code-development`.
    // Same phantom-slug class as the sitemap /compare/ bug — page rendered
    // empty because Supabase silently returned 0 tool IDs.
    categories: ['code-development'],
  },
  {
    slug: 'image-generation',
    title: 'Best AI Image Generators',
    h1: 'Best AI Image Generation Tools',
    description:
      'Compare the top AI image generators including Midjourney, DALL-E 3, Stable Diffusion, and more. Find the right tool for your creative workflow.',
    // Phase 7 Step 52 (BUG-016): was `design-creative` which is a phantom slug.
    // The canonical category for image generators is `image-generation` itself.
    categories: ['image-generation'],
    featureKeywords: ['image generation', 'text-to-image'],
  },
  {
    slug: 'video',
    title: 'Best AI Video Tools',
    h1: 'Best AI Video Creation & Editing Tools',
    description:
      'The top AI video tools for creators — from text-to-video generators like Sora and Pika to editing assistants and avatar platforms like HeyGen and Synthesia.',
    // Phase 7 Step 52 (BUG-016): was `voice-audio` (phantom). Canonical is
    // `video-audio` for video tools (46 refs in seed data).
    categories: ['video-audio'],
    featureKeywords: ['video generation', 'text-to-video', 'video editing'],
  },
  {
    slug: 'seo',
    title: 'Best AI SEO Tools',
    h1: 'Best AI Tools for SEO & Content Marketing',
    description:
      'Top AI-powered SEO tools to rank higher in search. Compare Surfer SEO, Semrush AI, Frase, and other tools for keyword research, content optimization, and competitor analysis.',
    // Phase 7 Step 52 (BUG-016): was `seo-marketing` (phantom). Canonical is `marketing-seo`.
    categories: ['marketing-seo'],
  },
  {
    slug: 'productivity',
    title: 'Best AI Productivity Tools',
    h1: 'Best AI Tools for Productivity',
    description:
      'Boost your output with the best AI productivity tools — meeting assistants, task managers, note-takers, email writers, and workflow automation platforms.',
    // Phase 7 Step 52 (BUG-016): was `productivity-automation` (phantom).
    // Canonical is `productivity`. The page only uses categories[0] today.
    categories: ['productivity'],
  },
  {
    slug: 'customer-support',
    title: 'Best AI Customer Support Tools',
    h1: 'Best AI Tools for Customer Support',
    description:
      'The top AI chatbots and customer support platforms that reduce ticket volume, improve response times, and deliver personalized support at scale.',
    categories: ['customer-support'],
  },
  {
    slug: 'data-analytics',
    title: 'Best AI Data Analytics Tools',
    h1: 'Best AI Tools for Data Analytics & Business Intelligence',
    description:
      'From natural language querying to predictive analytics — discover the best AI data tools for analysts, data scientists, and business teams.',
    categories: ['data-analytics'],
  },
  {
    slug: 'design',
    title: 'Best AI Design Tools',
    h1: 'Best AI Tools for Design & Creative Work',
    description:
      'AI design tools for every creator — from logo generators and UI builders to AI photo editors, 3D tools, and brand identity platforms.',
    // Phase 7 Step 52 (BUG-016): was `design-creative` (phantom). Canonical is `design-ui`.
    categories: ['design-ui'],
    noindex: true,
  },
  {
    slug: 'research',
    title: 'Best AI Research Tools',
    h1: 'Best AI Tools for Research & Learning',
    description:
      'Accelerate your research with AI-powered literature discovery, paper summarization, and knowledge synthesis tools.',
    categories: ['research-education'],
  },
  {
    slug: 'startups',
    niche: 'startups',
    title: 'Best AI Tools for Startups',
    h1: 'Best AI Tools for Startups & Entrepreneurs',
    description:
      'Essential AI tools for startup founders — from building your product and marketing your brand to automating operations and finding customers.',
    skillLevel: 'beginner',
  },
  {
    slug: 'social-media',
    niche: 'social media',
    title: 'Best AI Social Media Tools',
    h1: 'Best AI Tools for Social Media Marketing',
    description:
      'The top AI tools to grow your social media presence — content generators, scheduling platforms, analytics tools, and viral clip creators.',
    featureKeywords: ['social media', 'scheduling', 'content creation'],
  },
  {
    slug: 'free',
    title: 'Best Free AI Tools',
    h1: 'Best Free AI Tools (No Credit Card Required)',
    description:
      'Discover the best free AI tools available in 2026 — with generous free tiers, no credit card required. Covers writing, image generation, coding, productivity, and more.',
  },
  {
    slug: 'beginners',
    title: 'Best AI Tools for Beginners',
    h1: 'Best AI Tools for Beginners',
    description:
      'New to AI? These beginner-friendly AI tools require no technical skills. Start creating, writing, coding, and automating with the easiest AI tools available.',
    skillLevel: 'beginner',
  },

  // ── Phase 5 expansion (36 new pages) ──────────────────────────

  // High search volume
  {
    slug: 'email-marketing',
    niche: 'email marketing',
    title: 'Best AI Email Marketing Tools',
    h1: 'Best AI Tools for Email Marketing',
    description:
      'Top AI email marketing tools for automated campaigns, personalized copy, subject line optimization, and deliverability. Compare features, pricing, and user reviews.',
    categories: ['marketing-seo'],
    featureKeywords: ['email', 'email marketing', 'newsletter'],
  },
  {
    slug: 'sales',
    niche: 'sales',
    title: 'Best AI Sales Tools',
    h1: 'Best AI Tools for Sales Teams',
    description:
      'AI sales tools that help you prospect, write outreach, book meetings, and close deals faster. From lead scoring to conversation intelligence.',
    categories: ['business-finance'],
    featureKeywords: ['sales', 'CRM', 'lead generation', 'outreach'],
  },
  {
    slug: 'students',
    niche: 'student',
    title: 'Best AI Tools for Students',
    h1: 'Best AI Tools for Students in 2026',
    description:
      'The best AI tools every student needs — for research, writing essays, studying, note-taking, and exam prep. Ranked on accuracy, free tiers, and real-world signals.',
  },
  {
    slug: 'resume',
    niche: 'resume',
    title: 'Best AI Resume Builders',
    h1: 'Best AI Resume & CV Builders',
    description:
      'Create professional resumes in minutes with AI. Compare the top AI resume builders for formatting, ATS optimization, cover letters, and LinkedIn profiles.',
    featureKeywords: ['resume', 'CV', 'career', 'job search'],
  },
  {
    slug: 'transcription',
    niche: 'transcription',
    title: 'Best AI Transcription Tools',
    h1: 'Best AI Transcription & Speech-to-Text Tools',
    description:
      'Accurate, fast AI transcription tools for meetings, interviews, podcasts, and videos. Compare Otter, Whisper, Descript, and more.',
    featureKeywords: ['transcription', 'speech-to-text', 'captions'],
  },
  {
    slug: 'ecommerce',
    niche: 'ecommerce',
    title: 'Best AI Tools for Ecommerce',
    h1: 'Best AI Tools for Ecommerce & Online Stores',
    description:
      'AI tools that help ecommerce businesses write product descriptions, optimize listings, manage inventory, personalize shopping, and increase conversions.',
    categories: ['marketing-seo'],
    featureKeywords: ['ecommerce', 'product description', 'shopping', 'store'],
  },
  {
    slug: 'photo-editing',
    title: 'Best AI Photo Editing Tools',
    h1: 'Best AI Photo Editors & Image Enhancement Tools',
    description:
      'AI photo editors that remove backgrounds, upscale images, retouch portraits, and transform photos. Compare Luminar, Photoroom, and more.',
    categories: ['image-generation'],
    featureKeywords: ['photo editing', 'image enhancement', 'background removal', 'upscale'],
  },

  // Medium-high volume
  {
    slug: 'presentations',
    niche: 'presentation',
    title: 'Best AI Presentation Tools',
    h1: 'Best AI Presentation & Slide Deck Tools',
    description:
      'Create stunning presentations in minutes with AI. Compare Gamma, Beautiful.ai, Tome, and other tools that generate professional slides from text.',
    featureKeywords: ['presentation', 'slides', 'pitch deck', 'slideshow'],
  },
  {
    slug: 'translation',
    niche: 'translation',
    title: 'Best AI Translation Tools',
    h1: 'Best AI Translation & Localization Tools',
    description:
      'Top AI translation tools for real-time communication, document translation, and website localization. Compare DeepL, Google Translate alternatives, and more.',
    featureKeywords: ['translation', 'localization', 'language'],
  },
  {
    slug: 'meeting-notes',
    title: 'Best AI Meeting Note Takers',
    h1: 'Best AI Meeting Assistants & Note Takers',
    description:
      'Never miss an action item again. AI meeting assistants that record, transcribe, summarize, and extract tasks from your calls and video meetings.',
    categories: ['productivity'],
    featureKeywords: ['meeting', 'notes', 'transcription', 'summary'],
  },
  {
    slug: 'legal',
    niche: 'legal',
    title: 'Best AI Tools for Lawyers',
    h1: 'Best AI Tools for Legal Professionals',
    description:
      'AI tools designed for law firms and legal teams — contract review, legal research, document drafting, compliance checking, and case management.',
    featureKeywords: ['legal', 'contract', 'law', 'compliance'],
  },
  {
    slug: 'real-estate',
    niche: 'real estate',
    title: 'Best AI Tools for Real Estate',
    h1: 'Best AI Tools for Real Estate Agents',
    description:
      'AI tools that help realtors generate listings, write property descriptions, create virtual tours, automate follow-ups, and close more deals.',
    featureKeywords: ['real estate', 'property', 'listing'],
  },
  {
    slug: 'podcasting',
    title: 'Best AI Podcasting Tools',
    h1: 'Best AI Tools for Podcasters',
    description:
      'AI-powered tools for podcast creation — from recording and editing to transcription, show notes, audiograms, and distribution.',
    categories: ['voice-speech'],
    featureKeywords: ['podcast', 'audio editing', 'show notes'],
  },
  {
    slug: 'music',
    title: 'Best AI Music Generators',
    h1: 'Best AI Music Creation & Generation Tools',
    description:
      'Create original music, beats, and soundtracks with AI. Compare Suno, Udio, AIVA, Soundraw, and other AI music generators for creators and producers.',
    categories: ['voice-speech'],
    featureKeywords: ['music', 'audio generation', 'beat', 'soundtrack'],
  },
  {
    slug: 'project-management',
    title: 'Best AI Project Management Tools',
    h1: 'Best AI Tools for Project Management',
    description:
      'AI project management tools that automate task assignment, predict timelines, summarize updates, and keep teams aligned. Compare top options.',
    categories: ['productivity'],
    featureKeywords: ['project management', 'task management', 'workflow'],
  },
  {
    slug: 'voiceover',
    title: 'Best AI Voiceover Tools',
    h1: 'Best AI Text-to-Speech & Voiceover Tools',
    description:
      'Generate natural-sounding voiceovers for videos, ads, audiobooks, and e-learning with AI. Compare ElevenLabs, Murf, Play.ht, and more.',
    categories: ['voice-speech'],
    featureKeywords: ['text-to-speech', 'voiceover', 'voice cloning', 'TTS'],
    noindex: true,
  },
  {
    slug: 'accounting',
    niche: 'accounting',
    title: 'Best AI Accounting Tools',
    h1: 'Best AI Tools for Accounting & Bookkeeping',
    description:
      'AI accounting tools that automate bookkeeping, categorize expenses, generate financial reports, and simplify tax preparation.',
    categories: ['business-finance'],
    featureKeywords: ['accounting', 'bookkeeping', 'finance', 'tax'],
  },
  {
    slug: 'hr-recruiting',
    niche: 'recruiting',
    title: 'Best AI HR & Recruiting Tools',
    h1: 'Best AI Tools for HR & Recruiting',
    description:
      'AI tools for hiring teams — automated resume screening, candidate sourcing, interview scheduling, employee onboarding, and performance management.',
    featureKeywords: ['HR', 'recruiting', 'hiring', 'talent'],
  },
  {
    slug: 'healthcare-ai',
    niche: 'healthcare',
    title: 'Best AI Tools for Healthcare',
    h1: 'Best AI Tools for Healthcare Professionals',
    description:
      'AI tools for medical professionals — clinical note generation, diagnostic assistance, patient communication, medical imaging analysis, and research.',
  },
  {
    slug: 'education',
    niche: 'education',
    title: 'Best AI Tools for Teachers',
    h1: 'Best AI Tools for Educators & Teachers',
    description:
      'AI tools that help teachers create lesson plans, generate quizzes, personalize learning, grade assignments, and save hours of prep time every week.',
    featureKeywords: ['education', 'teaching', 'lesson plan', 'quiz'],
  },
  {
    slug: 'cybersecurity',
    niche: 'cybersecurity',
    title: 'Best AI Cybersecurity Tools',
    h1: 'Best AI Tools for Cybersecurity',
    description:
      'AI-powered cybersecurity tools for threat detection, vulnerability scanning, incident response, and security operations. Compare top solutions.',
  },
  {
    slug: 'game-dev',
    niche: 'game development',
    title: 'Best AI Tools for Game Development',
    h1: 'Best AI Tools for Game Developers',
    description:
      'AI tools for indie and professional game developers — generate 2D/3D assets, write dialogue, design levels, create music, and test gameplay.',
    featureKeywords: ['game', 'game development', '3D', 'assets'],
  },
  {
    slug: 'architecture',
    title: 'Best AI Tools for Architecture',
    h1: 'Best AI Tools for Architects & Interior Designers',
    description:
      'AI-powered design tools for architects — generate floor plans, render visualizations, explore design variations, and streamline BIM workflows.',
    categories: ['design-ui'],
    featureKeywords: ['architecture', 'floor plan', '3D rendering', 'interior design'],
  },

  // Role-based and audience pages
  {
    slug: 'freelancers',
    niche: 'freelancers',
    title: 'Best AI Tools for Freelancers',
    h1: 'Best AI Tools for Freelancers',
    description:
      'The essential AI toolkit for freelancers — automate proposals, write faster, manage clients, send invoices, and deliver better work in less time.',
    featureKeywords: ['freelance', 'proposal', 'invoice', 'client'],
  },
  {
    slug: 'solopreneurs',
    niche: 'solopreneur',
    title: 'Best AI Tools for Solopreneurs',
    h1: 'Best AI Tools for Solo Founders & Solopreneurs',
    description:
      'Run your entire business with AI. The best tools for solopreneurs who need to handle marketing, sales, support, operations, and product — alone.',
  },
  {
    slug: 'agencies',
    niche: 'agency',
    title: 'Best AI Tools for Agencies',
    h1: 'Best AI Tools for Marketing & Creative Agencies',
    description:
      'AI tools that help agencies scale — from client reporting and content generation to campaign optimization and white-label solutions.',
    featureKeywords: ['agency', 'white-label', 'client reporting'],
  },
  {
    slug: 'content-repurposing',
    niche: 'content repurposing',
    title: 'Best AI Content Repurposing Tools',
    h1: 'Best AI Tools for Content Repurposing',
    description:
      'Turn one piece of content into 10. AI tools that transform blog posts into videos, podcasts into articles, threads into carousels, and more.',
    featureKeywords: ['repurpose', 'content', 'clip', 'carousel'],
  },
  {
    slug: 'cold-outreach',
    niche: 'cold outreach',
    title: 'Best AI Cold Outreach Tools',
    h1: 'Best AI Tools for Cold Email & Outreach',
    description:
      'AI-powered cold outreach tools for personalized emails at scale — find leads, write copy, automate sequences, and track responses.',
    featureKeywords: ['cold email', 'outreach', 'lead generation', 'personalization'],
  },
  {
    slug: 'data-analysis',
    title: 'Best AI Data Analysis Tools',
    h1: 'Best AI Tools for Data Analysis',
    description:
      'Ask questions of your data in plain English. AI data analysis tools that generate charts, find patterns, clean datasets, and automate reporting.',
    categories: ['data-analytics'],
  },
  {
    slug: 'automation',
    title: 'Best AI Automation Tools',
    h1: 'Best AI Workflow Automation & Agent Tools',
    description:
      'Automate repetitive tasks with AI agents and workflow builders. Compare Make, Zapier AI, n8n, and other no-code automation platforms.',
    categories: ['automation-agents'],
  },
  {
    slug: 'chatbots',
    title: 'Best AI Chatbot Builders',
    h1: 'Best AI Chatbot & Conversational AI Tools',
    description:
      'Build AI chatbots for your website, app, or support team. Compare no-code chatbot builders, custom GPT platforms, and enterprise conversational AI.',
    categories: ['customer-support'],
    featureKeywords: ['chatbot', 'conversational AI', 'virtual assistant'],
  },
  {
    slug: 'video-editing',
    title: 'Best AI Video Editing Tools',
    h1: 'Best AI Video Editing & Creation Tools',
    description:
      'AI video editors that cut, caption, generate B-roll, remove silence, and add effects automatically. Compare Descript, Runway, CapCut, and more.',
    categories: ['video-audio'],
    featureKeywords: ['video editing', 'video creation', 'captions'],
    noindex: true,
  },
  {
    slug: 'copywriting',
    niche: 'copywriting',
    title: 'Best AI Copywriting Tools',
    h1: 'Best AI Copywriting & Ad Copy Tools',
    description:
      'Write high-converting ad copy, landing pages, product descriptions, and marketing emails with AI. Compare Jasper, Copy.ai, Writesonic, and more.',
    featureKeywords: ['copywriting', 'ad copy', 'landing page', 'marketing copy'],
  },
  {
    slug: 'social-media-scheduling',
    niche: 'social media scheduling',
    title: 'Best AI Social Media Scheduling Tools',
    h1: 'Best AI Social Media Scheduling & Management Tools',
    description:
      'Schedule, create, and optimize social media content with AI. Compare Buffer, Hootsuite AI, Publer, and other AI-powered scheduling platforms.',
    featureKeywords: ['social media', 'scheduling', 'content calendar', 'auto-post'],
  },
  {
    slug: 'notetaking',
    title: 'Best AI Note-Taking Apps',
    h1: 'Best AI Note-Taking & Knowledge Management Tools',
    description:
      'AI note-taking apps that organize, summarize, search, and connect your ideas. Compare Notion AI, Mem, Reflect, and other smart note tools.',
    categories: ['productivity'],
    featureKeywords: ['note-taking', 'knowledge management', 'second brain'],
  },
  {
    slug: 'spreadsheets',
    niche: 'spreadsheet',
    title: 'Best AI Spreadsheet Tools',
    h1: 'Best AI Tools for Spreadsheets & Excel',
    description:
      'AI-powered spreadsheet tools that write formulas, clean data, generate charts, and automate analysis. Stop staring at cells — let AI handle it.',
    featureKeywords: ['spreadsheet', 'Excel', 'Google Sheets', 'formula'],
  },
  {
    slug: 'logo-design',
    title: 'Best AI Logo Makers',
    h1: 'Best AI Logo Generators & Brand Identity Tools',
    description:
      'Design professional logos in minutes with AI. Compare the top AI logo makers for startups, small businesses, and personal brands.',
    categories: ['design-ui'],
    featureKeywords: ['logo', 'brand', 'branding', 'identity'],
  },
  // ── Phase 9 (2026-06-05) niche pages — populated by `niche` full-text search
  //    (niche-relevant tools), each with a unique, hand-written intro. Coverage
  //    quality-gated (each returns ≥8 relevant tools). See doc 22. ──
  {
    slug: 'insurance',
    title: 'Best AI Tools for Insurance',
    h1: 'Best AI Tools for Insurance in 2026',
    description:
      'AI is reshaping insurance across claims processing, underwriting, fraud detection, and customer service. These are the tools insurers and agencies are actually using — compared on capability, pricing, and real-world signals.',
    niche: 'insurance',
  },
  {
    slug: 'nonprofits',
    title: 'Best AI Tools for Nonprofits',
    h1: 'Best AI Tools for Nonprofits in 2026',
    description:
      'From grant writing and donor outreach to fundraising analytics and volunteer coordination, AI helps lean nonprofit teams do more with less. Here are the best AI tools for nonprofits — with free-tier options highlighted.',
    niche: 'nonprofit',
  },
  {
    slug: 'construction',
    title: 'Best AI Tools for Construction',
    h1: 'Best AI Tools for Construction in 2026',
    description:
      'AI is moving onto the job site — estimating and takeoffs, project scheduling, design and BIM, and safety monitoring. These are the best AI tools for construction firms and contractors, ranked on real-world fit and cost.',
    niche: 'construction',
  },
  {
    slug: 'finance',
    title: 'Best AI Tools for Finance Teams',
    h1: 'Best AI Tools for Finance Teams in 2026',
    description:
      'Beyond bookkeeping: AI for FP&A, forecasting, reporting, spend management, and treasury. These are the best AI tools for finance teams and CFOs — compared on features, integrations, pricing, and user sentiment.',
    niche: 'finance',
  },

  // ── Phase 9 doc 22 — Phase B3 niche expansion (2026-06-06) ──────
  // Each entry is coverage-gated (>=8 relevant tools) and relevance-ranked
  // via the niche filter; the template differentiates per niche (ranked set +
  // quick-answer + FAQ all derive from the niche's own tools).
  {
    slug: 'branding',
    niche: 'branding',
    title: 'Best AI Branding Tools',
    h1: 'Best AI Tools for Branding & Brand Identity',
    description:
      'Build a brand identity with AI — logos, color palettes, brand voice, style guides, and on-brand visuals at scale. The best AI branding tools, compared on output quality, customization, pricing, and user sentiment.',
  },
  {
    slug: 'customer-success',
    niche: 'customer success',
    title: 'Best AI Tools for Customer Success',
    h1: 'Best AI Tools for Customer Success Teams',
    description:
      'AI for customer success — health scoring, churn prediction, renewal forecasting, and automated playbooks. The best AI customer success platforms, compared on signals, integrations, pricing, and real-world signals.',
  },
  {
    slug: 'fitness',
    niche: 'fitness',
    title: 'Best AI Fitness Tools',
    h1: 'Best AI Tools for Fitness & Personal Training',
    description:
      'AI fitness tools that build personalized workout plans, track recovery, coach form, and adapt training to your goals. The best AI tools for fitness and trainers, compared on features, accuracy, pricing, and user sentiment.',
  },
  {
    slug: 'hospitality',
    niche: 'hospitality',
    title: 'Best AI Tools for Hospitality',
    h1: 'Best AI Tools for Hotels & Hospitality',
    description:
      'AI for hotels and hospitality — guest messaging, revenue management, booking automation, and 24/7 concierge. The best AI hospitality tools, compared on guest experience, integrations, pricing, and user sentiment.',
  },
  {
    slug: 'logistics',
    niche: 'logistics',
    title: 'Best AI Tools for Logistics',
    h1: 'Best AI Tools for Logistics & Freight',
    description:
      'AI for logistics — route optimization, freight matching, dispatch, and delivery ETAs. The best AI logistics tools for carriers, brokers, and fleets, compared on optimization, integrations, pricing, and user sentiment.',
  },
  {
    slug: 'manufacturing',
    niche: 'manufacturing',
    title: 'Best AI Tools for Manufacturing',
    h1: 'Best AI Tools for Manufacturing & Factories',
    description:
      'AI for manufacturing — predictive maintenance, quality inspection, machine vision, and production analytics. The best AI manufacturing tools, compared on factory-floor fit, integrations, pricing, and user sentiment.',
  },
  {
    slug: 'retail',
    niche: 'retail',
    title: 'Best AI Tools for Retail',
    h1: 'Best AI Tools for Retail & Merchandising',
    description:
      'AI for retail — demand forecasting, assortment planning, personalization, and inventory optimization. The best AI retail tools for merchandisers and store operators, compared on features, integrations, pricing, and user sentiment.',
  },
  {
    slug: 'supply-chain',
    niche: 'supply chain',
    title: 'Best AI Tools for Supply Chain',
    h1: 'Best AI Tools for Supply Chain Management',
    description:
      'AI for supply chain — demand planning, inventory optimization, supplier risk, and end-to-end visibility. The best AI supply chain tools, compared on planning accuracy, integrations, pricing, and user sentiment.',
  },
  {
    slug: 'travel',
    niche: 'travel',
    title: 'Best AI Travel Tools',
    h1: 'Best AI Tools for Travel Planning',
    description:
      'AI travel tools that plan itineraries, find deals, and handle booking and expenses. The best AI tools for travelers and travel agents, compared on planning quality, coverage, pricing, and real-world signals.',
  },
  {
    slug: 'youtube',
    niche: 'youtube',
    title: 'Best AI Tools for YouTube',
    h1: 'Best AI Tools for YouTube Creators',
    description:
      'AI for YouTube — title and thumbnail generation, scripting, video ideas, and SEO optimization. The best AI tools for YouTubers, compared on output quality, time saved, pricing, and real-world signals.',
  },
  {
    slug: 'wordpress',
    niche: 'wordpress',
    title: 'Best AI Tools for WordPress',
    h1: 'Best AI Tools for WordPress Sites',
    description:
      'AI for WordPress — site building, content generation, SEO, and AI-assisted hosting. The best AI WordPress tools and plugins, compared on ease of setup, output quality, pricing, and real-world signals.',
  },
  {
    slug: 'newsletter',
    niche: 'newsletter',
    title: 'Best AI Newsletter Tools',
    h1: 'Best AI Tools for Newsletters',
    description:
      'AI newsletter tools that draft issues, write subject lines, grow subscribers, and optimize sends. The best AI tools for newsletter creators, compared on writing quality, deliverability, pricing, and user sentiment.',
  },
  {
    slug: 'advertising',
    niche: 'advertising',
    title: 'Best AI Advertising Tools',
    h1: 'Best AI Tools for Advertising & Paid Media',
    description:
      'AI for advertising — ad creative generation, campaign optimization, audience targeting, and budget allocation across channels. The best AI advertising tools, compared on ROAS impact, integrations, pricing, and user sentiment.',
  },
  {
    slug: 'fashion',
    niche: 'fashion',
    title: 'Best AI Tools for Fashion',
    h1: 'Best AI Tools for Fashion & Apparel',
    description:
      'AI for fashion — design generation, trend forecasting, virtual try-on, and product visualization. The best AI fashion tools for designers and brands, compared on output quality, workflow fit, pricing, and user sentiment.',
  },
  {
    slug: 'agriculture',
    niche: 'agriculture',
    title: 'Best AI Tools for Agriculture',
    h1: 'Best AI Tools for Agriculture & Farming',
    description:
      'AI for agriculture — crop monitoring, yield prediction, precision spraying, and farm management. The best AI agriculture tools for growers and agronomists, compared on field results, integrations, pricing, and user sentiment.',
  },
  {
    slug: 'restaurants',
    niche: 'restaurant',
    title: 'Best AI Tools for Restaurants',
    h1: 'Best AI Tools for Restaurants',
    description:
      'AI for restaurants — phone-order taking, reservations, demand forecasting, and back-office automation. The best AI restaurant tools for operators, compared on guest experience, integrations, pricing, and user sentiment.',
  },
  {
    slug: 'interior-design',
    niche: 'interior design',
    title: 'Best AI Interior Design Tools',
    h1: 'Best AI Tools for Interior Design',
    description:
      'AI interior design tools that redesign rooms, render concepts, and stage spaces from a photo. The best AI tools for interior designers and home renovators, compared on realism, control, pricing, and real-world signals.',
  },

  // ── Phase 9 doc 22 — Phase B4 niche expansion (2026-06-06) ──────
  {
    slug: 'compliance',
    niche: 'compliance',
    title: 'Best AI Compliance Tools',
    h1: 'Best AI Tools for Compliance & GRC',
    description:
      'AI for compliance — policy automation, control monitoring, audit evidence, and regulatory change tracking. The best AI compliance and GRC tools, compared on framework coverage, integrations, pricing, and user sentiment.',
  },
  {
    slug: 'no-code',
    niche: 'no-code',
    title: 'Best AI No-Code Tools',
    h1: 'Best AI No-Code & Low-Code Tools',
    description:
      'Build apps, automations, and workflows without writing code. The best AI no-code tools and platforms, compared on what you can ship, learning curve, pricing, and real-world signals.',
  },
  {
    slug: 'knowledge-base',
    niche: 'knowledge base',
    title: 'Best AI Knowledge Base Tools',
    h1: 'Best AI Knowledge Base & Documentation Tools',
    description:
      'AI knowledge base tools that write, organize, and surface documentation and support answers. The best AI knowledge base software, compared on search quality, integrations, pricing, and real-world signals.',
  },
  {
    slug: 'market-research',
    niche: 'market research',
    title: 'Best AI Market Research Tools',
    h1: 'Best AI Tools for Market Research',
    description:
      'AI market research tools for surveys, social listening, competitor analysis, and synthesizing insights. The best AI market research software, compared on data sources, depth, pricing, and real-world signals.',
  },
  {
    slug: 'prompt-engineering',
    niche: 'prompt engineering',
    title: 'Best AI Prompt Engineering Tools',
    h1: 'Best AI Prompt Engineering Tools',
    description:
      'Tools to write, test, version, and optimize prompts across models. The best AI prompt engineering tools for builders, compared on testing workflow, model coverage, pricing, and real-world signals.',
  },
  {
    slug: 'contract-management',
    niche: 'contract',
    title: 'Best AI Contract Tools',
    h1: 'Best AI Tools for Contract Review & Management',
    description:
      'AI contract tools that review, redline, extract clauses, and manage the contract lifecycle. The best AI contract management software, compared on accuracy, integrations, pricing, and real-world signals.',
  },
  {
    slug: '3d-modeling',
    niche: '3d modeling',
    title: 'Best AI 3D Modeling Tools',
    h1: 'Best AI Tools for 3D Modeling',
    description:
      'AI 3D modeling tools that generate meshes, textures, and assets from text or images. The best AI tools for 3D modeling and game/asset creators, compared on output quality, control, pricing, and user sentiment.',
  },
  {
    slug: 'property-management',
    niche: 'property management',
    title: 'Best AI Property Management Tools',
    h1: 'Best AI Tools for Property Management',
    description:
      'AI for property management — tenant screening, leasing automation, maintenance triage, and rent collection. The best AI property management software, compared on features, integrations, pricing, and user sentiment.',
  },
  {
    slug: 'procurement',
    niche: 'procurement',
    title: 'Best AI Procurement Tools',
    h1: 'Best AI Tools for Procurement & Sourcing',
    description:
      'AI for procurement — spend analysis, supplier sourcing, contract intake, and approvals. The best AI procurement software, compared on savings impact, integrations, pricing, and real-world signals.',
  },
  {
    slug: 'graphic-design',
    niche: 'graphic design',
    title: 'Best AI Graphic Design Tools',
    h1: 'Best AI Tools for Graphic Design',
    description:
      'AI graphic design tools that generate visuals, edit images, and produce on-brand assets fast. The best AI graphic design software, compared on output quality, ease of use, pricing, and real-world signals.',
  },
  {
    slug: 'data-scientists',
    niche: 'data scientist',
    title: 'Best AI Tools for Data Scientists',
    h1: 'Best AI Tools for Data Scientists',
    description:
      'AI tools for data scientists — model building, evaluation, monitoring, and MLOps. The best AI tools for data science teams, compared on workflow fit, integrations, pricing, and real-world signals.',
  },
  {
    slug: 'photography',
    niche: 'photography',
    title: 'Best AI Photography Tools',
    h1: 'Best AI Tools for Photography & Photo Editing',
    description:
      'AI photography tools that retouch, upscale, remove backgrounds, and enhance images automatically. The best AI tools for photographers, compared on output quality, batch workflow, pricing, and user sentiment.',
  },
  {
    slug: 'automotive',
    niche: 'automotive',
    title: 'Best AI Tools for Automotive',
    h1: 'Best AI Tools for Automotive',
    description:
      'AI for automotive — autonomous systems, dealership sales and service, and inventory intelligence. The best AI automotive tools for OEMs and dealers, compared on capability, integrations, pricing, and user sentiment.',
  },
  {
    slug: 'call-center',
    niche: 'call center',
    title: 'Best AI Call Center Tools',
    h1: 'Best AI Tools for Call Centers',
    description:
      'AI for call centers — voice agents, real-time agent assist, call summaries, and QA. The best AI call center software, compared on call handling, integrations, pricing, and real-world signals.',
  },
  {
    slug: 'real-estate-investing',
    niche: 'real estate investor',
    title: 'Best AI Tools for Real Estate Investors',
    h1: 'Best AI Tools for Real Estate Investing',
    description:
      'AI tools for real estate investors — deal sourcing, property valuation, market analytics, and underwriting. The best AI real estate investing tools, compared on data quality, accuracy, pricing, and user sentiment.',
  },
  {
    slug: 'veterinary',
    niche: 'veterinary',
    title: 'Best AI Tools for Veterinary',
    h1: 'Best AI Tools for Veterinary Practices',
    description:
      'AI for veterinary practices — clinical note generation, triage, and client communication. The best AI veterinary tools for vets and clinics, compared on time saved, accuracy, pricing, and real-world signals.',
  },
  {
    slug: 'product-design',
    niche: 'product design',
    title: 'Best AI Product Design Tools',
    h1: 'Best AI Tools for Product Design',
    description:
      'AI product design tools for UI generation, prototyping, design systems, and 3D concepts. The best AI tools for product and UX designers, compared on output quality, workflow fit, pricing, and user sentiment.',
  },
]

export function getBestPageBySlug(slug: string): BestPageConfig | undefined {
  return BEST_PAGES.find((p) => p.slug === slug)
}
