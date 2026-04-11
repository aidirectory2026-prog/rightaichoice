import { z } from 'zod'
import { getAnthropicClient } from '@/lib/ai/anthropic'
import { searchToolsForAI } from '@/lib/data/ai-search'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

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
}

type PlanStage = {
  id: string
  name: string
  description: string
  why: string
  tools: PlanTool[]
}

const PLANNER_SYSTEM_PROMPT = `You are an expert AI project planner for RightAIChoice.

When a user describes a goal, project, or workflow they want to build or accomplish, you:
1. Break it down into logical stages/departments (3–6 stages depending on complexity)
2. For each stage, provide a clear name, description, and why it matters
3. For each stage, provide 2-3 short search keywords that would match AI tool names or categories (NOT long phrases — use terms like "video editor", "writing", "design", "automation")

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

const planSchema = z.object({
  query: z.string().trim().min(3, 'Query must be at least 3 characters').max(500),
})

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

    const { query } = parsed.data

    const anthropic = getAnthropicClient()

    // Step 1: Get Claude to decompose the goal into stages (1 API call)
    const planResponse = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: PLANNER_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Create a detailed AI tool plan for: "${query.trim()}"`,
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
    const stagesWithTools = await Promise.all(
      plan.stages.map(async (stage) => {
        const results = await searchToolsForAI({
          query: stage.searchQuery ?? stage.name,
          ...(stage.searchCategory ? { category: stage.searchCategory } : {}),
        })

        const topTools = results.slice(0, 3)

        return {
          id: stage.id,
          name: stage.name,
          description: stage.description,
          why: stage.why,
          toolResults: topTools,
        }
      })
    )

    // Step 3: One single Claude call to generate "why" for all tools at once
    const toolSummaryInput = stagesWithTools
      .filter((s) => s.toolResults.length > 0)
      .map(
        (s) =>
          `Stage "${s.name}" (${s.description}):\n${s.toolResults.map((t) => `  - ${t.name}: ${t.tagline}`).join('\n')}`
      )
      .join('\n\n')

    let reasons: Record<string, string> = {}

    if (toolSummaryInput) {
      try {
        const reasonResponse = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 1500,
          messages: [
            {
              role: 'user',
              content: `For the project "${query}", I have these tools matched to stages. Give a one-sentence reason (max 15 words) why each tool fits its stage.

${toolSummaryInput}

Respond with ONLY a JSON object mapping "ToolName" to "reason string". Example: {"ChatGPT": "Great for brainstorming and drafting initial content ideas", "Canva": "Quick professional designs without design skills"}`,
            },
          ],
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

    // Step 4: Assemble final response
    const finalStages: PlanStage[] = stagesWithTools.map((stage) => ({
      id: stage.id,
      name: stage.name,
      description: stage.description,
      why: stage.why,
      tools: stage.toolResults.map((tool) => ({
        slug: tool.slug,
        name: tool.name,
        tagline: tool.tagline,
        pricing: tool.pricing_type,
        rating: tool.avg_rating,
        reviewCount: tool.review_count,
        whyThisStage: reasons[tool.name] ?? '',
      })),
    }))

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
