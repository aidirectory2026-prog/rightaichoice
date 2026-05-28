import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAnthropicClient } from '@/lib/ai/anthropic'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

type RouteContext = { params: Promise<{ slug: string }> }

// Phase 9.0.3 — hardened. Previously this route was unauthenticated,
// unthrottled, and built the entire Claude prompt from the REQUEST BODY,
// allowing (a) unbounded cost-amplification on our key and (b) prompt
// injection (caller fully controlled the model input). It now:
//   - rate-limits per IP (5/min)
//   - loads tool + reviews from the DB by slug (ignores any client-sent data)
//   - lazy-inits the Anthropic client (no module-load crash on missing key)
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { slug } = await params

  const limit = rateLimit('ai-panel', req, { limit: 5, windowMs: 60_000 })
  if (!limit.ok) return rateLimitResponse(limit)

  const supabase = await createClient()

  const { data: tool } = await supabase
    .from('tools')
    .select('id, name, tagline, description, pricing_type, skill_level, features, has_api, platforms')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!tool) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  }

  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating, pros, cons, use_case')
    .eq('tool_id', tool.id)
    .order('rating', { ascending: false })
    .limit(5)

  const reviewContext =
    reviews && reviews.length > 0
      ? `\nUser reviews (${reviews.length} shown):\n` +
        reviews
          .map(
            (r) =>
              `- Rating: ${r.rating}/5 | Pros: ${r.pros || 'N/A'} | Cons: ${r.cons || 'N/A'} | Use case: ${r.use_case || 'N/A'}`
          )
          .join('\n')
      : '\nNo user reviews yet.'

  const prompt = `You are an expert AI tool analyst. Analyze this tool and give a concise, honest assessment.

Tool: ${tool.name}
Tagline: ${tool.tagline}
Description: ${tool.description}
Pricing: ${tool.pricing_type}
Skill level: ${tool.skill_level}
Features: ${(tool.features ?? []).join(', ')}
Has API: ${tool.has_api}
Platforms: ${(tool.platforms ?? []).join(', ')}
${reviewContext}

Return ONLY valid JSON (no markdown, no code fences) in this exact shape:
{
  "verdict": "One sentence: who should use this and what for",
  "when_to_use": ["specific scenario 1", "specific scenario 2", "specific scenario 3"],
  "when_to_avoid": ["specific reason 1", "specific reason 2"],
  "best_for": ["user segment 1", "user segment 2", "user segment 3"],
  "sentiment": "positive" | "mixed" | "negative"
}

Be specific and honest. Base best_for on actual capabilities, not marketing.`

  try {
    const anthropic = getAnthropicClient()
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()
    const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')

    const parsed = JSON.parse(clean)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
