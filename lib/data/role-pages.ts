/**
 * Static config for "Best AI Tools for [Role]" landing pages.
 * Each entry targets a profession/persona and curates tools across
 * multiple categories relevant to that role.
 *
 * Route: /for/[slug]
 */

export type RolePageConfig = {
  slug: string
  title: string
  h1: string
  description: string
  /** Intro paragraph shown below the hero */
  intro: string
  /** Category slugs to pull tools from (OR — tools in ANY of these categories) */
  categories: string[]
  /** Optional feature keywords for additional filtering */
  featureKeywords?: string[]
  /** Recommended stack page slug if one exists */
  stackSlug?: string
}

export const ROLE_PAGES: RolePageConfig[] = [
  {
    slug: 'content-creators',
    title: 'Best AI Tools for Content Creators',
    h1: 'AI Tools for Content Creators',
    description:
      'The complete AI toolkit for content creators — writing, video, thumbnails, SEO, scheduling, and repurposing. Build faster, publish more, grow your audience.',
    intro:
      'Content creation in 2026 means producing across multiple platforms simultaneously. These AI tools help you write faster, create visuals, edit video, optimize for search, and repurpose one piece of content into ten — without hiring a team.',
    categories: ['writing-content', 'design-creative', 'voice-audio', 'seo-marketing'],
    featureKeywords: ['content creation', 'writing', 'video', 'social media'],
    stackSlug: 'youtube-channel',
  },
  {
    slug: 'developers',
    title: 'Best AI Tools for Developers',
    h1: 'AI Tools for Software Developers',
    description:
      'AI coding assistants, debugging tools, DevOps automation, and code review — the essential AI toolkit for modern developers.',
    intro:
      'From code completion to full-app generation, AI is reshaping how developers work. These tools cover the entire development workflow: writing code, reviewing PRs, debugging, deploying, and monitoring — so you can ship faster with fewer bugs.',
    categories: ['developer-code'],
    featureKeywords: ['code generation', 'debugging', 'code review', 'devops'],
    stackSlug: 'saas-mvp',
  },
  {
    slug: 'marketers',
    title: 'Best AI Tools for Marketers',
    h1: 'AI Tools for Digital Marketers',
    description:
      'AI-powered marketing tools for SEO, email campaigns, social media, ad copy, analytics, and content strategy. Work smarter, not harder.',
    intro:
      'Marketing teams are expected to do more with less. These AI tools handle the heavy lifting — from keyword research and ad copy to social scheduling and campaign analytics — so you can focus on strategy instead of execution.',
    categories: ['seo-marketing', 'writing-content'],
    featureKeywords: ['marketing', 'seo', 'email', 'social media', 'ads', 'analytics'],
    stackSlug: 'marketing-agency',
  },
  {
    slug: 'designers',
    title: 'Best AI Tools for Designers',
    h1: 'AI Tools for UI/UX & Graphic Designers',
    description:
      'AI design tools for UI/UX, graphic design, prototyping, image generation, and brand assets. Create stunning visuals in a fraction of the time.',
    intro:
      'AI is not replacing designers — it is amplifying them. Generate mockups in seconds, create brand-consistent assets, prototype interactive layouts, and iterate on designs faster than ever. These tools let you focus on the creative decisions that matter.',
    categories: ['design-creative'],
    featureKeywords: ['design', 'image generation', 'prototyping', 'ui', 'ux'],
  },
  {
    slug: 'freelancers',
    title: 'Best AI Tools for Freelancers',
    h1: 'AI Tools for Freelancers',
    description:
      'The AI toolkit that turns one freelancer into a full agency — writing, invoicing, project management, client communication, and automation.',
    intro:
      'As a freelancer, you are the entire team. These AI tools help you handle client work, manage projects, write proposals, track time, and automate the repetitive tasks that eat into your billable hours.',
    categories: ['productivity-automation', 'writing-content'],
    featureKeywords: ['freelance', 'automation', 'writing', 'project management', 'invoicing'],
    stackSlug: 'freelance-business',
  },
  {
    slug: 'startup-founders',
    title: 'Best AI Tools for Startup Founders',
    h1: 'AI Tools for Startup Founders',
    description:
      'Launch faster with AI — from MVP development to pitch decks, customer research, marketing automation, and fundraising prep.',
    intro:
      'Startups need speed and leverage. These AI tools help founders build MVPs without a full dev team, create pitch decks, automate outreach, handle customer support, and make data-driven decisions — all before Series A.',
    categories: ['developer-code', 'productivity-automation', 'seo-marketing'],
    featureKeywords: ['startup', 'mvp', 'pitch deck', 'automation', 'analytics'],
    stackSlug: 'saas-mvp',
  },
  {
    slug: 'educators',
    title: 'Best AI Tools for Educators & Teachers',
    h1: 'AI Tools for Educators',
    description:
      'AI tools for lesson planning, grading, student engagement, content creation, and personalized learning. Teach smarter in 2026.',
    intro:
      'From generating lesson plans and quizzes to providing personalized feedback and creating interactive learning materials, these AI tools help educators save hours of prep time and focus on what matters most — their students.',
    categories: ['writing-content', 'research-knowledge'],
    featureKeywords: ['education', 'teaching', 'lesson plan', 'grading', 'quiz', 'learning'],
  },
  {
    slug: 'sales-teams',
    title: 'Best AI Tools for Sales Teams',
    h1: 'AI Tools for Sales Teams',
    description:
      'Close more deals with AI — prospecting, lead scoring, email sequences, call analysis, CRM automation, and pipeline intelligence.',
    intro:
      'Modern sales teams use AI at every stage of the funnel. These tools help you find the right prospects, write personalized outreach, analyze sales calls, forecast pipeline, and automate the CRM busywork that kills selling time.',
    categories: ['seo-marketing', 'customer-support'],
    featureKeywords: ['sales', 'crm', 'lead generation', 'outreach', 'prospecting', 'email'],
  },
  {
    slug: 'product-managers',
    title: 'Best AI Tools for Product Managers',
    h1: 'AI Tools for Product Managers',
    description:
      'AI-powered tools for roadmap planning, user research, feature prioritization, analytics, and stakeholder communication.',
    intro:
      'Product managers juggle roadmaps, user feedback, stakeholder alignment, and data analysis. These AI tools help you synthesize user research, write better specs, prioritize features with data, and communicate decisions clearly.',
    categories: ['productivity-automation', 'research-knowledge'],
    featureKeywords: ['product management', 'roadmap', 'user research', 'analytics', 'specs'],
  },
  {
    slug: 'writers',
    title: 'Best AI Tools for Writers & Authors',
    h1: 'AI Tools for Writers & Authors',
    description:
      'AI writing assistants, grammar checkers, story generators, and publishing tools for fiction and non-fiction writers.',
    intro:
      'Whether you are writing a novel, blog posts, or technical documentation, these AI tools help you overcome writer\'s block, improve your prose, research topics, and format your work for publication.',
    categories: ['writing-content'],
    featureKeywords: ['writing', 'grammar', 'story', 'blog', 'editing', 'publishing'],
  },
  {
    slug: 'agencies',
    title: 'Best AI Tools for Digital Agencies',
    h1: 'AI Tools for Digital Agencies',
    description:
      'Scale your agency with AI — client deliverables, project management, creative production, reporting, and white-label solutions.',
    intro:
      'Agencies need to deliver more for clients while maintaining margins. These AI tools help you produce content at scale, automate reporting, generate creative assets, manage multi-client workflows, and deliver results faster.',
    categories: ['writing-content', 'design-creative', 'seo-marketing', 'productivity-automation'],
    featureKeywords: ['agency', 'client', 'white-label', 'reporting', 'project management'],
    stackSlug: 'marketing-agency',
  },
  {
    slug: 'data-scientists',
    title: 'Best AI Tools for Data Scientists',
    h1: 'AI Tools for Data Scientists',
    description:
      'AI-powered tools for data analysis, visualization, model building, notebook workflows, and experiment tracking.',
    intro:
      'Data science workflows are being supercharged by AI. From automated EDA and feature engineering to model monitoring and report generation, these tools help data scientists spend less time on boilerplate and more on insights.',
    categories: ['data-analytics', 'research-knowledge'],
    featureKeywords: ['data science', 'machine learning', 'analytics', 'visualization', 'notebook'],
  },
  {
    slug: 'ecommerce-owners',
    title: 'Best AI Tools for E-commerce',
    h1: 'AI Tools for E-commerce Store Owners',
    description:
      'AI tools for product descriptions, inventory management, customer support, pricing optimization, and marketing automation for online stores.',
    intro:
      'Running an online store means managing products, marketing, customer support, and logistics simultaneously. These AI tools automate product descriptions, optimize pricing, personalize shopping experiences, and handle customer queries — so you can focus on growth.',
    categories: ['seo-marketing', 'customer-support', 'writing-content'],
    featureKeywords: ['ecommerce', 'product description', 'inventory', 'pricing', 'shopify'],
  },
  {
    slug: 'lawyers',
    title: 'Best AI Tools for Lawyers',
    h1: 'AI Tools for Legal Professionals',
    description:
      'AI legal tools for contract review, legal research, document drafting, case analysis, and compliance. Save hours of billable time.',
    intro:
      'Legal professionals are adopting AI for contract analysis, precedent research, document drafting, and due diligence. These tools reduce hours of manual review to minutes while maintaining the accuracy the profession demands.',
    categories: ['research-knowledge'],
    featureKeywords: ['legal', 'contract', 'law', 'compliance', 'document review'],
  },
  {
    slug: 'hr-professionals',
    title: 'Best AI Tools for HR & Recruiting',
    h1: 'AI Tools for HR & Recruiting',
    description:
      'AI-powered hiring tools — resume screening, candidate sourcing, interview scheduling, onboarding automation, and employee engagement.',
    intro:
      'HR teams handle recruiting, onboarding, engagement, and compliance across a growing workforce. These AI tools automate resume screening, source candidates, schedule interviews, generate offer letters, and analyze employee sentiment.',
    categories: ['productivity-automation'],
    featureKeywords: ['hr', 'recruiting', 'hiring', 'resume', 'onboarding', 'employee'],
  },
  {
    slug: 'researchers',
    title: 'Best AI Tools for Academic Researchers',
    h1: 'AI Tools for Researchers & Academics',
    description:
      'AI research tools for literature review, paper writing, citation management, data analysis, and experiment design.',
    intro:
      'Research is being transformed by AI — from finding relevant papers across millions of publications to analyzing datasets, generating visualizations, and drafting manuscripts. These tools help researchers focus on breakthrough thinking instead of tedious processes.',
    categories: ['research-knowledge', 'writing-content'],
    featureKeywords: ['research', 'academic', 'paper', 'literature review', 'citation'],
  },
  {
    slug: 'real-estate-agents',
    title: 'Best AI Tools for Real Estate Agents',
    h1: 'AI Tools for Real Estate Professionals',
    description:
      'AI tools for property listings, lead generation, virtual staging, market analysis, and client communication in real estate.',
    intro:
      'Real estate professionals need to move fast — from creating compelling listings and staging photos virtually to qualifying leads and analyzing market trends. These AI tools help agents close more deals with less manual work.',
    categories: ['writing-content', 'seo-marketing'],
    featureKeywords: ['real estate', 'property', 'listing', 'staging', 'lead generation'],
  },
  {
    slug: 'podcasters',
    title: 'Best AI Tools for Podcasters',
    h1: 'AI Tools for Podcasters',
    description:
      'AI podcast tools for editing, transcription, show notes, clip generation, distribution, and audience growth.',
    intro:
      'Podcasting involves recording, editing, transcribing, writing show notes, creating clips for social media, and distributing across platforms. These AI tools automate the post-production workflow so you can focus on great conversations.',
    categories: ['voice-audio', 'writing-content'],
    featureKeywords: ['podcast', 'audio', 'transcription', 'editing', 'show notes'],
    stackSlug: 'podcast',
  },
  {
    slug: 'small-business',
    title: 'Best AI Tools for Small Businesses',
    h1: 'AI Tools for Small Business Owners',
    description:
      'Affordable AI tools for small businesses — customer support, marketing, bookkeeping, scheduling, and operations automation.',
    intro:
      'Small business owners wear every hat. These AI tools are affordable, easy to set up, and handle the tasks that take time away from growing your business — from answering customer emails to managing social media and tracking expenses.',
    categories: ['productivity-automation', 'customer-support', 'seo-marketing'],
    featureKeywords: ['small business', 'affordable', 'automation', 'scheduling', 'bookkeeping'],
  },
  {
    slug: 'video-creators',
    title: 'Best AI Tools for Video Creators',
    h1: 'AI Tools for Video Creators & YouTubers',
    description:
      'AI video tools for editing, scripting, thumbnails, subtitles, B-roll generation, and YouTube optimization.',
    intro:
      'Video creation is a multi-step process — scripting, filming, editing, thumbnails, captions, and SEO. These AI tools handle the time-consuming parts so you can publish more consistently and grow your channel faster.',
    categories: ['voice-audio', 'design-creative'],
    featureKeywords: ['video', 'youtube', 'editing', 'thumbnail', 'subtitle', 'script'],
    stackSlug: 'youtube-channel',
  },
]

export function getRolePageBySlug(slug: string): RolePageConfig | undefined {
  return ROLE_PAGES.find((p) => p.slug === slug)
}
