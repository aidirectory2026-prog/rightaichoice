import { z } from 'zod'
import { getAnthropicClient } from '@/lib/ai/anthropic'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { computeMatchScore, type MatchScore } from '@/lib/plan/match-score'
import { refinePrompt } from '@/lib/plan/refine-prompt'
import { searchStageTools, type MatchTier } from '@/lib/plan/stage-search'
import type { UserProfile } from '@/lib/plan/user-profile'
import {
  SKILL_LABELS,
  BUDGET_LABELS,
  TEAM_LABELS,
  INDUSTRY_LABELS,
  GOAL_LABELS,
} from '@/lib/plan/user-profile'

export const dynamic = 'force-dynamic'

const MODEL = 'claude-sonnet-4-6'

type PlanTool = {
  slug: string
  name: string
  tagline: string
  pricing: string
  rating: number
  reviewCount: number
  whyThisStage: string
  matchScore?: number
  matchReasons?: string[]
  matchWarnings?: string[]
  budgetFit?: 'fits' | 'over' | 'unknown'
  integrationMatches?: string[]
  whyForYou?: string
  sentimentScore?: string | null
  quickVerdict?: string | null
}

type PlanStage = {
  id: string
  name: string
  description: string
  why: string
  tools: PlanTool[]
  matchTier: MatchTier
}

const PLANNER_SYSTEM_PROMPT = `You are an expert AI project planner for RightAIChoice.

When a user describes a goal, project, or workflow they want to build or accomplish, you:
1. Break it down into logical stages/departments (3–6 stages depending on complexity)
2. For each stage, provide a clear name, description, and why it matters
3. For each stage, provide 2-3 short search keywords that would match AI tool names or categories (NOT long phrases — use terms like "video editor", "writing", "design", "automation")

## Input Tolerance (CRITICAL)
Always produce a plan. Never refuse, never ask for clarification, never output an
empty stages array. Users may send:
- Typos, slang, or fragmentary sentences ("make yt vid")
- Non-English or mixed-language input — translate in your head, then plan in English
- Metaphors or vague goals ("blow up my brand", "make money from AI") — pick the
  most common concrete interpretation and plan for that
- Single-word prompts ("podcast", "app") — treat as "start a <word>"
Infer the best-guess intent and decompose anyway. Your searchQuery/searchCategory
values MUST be English keywords matching real tool categories.

## Stage Decomposition Rules
- Be practical and specific (not generic)
- Each stage must be a distinct phase of work
- Name stages clearly: use action + noun format (e.g., "UI Design", "Content Creation", "Automation Setup")
- Stages should flow logically from first to last
- Keep searchQuery to 1-3 simple words that match tool names/categories

## Response Format
You MUST respond with ONLY valid JSON in this exact structure:
{
  "title": "Project plan title",
  "summary": "2-sentence summary of the plan",
  "stages": [
    {
      "id": "stage-1",
      "name": "Stage Name",
      "description": "What happens in this stage",
      "why": "Why this stage is important",
      "searchQuery": "simple keyword",
      "searchCategory": "optional category slug"
    }
  ]
}

IMPORTANT: Return ONLY the JSON. No markdown, no explanation outside the JSON.`

const profileSchema = z
  .object({
    skill: z.enum(['beginner', 'intermediate', 'expert']),
    budget: z.enum(['free', 'under_50', '50_200', 'over_200', 'no_limit']),
    team: z.enum(['solo', '2_5', '6_20', '20_plus']),
    industry: z.enum(['marketing', 'dev', 'design', 'sales', 'education', 'content', 'other']),
    goalType: z.enum(['build', 'automate', 'learn', 'create', 'research']),
    existingTools: z.array(z.string()).default([]),
  })
  .optional()
  .nullable()

const planSchema = z.object({
  query: z.string().trim().min(3, 'Query must be at least 3 characters').max(500),
  profile: profileSchema,
})

