import { getAnthropicClient } from '@/lib/ai/anthropic'
import { fetchPageText } from './scrape'
import { z } from 'zod'

const enrichedToolSchema = z.object({
  tagline: z.string().max(120),
  description: z.string().max(2000),
  pricing_type: z.enum(['free', 'freemium', 'paid', 'contact']),
  pricing_details: z.array(z.object({
    plan: z.string(),
    price: z.string(),
    features: z.array(z.string()),
  })).default([]),
  skill_level: z.enum(['beginner', 'intermediate', 'advanced']),
  has_api: z.boolean(),
  platforms: z.array(z.enum(['web', 'mobile', 'desktop', 'api', 'plugin', 'cli'])),
  features: z.array(z.string()).max(15),
  integrations: z.array(z.string()).max(15),
  best_for: z.array(z.string()).max(5),
  not_for: z.array(z.string()).max(5),
  editorial_verdict: z.string().max(500),
})

export type EnrichedToolData = z.infer<typeof enrichedToolSchema>

export async function enrichTool(
  name: string,
  websiteUrl: string,
  rawDescription: string
): Promise<EnrichedToolData | null> {
  let pageText = ''
  try {
    pageText = await fetchPageText(websiteUrl)
  } catch {
    // Fall back to raw description only
  }

  const client = getAnthropicClient()

  const prompt = `You are analyzing an AI tool for a directory. Based on the information below, generate structured metadata.

Tool name: ${name}
Website URL: ${websiteUrl}
Raw description: ${rawDescription}
Website content (first 8000 chars): ${pageText}

Return a JSON object with these exact fields:
- tagline: One-line description (max 120 chars)
- description: 2-4 paragraph detailed description of what this tool does and why someone would use it (max 2000 chars)
- pricing_type: "free" | "freemium" | "paid" | "contact"
- pricing_details: Array of {plan, price, features[]} — leave empty if unknown
- skill_level: "beginner" | "intermediate" | "advanced"
- has_api: boolean
- platforms: Array of "web" | "mobile" | "desktop" | "api" | "plugin" | "cli"
- features: Array of key features (max 15)
- integrations: Array of integrations/platforms it works with (max 15)
- best_for: Array of ideal use cases (max 5)
- not_for: Array of when NOT to use this tool (max 5)
- editorial_verdict: A concise, opinionated 2-3 sentence take on this tool — who should use it, main strength, main weakness

Only output valid JSON, no markdown or explanation.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text)
    return enrichedToolSchema.parse(parsed)
  } catch (e) {
    console.error(`Enrichment failed for ${name}:`, e)
    return null
  }
}
