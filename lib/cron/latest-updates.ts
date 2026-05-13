/**
 * Phase 8.next Stage 4 / Tier 2 (2026-05-13): "Latest from {Tool}" synthesizer.
 *
 * Orchestrates 5 raw signal sources (changelog text, blog text, news
 * mentions, HN stories, Reddit posts, tweets) and feeds them to
 * DeepSeek V3 with strict instructions to NOT invent dates or titles
 * that aren't in the input.
 *
 * Returns a strict zod-validated array of 5-10 items per tool.
 *
 * Pattern mirrors Phase 4 SOP exactly — same DeepSeek call shape,
 * same single-corrective-retry, same atomic write contract.
 */
import { z } from 'zod'

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

export const latestUpdateItemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  source: z.enum(['changelog', 'blog', 'news', 'reddit', 'hackernews', 'twitter']),
  title: z.string().min(8).max(220),
  url: z.string().url(),
  summary: z.string().min(20).max(280),
  type: z.enum(['feature', 'pricing', 'launch', 'discussion', 'news', 'changelog']),
})

export const latestUpdatesSchema = z.object({
  items: z.array(latestUpdateItemSchema).min(0).max(12),
})

export type LatestUpdateItem = z.infer<typeof latestUpdateItemSchema>
export type LatestUpdatesOutput = z.infer<typeof latestUpdatesSchema>

const SYSTEM_PROMPT = `You are RightAIChoice's editorial freshness curator. You receive raw signal about an AI tool from up to 5 sources (vendor changelog, vendor blog, tech-press news, Hacker News stories, and tweets). Synthesize a chronological "Latest from this tool" timeline of 5-10 items.

HARD RULES (non-negotiable):
1. NEVER invent dates, titles, or URLs not present in the input. Every item's url + date must trace back to source data.
2. NO marketing superlatives ("best-in-class", "revolutionary", etc.).
3. RAC editorial voice: factual, terse, declarative. Each summary is 20-280 chars.
4. Skip items older than 90 days from today. Skip items missing a parseable date.
5. Skip items that don't move a buyer's understanding (e.g., "we hired a new VP" — irrelevant to product). Keep launches, version bumps, pricing changes, integrations, model upgrades, deprecations, partnerships that affect product, controversies, benchmarks.
6. Dedup near-identical items across sources (e.g., a vendor blog post + a TechCrunch covering the same launch — keep ONE, prefer vendor changelog > vendor blog > news > HN > reddit > twitter).
7. JSON OUTPUT ONLY. Strict schema (zod-validated):
{
  "items": [
    {
      "date": "YYYY-MM-DD",
      "source": "changelog" | "blog" | "news" | "reddit" | "hackernews" | "twitter",
      "title": "<8-220 chars>",
      "url": "<canonical link from input>",
      "summary": "<20-280 char RAC-voice summary, e.g. 'GPT-5 Turbo released with 256k context — 4× cheaper than GPT-4.'>",
      "type": "feature" | "pricing" | "launch" | "discussion" | "news" | "changelog"
    }
  ]
}

EMPTY RESULT: if input has nothing dateable from the last 90 days, return {"items":[]} — do NOT fabricate.

ORDERING: items array sorted by date DESC (newest first).`

export type SignalInput = {
  changelog_text?: string
  changelog_url?: string
  blog_text?: string
  blog_url?: string
  news?: Array<{ title: string; url: string; description: string; date: string | null; domain: string }>
  hn?: Array<{ title: string; url: string; hn_url: string; created_at: string; points: number }>
  reddit?: Array<{ title: string; url: string; subreddit: string | null; score: number; created_utc?: number }>
  tweets?: Array<{ text: string; url: string; author: string; date: string; likes: number; retweets: number }>
}

