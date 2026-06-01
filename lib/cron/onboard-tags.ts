/**
 * Tag assignment for the onboard SOP (Phase 9 — Automations & Catalog).
 *
 * Tags (tool_tags → tags, a controlled ~31-slug vocabulary) power the live
 * alternatives ranker (getAlternativeTools leans on shared/identity tags), the
 * Topics sidebar, and search relevance. Yet only ~14% of published tools had
 * tags — ingest/enrich never assigned them; only seed-migration tools did. So
 * new tools (and most of the catalog) showed weak alternatives + an empty
 * Topics sidebar. This module predicts 2–5 tags from the existing vocabulary
 * (same DeepSeek pattern as onboard.ts predictCategories) and assigns them.
 * Idempotent. Shared by the onboard SOP and scripts/backfill-tags.ts.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'

export type TagPredictInput = {
  name: string
  tagline: string | null
  description: string | null
  features: string[] | null
}

/** DeepSeek picks 2–5 tag slugs from the fixed vocabulary. Returns valid slugs only. */
export async function predictTags(input: TagPredictInput, validTagSlugs: string[]): Promise<string[]> {
  if (!process.env.DEEPSEEK_API_KEY || validTagSlugs.length === 0) return []
  const prompt = `Assign capability tags to this tool. Return ONLY slugs from the provided list — never invent.

RULES:
- Pick ONLY tags that GENUINELY and accurately describe what this tool does. Accuracy over coverage.
- It is better to return 1-2 precise tags (or even an empty list) than to force 5 loose/wrong ones.
- These are AI-CAPABILITY tags. A tool with no strong match to any (e.g. a generic hosting/observability/PM platform) should get only the few that truly apply (often just "automation", "api-tool", "data-analysis", or "code-generation") — NOT unrelated ones like "meeting-assistant" or "image-generation".
- Max 5.

Tool: ${input.name}
Tagline: ${input.tagline ?? ''}
Description: ${(input.description ?? '').slice(0, 800)}
Features: ${(input.features ?? []).slice(0, 10).join(', ')}

Valid tag slugs (pick from these only):
${validTagSlugs.join(', ')}

Return JSON: {"slugs": ["slug-1", "slug-2"]}  (empty list ok if none truly fit)`

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 200,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You assign tags to AI tools. Reply with strict JSON only.' },
        { role: 'user', content: prompt },
      ],
    }),
  })
  if (!res.ok) throw new Error(`DeepSeek ${res.status}`)
  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  const text = json.choices[0]?.message?.content ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return []
  const parsed = JSON.parse(match[0]) as { slugs?: unknown }
  const slugs = Array.isArray(parsed.slugs) ? parsed.slugs : []
  return slugs.filter((s): s is string => typeof s === 'string' && validTagSlugs.includes(s)).slice(0, 5)
}

/** Load the controlled tag vocabulary (slugs). */
export async function loadValidTagSlugs(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase.from('tags').select('slug')
  return ((data ?? []) as { slug: string }[]).map((t) => t.slug).filter(Boolean)
}

/**
 * Predict + assign tags for a tool. Idempotent: returns the existing count if
 * the tool already has tags (never re-tags). Returns the number of tags on the
 * tool afterward.
 */
export async function assignTags(
  supabase: SupabaseClient,
  tool: { id: string; name: string; tagline: string | null; description: string | null; features: string[] | null },
  validTagSlugs: string[],
): Promise<number> {
  const { data: existing } = await supabase
    .from('tool_tags')
    .select('tag_id')
    .eq('tool_id', tool.id)
  if (existing && existing.length > 0) return existing.length

  const slugs = await predictTags(
    { name: tool.name, tagline: tool.tagline, description: tool.description, features: tool.features },
    validTagSlugs,
  )
  if (slugs.length === 0) return 0

  const { data: tagRows } = await supabase.from('tags').select('id, slug').in('slug', slugs)
  const ids = ((tagRows ?? []) as { id: string; slug: string }[]).map((t) => t.id)
  if (ids.length === 0) return 0

  const { error } = await supabase
    .from('tool_tags')
    .upsert(
      ids.map((tag_id) => ({ tool_id: tool.id, tag_id })) as never,
      { onConflict: 'tool_id,tag_id', ignoreDuplicates: true },
    )
  if (error) throw new Error(`tool_tags: ${error.message}`)
  return ids.length
}
