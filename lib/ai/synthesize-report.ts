import { getAnthropicClient } from './anthropic'
import type { AllScrapeResults } from '@/lib/scrapers'

const MODEL = 'claude-sonnet-4-6'

export type SynthesizedReport = {
  ai_verdict: string
  pros: string[]
  cons: string[]
  sentiment_score: 'positive' | 'mixed' | 'negative'
  sentiment_breakdown: Record<string, number>
  themes: Array<{ theme: string; sources: string[] }>
  best_for: string[]
  not_for: string[]
  pricing_analysis: {
    tiers: Array<{ name: string; price: string; features: string[] }>
    hidden_costs: string[]
    verdict: string
  }
  community_buzz: {
    volume: 'high' | 'medium' | 'low'
    trend: 'up' | 'stable' | 'down'
    topics: string[]
  }
  learning_curve: {
    time_to_start: string
    skill_level: 'beginner' | 'intermediate' | 'advanced'
    hurdles: string[]
  }
  integration_insights: Array<{
    tool: string
    sentiment: 'positive' | 'mixed' | 'negative'
    note: string
  }>
}

type ToolContext = {
  name: string
  tagline: string
  description: string
  pricing_type: string
  pricing_details?: string | null
  skill_level: string
  features?: string[]
  integrations?: string[]
  platforms?: string[]
}

function buildScrapeContext(results: AllScrapeResults): string {
  const sections: string[] = []

  for (const source of ['reddit', 'twitter', 'quora', 'g2'] as const) {
    const result = results[source]
    if (result.posts.length === 0) {
      sections.push(`## ${source.toUpperCase()} — No data available`)
      continue
    }

    const postTexts = result.posts
      .slice(0, 15)
      .map((p, i) => {
        const parts = [
          `[${i + 1}]`,
          p.title ? `Title: ${p.title}` : '',
          `Content: ${p.body.slice(0, 500)}`,
          p.score !== undefined ? `Score: ${p.score}` : '',
        ].filter(Boolean)
        return parts.join(' | ')
      })
      .join('\n')

    sections.push(`## ${source.toUpperCase()} (${result.posts.length} posts)\n${postTexts}`)
  }

  return sections.join('\n\n')
}

const SYSTEM_PROMPT = `You are an expert AI tool analyst for RightAIChoice. You synthesize community feedback from Reddit, X/Twitter, Quora, and G2 into honest, actionable tool reports.

Rules:
- Be honest and specific — never generic marketing language
- Base everything on the actual scraped data provided
- If data is sparse for some sections, say so honestly rather than making things up
- Pros and cons must be specific and based on real user feedback
- Sentiment scores should reflect actual community opinion, not tool marketing
- Each pro/con should be a single clear sentence, max 15 words
- Themes should capture the dominant narratives in community discussion`

/**
 * Takes scraped data from all sources + tool metadata, and synthesizes
 * a full 10-section report via a single Claude call.
 */
export async function synthesizeReport(
  tool: ToolContext,
  scrapeResults: AllScrapeResults
): Promise<SynthesizedReport> {
  const anthropic = getAnthropicClient()
  const scrapeContext = buildScrapeContext(scrapeResults)

  const prompt = `Analyze this AI tool and synthesize a comprehensive report from community feedback.

## TOOL INFO
Name: ${tool.name}
Tagline: ${tool.tagline}
Description: ${tool.description}
Pricing: ${tool.pricing_type}${tool.pricing_details ? ` — ${tool.pricing_details}` : ''}
Skill Level: ${tool.skill_level}
Features: ${(tool.features ?? []).join(', ') || 'N/A'}
Integrations: ${(tool.integrations ?? []).join(', ') || 'N/A'}
Platforms: ${(tool.platforms ?? []).join(', ') || 'N/A'}

## COMMUNITY DATA (${scrapeResults.totalPosts} posts from ${scrapeResults.sourcesSucceeded.join(', ') || 'no sources'})
${scrapeResults.sourcesFailed.length > 0 ? `(Failed sources: ${scrapeResults.sourcesFailed.join(', ')})` : ''}

${scrapeContext}

## TASK
Synthesize ALL the above into a structured report. Return ONLY valid JSON matching this exact schema:

{
  "ai_verdict": "One honest paragraph (3-4 sentences) summarizing who should use this tool and why, based on community feedback",
  "pros": ["5 specific pros based on user feedback, max 15 words each"],
  "cons": ["5 specific cons based on user feedback, max 15 words each"],
  "sentiment_score": "positive" | "mixed" | "negative",
  "sentiment_breakdown": {"reddit": 0.0-1.0, "twitter": 0.0-1.0, "quora": 0.0-1.0, "g2": 0.0-1.0},
  "themes": [{"theme": "Key community narrative", "sources": ["reddit", "twitter"]}],
  "best_for": ["Specific user segment 1", "Specific user segment 2", "Specific use case"],
  "not_for": ["Specific user segment who should avoid", "Specific use case it's bad for"],
  "pricing_analysis": {
    "tiers": [{"name": "Free/Pro/Enterprise", "price": "$X/mo", "features": ["key feature"]}],
    "hidden_costs": ["Any hidden costs users complain about"],
    "verdict": "One sentence: is it worth it and for whom"
  },
  "community_buzz": {
    "volume": "high" | "medium" | "low",
    "trend": "up" | "stable" | "down",
    "topics": ["What people are discussing"]
  },
  "learning_curve": {
    "time_to_start": "5 minutes / A few hours / Days of setup",
    "skill_level": "beginner" | "intermediate" | "advanced",
    "hurdles": ["Specific hurdle users mention"]
  },
  "integration_insights": [{"tool": "Zapier/Slack/etc", "sentiment": "positive" | "mixed" | "negative", "note": "Brief insight"}]
}

For sentiment_breakdown, use 0.0-1.0 where 1.0 is fully positive. Set to 0 for sources with no data.
If you don't have enough data for a section, provide your best assessment based on available info and the tool's characteristics.
Return ONLY the JSON — no markdown fences, no explanation.`

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')

  const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

  let report: SynthesizedReport
  try {
    report = JSON.parse(cleaned) as SynthesizedReport
  } catch {
    // Retry once on parse failure
    const retry = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: text },
        { role: 'user', content: 'Your response was not valid JSON. Please return ONLY the JSON object, no markdown fences or other text.' },
      ],
    })

    const retryText = retry.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    const retryCleaned = retryText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
    report = JSON.parse(retryCleaned) as SynthesizedReport
  }

  // Ensure arrays have correct length
  if (report.pros.length > 5) report.pros = report.pros.slice(0, 5)
  if (report.cons.length > 5) report.cons = report.cons.slice(0, 5)

  return report
}
