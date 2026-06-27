/**
 * Phase 13 D3.2 — /llms-full.txt generated LIVE from the database.
 *
 * Full per-tool markdown dump with real per-tool last-verified dates and a live
 * freshness banner. Replaces the static public/llms-full.txt.
 */
import { loadDataset, buildLlmsFullTxt } from '@/lib/geo/llms-dataset'

export const revalidate = 3600
export const runtime = 'nodejs'

export async function GET() {
  const ds = await loadDataset()
  return new Response(buildLlmsFullTxt(ds), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
