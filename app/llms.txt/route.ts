/**
 * Phase 13 D3.2 — /llms.txt generated LIVE from the database.
 *
 * Replaces the static public/llms.txt (frozen at "Generated 2026-05-28"). Now the
 * freshness line is real and current on every revalidate — our core GEO signal.
 */
import { loadDataset, buildLlmsTxt } from '@/lib/geo/llms-dataset'

export const revalidate = 3600
export const runtime = 'nodejs'

export async function GET() {
  const ds = await loadDataset()
  return new Response(buildLlmsTxt(ds), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
