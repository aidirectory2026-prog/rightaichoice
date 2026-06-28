// Phase 13 D2.1 — curated directories to submit RightAIChoice to.
//
// Selected for two payoffs at once: (1) authority — dofollow links from
// high-DA sites, the #1 lever for breaking off page 4; (2) GEO consensus —
// these are the exact sources LLMs read to decide which brands to cite
// (G2, Capterra, Product Hunt, Crunchbase, the big AI directories). All are
// FREE to list on (founder chose free/organic). Tier 1 = do first.
//
// Pattern mirrors lib/data/best-pages.ts: a static array + a getter.

export type DirectoryTarget = {
  key: string
  name: string
  url: string
  submitUrl?: string
  authorityTier: 1 | 2 | 3
  daEstimate?: number
  pricing: 'free' | 'freemium'
  dofollow?: boolean
  category: 'ai-directory' | 'saas-review' | 'launch' | 'entity' | 'general'
  notes?: string
}

export const DIRECTORY_TARGETS: DirectoryTarget[] = [
  // — Tier 1: highest authority / strongest GEO-consensus signal —
  { key: 'producthunt', name: 'Product Hunt', url: 'https://www.producthunt.com', submitUrl: 'https://www.producthunt.com/posts/new', authorityTier: 1, daEstimate: 91, pricing: 'free', dofollow: true, category: 'launch', notes: 'Plan a launch day; drives traffic + a high-DA profile LLMs read.' },
  { key: 'g2', name: 'G2', url: 'https://www.g2.com', submitUrl: 'https://www.g2.com/products/new', authorityTier: 1, daEstimate: 92, pricing: 'free', dofollow: false, category: 'saas-review', notes: 'Claim a product profile; G2 is a top AI-citation source. Seed first reviews.' },
  { key: 'capterra', name: 'Capterra', url: 'https://www.capterra.com', submitUrl: 'https://www.capterra.com/vendors/sign-up', authorityTier: 1, daEstimate: 91, pricing: 'free', dofollow: false, category: 'saas-review', notes: 'Gartner network (Capterra/GetApp/SoftwareAdvice) — one submission, broad reach.' },
  { key: 'crunchbase', name: 'Crunchbase', url: 'https://www.crunchbase.com', submitUrl: 'https://www.crunchbase.com/add-new', authorityTier: 1, daEstimate: 91, pricing: 'free', dofollow: false, category: 'entity', notes: 'Company entity record — strengthens our knowledge-graph identity for GEO.' },
  { key: 'theresanaiforthat', name: "There's An AI For That", url: 'https://theresanaiforthat.com', submitUrl: 'https://theresanaiforthat.com/submit', authorityTier: 1, daEstimate: 78, pricing: 'freemium', dofollow: true, category: 'ai-directory', notes: 'Largest AI directory; frequently cited by LLMs (a competitor we want parity with).' },
  { key: 'futurepedia', name: 'Futurepedia', url: 'https://www.futurepedia.io', submitUrl: 'https://www.futurepedia.io/submit-tool', authorityTier: 1, daEstimate: 73, pricing: 'freemium', dofollow: true, category: 'ai-directory', notes: 'Appeared in our GEO baseline as a cited competitor — get listed alongside.' },

  // — Tier 2: strong AI/SaaS directories —
  { key: 'alternativeto', name: 'AlternativeTo', url: 'https://alternativeto.net', submitUrl: 'https://alternativeto.net/manage/new/', authorityTier: 2, daEstimate: 90, pricing: 'free', dofollow: true, category: 'saas-review' },
  { key: 'saashub', name: 'SaaSHub', url: 'https://www.saashub.com', submitUrl: 'https://www.saashub.com/submit', authorityTier: 2, daEstimate: 67, pricing: 'free', dofollow: true, category: 'saas-review' },
  { key: 'toolify', name: 'Toolify', url: 'https://www.toolify.ai', submitUrl: 'https://www.toolify.ai/submit', authorityTier: 2, daEstimate: 64, pricing: 'freemium', dofollow: true, category: 'ai-directory' },
  { key: 'thesaasdir', name: 'TheSaaSDir', url: 'https://thesaasdir.com', submitUrl: 'https://thesaasdir.com/submit', authorityTier: 2, daEstimate: 45, pricing: 'free', dofollow: true, category: 'ai-directory' },
  { key: 'aixploria', name: 'AIxploria', url: 'https://www.aixploria.com', submitUrl: 'https://www.aixploria.com/en/submit-ai/', authorityTier: 2, daEstimate: 55, pricing: 'free', dofollow: true, category: 'ai-directory', notes: 'Also a cited competitor in our GEO baseline.' },
  { key: 'futuretools', name: 'Futuretools', url: 'https://www.futuretools.io', submitUrl: 'https://www.futuretools.io/submit-a-tool', authorityTier: 2, daEstimate: 60, pricing: 'free', dofollow: true, category: 'ai-directory' },
  { key: 'topai', name: 'TopAI.tools', url: 'https://topai.tools', submitUrl: 'https://topai.tools/submit', authorityTier: 2, daEstimate: 52, pricing: 'free', dofollow: true, category: 'ai-directory' },
  { key: 'trustpilot', name: 'Trustpilot', url: 'https://www.trustpilot.com', submitUrl: 'https://business.trustpilot.com/signup', authorityTier: 2, daEstimate: 93, pricing: 'free', dofollow: false, category: 'saas-review', notes: 'Review profile — trust signal LLMs weigh.' },

  // — Tier 3: launch / indie / breadth —
  { key: 'betalist', name: 'BetaList', url: 'https://betalist.com', submitUrl: 'https://betalist.com/submit', authorityTier: 3, daEstimate: 76, pricing: 'freemium', dofollow: true, category: 'launch' },
  { key: 'indiehackers', name: 'Indie Hackers', url: 'https://www.indiehackers.com', authorityTier: 3, daEstimate: 75, pricing: 'free', dofollow: true, category: 'general', notes: 'Build a product page + post our story; community + link.' },
  { key: 'saasworthy', name: 'SaaSworthy', url: 'https://www.saasworthy.com', submitUrl: 'https://www.saasworthy.com/submit-product', authorityTier: 3, daEstimate: 62, pricing: 'free', dofollow: true, category: 'saas-review' },
  { key: 'insidr', name: 'Insidr AI', url: 'https://www.insidr.ai', submitUrl: 'https://www.insidr.ai/submit-tool/', authorityTier: 3, daEstimate: 48, pricing: 'free', dofollow: true, category: 'ai-directory' },
  { key: 'aitoolsdirectory', name: 'AI Tools Directory', url: 'https://aitoolsdirectory.com', submitUrl: 'https://aitoolsdirectory.com/submit', authorityTier: 3, daEstimate: 40, pricing: 'free', dofollow: true, category: 'ai-directory' },

  // — Phase 13 round-2: additional HIGH-AUTHORITY, free placements (high DA and/or AI-cited) —
  { key: 'sourceforge', name: 'SourceForge', url: 'https://sourceforge.net', submitUrl: 'https://sourceforge.net/create/', authorityTier: 1, daEstimate: 92, pricing: 'free', dofollow: true, category: 'saas-review', notes: 'Very high DA business-software directory; free listing + reviews; strong dofollow link. (Sister site Slashdot.)' },
  { key: 'trustradius', name: 'TrustRadius', url: 'https://www.trustradius.com', submitUrl: 'https://www.trustradius.com/vendors', authorityTier: 1, daEstimate: 80, pricing: 'free', dofollow: false, category: 'saas-review', notes: 'Major B2B review platform AIs cite (alongside G2/Capterra); free vendor profile. Value grows with reviews.' },
  { key: 'wellfound', name: 'Wellfound (AngelList)', url: 'https://wellfound.com', submitUrl: 'https://wellfound.com/company/new', authorityTier: 1, daEstimate: 91, pricing: 'free', dofollow: false, category: 'entity', notes: 'Startup company profile — strong entity/knowledge-graph signal; high DA.' },
  { key: 'stackshare', name: 'StackShare', url: 'https://stackshare.io', submitUrl: 'https://stackshare.io/tools/new', authorityTier: 2, daEstimate: 78, pricing: 'free', dofollow: true, category: 'saas-review', notes: 'Developer tech-stack directory; good for the builder/dev audience.' },
  { key: 'getapp', name: 'GetApp (Gartner)', url: 'https://www.getapp.com', submitUrl: 'https://vendors.getapp.com', authorityTier: 2, daEstimate: 88, pricing: 'free', dofollow: false, category: 'saas-review', notes: 'Gartner network — MAY auto-populate from the Capterra listing; check before duplicating.' },
  { key: 'softwareadvice', name: 'Software Advice (Gartner)', url: 'https://www.softwareadvice.com', authorityTier: 2, daEstimate: 85, pricing: 'free', dofollow: false, category: 'saas-review', notes: 'Gartner network — usually syndicated from Capterra; likely no separate submission needed.' },
  { key: 'goodfirms', name: 'GoodFirms', url: 'https://www.goodfirms.co', submitUrl: 'https://www.goodfirms.co/get-listed', authorityTier: 2, daEstimate: 74, pricing: 'free', dofollow: true, category: 'saas-review', notes: 'B2B reviews + directory; free listing + dofollow.' },
  { key: 'crozdesk', name: 'Crozdesk', url: 'https://crozdesk.com', submitUrl: 'https://vendors.crozdesk.com', authorityTier: 2, daEstimate: 64, pricing: 'free', dofollow: true, category: 'saas-review', notes: 'SaaS discovery directory; free vendor listing.' },
]

export function getDirectoryTarget(key: string): DirectoryTarget | undefined {
  return DIRECTORY_TARGETS.find((d) => d.key === key)
}
