import { callDeepSeek, stripJsonFences } from '@/lib/plan/deepseek'
import type { AllScrapeResults } from '@/lib/scrapers'

// DeepSeek (deepseek-chat, JSON mode) — Phase 9 Workstream S1 (2026-06-01).
// Switched off Anthropic Haiku: (1) "use DeepSeek everywhere" — the data
// layer's economics (~8× cheaper at parity on structured synthesis) now
// cover sentiment too; (2) it unblocks the live Market Sentiment Checker +
// the 26 new tools whose sentiment was soft-warning on Anthropic's 402.
// `response_format: json_object` forces valid JSON (replaces the manual
// fence-cleaning the Anthropic path needed). Same output contract — the
// display component (sentiment-synthesis.tsx) is untouched.

export type SynthesizedReport = {
  ai_verdict: string
  /** Premium report extras (Phase 9 S6 redesign) — optional for back-compat. */
  bottom_line?: string
  standout_quotes?: Array<{ text: string; source: string }>
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

  // Iterate every source that returned data (Reddit, HN, YouTube, Product Hunt,
  // App Store, Trustpilot). Empty/credential-less sources are simply omitted.
  for (const result of results.all) {
    if (result.posts.length === 0) continue

    const postTexts = result.posts
      .slice(0, 12)
      .map((p, i) => {
        const parts = [
          `[${i + 1}]`,
          p.title ? `T: ${p.title}` : '',
          `C: ${p.body.slice(0, 300)}`,
        ].filter(Boolean)
        return parts.join(' | ')
      })
      .join('\n')

    sections.push(`## ${result.source.toUpperCase()} (${result.posts.length} posts)\n${postTexts}`)
  }

  return sections.length > 0 ? sections.join('\n\n') : '(No community data was found for this tool across the scraped sources.)'
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
Synthesize ALL the above into a DETAILED, premium, paid-quality report. Be specific, data-rich, and genuinely useful — this report is sold to users, so depth and honesty matter. Return ONLY valid JSON matching this exact schema:

{
  "ai_verdict": "A thorough, honest executive summary (5-7 sentences) of what the community really thinks: overall reception, who it's great for, the main strengths, the recurring complaints, and whether it's worth it. Specific, not generic.",
  "bottom_line": "One punchy sentence — the single most important takeaway a buyer needs.",
  "standout_quotes": [{"text": "A representative, paraphrased real user opinion (positive or critical), 1-2 sentences", "source": "the kind of source, e.g. 'a developer in a community thread' or 'a reviewer'"}],
  "pros": ["6-8 specific strengths grounded in real user feedback, max 18 words each"],
  "cons": ["6-8 specific weaknesses/complaints grounded in real user feedback, max 18 words each"],
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

  const text = await callDeepSeek({
    system: SYSTEM_PROMPT,
    user: prompt,
    max_tokens: 4096,
    json: true,
  })

  let report: SynthesizedReport
  try {
    report = JSON.parse(stripJsonFences(text)) as SynthesizedReport
  } catch {
    // Retry once on parse failure (json_object mode makes this rare, but a
    // truncated/odd response can still slip through). Re-ask plainly.
    const retryText = await callDeepSeek({
      system: SYSTEM_PROMPT,
      user: `${prompt}\n\nYour previous response was not valid JSON. Return ONLY the JSON object — no markdown fences, no other text.`,
      max_tokens: 4096,
      json: true,
    })
    report = JSON.parse(stripJsonFences(retryText)) as SynthesizedReport
  }

  // Normalize: guard against a missing/short array from the model, then cap.
  if (!Array.isArray(report.pros)) report.pros = []
  if (!Array.isArray(report.cons)) report.cons = []
  if (report.pros.length > 8) report.pros = report.pros.slice(0, 8)
  if (report.cons.length > 8) report.cons = report.cons.slice(0, 8)

  return report
}
