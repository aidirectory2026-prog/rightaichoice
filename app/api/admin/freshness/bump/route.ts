/**
 * 1.1 freshness-cascade — admin "Bump freshness" endpoint.
 *
 * Lets a manager mark a tool's pages as freshly reviewed when they ship a
 * non-DB editorial change (e.g., copy polish in a rendered component).
 *
 * Behaviour:
 *   • Calls the SQL function `propagate_freshness(tool_slug, 'admin_manual',
 *     event, reason)` — fans out to every page mentioning the tool.
 *   • Triggers immediate revalidatePath for `/tools/<slug>` so the tool page
 *     refreshes within seconds (other pages cascade on the next hourly cron).
 *
 * Required body:
 *   { tool_slug: string, reason: string (≥10 chars), event?: string }
 *
 * Auth: must be a signed-in user with profiles.is_admin = true.
 */
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { checkAdmin } from '@/lib/admin/require-admin'
import { propagateFreshness } from '@/lib/seo/freshness'

export async function POST(req: NextRequest) {
  const gate = await checkAdmin()
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: 403 })
  }

  let body: { tool_slug?: string; reason?: string; event?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 })
  }

  const toolSlug = (body.tool_slug ?? '').trim()
  const reason = (body.reason ?? '').trim()
  const event = body.event ? String(body.event).slice(0, 64) : 'admin_bump'

  if (!toolSlug) {
    return NextResponse.json({ error: 'tool_slug required' }, { status: 400 })
  }
  if (reason.length < 10) {
    return NextResponse.json(
      { error: 'reason must be at least 10 characters' },
      { status: 400 }
    )
  }

  const touched = await propagateFreshness(toolSlug, {
    source: 'admin_manual',
    event,
    reason,
  })

  // Immediate revalidate for the tool's own page; cascade-hubs handles the
  // rest on its next fire.
  try {
    revalidatePath(`/tools/${toolSlug}`)
  } catch (err) {
    console.warn(
      `[admin/freshness/bump] revalidatePath failed:`,
      (err as Error).message
    )
  }

  return NextResponse.json({
    success: true,
    tool_slug: toolSlug,
    pages_touched: touched,
    reason,
    event,
  })
}
