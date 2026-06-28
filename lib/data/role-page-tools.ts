/**
 * BUG-06 (Phase 13) — shared tool-fetch for /for/[slug] (role pages), kept out
 * of the pure-config `role-pages.ts`. Wrapped in React `cache()` so
 * generateMetadata, the page render, and the thin-page gate share one query.
 */
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { RolePageConfig } from './role-pages'

/** Tools curated for a /for/[slug] role page (top 24 by review count). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getRolePageTools = cache(async (config: RolePageConfig): Promise<any[]> => {
  const supabase = await createClient()
  const { data: catTools } = await supabase
    .from('tool_categories')
    .select('tool_id, categories!inner(slug)')
    .in('categories.slug', config.categories)
  const toolIds = [...new Set(catTools?.map((r) => r.tool_id) ?? [])]
  if (toolIds.length === 0) return []
  const { data } = await supabase
    .from('tools')
    .select('*, tool_categories(category_id, categories(*))')
    .eq('is_published', true)
    .in('id', toolIds)
    .order('review_count', { ascending: false })
    .limit(24)
  return data ?? []
})
