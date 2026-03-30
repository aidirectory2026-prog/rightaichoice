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
]

export function getBestPageBySlug(slug: string): BestPageConfig | undefined {
  return BEST_PAGES.find((p) => p.slug === slug)
}
