// Phase 8.g.8 — per-user timeline at /admin/insights/user/[distinct_id]
// Phase 8.g.10 — session-grouped view + geo + Clarity/Mixpanel deep-links.
// Phase 10.5c.4 — journey merge: /admin/insights/journey/[id] redirects to
//   ?tab=journey here (Profile + Journey tabs).
// Phase 10.6.2 (2026-06-12) — Mixpanel-grade User 360:
//   - identity header from insights_user_profile_v2 (migration 158): linked
//     account + username, auth badge, lifetime/30d/session counts,
//     first-touch source chip, top countries/devices, returning flag.
//   - Journey tab now renders insights_user_sessions_v2: HYBRID sessions
//     (grouped by properties->>'session_id' when present — envelope epoch
//     2026-06-10 — else 30-min-gap fallback; each card labels its method)
//     as expandable cards with the ordered page flow, key-action counts and
//     the full per-event stream with raw-props expanders. Server-rendered
//     <details>; initial render capped at 200 events with ?ecap= "show
//     more" pagination.
//   - cross-links to the user's reviews / saved tools / plan intents.
//   - Clarity: there is NO code-verifiable per-session deep link — the real
//     player URL (https://clarity.microsoft.com/player/<project>/<clarityUserId>/<claritySessionId>,
//     community-documented) needs the Clarity USER id, which we never
//     capture, and the clarity_session_id column is currently all-NULL in
//     prod (the clarity('get','session') bridge in
//     components/providers/clarity-provider.tsx never returned a value).
//     So the header links to the docs-verified dashboard view
//     (projects/view/<id>/dashboard) and surfaces the stored session id as
//     copyable text when one exists. Fixing the bridge is a Phase 7 item.

import Link from 'next/link'
import {
  ChevronLeft, ExternalLink, Globe, MapPin, MonitorSmartphone,
  PlayCircle, Route, UserRound,
} from 'lucide-react'
import {
  getUserContentLinks,
  getUserProfile,
  getUserProfileV2,
  getUserSessionsV2,
  type SessionEventRow,
  type UserContentLinks,
  type UserProfile,
  type UserProfileV2,
  type UserSessionV2,
} from '../../queries'
import { LiveEventsTicker } from '@/components/admin/live-events-ticker'
import { classifyChannel, hostFromReferrer } from '@/lib/analytics/channels'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'User 360 — Admin' }

const MIXPANEL_PROJECT_ID = process.env.MIXPANEL_PROJECT_ID || '4014921'
const MIXPANEL_VIEW_ID = '4511061'
const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID

/** Initial total events rendered across session cards (then ?ecap= pages). */
const EVENTS_RENDER_CAP = 200

function fmtAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toISOString().replace('T', ' ').replace('Z', ' UTC')
}

function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec}s`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`
}

function refHost(ref: string | null): string | null {
  if (!ref) return null
  if (ref === 'direct' || ref === '') return ref || null
  try {
    return new URL(ref).hostname.replace(/^www\./, '')
  } catch {
    return ref
  }
}

// ── Identity header (insights_user_profile_v2) ─────────────────────

function HeaderStat({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="rounded bg-zinc-950 px-2.5 py-1.5" title={title}>
      <div className="text-[9px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-0.5 text-xs font-semibold text-zinc-200">{value}</div>
    </div>
  )
}