function buildUserPrompt(toolName: string, signal: SignalInput): string {
  const today = new Date().toISOString().slice(0, 10)
  const sections: string[] = [`Tool: ${toolName}\nToday: ${today}\n`]

  if (signal.changelog_text) {
    sections.push(
      `--- CHANGELOG (source URL: ${signal.changelog_url}) ---\n${signal.changelog_text.slice(0, 3500)}`
    )
  }
  if (signal.blog_text) {
    sections.push(
      `--- BLOG INDEX (source URL: ${signal.blog_url}) ---\n${signal.blog_text.slice(0, 3500)}`
    )
  }
  if (signal.news?.length) {
    sections.push(
      '--- NEWS MENTIONS ---\n' +
        signal.news
          .slice(0, 10)
          .map(
            (n, i) =>
              `[${i + 1}] ${n.title} (${n.domain}, date=${n.date ?? 'unknown'})\n  url: ${n.url}\n  desc: ${n.description.slice(0, 250)}`
          )
          .join('\n')
    )
  }
  if (signal.hn?.length) {
    sections.push(
      '--- HACKER NEWS (last 30 days) ---\n' +
        signal.hn
          .map(
            (h, i) =>
              `[${i + 1}] ${h.title} (${h.points} points, ${h.created_at.slice(0, 10)})\n  hn_url: ${h.hn_url}\n  external_url: ${h.url}`
          )
          .join('\n')
    )
  }
  if (signal.reddit?.length) {
    sections.push(
      '--- REDDIT (last 30 days) ---\n' +
        signal.reddit
          .map(
            (r, i) =>
              `[${i + 1}] ${r.title} (r/${r.subreddit ?? '?'}, ${r.score} upvotes, ts=${r.created_utc ?? '?'})\n  url: ${r.url}`
          )
          .join('\n')
    )
  }
  if (signal.tweets?.length) {
    sections.push(
      '--- TWEETS (last 30 days) ---\n' +
        signal.tweets
          .map(
            (t, i) =>
              `[${i + 1}] @${t.author} (${t.date}, ${t.likes}❤ ${t.retweets}🔁)\n  text: ${t.text}\n  url: ${t.url}`
          )
          .join('\n')
    )
  }

  return (
    sections.join('\n\n') +
    `\n\nReturn JSON per the schema. 5-10 items, sorted DESC by date. Empty array if nothing dateable from the last 90 days.`
  )
}

async function callDeepSeek(toolName: string, signal: SignalInput, correction?: string): Promise<string> {
  const userBase = buildUserPrompt(toolName, signal)
  const userContent = correction
    ? `${userBase}\n\n---\n\nYour previous response failed schema validation:\n${correction}\n\nReturn STRICT JSON of the exact shape. No prose, no fences.`
    : userBase

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
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

/**
 * Synthesize the latest_updates JSON for a single tool. Single
 * corrective auto-retry on schema fail. Returns null on persistent
 * failure (caller logs to needs-review file).
 */
export async function synthesizeLatestUpdates(
  toolName: string,
  signal: SignalInput
): Promise<LatestUpdatesOutput | null> {
  // If all signals are empty, skip the LLM call entirely. Saves $0.01/tool.
  const hasSignal =
    !!signal.changelog_text ||
    !!signal.blog_text ||
    (signal.news?.length ?? 0) > 0 ||
    (signal.hn?.length ?? 0) > 0 ||
    (signal.reddit?.length ?? 0) > 0 ||
    (signal.tweets?.length ?? 0) > 0
  if (!hasSignal) return { items: [] }

  let correction: string | undefined
  for (let attempt = 1; attempt <= 2; attempt++) {
    let raw: string
    try {
      raw = await callDeepSeek(toolName, signal, correction)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[latest-updates] DeepSeek call failed for "${toolName}" attempt ${attempt}: ${msg}`)
      return null
    }
    const stripped = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '').trim()
    let parsed: unknown
    try {
      parsed = JSON.parse(stripped)
    } catch (err) {
      correction = `JSON parse error: ${err instanceof Error ? err.message : String(err)}`
      continue
    }
    const result = latestUpdatesSchema.safeParse(parsed)
    if (result.success) {
      // Sort items by date desc as a final safety pass
      result.data.items.sort((a, b) => (b.date > a.date ? 1 : -1))
      return result.data
    }
    correction = result.error.issues
      .slice(0, 6)
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
  }
  return null
}
