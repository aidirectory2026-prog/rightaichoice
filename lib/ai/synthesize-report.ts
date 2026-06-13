import { callDeepSeek, stripJsonFences } from '@/lib/plan/deepseek'
import type { AllScrapeResults } from '@/lib/scrapers'
import { sourceLabel } from '@/lib/scrapers/source-labels'

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
  standout_quotes?: Array<{ text: string; source: string; sentiment?: 'positive' | 'critical' | 'mixed' }>
  /** Phase 9 S8 depth pass — optional for back-compat with older cached reports. */
  scorecard?: {
    overall: number
    value: number
    ease_of_use: number
    support: number
    reliability: number
    performance: number
  }
  red_flags?: Array<{ title: string; detail: string; severity: 'low' | 'medium' | 'high' }>
  momentum?: {
    direction: 'rising' | 'steady' | 'cooling'
    summary: string
    drivers: string[]
  }
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

  // Iterate every source that returned data. Empty/credential-less sources are
  // simply omitted. Section headers use the human label so the model attributes
  // quotes to "Stack Overflow"/"Hacker News", not "STACKOVERFLOW"/"HN".
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

    sections.push(`## ${sourceLabel(result.source)} (${result.posts.length} posts)\n${postTexts}`)
  }

  return sections.length > 0 ? sections.join('\n\n') : '(No community data was found for this tool across the scraped sources.)'
}

const SYSTEM_PROMPT = `You are an expert AI tool analyst for RightAIChoice. You synthesize real community feedback — from Hacker News, Reddit, Stack Overflow, GitHub, Product Hunt, the App Store, Bluesky, Lemmy, and YouTube — into honest, actionable tool reports.

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
  "ai_verdict": "A thorough, honest executive summary (6-9 sentences) of what the community really thinks: overall reception, who it's great for, the main strengths, the recurring complaints, how it compares to expectations, and whether it's worth it. Specific and data-grounded, never generic.",
  "bottom_line": "One punchy sentence — the single most important takeaway a buyer needs.",
  "scorecard": {"overall": 0-100, "value": 0-100, "ease_of_use": 0-100, "support": 0-100, "reliability": 0-100, "performance": 0-100},
  "momentum": {"direction": "rising" | "steady" | "cooling", "summary": "2 sentences on whether community sentiment/buzz is trending up, holding, or cooling recently — and the why behind it", "drivers": ["specific recent driver of the shift", "another driver"]},
  "standout_quotes": [{"text": "A representative, paraphrased real user opinion, 1-2 sentences", "source": "the kind of source, e.g. 'a developer in a community thread' or 'a reviewer'", "sentiment": "positive" | "critical" | "mixed"}],
  "red_flags": [{"title": "Short dealbreaker name", "detail": "1-2 sentences: the concrete risk and exactly who it bites", "severity": "low" | "medium" | "high"}],
  "pros": ["6-8 specific strengths grounded in real user feedback, max 18 words each"],
  "cons": ["6-8 specific weaknesses/complaints grounded in real user feedback, max 18 words each"],
  "sentiment_score": "positive" | "mixed" | "negative",
  "sentiment_breakdown": {"<source>": 0.0-1.0 for EACH source that appears in the COMMUNITY DATA above (use the exact source name from each section header, e.g. "Hacker News", "Stack Overflow", "GitHub", "Reddit", "Product Hunt", "App Store", "Bluesky", "Lemmy", "YouTube"); include only sources that actually have data},
  "themes": [{"theme": "Key community narrative", "sources": ["the source names that voiced this theme, matching the section headers"]}],
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

For sentiment_breakdown, use 0.0-1.0 where 1.0 is fully positive, keyed by the EXACT source names from the COMMUNITY DATA section headers. Only include sources that actually returned data — never invent a source that isn't in the data above.
For scorecard, every field is an integer 0-100 grounded in the actual sentiment (overall = the weighted gist; be honest — a flawed tool should score low on its weak axes, not a flat 70s).
For red_flags, surface 3-5 genuine dealbreakers/risks from real complaints — these are about reliability, support, lock-in, churn, data/safety, NOT the pricing hidden_costs (keep those separate).
For standout_quotes, return 6-8 quotes that mix genuine praise and genuine criticism so the reader sees both sides.
For momentum, judge the recent trajectory of opinion, not the all-time average.
Make every section deep, specific and decision-useful — this is a paid report; thin or generic output is a failure.
If you don't have enough data for a section, provide your best assessment based on available info and the tool's characteristics.
Return ONLY the JSON — no markdown fences, no explanation.`

  const text = await callDeepSeek({
    system: SYSTEM_PROMPT,
    user: prompt,
    max_tokens: 5200,
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

  // Depth-pass fields (optional): clamp the scorecard to 0-100 and bound arrays.
  if (report.scorecard) {
    const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(typeof n === 'number' ? n : 0)))
    report.scorecard = {
      overall: clamp(report.scorecard.overall),
      value: clamp(report.scorecard.value),
      ease_of_use: clamp(report.scorecard.ease_of_use),
      support: clamp(report.scorecard.support),
      reliability: clamp(report.scorecard.reliability),
      performance: clamp(report.scorecard.performance),
    }
  }
  if (!Array.isArray(report.red_flags)) report.red_flags = []
  if (report.red_flags.length > 5) report.red_flags = report.red_flags.slice(0, 5)
  if (Array.isArray(report.standout_quotes) && report.standout_quotes.length > 8) {
    report.standout_quotes = report.standout_quotes.slice(0, 8)
  }
  if (report.momentum && !Array.isArray(report.momentum.drivers)) report.momentum.drivers = []

  // Phase 10 #35 — guarantee every object the report UI reads exists, so a model
  // that omits a section can never throw an unguarded `.tiers`/`.topics` access
  // and white-screen the (error-boundary-less) report page.
  if (typeof report.ai_verdict !== 'string') report.ai_verdict = ''
  if (!['positive', 'mixed', 'negative'].includes(report.sentiment_score as string)) {
    report.sentiment_score = 'mixed'
  }
  if (!report.sentiment_breakdown || typeof report.sentiment_breakdown !== 'object') {
    report.sentiment_breakdown = {}
  }
  if (!Array.isArray(report.themes)) report.themes = []
  if (!Array.isArray(report.best_for)) report.best_for = []
  if (!Array.isArray(report.not_for)) report.not_for = []
  if (!report.pricing_analysis || typeof report.pricing_analysis !== 'object') {
    report.pricing_analysis = { tiers: [], hidden_costs: [], verdict: '' }
  } else {
    if (!Array.isArray(report.pricing_analysis.tiers)) report.pricing_analysis.tiers = []
    if (!Array.isArray(report.pricing_analysis.hidden_costs)) report.pricing_analysis.hidden_costs = []
    if (typeof report.pricing_analysis.verdict !== 'string') report.pricing_analysis.verdict = ''
  }
  if (!report.community_buzz || typeof report.community_buzz !== 'object') {
    report.community_buzz = { volume: 'low', trend: 'stable', topics: [] }
  } else if (!Array.isArray(report.community_buzz.topics)) {
    report.community_buzz.topics = []
  }
  if (!report.learning_curve || typeof report.learning_curve !== 'object') {
    report.learning_curve = { time_to_start: '', skill_level: 'beginner', hurdles: [] }
  } else if (!Array.isArray(report.learning_curve.hurdles)) {
    report.learning_curve.hurdles = []
  }
  if (!Array.isArray(report.integration_insights)) report.integration_insights = []

  return report
}
