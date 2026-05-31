/**
 * Long-tail FAQ generation for the gated onboard SOP (Phase 9 D2).
 *
 * The product page renders tools.faqs_long_tail ({question, answer,
 * target_keyword}[]). The full Phase-4 SOP (scripts/backfill-tool-data.ts)
 * generates these as part of a 22-field synthesis, but that script is a
 * CLI-private `export {}` module that isn't importable. Rather than refactor
 * the whole heavy SOP, this is a focused, reusable DeepSeek call that produces
 * ONLY faqs_long_tail to satisfy the ">=9 FAQ" hard gate — same model
 * (deepseek-chat), same SEO bar (distinct long-tail query patterns), same
 * "ground in real data, never invent" rules used elsewhere.
 *
 * Idempotent at the gate level: onboard only calls this when the existing
 * faqs_long_tail count is below the threshold.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

const faqSchema = z.object({
  faqs: z
    .array(
      z.object({
        question: z.string().min(15).max(180),
        answer: z.string().min(40).max(600),
        target_keyword: z.string().min(3).max(80),
      }),
    )
    .min(9)
    .max(12),
})

export type LongTailFaq = z.infer<typeof faqSchema>['faqs'][number]

type FaqToolInput = {
  id: string
  name: string
  tagline: string | null
  description: string | null
  pricing_type: string | null
  features: string[] | null
  best_for: string[] | null
  not_for: string[] | null
  integrations: string[] | null
}

const SYSTEM_PROMPT = `You are an SEO editorial analyst at RightAIChoice, a decision engine for AI tools. You write long-tail FAQ entries that rank on Google for real buyer-intent queries. Every answer is grounded in the tool data provided — never invent pricing, features, or integrations. Reviewer voice, not marketing.

Return STRICT JSON: {"faqs": [{"question": "...", "answer": "...", "target_keyword": "..."}]}.
- 9-12 FAQs, each targeting a DISTINCT long-tail query pattern.
- Cover at least: pricing/cost, free plan or trial, alternatives/comparison, who it's best for, who should avoid it, key limitations, integrations, setup/learning curve, and a "is X good for <use case>" style query.
- question: 15-180 chars, the exact phrasing a user would Google.
- answer: 40-600 chars, specific and helpful, 2-4 sentences.
- target_keyword: 3-80 chars, the long-tail keyword the FAQ targets.
NO markdown, NO prose, JUST the JSON object.`

function buildPrompt(t: FaqToolInput): string {
  return [
    `Generate long-tail FAQs for the AI tool "${t.name}".`,
    `tagline: ${t.tagline ?? '(none)'}`,
    `pricing_type: ${t.pricing_type ?? 'unknown'}`,
    `features: ${(t.features ?? []).slice(0, 12).join(', ')}`,
    `integrations: ${(t.integrations ?? []).slice(0, 12).join(', ')}`,
    `best_for: ${(t.best_for ?? []).join(', ')}`,
    `not_for: ${(t.not_for ?? []).join(', ')}`,
    `description: ${(t.description ?? '').slice(0, 1200)}`,
  ].join('\n')
}

async function callDeepSeek(t: FaqToolInput, correction?: string): Promise<string> {
  const base = buildPrompt(t)
  const user = correction
    ? `${base}\n\n---\nPrev attempt failed validation: ${correction}\nReturn STRICT JSON matching the exact schema — at least 9 FAQs.`
    : base
  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  return json.choices[0]?.message?.content ?? ''
}

/**
 * Generate >=9 long-tail FAQs and write them to tools.faqs_long_tail.
 * Returns the count written, or 0 on failure (caller treats 0 as gate-fail).
 * Single corrective retry on validation failure (same pattern as refresh /
 * cascade-editorials).
 */
export async function generateLongTailFaqs(
  supabase: SupabaseClient,
  tool: FaqToolInput,
): Promise<number> {
  if (!process.env.DEEPSEEK_API_KEY) return 0

  let parsed: z.infer<typeof faqSchema> | null = null
  let lastErr = ''
  for (let attempt = 1; attempt <= 2; attempt++) {
    let raw: string
    try {
      raw = await callDeepSeek(tool, attempt === 2 ? lastErr : undefined)
    } catch (e) {
      lastErr = e instanceof Error ? e.message : 'unknown'
      continue
    }
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) {
      lastErr = 'no JSON object in response'
      continue
    }
    try {
      parsed = faqSchema.parse(JSON.parse(match[0]))
      break
    } catch (e) {
      lastErr = (e instanceof Error ? e.message : 'unknown').slice(0, 200)
    }
  }
  if (!parsed) {
    console.error(`[onboard-faqs] ${tool.name}: ${lastErr}`)
    return 0
  }

  const { error } = await supabase
    .from('tools')
    .update({ faqs_long_tail: parsed.faqs } as never)
    .eq('id', tool.id)
  if (error) {
    console.error(`[onboard-faqs] ${tool.name} write failed: ${error.message}`)
    return 0
  }
  return parsed.faqs.length
}
