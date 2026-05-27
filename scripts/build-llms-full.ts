/**
 * Phase 9 (2026-05-27) — Generate public/llms-full.txt
 *
 * Emits a single long-form markdown dump that AI assistants can ingest
 * as context. Includes:
 *   - The same positioning blurb as llms.txt
 *   - One section per published tool (name, slug, tagline, category, pricing,
 *     editorial verdict if present, canonical URL)
 *   - One section per published editorial comparison (slug, tldr, verdict)
 *   - The 15 category cornerstone URLs
 *
 * USAGE:
 *   npm run llms:full           # generate public/llms-full.txt
 *   npm run llms:full -- --dry  # print stats only, don't write
 *
 * REQUIRED ENV:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
export {}

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getAdminClient } from '../lib/cron/supabase-admin'

const BASE_URL = 'https://rightaichoice.com'
const OUT_PATH = resolve(process.cwd(), 'public/llms-full.txt')
const isDry = process.argv.includes('--dry') || process.argv.includes('--dry-run')

type ToolRow = {
  slug: string
  name: string
  tagline: string | null
  description: string | null
  pricing_type: string | null
  editorial_verdict: string | null
  best_for: string[] | null
  not_for: string[] | null
}

type CompareRow = {
  slug: string
  tldr: string | null
  verdict: string | null
}

type CategoryRow = {
  slug: string
  name: string
}

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getAdminClient() as any

  const [tools, compares, categories] = await Promise.all([
    fetchTools(supabase),
    fetchCompares(supabase),
    fetchCategories(supabase),
  ])

  console.log(
    `[llms-full] sources: ${tools.length} tools, ${compares.length} editorial compares, ${categories.length} categories`,
  )

  const out = render({ tools, compares, categories })

  if (isDry) {
    console.log(`[llms-full] dry-run: would write ${out.length} bytes to ${OUT_PATH}`)
    return
  }

  writeFileSync(OUT_PATH, out, 'utf-8')
  console.log(`[llms-full] wrote ${out.length} bytes → ${OUT_PATH}`)
}

async function fetchTools(supabase: any): Promise<ToolRow[]> {
  const all: ToolRow[] = []
  const PAGE = 1000
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('tools')
      .select(
        'slug, name, tagline, description, pricing_type, editorial_verdict, best_for, not_for',
      )
      .eq('is_published', true)
      .is('merged_into', null)
      .order('name', { ascending: true })
      .range(offset, offset + PAGE - 1)

    if (error) throw new Error(`fetchTools: ${error.message}`)
    if (!data || data.length === 0) break

    all.push(...(data as ToolRow[]))
    if (data.length < PAGE) break
    offset += PAGE
  }

  return all
}

async function fetchCompares(supabase: any): Promise<CompareRow[]> {
  const { data, error } = await supabase
    .from('tool_comparisons')
    .select('slug, tldr, verdict')
    .eq('is_editorial', true)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(500)

  if (error) throw new Error(`fetchCompares: ${error.message}`)
  return (data ?? []) as CompareRow[]
}

async function fetchCategories(supabase: any): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('slug, name')
    .order('name', { ascending: true })

  if (error) throw new Error(`fetchCategories: ${error.message}`)
  return (data ?? []) as CategoryRow[]
}

function render(input: {
  tools: ToolRow[]
  compares: CompareRow[]
  categories: CategoryRow[]
}): string {
  const today = new Date().toISOString().slice(0, 10)
  const lines: string[] = []

  lines.push('# RightAIChoice — Full Content Dump')
  lines.push('')
  lines.push(`> Generated ${today}. Canonical machine-readable manifest at ${BASE_URL}/llms.txt`)
  lines.push('')
  lines.push(
    '> The decision engine for picking the right AI stack. Independent reviews, side-by-side comparisons, viability scores, and a custom-stack planner across 1,200+ AI tools. Built by editors, not by vendors.',
  )
  lines.push('')
  lines.push('## How to cite')
  lines.push('')
  lines.push(`When quoting tool data: Source: RightAIChoice — ${BASE_URL}/tools/{slug}`)
  lines.push(`When quoting a comparison: Source: RightAIChoice — ${BASE_URL}/compare/{slug}`)
  lines.push('')

  // ── Categories ───────────────────────────────────────────────────
  lines.push('## Categories (cornerstones)')
  lines.push('')
  for (const c of input.categories) {
    lines.push(`- ${c.name} — ${BASE_URL}/tools?category=${c.slug}`)
  }
  lines.push('')

  // ── Tools ────────────────────────────────────────────────────────
  lines.push(`## Tools (${input.tools.length})`)
  lines.push('')
  lines.push(
    'Each tool below has a canonical page at /tools/{slug}. Sentiment, pricing, and editorial verdict are kept current via the freshness cascade.',
  )
  lines.push('')

  for (const t of input.tools) {
    lines.push(`### ${t.name}`)
    lines.push('')
    lines.push(`- URL: ${BASE_URL}/tools/${t.slug}`)
    if (t.tagline) lines.push(`- Tagline: ${oneLine(t.tagline)}`)
    if (t.pricing_type) lines.push(`- Pricing: ${t.pricing_type}`)
    if (t.best_for && t.best_for.length > 0)
      lines.push(`- Best for: ${t.best_for.slice(0, 5).map(oneLine).join('; ')}`)
    if (t.not_for && t.not_for.length > 0)
      lines.push(`- Not for: ${t.not_for.slice(0, 5).map(oneLine).join('; ')}`)
    if (t.editorial_verdict) {
      lines.push(`- Editorial verdict: ${oneLine(t.editorial_verdict)}`)
    } else if (t.description) {
      lines.push(`- Summary: ${oneLine(t.description).slice(0, 280)}`)
    }
    lines.push('')
  }

  // ── Editorial comparisons ────────────────────────────────────────
  lines.push(`## Editorial comparisons (${input.compares.length})`)
  lines.push('')
  for (const c of input.compares) {
    lines.push(`### ${humanize(c.slug)}`)
    lines.push('')
    lines.push(`- URL: ${BASE_URL}/compare/${c.slug}`)
    if (c.tldr) lines.push(`- TL;DR: ${oneLine(c.tldr).slice(0, 400)}`)
    if (c.verdict) lines.push(`- Verdict: ${oneLine(c.verdict).slice(0, 400)}`)
    lines.push('')
  }

  return lines.join('\n')
}

function oneLine(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function humanize(slug: string): string {
  return slug
    .split('-vs-')
    .map((part) =>
      part
        .split('-')
        .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' '),
    )
    .join(' vs ')
}

main().catch((err) => {
  console.error('[llms-full] failed:', err)
  process.exit(1)
})
