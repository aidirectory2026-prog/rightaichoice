import { z } from 'zod'
import { getAnthropicClient } from '@/lib/ai/anthropic'
import { searchToolsForAI } from '@/lib/data/ai-search'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const MODEL = 'claude-sonnet-4-6'

type PlanStage = {
  id: string
  name: string
  description: string
  why: string
  tools: {
    slug: string
    name: string
    tagline: string
    pricing: string
    rating: number
    reviewCount: number
    whyThisStage: string
  }[]
}

type PlanResult = {
  title: string
  summary: string
  stages: PlanStage[]
}

const PLANNER_SYSTEM_PROMPT = `You are an expert AI project planner for RightAIChoice.

When a user describes a goal, project, or workflow they want to build or accomplish, you:
1. Break it down into logical stages/departments (3–8 stages depending on complexity)
2. For each stage, provide a clear name, description, and why it matters
3. For each stage, call search_tools to find the best AI tools

Your job is to think like a startup operator or product manager breaking down a project into its component parts.

## Stage Decomposition Rules
- Be practical and specific (not generic)
- Each stage must be a distinct phase of work
- Name stages clearly: use action + noun format (e.g., "UI Design", "Content Creation", "Automation Setup")
- Stages should flow logically from first to last

## Examples of good decomposition:

"Build a CRM tool":
→ Product Naming & Branding, UI/UX Design, Frontend Development, Backend & Database, Testing & QA, Deployment & DevOps, Marketing & Launch

"Create and automate Instagram content":
→ Content Strategy, Text & Caption Writing, Image/Video Generation, Video Editing, Scheduling & Automation, Analytics & Growth

"Start a YouTube channel":
→ Content Research & Planning, Script Writing, Video Recording, Video Editing, Thumbnail Design, SEO & Publishing, Analytics & Optimization

"Build an e-commerce store":
→ Store Design, Product Photography, Copywriting, Payment & Backend, Marketing Automation, Customer Support, Analytics

"Write and publish a book":
→ Idea Development, Research, Writing & Drafting, Editing & Proofreading, Cover Design, Publishing, Marketing

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
      "searchQuery": "keywords to search for tools in this stage",
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

    // Step 1: Get Claude to decompose the goal into stages
    const planResponse = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
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

    type RawStage = PlanStage & { searchQuery?: string; searchCategory?: string }
    type RawPlan = { title: string; summary: string; stages: RawStage[] }

    let plan: RawPlan

    try {
      // Strip markdown code fences if present
      const cleaned = planText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
      plan = JSON.parse(cleaned) as RawPlan
    } catch {
      return Response.json({ error: 'Failed to parse plan' }, { status: 500 })
    }

    // Step 2: For each stage, search for tools in parallel
    const stagesWithTools: PlanStage[] = await Promise.all(
      plan.stages.map(async (stage) => {
        const results = await searchToolsForAI({
          query: stage.searchQuery ?? stage.name,
          ...(stage.searchCategory ? { category: stage.searchCategory } : {}),
        })

        // Take top 3 results
        const topTools = results.slice(0, 3)

        // Ask Claude for a brief "why this tool for this stage" for each top tool
        const toolsWithReasons = await Promise.all(
          topTools.map(async (tool) => {
            // Short reasoning from the stage context
            const whyResponse = await anthropic.messages.create({
              model: MODEL,
              max_tokens: 80,
              messages: [
                {
                  role: 'user',
                  content: `In one sentence (max 20 words), why is ${tool.name} (${tool.tagline}) ideal for the "${stage.name}" stage when ${query}?`,
                },
              ],
            })
            const why = whyResponse.content
              .filter((b) => b.type === 'text')
              .map((b) => (b as { type: 'text'; text: string }).text)
              .join('')
              .trim()
              .replace(/^["']|["']$/g, '')

            return {
              slug: tool.slug,
              name: tool.name,
              tagline: tool.tagline,
              pricing: tool.pricing_type,
              rating: tool.avg_rating,
              reviewCount: tool.review_count,
              whyThisStage: why,
            }
          })
        )

        return {
          id: stage.id,
          name: stage.name,
          description: stage.description,
          why: stage.why,
          tools: toolsWithReasons,
        }
      })
    )

    return Response.json({
      title: plan.title,
      summary: plan.summary,
      stages: stagesWithTools,
    })
  } catch (error) {
    console.error('Plan API error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected error'
    return Response.json({ error: message }, { status: 500 })
  }
}
