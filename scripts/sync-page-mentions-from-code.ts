/**
 * 1.1 freshness-cascade — sync page_tool_mentions rows for pages whose
 * tool memberships live in TypeScript configs (not the DB).
 *
 *   • /best/<slug>       ← BEST_PAGES   (lib/data/best-pages.ts)
 *   • /for/<slug>        ← ROLE_PAGES   (lib/data/role-pages.ts)
 *   • /stacks/<slug>     ← STACKS       (lib/data/stacks.ts)
 *
 * For each config entry we resolve the same Supabase query the page itself
 * would run (categories + featureKeywords filters), collect the tool slugs,
 * then upsert (page_path, tool_slug) rows with mention_source='code_config'.
 * Rows whose page+tool pair no longer appears are removed.
 *
 * Stacks are simpler — the config lists tool slugs directly.
 *
 * USAGE
 *   npm run sync:mentions:code
 *   npm run sync:mentions:code -- --dry-run
 *
 * REQUIRED ENV
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotent. Safe to run nightly via GH Actions + post-deploy.
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { BEST_PAGES, type BestPageConfig } from '../lib/data/best-pages'
import { ROLE_PAGES, type RolePageConfig } from '../lib/data/role-pages'
import { STACKS, type StackConfig } from '../lib/data/stacks'

type Mention = {
  page_path: string
  page_type: 'best' | 'role' | 'stack'
  tool_slug: string
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function resolveCategoryIds(
  supabase: ReturnType<typeof getSupabase>,
  slugs: string[]
): Promise<string[]> {
  if (slugs.length === 0) return []
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug')
    .in('slug', slugs)
  if (error) throw new Error(`category lookup failed: ${error.message}`)
  return (data ?? []).map((r: { id: string }) => r.id)
}

async function resolveToolsForBest(
  supabase: ReturnType<typeof getSupabase>,
  cfg: BestPageConfig
): Promise<string[]> {
  const categoryIds = await resolveCategoryIds(supabase, cfg.categories ?? [])

  // Pages of this type filter by category membership (OR) + optional
  // featureKeywords. Mirror the page renderer's logic conservatively —
  // include every published tool in any of the categories. Feature-keyword
  // filtering is non-strict here; we'd rather over-mention (extra cascade)
  // than under-mention (missed cascade).
  if (categoryIds.length > 0) {
    const { data, error } = await supabase
      .from('tool_categories')
      .select('tools!inner(slug, is_published)')
      .in('category_id', categoryIds)
      .limit(5000)
    if (error) throw new Error(`tool_categories query failed: ${error.message}`)

    const slugs = new Set<string>()
    for (const row of data ?? []) {
      const t = (row as { tools?: { slug?: string; is_published?: boolean } | null }).tools
      if (t?.slug && t.is_published !== false) slugs.add(t.slug)
    }
    return [...slugs]
  }

  return []
}

async function resolveToolsForRole(
  supabase: ReturnType<typeof getSupabase>,
  cfg: RolePageConfig
): Promise<string[]> {
  return resolveToolsForBest(supabase, cfg)
}

function resolveToolsForStack(cfg: StackConfig): string[] {
  const slugs = new Set<string>()
  for (const stage of cfg.stages) {
    if (stage.bestPick?.slug) slugs.add(stage.bestPick.slug)
    for (const alt of stage.alternatives ?? []) {
      if (alt?.slug) slugs.add(alt.slug)
    }
  }
  return [...slugs]
}

async function syncCodeConfig(dryRun: boolean): Promise<void> {
  const supabase = getSupabase()
  const desired: Mention[] = []

  // /best/<slug>
  for (const cfg of BEST_PAGES) {
    const tools = await resolveToolsForBest(supabase, cfg)
    for (const slug of tools) {
      desired.push({
        page_path: `/best/${cfg.slug}`,
        page_type: 'best',
        tool_slug: slug,
      })
    }
  }

  // /for/<slug>
  for (const cfg of ROLE_PAGES) {
    const tools = await resolveToolsForRole(supabase, cfg)
    for (const slug of tools) {
      desired.push({
        page_path: `/for/${cfg.slug}`,
        page_type: 'role',
        tool_slug: slug,
      })
    }
  }

  // /stacks/<slug>
  for (const cfg of STACKS) {
    const tools = resolveToolsForStack(cfg)
    for (const slug of tools) {
      desired.push({
        page_path: `/stacks/${cfg.slug}`,
        page_type: 'stack',
        tool_slug: slug,
      })
    }
  }

  console.log(
    `[sync:mentions:code] resolved ${desired.length} (page,tool) pairs across ` +
      `${BEST_PAGES.length} best + ${ROLE_PAGES.length} role + ${STACKS.length} stack pages`
  )

  if (dryRun) {
    console.log('[sync:mentions:code] --dry-run, skipping writes')
    return
  }

  // Validate tool slugs exist (FK ON DELETE CASCADE protects us, but skip
  // unknown slugs to avoid wasted INSERTs and noisy errors).
  const allSlugs = [...new Set(desired.map((d) => d.tool_slug))]
  const known = new Set<string>()
  const CHUNK = 500
  for (let i = 0; i < allSlugs.length; i += CHUNK) {
    const { data, error } = await supabase
      .from('tools')
      .select('slug')
      .in('slug', allSlugs.slice(i, i + CHUNK))
    if (error) throw new Error(`tool slug check failed: ${error.message}`)
    for (const row of data ?? []) {
      const s = (row as { slug?: string }).slug
      if (s) known.add(s)
    }
  }
  const valid = desired.filter((d) => known.has(d.tool_slug))
  const skipped = desired.length - valid.length
  if (skipped > 0) {
    console.warn(`[sync:mentions:code] skipped ${skipped} pairs with unknown tool slugs`)
  }

  // Upsert in chunks.
  const now = new Date().toISOString()
  for (let i = 0; i < valid.length; i += CHUNK) {
    const batch = valid.slice(i, i + CHUNK).map((d) => ({
      page_path: d.page_path,
      page_type: d.page_type,
      tool_slug: d.tool_slug,
      mention_source: 'code_config',
      updated_at: now,
    }))
    const { error } = await supabase
      .from('page_tool_mentions')
      .upsert(batch, { onConflict: 'page_path,tool_slug' })
    if (error) throw new Error(`upsert failed at offset ${i}: ${error.message}`)
  }

  // Delete stale code_config rows. A row is stale if it isn't in `valid`
  // AND its page_type belongs to this script's purview (best/role/stack).
  const desiredKeys = new Set(valid.map((d) => `${d.page_path}|${d.tool_slug}`))
  const { data: existing, error: existErr } = await supabase
    .from('page_tool_mentions')
    .select('page_path, tool_slug, page_type')
    .eq('mention_source', 'code_config')
    .limit(10000)
  if (existErr) throw new Error(`stale lookup failed: ${existErr.message}`)

  const stale: Array<{ page_path: string; tool_slug: string }> = []
  for (const row of existing ?? []) {
    const r = row as { page_path: string; tool_slug: string; page_type: string }
    if (!['best', 'role', 'stack'].includes(r.page_type)) continue
    if (!desiredKeys.has(`${r.page_path}|${r.tool_slug}`)) {
      stale.push({ page_path: r.page_path, tool_slug: r.tool_slug })
    }
  }
  for (const { page_path, tool_slug } of stale) {
    await supabase
      .from('page_tool_mentions')
      .delete()
      .eq('page_path', page_path)
      .eq('tool_slug', tool_slug)
      .eq('mention_source', 'code_config')
  }

  console.log(
    `[sync:mentions:code] upserted=${valid.length}, deleted_stale=${stale.length}`
  )
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  await syncCodeConfig(dryRun)
}

main().catch((err) => {
  console.error('[sync:mentions:code] FAILED:', err)
  process.exit(1)
})
