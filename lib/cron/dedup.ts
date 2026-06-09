import { SupabaseClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/utils/slugify'
import type { DiscoveredTool } from './discover'

function normalizeDomain(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return url.toLowerCase()
  }
}

// Phase 10 #57 — multi-tenant hosts where many DIFFERENT products share one
// domain. Deduping on these would wrongly collapse distinct tools (e.g. every
// homepage-less GitHub repo → github.com). Domain-dedup is skipped for them;
// slug + name dedup still applies.
const MULTI_TENANT_HOSTS = new Set([
  'github.com', 'gitlab.com', 'producthunt.com', 'huggingface.co', 'replit.com',
  'vercel.app', 'netlify.app', 'herokuapp.com', 'notion.site', 'gumroad.com',
  'itch.io', 'streamlit.app', 'gradio.app', 'pages.dev',
])

export async function dedup(
  tools: DiscoveredTool[],
  supabase: SupabaseClient
): Promise<DiscoveredTool[]> {
  if (tools.length === 0) return []

  // Fetch all existing slugs and website URLs
  const { data: existing } = await supabase
    .from('tools')
    .select('slug, website_url')

  if (!existing) return tools

  const existingSlugs = new Set(existing.map(t => t.slug))
  const existingDomains = new Set(
    existing
      .map(t => t.website_url ? normalizeDomain(t.website_url) : null)
      .filter(Boolean)
  )

  // Also deduplicate within the batch itself (by slug AND name, so case/
  // punctuation variants like "ToolAI" vs "Tool AI" don't both slip through).
  const seenNames = new Set<string>()
  const seenSlugs = new Set<string>()

  return tools.filter(tool => {
    const slug = slugify(tool.name)
    const domain = normalizeDomain(tool.url)
    const nameKey = tool.name.toLowerCase().trim()
    const domainUsable = !!domain && !MULTI_TENANT_HOSTS.has(domain)

    if (existingSlugs.has(slug) || seenSlugs.has(slug) || seenNames.has(nameKey)) return false
    if (domainUsable && existingDomains.has(domain)) return false

    seenNames.add(nameKey)
    seenSlugs.add(slug)
    if (domainUsable) existingDomains.add(domain) // also prevent in-batch domain dups
    return true
  })
}