function profileToPromptContext(profile: UserProfile): string {
  return `User profile:
- Skill level: ${SKILL_LABELS[profile.skill]}
- Monthly budget: ${BUDGET_LABELS[profile.budget]}
- Team size: ${TEAM_LABELS[profile.team]}
- Role/Industry: ${INDUSTRY_LABELS[profile.industry]}
- Primary goal: ${GOAL_LABELS[profile.goalType]}
- Already uses: ${profile.existingTools.length > 0 ? profile.existingTools.join(', ') : 'none specified'}`
}

export async function POST(request: Request) {
  const rl = rateLimit('plan', request, { limit: 5, windowMs: 60_000 })
  if (!rl.ok) return rateLimitResponse(rl)

  try {
    const body = await request.json()
    const parsed = planSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { query, profile } = parsed.data

    const anthropic = getAnthropicClient()
    const supabase = await createClient()

    const profileContext = profile ? profileToPromptContext(profile) : ''
    const refined = refinePrompt(query)

    // Step 1: Get Claude to decompose the goal into stages (1 API call)
    const planResponse = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: PLANNER_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: profile
            ? `Create a detailed AI tool plan for: "${refined.normalizedGoal}"\n\n${profileContext}\n\nTailor the stages and keywords to match this user's skill, budget, and goal. If they're on a free budget, avoid enterprise-only workflows. If they're solo, skip team-collaboration stages.`
            : `Create a detailed AI tool plan for: "${refined.normalizedGoal}"`,
        },
      ],
    })

    const planText = planResponse.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')

    type RawStage = { id: string; name: string; description: string; why: string; searchQuery?: string; searchCategory?: string }
    type RawPlan = { title: string; summary: string; stages: RawStage[] }

    let plan: RawPlan

    try {
      const cleaned = planText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
      plan = JSON.parse(cleaned) as RawPlan
    } catch {
      return Response.json({ error: 'Failed to generate plan. Please try again.' }, { status: 500 })
    }

    // Step 2: Search tools for ALL stages in parallel (no Claude calls — just DB queries)
    // searchStageTools guarantees at least one tool per stage via a 4-tier cascade.
    const stagesWithTools = await Promise.all(
      plan.stages.map(async (stage) => {
        const { results, tier } = await searchStageTools({
          searchQuery: stage.searchQuery ?? stage.name,
          ...(stage.searchCategory ? { searchCategory: stage.searchCategory } : {}),
          fallbackKeywords: refined.intentKeywords,
        })

        const topTools = results.slice(0, 3)

        return {
          id: stage.id,
          name: stage.name,
          description: stage.description,
          why: stage.why,
          toolResults: topTools,
          matchTier: tier,
        }
      })
    )

    // Step 3: One single Claude call to generate personalized "why for you" reasons
    const toolSummaryInput = stagesWithTools
      .filter((s) => s.toolResults.length > 0)
      .map(
        (s) =>
          `Stage "${s.name}" (${s.description}):\n${s.toolResults.map((t) => `  - ${t.name}: ${t.tagline} [${t.pricing_type}, ${t.skill_level}]`).join('\n')}`
      )
      .join('\n\n')

    let reasons: Record<string, string> = {}

    if (toolSummaryInput) {
      try {
        const promptBody = profile
          ? `For the project "${query}", I have these tools matched to stages. Give each tool a personalized one-sentence reason (max 20 words) explaining why it fits THIS specific user based on their profile below. Reference their actual constraints (skill, budget, team, existing tools) when relevant.

${profileContext}

${toolSummaryInput}

Respond with ONLY a JSON object mapping "ToolName" to "reason string". Example: {"ChatGPT": "Free tier handles your solo content needs, and its simple UI matches your beginner level.", "Canva": "Works with your existing Notion setup and stays within your $50 budget."}`
          : `For the project "${query}", I have these tools matched to stages. Give a one-sentence reason (max 15 words) why each tool fits its stage.

${toolSummaryInput}

Respond with ONLY a JSON object mapping "ToolName" to "reason string". Example: {"ChatGPT": "Great for brainstorming and drafting initial content ideas", "Canva": "Quick professional designs without design skills"}`

        const reasonResponse = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 1500,
          messages: [{ role: 'user', content: promptBody }],
        })

        const reasonText = reasonResponse.content
          .filter((b) => b.type === 'text')
          .map((b) => (b as { type: 'text'; text: string }).text)
          .join('')

        try {
          const cleaned = reasonText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
          reasons = JSON.parse(cleaned)
        } catch {
          // Continue without reasons — not critical
        }
      } catch {
        // Continue without reasons — not critical
      }
    }

    // Step 4: Look up cached sentiment for matched tools (non-blocking)
    const allToolIds = stagesWithTools.flatMap((s) => s.toolResults.map((t) => t.id))
    let sentimentMap: Record<string, { sentiment_score: string; ai_verdict: string }> = {}

    if (allToolIds.length > 0) {
      try {
        const { data: sentimentData } = await supabase
          .from('tool_sentiment_cache')
          .select('tool_id, sentiment_score, ai_verdict')
          .in('tool_id', allToolIds)
          .eq('status', 'ready')

        if (sentimentData) {
          sentimentMap = Object.fromEntries(
            sentimentData.map((s: { tool_id: string; sentiment_score: string; ai_verdict: string }) => [s.tool_id, { sentiment_score: s.sentiment_score, ai_verdict: s.ai_verdict }])
          )
        }
      } catch {
        // Non-critical — continue without sentiment
      }
    }

    // Step 5: Assemble final response — compute match scores if profile is present
    const finalStages: PlanStage[] = stagesWithTools.map((stage) => {
      // Build tool list with match scores first, then sort so best match is ranked first
      const toolsWithScores = stage.toolResults.map((tool) => {
        const sentimentScore = sentimentMap[tool.id]?.sentiment_score ?? null
        const quickVerdict = sentimentMap[tool.id]?.ai_verdict
          ? sentimentMap[tool.id].ai_verdict.split('.')[0] + '.'
          : null

        let match: MatchScore | null = null
        if (profile) {
          match = computeMatchScore(
            {
              name: tool.name,
              pricing_type: tool.pricing_type,
              skill_level: tool.skill_level,
              best_for: tool.best_for,
              integrations: tool.integrations,
              sentimentScore,
            },
            profile
          )
        }

        const reason = reasons[tool.name] ?? ''
        return {
          slug: tool.slug,
          name: tool.name,
          tagline: tool.tagline,
          pricing: tool.pricing_type,
          rating: tool.avg_rating,
          reviewCount: tool.review_count,
          whyThisStage: reason,
          whyForYou: profile ? reason : undefined,
          sentimentScore,
          quickVerdict,
          matchScore: match?.score,
          matchReasons: match?.reasons,
          matchWarnings: match?.warnings,
          budgetFit: match?.budgetFit,
          integrationMatches: match?.integrationMatches,
          _score: match?.score ?? 0,
        }
      })

      // Re-rank by match score when profile is present (best match becomes Best Pick)
      if (profile) {
        toolsWithScores.sort((a, b) => b._score - a._score)
      }

      const tools: PlanTool[] = toolsWithScores.map(({ _score, ...t }) => {
        void _score
        return t
      })

      return {
        id: stage.id,
        name: stage.name,
        description: stage.description,
        why: stage.why,
        tools,
        matchTier: stage.matchTier,
      }
    })

    return Response.json({
      title: plan.title,
      summary: plan.summary,
      stages: finalStages,
    })
  } catch (error) {
    console.error('Plan API error:', error)
    // Friendly error messages — never expose raw API errors
    const message = error instanceof Error ? error.message : 'Unexpected error'
    if (message.includes('credit balance') || message.includes('billing') || message.includes('authentication') || message.includes('401')) {
      return Response.json(
        { error: 'AI service temporarily unavailable. Please try again later.' },
        { status: 503 }
      )
    }
    return Response.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
