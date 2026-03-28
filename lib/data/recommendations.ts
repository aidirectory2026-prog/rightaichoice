import { getAnthropicClient } from '@/lib/ai/anthropic'
import { searchToolsForAI } from '@/lib/data/ai-search'
import type Anthropic from '@anthropic-ai/sdk'

export type RecommendationParams = {
  use_case: string
  pricing_type?: string // 'free' | 'freemium' | 'paid' | 'any'
  skill_level?: string  // 'beginner' | 'intermediate' | 'advanced' | 'any'
}

export type RecommendedTool = {
  slug: string
  name: string
  tagline: string
  pricing: string
  rating: number
  reviewCount: number
  reason: string
}

export type RecommendationResult = {
  tools: RecommendedTool[]
  summary: string
}

export async function getRecommendations(
  params: RecommendationParams
): Promise<RecommendationResult> {
  const { use_case, pricing_type, skill_level } = params

  // Step 1: DB search for candidate tools
  const candidates = await searchToolsForAI({
    query: use_case,
    pricing_type: pricing_type && pricing_type !== 'any' ? pricing_type : undefined,
    skill_level: skill_level && skill_level !== 'any' ? skill_level : undefined,
  })

  if (candidates.length === 0) {
    return {
      tools: [],
      summary: 'No tools found matching your criteria. Try broadening your filters.',
    }
  }

  // Step 2: Ask Claude to rank + explain relevance
  const anthropic = getAnthropicClient()

  const toolsContext = candidates
    .map(
      (t, i) =>
        `${i + 1}. ${t.name} (slug: ${t.slug})
   Tagline: ${t.tagline}
   Pricing: ${t.pricing_type}
   Skill level: ${t.skill_level}
   Rating: ${t.avg_rating}/5 (${t.review_count} reviews)
   Categories: ${t.categories.join(', ')}
   Tags: ${t.tags.join(', ')}
   Description: ${t.description.slice(0, 150)}`
    )
    .join('\n\n')

  const contextLines = [
    `Use case: ${use_case}`,
    pricing_type && pricing_type !== 'any' ? `Budget preference: ${pricing_type}` : null,
    skill_level && skill_level !== 'any' ? `Experience level: ${skill_level}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const prompt = `You are an AI tool recommendation expert for RightAIChoice. A user needs personalized tool recommendations.

User context:
${contextLines}

Available tools from our database:
${toolsContext}

Select the best 4-5 tools for this user. For each, write a 1-2 sentence reason explaining specifically why it fits their use case, budget, and skill level. Be concrete, not generic.

Return ONLY valid JSON (no markdown, no explanation outside the JSON):
{
  "summary": "One sentence summary of your recommendations",
  "ranked": [
    { "slug": "tool-slug", "reason": "Specific 1-2 sentence reason tied to the user's context" }
  ]
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    // Parse JSON — strip any accidental code block markers
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    const parsed = JSON.parse(jsonMatch[0]) as {
      summary: string
      ranked: { slug: string; reason: string }[]
    }

    const slugToTool = new Map(candidates.map((t) => [t.slug, t]))

    const tools: RecommendedTool[] = parsed.ranked
      .map(({ slug, reason }) => {
        const tool = slugToTool.get(slug)
        if (!tool) return null
        return {
          slug: tool.slug,
          name: tool.name,
          tagline: tool.tagline,
          pricing: tool.pricing_type,
          rating: tool.avg_rating,
          reviewCount: tool.review_count,
          reason,
        }
      })
      .filter((t): t is RecommendedTool => t !== null)

    return { tools, summary: parsed.summary ?? '' }
  } catch {
    // Fallback: return top candidates without reasoning
    const tools: RecommendedTool[] = candidates.slice(0, 5).map((t) => ({
      slug: t.slug,
      name: t.name,
      tagline: t.tagline,
      pricing: t.pricing_type,
      rating: t.avg_rating,
      reviewCount: t.review_count,
      reason: '',
    }))
    return { tools, summary: `Top tools for "${use_case}"` }
  }
}
