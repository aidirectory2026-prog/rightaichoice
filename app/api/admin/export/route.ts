// Phase 8.h (2026-05-20) — CSV export endpoint for vendor data deliveries.
//
// Streams from Supabase (user_events + user_intent_profile) to CSV. Auth-
// gated to admins only via the same pattern as the rest of /admin/*.
//
// Supported export types (?type=):
//   user_intent_profile         — every user's full behavioural record
//   user_events&days=N          — raw event log, last N days
//   existing_tools_mentions     — tool name → N users currently using it
//   tool_audience&slug=<slug>   — every user who interacted with one tool

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { checkAdmin } from '@/lib/admin/require-admin'

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return ''
    if (Array.isArray(v)) return `"${v.join('|').replace(/"/g, '""')}"`
    if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`
    const s = String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [headers.join(',')]
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(','))
  return lines.join('\n')
}

function csvResponse(rows: Array<Record<string, unknown>>, filename: string): NextResponse {
  const body = toCsv(rows)
  return new NextResponse(body, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  })
}

export async function GET(req: NextRequest) {
  const gate = await checkAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 })

  const url = new URL(req.url)
  const type = url.searchParams.get('type') ?? 'user_intent_profile'
  const db = getAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  switch (type) {
    case 'user_intent_profile': {
      const { data, error } = await db.from('user_intent_profile').select('*').limit(20000)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return csvResponse((data ?? []) as Array<Record<string, unknown>>, `user_intent_profile_${today}.csv`)
    }
    case 'user_events': {
      const days = Math.max(1, Math.min(90, Number(url.searchParams.get('days') ?? '30')))
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await db
        .from('user_events')
        .select('event_name, distinct_id, user_id, auth_state, page_path, device_type, properties, created_at')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(50000)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return csvResponse((data ?? []) as Array<Record<string, unknown>>, `user_events_${days}d_${today}.csv`)
    }
    case 'existing_tools_mentions': {
      // Aggregate across all user_intent_profile rows. Returns tool_name + user_count.
      const { data, error } = await db
        .from('user_intent_profile')
        .select('existing_tools_history')
        .limit(20000)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const counts: Record<string, number> = {}
      for (const row of (data ?? []) as Array<{ existing_tools_history: string[] | null }>) {
        for (const name of row.existing_tools_history ?? []) {
          const key = name.toLowerCase().trim()
          if (!key) continue
          counts[key] = (counts[key] ?? 0) + 1
        }
      }
      const rows = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([tool_name, user_count]) => ({ tool_name, user_count }))
      return csvResponse(rows, `existing_tools_mentions_${today}.csv`)
    }
    case 'tool_audience': {
      const slug = url.searchParams.get('slug')
      if (!slug) return NextResponse.json({ error: 'Missing slug param' }, { status: 400 })
      // P2 (Cowork QA): slug is interpolated into a PostgREST .or() filter below,
      // so validate it to a strict slug charset to prevent filter-string injection.
      if (!/^[a-z0-9-]+$/.test(slug)) return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
      // Two queries: user_intent_profile where any array contains slug,
      // OR user_events where event has tool_slug=slug.
      const { data: profileMatches } = await db
        .from('user_intent_profile')
        .select('distinct_id, user_id, email_domain, plan_budget_segment, plan_team_segment, plan_industry_segment, plan_skill_segment, existing_tools_history, ai_chat_tools_mentioned, tools_visited_externally, tools_compared_with, saves_count, plans_completed_count, last_active_at')
        .or(`existing_tools_history.cs.{${slug}},ai_chat_tools_mentioned.cs.{${slug}},tools_visited_externally.cs.{${slug}}`)
        .limit(10000)
      const rows = (profileMatches ?? []) as Array<Record<string, unknown>>
      return csvResponse(rows, `tool_audience_${slug}_${today}.csv`)
    }
    // Phase 11 — export the same data the new admin tables show.
    case 'searches': {
      const days = Math.max(1, Math.min(365, Number(url.searchParams.get('days') ?? '30')))
      const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (db as any).rpc('insights_search_log', { p_cutoff: cutoff, p_end: null, p_include_bots: false, p_limit: 5000 })
      return csvResponse((data ?? []) as Array<Record<string, unknown>>, `searches_${days}d_${today}.csv`)
    }
    case 'plan_dropoff': {
      const days = Math.max(1, Math.min(365, Number(url.searchParams.get('days') ?? '30')))
      const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (db as any).rpc('insights_plan_dropoff', { p_cutoff: cutoff, p_end: null, p_include_bots: false })
      return csvResponse((data ?? []) as Array<Record<string, unknown>>, `plan_dropoff_${days}d_${today}.csv`)
    }
    case 'users_directory': {
      const days = Math.max(1, Math.min(365, Number(url.searchParams.get('days') ?? '30')))
      const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (db as any).rpc('insights_user_directory', { p_cutoff: cutoff, p_end: null, p_include_bots: false, p_filters: null, p_sort: 'events', p_limit: 5000, p_offset: 0 })
      const rows = ((data ?? []) as Array<Record<string, unknown>>).map(({ total_rows, ...rest }) => { void total_rows; return rest })
      return csvResponse(rows, `users_${days}d_${today}.csv`)
    }
    default:
      return NextResponse.json({ error: `Unknown export type: ${type}` }, { status: 400 })
  }
}
