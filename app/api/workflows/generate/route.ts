import { getAnthropicClient } from '@/lib/ai/anthropic'
import { createClient } from '@/lib/supabase/server'
import type Anthropic from '@anthropic-ai/sdk'
import type { WorkflowStep } from '@/types'

export const dynamic = 'force-dynamic'
const MODEL = 'claude-sonnet-4-6'

type GeneratedWorkflow = {
  title: string
  description: string
  steps: WorkflowStep[]
}

export async function POST(request: Request) {
  try {
    const { goal } = (await request.json()) as { goal: string }
    if (!goal?.trim()) {
      return Response.json({ error: 'goal is required' }, { status: 400 })
    }

    // Fetch all published tools to give Claude grounded options
    const supabase = await createClient()
    const { data: tools } = await supabase
      .from('tools')
      .select('name, slug, tagline, pricing_type, skill_level, tool_categories(categories(name))')
      .eq('is_published', true)
      .order('view_count', { ascending: false })

    if (!tools || tools.length === 0) {
      return Response.json({ error: 'Could not load tools from database' }, { status: 500 })
    }

    const toolsList = tools
      .map((t) => {
        const cats = (
          t.tool_categories as unknown as { categories: { name: string } }[]
        )
          ?.map((tc) => tc.categories?.name)
          .filter(Boolean)
          .join(', ')
        return `- ${t.name} (slug: ${t.slug}) — ${t.tagline} [${t.pricing_type}] [${cats}]`
      })
      .join('\n')

    const prompt = `You are a workflow architect for RightAIChoice, an AI tool discovery platform.

A user wants to accomplish this goal: "${goal.trim()}"

Available AI tools (you MUST only use slugs from this list):
${toolsList}

Create a practical 4-6 step workflow to achieve this goal. Each step should:
- Have a clear, action-oriented name
- Describe concretely what to do in that step
- Use ONE tool from the list above
- Explain in one sentence why that tool is the best fit for this step

Important: use realistic, useful workflows — not generic or vague steps.

Return ONLY valid JSON with no markdown fencing:
{
  "title": "Short descriptive workflow title (max 10 words)",
  "description": "2-3 sentences summarizing what this workflow achieves and who it's for",
  "steps": [
    {
      "step": 1,
      "name": "Action-oriented step name",
      "description": "What to do and what output you get (1-2 sentences)",
      "tool_slug": "slug-from-list",
      "tool_name": "Tool Name",
      "why": "Why this specific tool is best for this step"
    }
  ]
}`

    const anthropic = getAnthropicClient()
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    // Strip any accidental code fencing
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return Response.json({ error: 'Failed to generate workflow. Please try again.' }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0]) as GeneratedWorkflow

    // Validate slugs exist in our tool list
    const validSlugs = new Set(tools.map((t) => t.slug))
    const validSteps = parsed.steps.filter((s) => validSlugs.has(s.tool_slug))

    return Response.json({
      title: parsed.title,
      description: parsed.description,
      goal: goal.trim(),
      steps: validSteps,
    })
  } catch (error) {
    console.error('Workflow generate error:', error)
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    return Response.json({ error: message }, { status: 500 })
  }
}
