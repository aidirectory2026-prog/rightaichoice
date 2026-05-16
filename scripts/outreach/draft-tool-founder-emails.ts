/**
 * Phase 7O.1 — Tool-founder backlink outreach drafter.
 *
 * For every published tool with no existing outreach_log row, drafts a
 * personalized outreach email via DeepSeek V3 grounded in the tool's
 * editorial signal (tagline, verdict, viability score), and writes:
 *   1. The draft into outreach_log (drafted_at=now(), sent_at NULL).
 *   2. A CSV at logs/outreach-<date>.csv ready to paste into Gmail /
 *      Apollo / Instantly.
 *
 * Quality screens:
 *   - viability_score >= 30 (skip abandoned tools)
 *   - is_published = true
 *   - has website_url (need a domain to guess contacts)
 *   - has tagline or editorial verdict (need something to ground in)
 *
 * USAGE:
 *   npm run outreach:draft:dry                # list eligible, no API calls
 *   npm run outreach:draft -- --limit=10      # smoke-test 10 drafts
 *   npm run outreach:draft -- --limit=100     # weekly batch
 *   npm run outreach:draft                    # whole eligible catalog
 *
 * REQUIRED ENV:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DEEPSEEK_API_KEY
 *
 * COST: ~$0.001/draft × 500 tools ≈ $0.50 one-time. CSV output is the
 * operator's working surface — they decide which to actually send.
 */
export {}

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { z } from 'zod'
import { getAdminClient } from '../../lib/cron/supabase-admin'

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'
const CONCURRENCY = 4

type Tool = {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  website_url: string | null
  viability_score: number | null
  pros_5: string[] | null
  our_take: string | null
}

const draftSchema = z.object({
  subject: z.string().min(10).max(120),
  body: z.string().min(120).max(1200),
})

const SYSTEM_PROMPT = `You write short, founder-to-founder cold emails on behalf of RightAIChoice — an independent decision engine for AI tools. Your goal: ask the recipient to add a backlink to RightAIChoice's editorial review of their product, on their "as featured in" / "press" / "partners" page if one exists.

Rules:
- Subject: <60 chars, specific to the tool, no clickbait. NEVER use "quick question", "love your product", or "amazing".
- Body: 4 short paragraphs max, <180 words total. Plain text, no markdown, no signoff personalisation tokens.
- Open with a SPECIFIC observation from the editorial review (a real fact, not flattery). Reference the verdict line or a pro.
- State the ask in ONE sentence with the editorial URL.
- Close with a low-pressure out ("totally fine if it's not your thing").
- Sign as "Tanmay, RightAIChoice".
- NEVER promise traffic, rankings, or SEO benefit. NEVER claim numbers we can't back.

Return strict JSON: { "subject": "...", "body": "..." }. No prose, no fences.`

function buildUserPrompt(tool: Tool, editorialUrl: string): string {
  const verdict = tool.our_take?.trim() || tool.tagline?.trim() || ''
  const prosLine = (tool.pros_5 ?? []).slice(0, 3).join('; ')
  return [
    `Tool: ${tool.name}`,
    `Editorial URL: ${editorialUrl}`,
    verdict ? `Our editorial take: ${verdict}` : null,
    prosLine ? `Top 3 pros we highlighted: ${prosLine}` : null,
    typeof tool.viability_score === 'number'
      ? `Our viability score for them: ${tool.viability_score}/100`
      : null,
    '',
    'Draft the email per the rules. Reference at least one specific detail from our editorial take so they know this is real, not templated.',
  ]
    .filter(Boolean)
    .join('\n')
}

async function callDeepSeek(tool: Tool, editorialUrl: string): Promise<string> {
  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(tool, editorialUrl) },
      ],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`DeepSeek ${res.status}: ${body.slice(0, 300)}`)
  }
  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  return json.choices[0]?.message?.content ?? ''
}

