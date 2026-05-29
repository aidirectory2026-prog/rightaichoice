/**
 * 1.1 freshness-cascade — sync page_tool_mentions rows for blog posts.
 *
 * Each MDX file in content/blog/ declares its mentioned tools via
 * frontmatter:
 *
 *   ---
 *   title: "..."
 *   tools: ["cursor", "claude-code", "windsurf"]
 *   ---
 *
 * We walk the folder, parse frontmatter, and upsert one row per
 * (page_path, tool_slug) pair with mention_source='blog_frontmatter'.
 *
 * USAGE
 *   npm run sync:mentions:blog
 *   npm run sync:mentions:blog -- --dry-run
 *
 * REQUIRED ENV
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotent. Runs in CI on every push that touches content/.
 */
import 'dotenv/config'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import { createClient } from '@supabase/supabase-js'

const BLOG_DIR = join(process.cwd(), 'content', 'blog')

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

/**
 * Tiny frontmatter parser — enough to extract `tools: [...]` arrays.
 * We don't pull in gray-matter to keep this script dependency-free.
 */
function parseFrontmatter(raw: string): Record<string, unknown> {
  if (!raw.startsWith('---')) return {}
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return {}
  const block = raw.slice(3, end).trim()

  const out: Record<string, unknown> = {}
  let i = 0
  const lines = block.split('\n')
  while (i < lines.length) {
    const line = lines[i]
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/)
    if (!m) {
      i++
      continue
    }
    const key = m[1]
    const inline = m[2].trim()

    if (inline.startsWith('[') && inline.endsWith(']')) {
      out[key] = parseInlineArray(inline)
      i++
      continue
    }

    if (inline === '' || inline === '|' || inline === '>') {
      // Multi-line value (e.g., block scalars or arrays on next lines)
      const items: string[] = []
      i++
      while (i < lines.length && lines[i].startsWith('  - ')) {
        items.push(stripQuotes(lines[i].slice(4).trim()))
        i++
      }
      if (items.length > 0) out[key] = items
      continue
    }

    out[key] = stripQuotes(inline)
    i++
  }

  return out
}

function parseInlineArray(s: string): string[] {
  const inner = s.slice(1, -1).trim()
  if (!inner) return []
  return inner.split(',').map((p) => stripQuotes(p.trim())).filter(Boolean)
}

function stripQuotes(s: string): string {
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    return s.slice(1, -1)
  }
  return s
}

async function collectMentions(): Promise<Map<string, string[]>> {
  const files = (await readdir(BLOG_DIR)).filter((f) => f.endsWith('.mdx'))
  const mentions = new Map<string, string[]>()

  for (const file of files) {
    const raw = await readFile(join(BLOG_DIR, file), 'utf8')
    const fm = parseFrontmatter(raw)
    const tools = Array.isArray(fm.tools)
      ? (fm.tools as string[]).filter((s) => typeof s === 'string')
      : []
    if (tools.length === 0) continue
    const pagePath = `/blog/${file.replace(/\.mdx$/, '')}`
    mentions.set(pagePath, tools)
  }

  return mentions
}

async function syncBlogMentions(dryRun: boolean): Promise<void> {
  const mentions = await collectMentions()
  const supabase = getSupabase()

  const desired: Array<{ page_path: string; tool_slug: string }> = []
  for (const [pagePath, slugs] of mentions) {
    for (const slug of slugs) {
      desired.push({ page_path: pagePath, tool_slug: slug })
    }
  }

  console.log(
    `[sync:mentions:blog] resolved ${desired.length} (page,tool) pairs across ${mentions.size} blog posts`
  )

  if (dryRun) {
    console.log('[sync:mentions:blog] --dry-run, skipping writes')
    return
  }

  // Drop pairs whose tool slug doesn't exist (avoid FK violations + noise)
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
    console.warn(
      `[sync:mentions:blog] skipped ${skipped} pairs whose tool slug isn't in DB (typos in frontmatter, or future tools)`
    )
  }

  const now = new Date().toISOString()
  for (let i = 0; i < valid.length; i += CHUNK) {
    const batch = valid.slice(i, i + CHUNK).map((d) => ({
      page_path: d.page_path,
      page_type: 'blog',
      tool_slug: d.tool_slug,
      mention_source: 'blog_frontmatter',
      updated_at: now,
    }))
    const { error } = await supabase
      .from('page_tool_mentions')
      .upsert(batch, { onConflict: 'page_path,tool_slug' })
    if (error) throw new Error(`upsert failed at offset ${i}: ${error.message}`)
  }

  // Stale removal: anything tagged blog_frontmatter that isn't in `valid`
  const desiredKeys = new Set(valid.map((d) => `${d.page_path}|${d.tool_slug}`))
  const { data: existing, error: existErr } = await supabase
    .from('page_tool_mentions')
    .select('page_path, tool_slug')
    .eq('mention_source', 'blog_frontmatter')
    .limit(10000)
  if (existErr) throw new Error(`stale lookup failed: ${existErr.message}`)

  const stale: Array<{ page_path: string; tool_slug: string }> = []
  for (const row of existing ?? []) {
    const r = row as { page_path: string; tool_slug: string }
    if (!desiredKeys.has(`${r.page_path}|${r.tool_slug}`)) {
      stale.push(r)
    }
  }
  for (const { page_path, tool_slug } of stale) {
    await supabase
      .from('page_tool_mentions')
      .delete()
      .eq('page_path', page_path)
      .eq('tool_slug', tool_slug)
      .eq('mention_source', 'blog_frontmatter')
  }

  console.log(
    `[sync:mentions:blog] upserted=${valid.length}, deleted_stale=${stale.length}`
  )
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  await syncBlogMentions(dryRun)
}

main().catch((err) => {
  console.error('[sync:mentions:blog] FAILED:', err)
  process.exit(1)
})
