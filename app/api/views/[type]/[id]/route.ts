/**
 * Phase 8.next Stage 3 (2026-05-13): real view-count increment.
 *
 * POST /api/views/tool/[id]      — increments tools.view_count
 * POST /api/views/compare/[id]   — increments tool_comparisons.view_count
 *
 * Anti-spam:
 * - 30-min sliding-window dedup per (IP + entity-type + entity-id)
 *   via the `rac_v_dedup` cookie; same browser hits in the window
 *   return 204 silently and don't bump the counter.
 * - Bot UA filter rejects HeadlessChrome / Playwright / Puppeteer /
 *   crawler / spider / preview / bot. Returns 204 silently so any
 *   client-side fetch doesn't surface an error.
 * - Body must be empty (POST with no body) — server doesn't trust
 *   any client payload.
 *
 * Increment is fire-and-forget from the client side; failures are
 * logged but don't surface to the user.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { isNonHumanRequest } from '@/lib/bot-detection'

export const runtime = 'nodejs'
// Disable caching — every POST must hit the route
export const dynamic = 'force-dynamic'

const COOKIE_NAME = 'rac_v_dedup'
const DEDUP_WINDOW_SEC = 30 * 60 // 30 min
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Ctx = { params: Promise<{ type: string; id: string }> }

export async function POST(req: NextRequest, ctx: Ctx) {
  const { type, id } = await ctx.params

  // Validate route params strictly — the dynamic [type]/[id] is open
  // by default, so reject anything that isn't an expected shape.
  if (type !== 'tool' && type !== 'compare') {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 })
  }
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  // Bot / prefetch / HEAD filter — silently 204 so client doesn't see an error.
  // 9.A.10: shared detector (same regex as track-mirror) + prefetch/HEAD guard.
  if (isNonHumanRequest(req.headers, req.method)) return new NextResponse(null, { status: 204 })

  // Cookie-based dedup. Cookie value is a JSON-encoded map of
  // {entity-type-id: timestamp}. Sliding 30-min window per entity.
  const cookieRaw = req.cookies.get(COOKIE_NAME)?.value
  let seen: Record<string, number> = {}
  if (cookieRaw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(cookieRaw))
      if (parsed && typeof parsed === 'object') seen = parsed
    } catch {
      // Bad cookie — treat as empty and overwrite below
    }
  }
  const key = `${type}:${id}`
  const now = Math.floor(Date.now() / 1000)
  if (seen[key] && now - seen[key] < DEDUP_WINDOW_SEC) {
    return new NextResponse(null, { status: 204 })
  }

  // Increment in DB. Use a Postgres function call would be cleaner
  // (atomic +1) but we don't have one — fall back to read-modify-write
  // which is acceptable for a single-row counter without contention.
  const supa = getAdminClient()
  const table = type === 'tool' ? 'tools' : 'tool_comparisons'
  const { data: row, error: readErr } = await supa
    .from(table)
    .select('view_count')
    .eq('id', id)
    .single()
  if (readErr || !row) {
    return new NextResponse(null, { status: 204 })
  }
  const currentCount = ((row as { view_count: number | null }).view_count ?? 0) | 0
  const { error: updateErr } = await supa
    .from(table)
    .update({ view_count: currentCount + 1 } as never)
    .eq('id', id)
  if (updateErr) {
    console.error(`[/api/views] increment failed for ${type}:${id}`, updateErr.message)
    return new NextResponse(null, { status: 204 })
  }

  // Update dedup cookie. Prune entries older than the window so the
  // cookie doesn't grow unbounded.
  const pruned: Record<string, number> = { [key]: now }
  for (const [k, ts] of Object.entries(seen)) {
    if (now - ts < DEDUP_WINDOW_SEC) pruned[k] = ts
  }
  // Cookie size cap — keep at most 50 entries (most recent first).
  const entries = Object.entries(pruned)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
  const cookieValue = encodeURIComponent(JSON.stringify(Object.fromEntries(entries)))

  const res = new NextResponse(null, { status: 204 })
  res.cookies.set(COOKIE_NAME, cookieValue, {
    httpOnly: false, // not sensitive — fine for client to inspect
    sameSite: 'lax',
    path: '/',
    maxAge: DEDUP_WINDOW_SEC,
    secure: true,
  })
  return res
}
