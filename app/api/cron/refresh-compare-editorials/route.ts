import { NextResponse } from 'next/server'
import { validateCronSecret } from '@/lib/cron/auth'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { runCompareEditorialCascade } from '@/lib/cron/cascade-editorials'

export const maxDuration = 300

// Phase 8 cascade (2026-05-16):
// Daily 08:00 UTC. Picks top N most-stale editorial comparisons from
// v_stale_comparisons view (any compare where ANY tool was refreshed
// more recently than the compare's last_reviewed_at), regenerates the
// editorial fields (tldr/verdict/feature_analysis/pricing_analysis/
// use_cases/faqs) via DeepSeek, bumps last_reviewed_at.
//
// Compare-page-level facts (live pricing, integrations, ratings) are
// already rendered live from tools.* — this only refreshes the OPINION
// layer that was generated as text and goes stale when underlying tools
// change.

async function handle(request: Request) {
  const authError = validateCronSecret(request)
  if (authError) return authError

  const url = new URL(request.url)
  const batchParam = Number(url.searchParams.get('batch'))
  const batchSize =
    Number.isFinite(batchParam) && batchParam > 0 && batchParam <= 50 ? batchParam : 20

  try {
    const supabase = getAdminClient()
    const result = await runCompareEditorialCascade(supabase, batchSize)
    return NextResponse.json({ ...result, batchSize })
  } catch (e) {
    console.error('Cascade editorial error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return handle(request)
}

export async function GET(request: Request) {
  return handle(request)
}
