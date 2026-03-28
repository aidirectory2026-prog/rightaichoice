import { getRecommendations } from '@/lib/data/recommendations'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { use_case, pricing_type, skill_level } = body as {
      use_case: string
      pricing_type?: string
      skill_level?: string
    }

    if (!use_case?.trim()) {
      return Response.json({ error: 'use_case is required' }, { status: 400 })
    }

    const result = await getRecommendations({ use_case, pricing_type, skill_level })
    return Response.json(result)
  } catch (error) {
    console.error('Recommend API error:', error)
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    return Response.json({ error: message }, { status: 500 })
  }
}
