import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

type RouteContext = { params: Promise<{ slug: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { slug } = await params

  const body = await req.json().catch(() => null)
  if (!body || !body.tool) {
    return NextResponse.json({ error: 'Missing tool data' }, { status: 400 })
  }

  const { tool, reviews } = body as {
    tool: {
      name: string
      tagline: string
      description: string
      pricing_type: string
      skill_level: string
      features: string[]
      has_api: boolean
      platforms: string[]
    }
    reviews: Array<{ pros: string; cons: string; rating: number; use_case: string }>
  }

  const reviewContext =
    reviews && reviews.length > 0
      ? `\nUser reviews (${reviews.length} total):\n` +
        reviews
          .slice(0, 5)
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
