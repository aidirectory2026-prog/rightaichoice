import { z } from 'zod'
import { getRecommendations } from '@/lib/data/recommendations'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const recommendSchema = z.object({
  use_case: z.string().trim().min(3, 'Use case must be at least 3 characters').max(500),
  pricing_type: z.enum(['free', 'freemium', 'paid', 'enterprise']).optional(),
  skill_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
})

export async function POST(request: Request) {
  const rl = rateLimit('recommend', request, { limit: 20, windowMs: 60_000 })
  if (!rl.ok) return rateLimitResponse(rl)

  try {
    const body = await request.json()
    const parsed = recommendSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { use_case, pricing_type, skill_level } = parsed.data

    const result = await getRecommendations({ use_case, pricing_type, skill_level })
    return Response.json(result)
  } catch (error) {
    console.error('Recommend API error:', error)
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    return Response.json({ error: message }, { status: 500 })
  }
}
