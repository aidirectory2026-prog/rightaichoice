/**
 * Master category list for the AI Directory.
 * These are upserted during seeding and used by all pages.
 */
export interface SeedCategory {
  name: string
  slug: string
  description: string
  icon: string
  sort_order: number
}

export const CATEGORIES: SeedCategory[] = [
  { name: 'Writing & Content', slug: 'writing-content', description: 'AI writing assistants, content generators, copywriting, and text editing tools.', icon: 'PenLine', sort_order: 1 },
  { name: 'Image Generation', slug: 'image-generation', description: 'Text-to-image generators, AI art tools, and visual content creation.', icon: 'ImagePlus', sort_order: 2 },
  { name: 'Video & Animation', slug: 'video-animation', description: 'AI video generation, editing, animation, and visual effects tools.', icon: 'Video', sort_order: 3 },
  { name: 'Voice & Audio', slug: 'voice-audio', description: 'Text-to-speech, voice cloning, audio editing, and speech tools.', icon: 'Mic', sort_order: 4 },
  { name: 'Music Creation', slug: 'music-creation', description: 'AI music generators, beat makers, and soundtrack creation tools.', icon: 'Music', sort_order: 5 },
  { name: 'Code & Development', slug: 'code-development', description: 'AI coding assistants, code generation, debugging, and developer tools.', icon: 'Code', sort_order: 6 },
  { name: 'Design & UI', slug: 'design-ui', description: 'AI design tools, UI generators, logo makers, and creative platforms.', icon: 'Palette', sort_order: 7 },
  { name: 'Photo Editing', slug: 'photo-editing', description: 'AI photo editors, background removers, image enhancers, and retouching tools.', icon: 'Camera', sort_order: 8 },
  { name: 'SEO & Marketing', slug: 'seo-marketing', description: 'AI-powered SEO, content marketing, keyword research, and optimization tools.', icon: 'TrendingUp', sort_order: 9 },
  { name: 'Social Media', slug: 'social-media', description: 'AI social media management, content creation, scheduling, and analytics.', icon: 'Share2', sort_order: 10 },
  { name: 'Email Marketing', slug: 'email-marketing', description: 'AI email campaign tools, newsletter generators, and outreach automation.', icon: 'Mail', sort_order: 11 },
  { name: 'Productivity', slug: 'productivity', description: 'AI productivity tools, task management, note-taking, and workflow automation.', icon: 'Zap', sort_order: 12 },
  { name: 'Automation & Agents', slug: 'automation-agents', description: 'AI workflow automation, agents, no-code builders, and integration platforms.', icon: 'Bot', sort_order: 13 },
  { name: 'Customer Support', slug: 'customer-support', description: 'AI chatbots, helpdesk tools, ticketing systems, and support automation.', icon: 'Headphones', sort_order: 14 },
  { name: 'Sales & CRM', slug: 'sales-crm', description: 'AI sales tools, CRM assistants, lead generation, and deal intelligence.', icon: 'Target', sort_order: 15 },
  { name: 'Data & Analytics', slug: 'data-analytics', description: 'AI data analysis, business intelligence, visualization, and insights tools.', icon: 'BarChart3', sort_order: 16 },
  { name: 'Research & Education', slug: 'research-education', description: 'AI research assistants, learning tools, study aids, and academic platforms.', icon: 'GraduationCap', sort_order: 17 },
  { name: 'Business & Finance', slug: 'business-finance', description: 'AI tools for accounting, financial analysis, invoicing, and business ops.', icon: 'Briefcase', sort_order: 18 },
  { name: 'HR & Recruiting', slug: 'hr-recruiting', description: 'AI hiring tools, resume screening, interview scheduling, and talent management.', icon: 'Users', sort_order: 19 },
  { name: 'Healthcare', slug: 'healthcare', description: 'AI medical tools, clinical assistants, diagnostic aids, and health tech.', icon: 'Heart', sort_order: 20 },
  { name: 'Legal', slug: 'legal', description: 'AI legal tools, contract review, legal research, and compliance platforms.', icon: 'Scale', sort_order: 21 },
  { name: 'Cybersecurity', slug: 'cybersecurity', description: 'AI security tools, threat detection, vulnerability scanning, and privacy.', icon: 'Shield', sort_order: 22 },
  { name: 'Translation', slug: 'translation', description: 'AI translation, localization, and multilingual communication tools.', icon: 'Languages', sort_order: 23 },
  { name: 'Presentations', slug: 'presentations', description: 'AI presentation makers, slide generators, and pitch deck tools.', icon: 'Presentation', sort_order: 24 },
  { name: 'Chatbots & Assistants', slug: 'chatbots-assistants', description: 'AI chatbot builders, virtual assistants, and conversational AI platforms.', icon: 'MessageSquare', sort_order: 25 },
  { name: 'Project Management', slug: 'project-management', description: 'AI project management, planning, and team collaboration tools.', icon: 'ClipboardList', sort_order: 26 },
  { name: 'Ecommerce', slug: 'ecommerce', description: 'AI tools for online stores, product descriptions, pricing, and conversion.', icon: 'ShoppingCart', sort_order: 27 },
  { name: 'Real Estate', slug: 'real-estate', description: 'AI tools for real estate agents, property listings, and virtual tours.', icon: 'Home', sort_order: 28 },
  { name: 'Spreadsheets & Data', slug: 'spreadsheets-data', description: 'AI spreadsheet tools, formula generators, and data cleaning utilities.', icon: 'Table', sort_order: 29 },
  { name: '3D & Game Dev', slug: '3d-game-dev', description: 'AI 3D modeling, game asset generation, and game development tools.', icon: 'Box', sort_order: 30 },
  { name: 'Transcription', slug: 'transcription', description: 'AI speech-to-text, meeting transcription, and captioning tools.', icon: 'FileText', sort_order: 31 },
  { name: 'Search & Knowledge', slug: 'search-knowledge', description: 'AI search engines, knowledge bases, and information retrieval tools.', icon: 'Search', sort_order: 32 },
  { name: 'No-Code & Low-Code', slug: 'no-code', description: 'AI-powered app builders, website creators, and no-code development platforms.', icon: 'Blocks', sort_order: 33 },
  { name: 'Personal Finance', slug: 'personal-finance', description: 'AI budgeting, investing, tax preparation, and personal finance tools.', icon: 'Wallet', sort_order: 34 },
  { name: 'Architecture & Interior', slug: 'architecture-interior', description: 'AI tools for architects, interior designers, and space planning.', icon: 'Building', sort_order: 35 },
]
