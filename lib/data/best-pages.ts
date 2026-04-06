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
  /** Feature keywords to match (OR logic) */
  featureKeywords?: string[]
  /** Skill level filter */
  skillLevel?: 'beginner' | 'intermediate' | 'advanced'
}

export const BEST_PAGES: BestPageConfig[] = [
  {
    slug: 'writing',
    title: 'Best AI Writing Tools',
    h1: 'Best AI Tools for Writing',
    description:
      'Discover the top AI writing assistants for content creation, copywriting, long-form articles, and more. Compare features, pricing, and real user reviews.',
    categories: ['writing-content'],
  },
  {
    slug: 'coding',
    title: 'Best AI Coding Assistants',
    h1: 'Best AI Tools for Coding & Development',
    description:
      'Find the best AI coding assistants, code completion tools, and developer productivity tools. From GitHub Copilot to Cursor — compare the top options.',
    categories: ['developer-code'],
  },
  {
    slug: 'image-generation',
    title: 'Best AI Image Generators',
    h1: 'Best AI Image Generation Tools',
    description:
      'Compare the top AI image generators including Midjourney, DALL-E 3, Stable Diffusion, and more. Find the right tool for your creative workflow.',
    categories: ['design-creative'],
    featureKeywords: ['image generation', 'text-to-image'],
  },
  {
    slug: 'video',
    title: 'Best AI Video Tools',
    h1: 'Best AI Video Creation & Editing Tools',
    description:
      'The top AI video tools for creators — from text-to-video generators like Sora and Pika to editing assistants and avatar platforms like HeyGen and Synthesia.',
    categories: ['voice-audio'],
    featureKeywords: ['video generation', 'text-to-video', 'video editing'],
  },
  {
    slug: 'seo',
    title: 'Best AI SEO Tools',
    h1: 'Best AI Tools for SEO & Content Marketing',
    description:
      'Top AI-powered SEO tools to rank higher in search. Compare Surfer SEO, Semrush AI, Frase, and other tools for keyword research, content optimization, and competitor analysis.',
    categories: ['seo-marketing'],
  },
  {
    slug: 'productivity',
    title: 'Best AI Productivity Tools',
    h1: 'Best AI Tools for Productivity',
    description:
      'Boost your output with the best AI productivity tools — meeting assistants, task managers, note-takers, email writers, and workflow automation platforms.',
    categories: ['productivity-automation'],
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
    categories: ['design-creative'],
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
    title: 'Best AI Tools for Startups',
    h1: 'Best AI Tools for Startups & Entrepreneurs',
    description:
      'Essential AI tools for startup founders — from building your product and marketing your brand to automating operations and finding customers.',
    skillLevel: 'beginner',
  },
  {
    slug: 'social-media',
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
      'Discover the best free AI tools available in 2025 — with generous free tiers, no credit card required. Covers writing, image generation, coding, productivity, and more.',
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
    title: 'Best AI Email Marketing Tools',
    h1: 'Best AI Tools for Email Marketing',
    description:
      'Top AI email marketing tools for automated campaigns, personalized copy, subject line optimization, and deliverability. Compare features, pricing, and user reviews.',
    categories: ['marketing-seo'],
    featureKeywords: ['email', 'email marketing', 'newsletter'],
  },
  {
    slug: 'sales',
    title: 'Best AI Sales Tools',
    h1: 'Best AI Tools for Sales Teams',
    description:
      'AI sales tools that help you prospect, write outreach, book meetings, and close deals faster. From lead scoring to conversation intelligence.',
    categories: ['business-finance'],
    featureKeywords: ['sales', 'CRM', 'lead generation', 'outreach'],
  },
  {
    slug: 'students',
    title: 'Best AI Tools for Students',
    h1: 'Best AI Tools for Students in 2026',
    description:
      'The best AI tools every student needs — for research, writing essays, studying, note-taking, and exam prep. All budget-friendly or free.',
    categories: ['research-education'],
    skillLevel: 'beginner',
  },
  {
    slug: 'resume',
    title: 'Best AI Resume Builders',
    h1: 'Best AI Resume & CV Builders',
    description:
      'Create professional resumes in minutes with AI. Compare the top AI resume builders for formatting, ATS optimization, cover letters, and LinkedIn profiles.',
    featureKeywords: ['resume', 'CV', 'career', 'job search'],
  },
  {
    slug: 'transcription',
    title: 'Best AI Transcription Tools',
    h1: 'Best AI Transcription & Speech-to-Text Tools',
    description:
      'Accurate, fast AI transcription tools for meetings, interviews, podcasts, and videos. Compare Otter, Whisper, Descript, and more.',
    categories: ['voice-speech'],
    featureKeywords: ['transcription', 'speech-to-text', 'captions'],
  },
  {
    slug: 'ecommerce',
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
    title: 'Best AI Presentation Tools',
    h1: 'Best AI Presentation & Slide Deck Tools',
    description:
      'Create stunning presentations in minutes with AI. Compare Gamma, Beautiful.ai, Tome, and other tools that generate professional slides from text.',
    featureKeywords: ['presentation', 'slides', 'pitch deck', 'slideshow'],
  },
  {
    slug: 'translation',
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
    title: 'Best AI Tools for Lawyers',
    h1: 'Best AI Tools for Legal Professionals',
    description:
      'AI tools designed for law firms and legal teams — contract review, legal research, document drafting, compliance checking, and case management.',
    featureKeywords: ['legal', 'contract', 'law', 'compliance'],
  },
  {
    slug: 'real-estate',
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
  },
  {
    slug: 'accounting',
    title: 'Best AI Accounting Tools',
    h1: 'Best AI Tools for Accounting & Bookkeeping',
    description:
      'AI accounting tools that automate bookkeeping, categorize expenses, generate financial reports, and simplify tax preparation.',
    categories: ['business-finance'],
    featureKeywords: ['accounting', 'bookkeeping', 'finance', 'tax'],
  },
  {
    slug: 'hr-recruiting',
    title: 'Best AI HR & Recruiting Tools',
    h1: 'Best AI Tools for HR & Recruiting',
    description:
      'AI tools for hiring teams — automated resume screening, candidate sourcing, interview scheduling, employee onboarding, and performance management.',
    categories: ['business-finance'],
    featureKeywords: ['HR', 'recruiting', 'hiring', 'talent'],
  },
  {
    slug: 'healthcare-ai',
    title: 'Best AI Tools for Healthcare',
    h1: 'Best AI Tools for Healthcare Professionals',
    description:
      'AI tools for medical professionals — clinical note generation, diagnostic assistance, patient communication, medical imaging analysis, and research.',
    categories: ['healthcare'],
  },
  {
    slug: 'education',
    title: 'Best AI Tools for Teachers',
    h1: 'Best AI Tools for Educators & Teachers',
    description:
      'AI tools that help teachers create lesson plans, generate quizzes, personalize learning, grade assignments, and save hours of prep time every week.',
    categories: ['research-education'],
    featureKeywords: ['education', 'teaching', 'lesson plan', 'quiz'],
  },
  {
    slug: 'cybersecurity',
    title: 'Best AI Cybersecurity Tools',
    h1: 'Best AI Tools for Cybersecurity',
    description:
      'AI-powered cybersecurity tools for threat detection, vulnerability scanning, incident response, and security operations. Compare top solutions.',
    categories: ['security-privacy'],
  },
  {
    slug: 'game-dev',
    title: 'Best AI Tools for Game Development',
    h1: 'Best AI Tools for Game Developers',
    description:
      'AI tools for indie and professional game developers — generate 2D/3D assets, write dialogue, design levels, create music, and test gameplay.',
    categories: ['code-development'],
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
    title: 'Best AI Tools for Freelancers',
    h1: 'Best AI Tools for Freelancers',
    description:
      'The essential AI toolkit for freelancers — automate proposals, write faster, manage clients, send invoices, and deliver better work in less time.',
    featureKeywords: ['freelance', 'proposal', 'invoice', 'client'],
  },
  {
    slug: 'solopreneurs',
    title: 'Best AI Tools for Solopreneurs',
    h1: 'Best AI Tools for Solo Founders & Solopreneurs',
    description:
      'Run your entire business with AI. The best tools for solopreneurs who need to handle marketing, sales, support, operations, and product — alone.',
  },
  {
    slug: 'agencies',
    title: 'Best AI Tools for Agencies',
    h1: 'Best AI Tools for Marketing & Creative Agencies',
    description:
      'AI tools that help agencies scale — from client reporting and content generation to campaign optimization and white-label solutions.',
    categories: ['marketing-seo'],
    featureKeywords: ['agency', 'white-label', 'client reporting'],
  },
  {
    slug: 'content-repurposing',
    title: 'Best AI Content Repurposing Tools',
    h1: 'Best AI Tools for Content Repurposing',
    description:
      'Turn one piece of content into 10. AI tools that transform blog posts into videos, podcasts into articles, threads into carousels, and more.',
    featureKeywords: ['repurpose', 'content', 'clip', 'carousel'],
  },
  {
    slug: 'cold-outreach',
    title: 'Best AI Cold Outreach Tools',
    h1: 'Best AI Tools for Cold Email & Outreach',
    description:
      'AI-powered cold outreach tools for personalized emails at scale — find leads, write copy, automate sequences, and track responses.',
    categories: ['marketing-seo'],
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
  },
  {
    slug: 'copywriting',
    title: 'Best AI Copywriting Tools',
    h1: 'Best AI Copywriting & Ad Copy Tools',
    description:
      'Write high-converting ad copy, landing pages, product descriptions, and marketing emails with AI. Compare Jasper, Copy.ai, Writesonic, and more.',
    categories: ['writing-content'],
    featureKeywords: ['copywriting', 'ad copy', 'landing page', 'marketing copy'],
  },
  {
    slug: 'social-media-scheduling',
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
    title: 'Best AI Spreadsheet Tools',
    h1: 'Best AI Tools for Spreadsheets & Excel',
    description:
      'AI-powered spreadsheet tools that write formulas, clean data, generate charts, and automate analysis. Stop staring at cells — let AI handle it.',
    categories: ['data-analytics'],
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
]

export function getBestPageBySlug(slug: string): BestPageConfig | undefined {
  return BEST_PAGES.find((p) => p.slug === slug)
}