function IdentityHeader({ p, distinctId }: { p: UserProfileV2 | null; distinctId: string }) {
  const mixpanelUrl = `https://eu.mixpanel.com/project/${MIXPANEL_PROJECT_ID}/view/${MIXPANEL_VIEW_ID}/app/users#user/${encodeURIComponent(distinctId)}`
  const clarityUrl = CLARITY_PROJECT_ID
    ? `https://clarity.microsoft.com/projects/view/${CLARITY_PROJECT_ID}/dashboard?date_d=Last%2030%20days`
    : null
  const firstTouch = p
    ? [
        refHost(p.first_touch_referrer) && `from ${refHost(p.first_touch_referrer)}`,
        p.first_touch_landing && `landed ${p.first_touch_landing}`,
        p.first_touch_utm_source && `utm ${[p.first_touch_utm_source, p.first_touch_utm_medium, p.first_touch_utm_campaign].filter(Boolean).join('/')}`,
      ].filter(Boolean).join(' · ')
    : ''
  // 10.7a — first-touch channel chip: classify the sticky first-touch
  // attribution through the same lib/analytics/channels.ts taxonomy the
  // capture path stamps on events. Null when no attribution was captured
  // (visitor predates the 2026-06-10 attribution epoch).
  const ftChannel =
    p && (p.first_touch_referrer || p.first_touch_utm_source || p.first_touch_utm_medium)
      ? classifyChannel(
          hostFromReferrer(p.first_touch_referrer),
          p.first_touch_utm_medium,
          p.first_touch_utm_source,
        )
      : null

  return (
    <div className="mb-6 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="break-all font-mono text-xs text-zinc-200">{distinctId}</span>
        {p?.is_authed ? (
          <span className="rounded-full border border-emerald-700 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
            AUTHED{p.auth_provider ? ` · ${p.auth_provider}` : ''}
            {p.full_name || p.username ? ` · ${p.full_name || p.username}` : ''}
          </span>
        ) : (
          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
            ANONYMOUS
          </span>
        )}
        {p?.is_returning && (
          <span className="rounded-full border border-sky-800 bg-sky-950/40 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
            RETURNING
          </span>
        )}
        {ftChannel && (
          <span
            className="rounded-full border border-indigo-800 bg-indigo-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase text-indigo-300"
            title={`First-touch channel — sticky attribution classified via lib/analytics/channels.ts (source: ${ftChannel.source})`}
          >
            {ftChannel.channel} · {ftChannel.source}
          </span>
        )}
        {p && p.bot_events > 0 && (
          <span className="rounded-full border border-amber-800 bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold text-amber-300" title={`${p.bot_events} of their events are bot-flagged`}>
            🤖 {p.bot_events} bot events
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {clarityUrl && (
            <a
              href={clarityUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded border border-orange-900/70 bg-orange-950/30 px-2 py-1 text-xs text-orange-300 hover:text-orange-200"
              title={
                p?.last_clarity_session_id
                  ? `Opens the Clarity dashboard. Filter recordings manually with session id ${p.last_clarity_session_id} — Clarity has no code-verifiable per-session deep link (the player URL needs a Clarity user id we don't capture).`
                  : 'Opens the Clarity dashboard. No stored Clarity session id for this user yet (the capture bridge has never returned one), so no per-session link is possible.'
              }
            >
              <PlayCircle className="h-3 w-3" />
              Clarity
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <a
            href={mixpanelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded border border-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200"
            title="Open this user's profile in Mixpanel"
          >
            <Globe className="h-3 w-3" />
            Mixpanel
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {p?.last_clarity_session_id && (
        <div className="text-[10px] text-zinc-500">
          Clarity session id (most recent event):{' '}
          <span className="select-all font-mono text-zinc-300">{p.last_clarity_session_id}</span>
          {' '}— paste into the Clarity recordings filter.
        </div>
      )}

      {p ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <HeaderStat label="First seen" value={p.first_seen_at ? fmtAgo(p.first_seen_at) : '—'} title={p.first_seen_at ? fmtDateTime(p.first_seen_at) : undefined} />
            <HeaderStat label="Last seen" value={p.last_seen_at ? fmtAgo(p.last_seen_at) : '—'} title={p.last_seen_at ? fmtDateTime(p.last_seen_at) : undefined} />
            <HeaderStat label="Lifetime events" value={p.lifetime_events.toLocaleString()} />
            <HeaderStat label="Events (30d)" value={p.events_30d.toLocaleString()} />
            <HeaderStat label="Sessions" value={p.session_count.toLocaleString()} title="Hybrid count: distinct session_id values + 30-min-gap sessions for rows without one" />
            <HeaderStat
              label="Email"
              value={p.email ?? p.email_domain ?? '—'}
              title={p.email ? `${p.full_name ?? p.username ?? ''} · signed up via ${p.auth_provider ?? 'unknown'}`.trim() : 'No linked auth account (anonymous or pre-signup)'}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            {firstTouch && (
              <span className="rounded bg-zinc-950 px-2 py-1 text-zinc-300" title="First-touch attribution from user_intent_profile">
                ⚑ first touch: {firstTouch}
              </span>
            )}
            {p.top_countries.length > 0 && (
              <span className="flex items-center gap-1 rounded bg-zinc-950 px-2 py-1 text-zinc-300">
                <MapPin className="h-3 w-3 text-emerald-400" />
                {p.top_countries.map((c) => `${c.value} (${c.events})`).join(' · ')}
              </span>
            )}
            {p.top_devices.length > 0 && (
              <span className="flex items-center gap-1 rounded bg-zinc-950 px-2 py-1 text-zinc-300">
                <MonitorSmartphone className="h-3 w-3 text-emerald-400" />
                {p.top_devices.map((d) => `${d.value} (${d.events})`).join(' · ')}
              </span>
            )}
            {p.user_id && (
              <span className="rounded bg-zinc-950 px-2 py-1 font-mono text-zinc-400" title="Linked auth user id">
                user_id {p.user_id}
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="text-xs text-zinc-500">No events recorded for this distinct_id.</div>
      )}
    </div>
  )
}

// ── Traits panel (user_intent_profile) ─────────────────────────────

function ArrayList({ label, items }: { label: string; items: string[] | null }) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {items.slice(0, 30).map((item, i) => (
          <span key={i} className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-200">
            {item}
          </span>
        ))}
        {items.length > 30 && (
          <span className="text-xs text-zinc-500">+{items.length - 30} more</span>
        )}
      </div>
    </div>
  )
}

function TraitsPanel({ traits }: { traits: UserProfile | null }) {
  if (!traits) {
    return (
      <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-6 text-center text-xs text-zinc-500">
        No computed traits yet (user_intent_profile has no row for this visitor).
      </div>
    )
  }
  const counters: Array<{ label: string; value: number | null }> = [
    { label: 'Saves', value: traits.saves_count ?? 0 },
    { label: 'Comparisons', value: traits.comparisons_count ?? 0 },
    { label: 'Plans completed', value: traits.plans_completed_count ?? 0 },
    { label: 'Reviews', value: traits.reviews_count ?? 0 },
    { label: 'Searches', value: traits.searches_count ?? 0 },
    { label: 'Tool visits', value: traits.tools_visited_count ?? 0 },
    { label: 'Chat messages', value: traits.chat_messages_count ?? 0 },
  ]
  const segments: Array<[string, string | null]> = [
    ['Budget', traits.plan_budget_segment ?? null],
    ['Team', traits.plan_team_segment ?? null],
    ['Industry', traits.plan_industry_segment ?? null],
    ['Skill', traits.plan_skill_segment ?? null],
  ]
  return (
    <div className="mb-6 space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
        Computed traits (user_intent_profile)
      </div>
      <div className="flex flex-wrap gap-3">
        {counters.map((c) => (
          <div key={c.label} className="rounded bg-zinc-950 px-2 py-1 text-xs">
            <span className="text-zinc-400">{c.label}:</span>{' '}
            <span className="font-mono text-zinc-200">{c.value ?? 0}</span>
          </div>
        ))}
      </div>
      {segments.some(([, v]) => v) && (
        <div className="flex flex-wrap gap-3">
          {segments.map(([label, v]) => (
            <div key={label} className="rounded bg-zinc-950 px-2 py-1 text-xs">
              <span className="text-zinc-400">{label}:</span>{' '}
              <span className="text-emerald-300">{v ?? '—'}</span>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ArrayList label="Existing tools mentioned (vendor gold)" items={traits.existing_tools_history} />
        <ArrayList label="Tools clicked through (affiliate intent)" items={traits.tools_visited_externally} />
        <ArrayList label="AI-chat tool mentions" items={traits.ai_chat_tools_mentioned} />
        <ArrayList label="Tools compared (pairs)" items={traits.tools_compared_with} />
        <ArrayList label="Plan use cases entered" items={traits.plan_use_cases_submitted} />
        <ArrayList label="Reviews submitted for" items={traits.reviews_submitted_for} />
        <ArrayList label="Recent search queries" items={traits.all_search_queries_recent} />
      </div>
    </div>
  )
}

// ── Cross-links (their actual content rows) ────────────────────────

function ContentLinks({ links }: { links: UserContentLinks }) {
  const empty = links.reviews.length === 0 && links.savedTools.length === 0 && links.planIntents.length === 0
  if (empty) return null
  return (
    <div className="mb-6 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">Their content</div>
      {links.reviews.length > 0 && (
        <div>
          <div className="text-[10px] text-zinc-500">Reviews ({links.reviews.length})</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {links.reviews.map((r, i) => (
              <Link
                key={`${r.tool_slug}-${i}`}
                href={`/tools/${r.tool_slug}`}
                className="rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-200 hover:border-emerald-700"
                title={`Reviewed ${fmtDateTime(r.created_at)}`}
              >
                {r.tool_name} <span className="text-amber-300">{'★'.repeat(r.rating)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {links.savedTools.length > 0 && (
        <div>
          <div className="text-[10px] text-zinc-500">Saved tools ({links.savedTools.length})</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {links.savedTools.map((s, i) => (
              <Link
                key={`${s.tool_slug}-${i}`}
                href={`/admin/insights/tool/${s.tool_slug}`}
                className="rounded border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-200 hover:border-emerald-700"
                title={`Saved ${fmtDateTime(s.created_at)} — opens the admin tool drill-down`}
              >
                {s.tool_name}
              </Link>
            ))}
          </div>
        </div>
      )}
      {links.planIntents.length > 0 && (
        <div>
          <div className="text-[10px] text-zinc-500">
            Plan intents ({links.planIntents.length}) ·{' '}
            <Link href="/admin/plan-conversion" className="text-emerald-500 hover:text-emerald-300">
              plan conversion →
            </Link>
          </div>
          <div className="mt-1 space-y-1">
            {links.planIntents.map((p) => (
              <div key={p.id} className="rounded bg-zinc-950 px-2 py-1 text-xs text-zinc-300">
                <span className="text-zinc-500" title={fmtDateTime(p.created_at)}>{fmtAgo(p.created_at)}</span>
                {p.source_surface && <span className="text-zinc-500"> · {p.source_surface}</span>}
                {p.typed_goal && <span> · “{p.typed_goal.slice(0, 140)}{p.typed_goal.length > 140 ? '…' : ''}”</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Journey: sessions_v2 cards ─────────────────────────────────────

function SessionEventLine({ ev }: { ev: SessionEventRow }) {
  const propKeys = Object.keys(ev.properties ?? {})
  return (
    <div className="border-b border-zinc-900 px-3 py-1.5 last:border-b-0 hover:bg-zinc-900/30">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-emerald-300">{ev.event_name}</span>
          {ev.bot_likely && <span className="text-amber-400" title="bot">🤖</span>}
          {ev.source_kind === 'server' && (
            <span className="rounded bg-blue-900/40 px-1.5 py-0.5 text-[10px] text-blue-300">server</span>
          )}
        </div>
        <div className="whitespace-nowrap text-[10px] text-zinc-500" title={fmtDateTime(ev.created_at)}>
          {new Date(ev.created_at).toISOString().slice(11, 19)} UTC
        </div>
      </div>
      <div className="mt-0.5 flex items-center gap-3 text-[10px] text-zinc-500">
        {ev.page_path && <span>{ev.page_path}</span>}
        {ev.device_type && <span>· {ev.device_type}</span>}
        {ev.auth_state && <span>· {ev.auth_state}</span>}
      </div>
      {propKeys.length > 0 && (
        <details className="mt-0.5">
          <summary className="cursor-pointer text-[10px] text-zinc-500 hover:text-zinc-300">
            {propKeys.length} properties — expand
          </summary>
          <pre className="mt-1 overflow-x-auto rounded bg-zinc-950 p-2 text-[10px] text-zinc-300">
            {JSON.stringify(ev.properties ?? {}, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

function SessionCardV2({
  s,
  index,
  total,
  renderEvents,
  defaultOpen,
}: {
  s: UserSessionV2
  index: number
  total: number
  /** How many of this session's events to render (0 = collapsed note). */
  renderEvents: number
  defaultOpen: boolean
}) {
  const geo = [s.city, s.region, s.country].filter(Boolean).join(', ')
  const utmString = [s.utm_source, s.utm_medium, s.utm_campaign].filter(Boolean).join(' · ')
  const keyActions = Object.entries(s.key_actions).sort((a, b) => b[1] - a[1])
  const shown = s.events.slice(0, renderEvents)
  return (
    <details className="rounded-lg border border-zinc-800 bg-zinc-900/40" open={defaultOpen}>
      <summary className="cursor-pointer px-3 py-2.5">
        <div className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
          <span className="text-zinc-200">Session {total - index}</span>
          <span
            className={`rounded-full border px-1.5 py-px text-[9px] font-semibold ${
              s.method === 'session_id'
                ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                : 'border-zinc-700 bg-zinc-900 text-zinc-400'
            }`}
            title={
              s.method === 'session_id'
                ? 'Grouped by the per-tab session_id the envelope carries (epoch 2026-06-10)'
                : 'Pre-epoch / server rows without a session_id — grouped by 30-minute idle gaps'
            }
          >
            {s.method === 'session_id' ? 'session_id' : 'gap-30m'}
          </span>
          <span title={fmtDateTime(s.started_at)}>{fmtAgo(s.started_at)}</span>
          <span className="text-zinc-600">·</span>
          <span className="font-mono">{fmtDuration(s.duration_sec)}</span>
          <span className="text-zinc-600">·</span>
          <span>{s.event_count} events</span>
          <span className="text-zinc-600">·</span>
          <span>{s.pages.length} page steps</span>
          {s.device_type && <span>· {s.device_type}</span>}
          {geo && <span>· {geo}</span>}
        </div>
        <div className="mt-1 truncate font-mono text-xs">
          <span className="text-emerald-400">{s.entry_page ?? '—'}</span>
          <span className="text-zinc-600"> → </span>
          <span className="text-zinc-300">{s.exit_page ?? '—'}</span>
        </div>
      </summary>
      <div className="space-y-3 border-t border-zinc-800 px-3 py-3">
        {(s.referrer || utmString) && (
          <div className="flex flex-wrap gap-2 text-[10px] text-zinc-500">
            {s.referrer && <span className="max-w-[360px] truncate" title={s.referrer}>↪ {s.referrer}</span>}
            {utmString && <span>📣 {utmString}</span>}
          </div>
        )}

        {s.pages.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Page flow</div>
            <div className="mt-1 flex flex-wrap items-center gap-1 font-mono text-[11px]">
              {s.pages.map((pg, i) => (
                <span key={`${pg}-${i}`} className="flex items-center gap-1">
                  {i > 0 && <span className="text-zinc-600">→</span>}
                  <span className="rounded bg-zinc-950 px-1.5 py-0.5 text-zinc-300">{pg}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {keyActions.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Key actions</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {keyActions.map(([name, n]) => (
                <span key={name} className="rounded bg-emerald-950/40 border border-emerald-900 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                  {name} × {n}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-zinc-800">
          <div className="border-b border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
            Events ({shown.length}{shown.length < s.event_count ? ` of ${s.event_count}` : ''}, oldest first)
          </div>
          {shown.length === 0 ? (
            <div className="px-3 py-3 text-center text-[11px] text-zinc-500">
              Hidden by the render cap — use “Show more events” below.
            </div>
          ) : (
            shown.map((ev) => <SessionEventLine key={ev.id} ev={ev} />)
          )}
          {shown.length > 0 && shown.length < s.event_count && (
            <div className="px-3 py-2 text-center text-[10px] text-zinc-500">
              {s.event_count - shown.length} more in this session
              {s.events_truncated ? ' (tail truncated at the 500-event RPC cap)' : ''} — use “Show more events” below.
            </div>
          )}
        </div>
      </div>
    </details>
  )
}

function TabLink({ href, active, icon, children }: { href: string; active: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
        active
          ? 'border-emerald-700 bg-emerald-950/40 text-emerald-300'
          : 'border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
      }`}
    >
      {icon}
      {children}
    </Link>
  )
}

export default async function UserTimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ distinct_id: string }>
  searchParams: Promise<{ tab?: string; ecap?: string }>
}) {
  const { distinct_id } = await params
  const sp = await searchParams
  const distinctId = decodeURIComponent(distinct_id)
  const tab: 'profile' | 'journey' = sp.tab === 'journey' ? 'journey' : 'profile'
  const ecap = Math.min(Math.max(parseInt(sp.ecap ?? '', 10) || EVENTS_RENDER_CAP, 50), 5000)
  const base = `/admin/insights/user/${encodeURIComponent(distinctId)}`

  const [profileV2, traits, sessions] = await Promise.all([
    getUserProfileV2(distinctId),
    getUserProfile(distinctId),
    getUserSessionsV2(distinctId, 50),
  ])
  const links = await getUserContentLinks(distinctId, profileV2?.user_id ?? null)

  // Render-cap allocation: newest sessions first, each takes from the
  // remaining event budget; later sessions render header-only once spent.
  let budget = ecap
  const renderPlan = sessions.map((s) => {
    const take = Math.min(s.events.length, budget)
    budget -= take
    return take
  })
  const renderedEvents = renderPlan.reduce((a, b) => a + b, 0)
  const loadedEvents = sessions.reduce((a, s) => a + s.events.length, 0)
  const hasMore = renderedEvents < loadedEvents

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/insights/users" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            <ChevronLeft className="h-3 w-3" />
            Users
          </Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-lg font-semibold text-white">User 360</h1>
        </div>
        <div className="text-xs text-zinc-500">
          {profileV2 ? `${profileV2.session_count} sessions · ${profileV2.lifetime_events.toLocaleString()} lifetime events` : 'no events'}
        </div>
      </div>

      <IdentityHeader p={profileV2} distinctId={distinctId} />

      {/* 10.5c.4 — journey merged in as a tab (old /insights/journey/[id]
          route redirects here with ?tab=journey). */}
      <div className="mb-5 flex items-center gap-2">
        <TabLink href={base} active={tab === 'profile'} icon={<UserRound className="h-3.5 w-3.5" />}>
          Profile
        </TabLink>
        <TabLink href={`${base}?tab=journey`} active={tab === 'journey'} icon={<Route className="h-3.5 w-3.5" />}>
          Journey
        </TabLink>
      </div>

      {tab === 'profile' ? (
        <>
          <TraitsPanel traits={traits} />
          <ContentLinks links={links} />

          {/* Phase 8.g.11.e — live stream filtered to this user only. Watch
              their actions arrive in real time. */}
          <div className="mb-6">
            <LiveEventsTicker filterDistinctId={distinctId} />
          </div>
        </>
      ) : (
        <div className="mb-6">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">
              Sessions
              <span className="ml-2 text-[10px] font-normal text-zinc-500">
                grouped by session_id when the envelope carries one (epoch 2026-06-10), else 30-min idle gaps — each card is labeled
              </span>
            </h2>
            <span className="text-[10px] text-zinc-500">newest first, max 50</span>
          </div>
          {sessions.length === 0 ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-6 text-center text-xs text-zinc-500">
              No sessions yet.
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s, i) => (
                <SessionCardV2
                  key={s.session_key}
                  s={s}
                  index={i}
                  total={sessions.length}
                  renderEvents={renderPlan[i]}
                  defaultOpen={i === 0}
                />
              ))}
            </div>
          )}
          {hasMore && (
            <div className="mt-3 text-center">
              <Link
                href={`${base}?tab=journey&ecap=${ecap + EVENTS_RENDER_CAP}`}
                className="inline-block rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-emerald-700 hover:text-emerald-300"
              >
                Show more events ({renderedEvents.toLocaleString()} of {loadedEvents.toLocaleString()} rendered)
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
