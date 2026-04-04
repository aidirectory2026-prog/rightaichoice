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

  // Also deduplicate within the batch itself
  const seenNames = new Set<string>()

  return tools.filter(tool => {
    const slug = slugify(tool.name)
    const domain = normalizeDomain(tool.url)
    const nameKey = tool.name.toLowerCase().trim()

    if (existingSlugs.has(slug) || existingDomains.has(domain) || seenNames.has(nameKey)) {
      return false
    }

    seenNames.add(nameKey)
    return true
  })
}
