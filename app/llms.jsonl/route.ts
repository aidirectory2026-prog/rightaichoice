/**
 * Phase 13 D3.2 — /llms.jsonl : machine-readable JSON Lines catalog.
 *
 * One JSON object per line (first line = Dataset header with live freshness
 * counts; subsequent lines = SoftwareApplication records). Built for LLM/RAG
 * ingestion and data-catalog distribution — the most citable form of our data.
 */
import { loadDataset, buildLlmsJsonl } from '@/lib/geo/llms-dataset'

export const revalidate = 3600
export const runtime = 'nodejs'

export async function GET() {
  const ds = await loadDataset()
  return new Response(buildLlmsJsonl(ds), {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
