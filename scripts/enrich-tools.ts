/**
 * Step 40 Slice 2 — populate the depth fields added in migration 037 for the
 * top-N tools by view_count. Idempotent: tools that already have a non-empty
 * `use_cases` array are skipped unless `--force` is passed.
 *
 * Usage:
 *   tsx scripts/enrich-tools.ts                    # top 300, skip enriched
 *   tsx scripts/enrich-tools.ts --limit=50         # top 50 by view_count
 *   tsx scripts/enrich-tools.ts --concurrency=5    # 5 parallel (default 3)
 *   tsx scripts/enrich-tools.ts --dry-run          # print, don't write
 *   tsx scripts/enrich-tools.ts --force            # re-enrich everything
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 *
 * Uses Haiku (claude-haiku-4-5-20251001) — this is a structured-extraction
 * task, not reasoning, so Haiku's speed/cost wins without quality loss. See
 * Step 39 Slice 1 for the Haiku-ladder rationale.
 */
export {}

import { z } from 'zod'
import { getAdminClient } from '../lib/cron/supabase-admin'
import { getAnthropicClient } from '../lib/ai/anthropic'
import { fetchPageText } from '../lib/cron/scrape'

const MODEL = 'claude-haiku-4-5-20251001'

const depthSchema = z.object({
  tutorial_urls: z.array(z.string().url()).max(10).default([]),
  limitations: z.string().max(1000).nullable().default(null),
  models: z.array(z.string().max(80)).max(10).default([]),
  community_links: z
    .object({
      g2_url: z.string().url().nullable().optional(),
      g2_rating: z.number().min(0).max(5).nullable().optional(),
      producthunt_url: z.string().url().nullable().optional(),
      reddit_threads: z.array(z.string().url()).max(5).optional(),
    })
    .default({}),
  use_cases: z.array(z.string().max(160)).max(5).default([]),
})

type DepthData = z.infer<typeof depthSchema>

function buildPrompt(name: string, websiteUrl: string, pageText: string): string {
  return `You are enriching an AI-tool directory listing. Extract ONLY information that is evidenced by the page content below or widely-known public facts about this tool. If a field cannot be supported, return its empty default — never invent.

Tool: ${name}
Website: ${websiteUrl}
Page content (first 8000 chars):
"""
${pageText}
"""

Return a single JSON object with exactly these keys:

- tutorial_urls: array of up to 10 absolute URLs to written tutorials / docs walkthroughs hosted on the tool's own domain or reputable sources (dev.to, Medium, YouTube tutorial pages). No homepage URLs.
- limitations: short free-text paragraph (max ~400 chars) summarizing real constraints: rate limits, region lockouts, language support, context window size, file-size caps, plan restrictions. Return null if none surfaced.
- models: array of underlying AI/LLM models this tool exposes (e.g. "gpt-4o", "claude-sonnet-4-6", "stable-diffusion-xl"). Empty array for non-AI or fully-abstracted tools.
- community_links: object { g2_url?, g2_rating?, producthunt_url?, reddit_threads? (up to 5 urls) }. Omit any key you cannot support.
- use_cases: array of 3-5 concrete, distinct use-case sentences (max ~120 chars each). Action-oriented (start with a verb). Skip generic ones like "save time".

Rules:
- Valid JSON only. No markdown, no prose before/after.
- URLs must include scheme (https://).
- Prefer "" or [] or null over guessing.`
}

async function enrichOne(name: string, websiteUrl: string): Promise<DepthData | null> {
  let pageText = ''
  try {
    pageText = await fetchPageText(websiteUrl)
  } catch {
    return null
  }
  if (pageText.length < 200) return null

  const client = getAnthropicClient()
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: buildPrompt(name, websiteUrl, pageText) }],
    })
    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    return depthSchema.parse(parsed)
  } catch (e) {
    console.error(`[enrich] ${name} —`, (e as Error).message)
    return null
  }
}

function argValue(flag: string, fallback: string): string {
  const arg = process.argv.find((a) => a.startsWith(`${flag}=`))
  return arg ? arg.split('=')[1] : fallback
}

async function main() {
  const limit = Number(argValue('--limit', '300'))
  const concurrency = Number(argValue('--concurrency', '3'))
  const dryRun = process.argv.includes('--dry-run')
  const force = process.argv.includes('--force')

  const supabase = getAdminClient()

  type ToolRow = {
    id: string
    name: string
    website_url: string
    use_cases: string[] | null
  }

  const { data, error } = await supabase
    .from('tools')
    .select('id, name, website_url, use_cases')
    .eq('is_published', true)
    .order('view_count', { ascending: false })
    .limit(limit)

  if (error) throw error
  const tools = (data ?? []) as unknown as ToolRow[]
  if (tools.length === 0) {
    console.log('no tools returned')
    return
  }

  const candidates = force
    ? tools
    : tools.filter((t) => !Array.isArray(t.use_cases) || t.use_cases.length === 0)

  console.log(`[enrich] top ${tools.length} by view_count · ${candidates.length} need enrichment · concurrency=${concurrency} · dryRun=${dryRun}`)

  let ok = 0
  let failed = 0
  for (let i = 0; i < candidates.length; i += concurrency) {
    const batch = candidates.slice(i, i + concurrency)
    const results = await Promise.all(
      batch.map(async (tool) => {
        const enriched = await enrichOne(tool.name, tool.website_url)
        if (!enriched) return 'failed' as const
        if (dryRun) {
          console.log(`[dry] ${tool.name}:`, JSON.stringify(enriched))
          return 'ok' as const
        }
        const { error: updateErr } = await supabase
          .from('tools')
          .update(enriched as never)
          .eq('id', tool.id)
        if (updateErr) {
          console.error(`[update] ${tool.name} —`, updateErr.message)
          return 'failed' as const
        }
        return 'ok' as const
      }),
    )
    for (const r of results) {
      if (r === 'ok') ok++
      else failed++
    }
    console.log(`[enrich] batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(candidates.length / concurrency)} · ok=${ok} failed=${failed}`)
  }

  console.log(`[enrich] done. ok=${ok} failed=${failed} skipped=${tools.length - candidates.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