function extractDomain(websiteUrl: string): string | null {
  try {
    const u = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function suggestContacts(domain: string): string {
  // Most-used vendor contact mailboxes, in operator-decision order.
  return [
    `press@${domain}`,
    `partnerships@${domain}`,
    `hello@${domain}`,
    `founders@${domain}`,
  ].join(' ; ')
}

function csvEscape(v: string | null | undefined): string {
  if (v == null) return ''
  const needsQuote = /[",\n\r]/.test(v)
  const escaped = v.replace(/"/g, '""')
  return needsQuote ? `"${escaped}"` : escaped
}

async function processOne(
  tool: Tool,
): Promise<{ subject: string; body: string } | null> {
  const editorialUrl = `https://rightaichoice.com/tools/${tool.slug}`
  let raw: string
  try {
    raw = await callDeepSeek(tool, editorialUrl)
  } catch (err) {
    console.warn(`[outreach] DeepSeek failed for ${tool.slug}: ${(err as Error).message}`)
    return null
  }
  const stripped = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
  try {
    const parsed = draftSchema.parse(JSON.parse(stripped))
    return parsed
  } catch (err) {
    console.warn(`[outreach] schema fail for ${tool.slug}: ${(err as Error).message}`)
    return null
  }
}

async function main() {
  const args = process.argv.slice(2)
  const isDry = args.includes('--dry')
  const limitArg = args.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity

  const supabase = getAdminClient()

  console.log(`[outreach] fetching eligible tools…`)
  const { data: tools, error } = await supabase
    .from('tools')
    .select(
      'id, slug, name, tagline, description, website_url, viability_score, pros_5, our_take',
    )
    .eq('is_published', true)
    .gte('viability_score', 30)
    .not('website_url', 'is', null)
    .order('viability_score', { ascending: false })
    .limit(2000)
  if (error) {
    console.error(`Supabase query failed: ${error.message}`)
    process.exit(1)
  }

  const { data: alreadyDrafted } = await supabase
    .from('outreach_log')
    .select('tool_id')
    .eq('source_channel', 'founder_outreach')
  const drafted = new Set((alreadyDrafted ?? []).map((r: { tool_id: string }) => r.tool_id))

  const eligible = (tools as Tool[])
    .filter((t) => !drafted.has(t.id))
    .filter((t) => !!extractDomain(t.website_url ?? ''))
    .slice(0, limit === Infinity ? 2000 : limit)

  console.log(
    `[outreach] ${eligible.length} eligible tools (skipped ${drafted.size} already drafted)`,
  )

  if (isDry) {
    eligible.slice(0, 20).forEach((t) => {
      console.log(
        `  - ${t.slug.padEnd(30)}  viability=${t.viability_score ?? '?'}  ${extractDomain(t.website_url!)}`,
      )
    })
    if (eligible.length > 20) console.log(`  … and ${eligible.length - 20} more`)
    return
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('DEEPSEEK_API_KEY required for non-dry runs.')
    process.exit(1)
  }

  const logsDir = join(process.cwd(), 'logs')
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true })
  const date = new Date().toISOString().slice(0, 10)
  const csvPath = join(logsDir, `outreach-${date}.csv`)

  const csvRows: string[] = [
    [
      'tool_slug',
      'tool_name',
      'domain',
      'suggested_contacts',
      'editorial_url',
      'draft_subject',
      'draft_body',
    ]
      .map(csvEscape)
      .join(','),
  ]

  let done = 0
  let failed = 0

  // Simple N-way pool — fan out CONCURRENCY at a time.
  const queue = [...eligible]
  async function worker() {
    while (queue.length > 0) {
      const t = queue.shift()
      if (!t) return
      const draft = await processOne(t)
      if (!draft) {
        failed++
        continue
      }
      const domain = extractDomain(t.website_url ?? '') ?? ''
      const editorialUrl = `https://rightaichoice.com/tools/${t.slug}`
      // Write to outreach_log (drafted, not yet sent).
      const { error: insertErr } = await supabase.from('outreach_log').insert({
        tool_id: t.id,
        source_channel: 'founder_outreach',
        draft_subject: draft.subject,
        draft_body: draft.body,
      } as never)
      if (insertErr) {
        console.warn(`[outreach] insert fail for ${t.slug}: ${insertErr.message}`)
        failed++
        continue
      }
      csvRows.push(
        [
          t.slug,
          t.name,
          domain,
          suggestContacts(domain),
          editorialUrl,
          draft.subject,
          draft.body,
        ]
          .map(csvEscape)
          .join(','),
      )
      done++
      if (done % 10 === 0) console.log(`  [outreach] ${done}/${eligible.length} drafted`)
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  writeFileSync(csvPath, csvRows.join('\n'), 'utf-8')
  console.log(`\n✓ Drafted ${done} emails. Failed ${failed}.`)
  console.log(`✓ CSV: ${csvPath}`)
  console.log(`\nNext: open the CSV, fill in real contact emails, paste into Gmail/Apollo.`)
  console.log(`When responses arrive, update outreach_log.response + responded_at via SQL.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
