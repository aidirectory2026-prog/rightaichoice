// Phase 11 (Mixpanel upgrade) — turns raw analytics events into plain-language,
// non-technical lines for the user journey. The journey used to show raw
// event_name snake_case + JSON dumps; this maps each event to a human label, an
// icon, a tone (for colour), an importance (so passive noise can be folded), and
// a one-line sentence built from the event's properties.
//
// Reuse note: the canonical plain-English names live in EVENT_SCHEMAS
// (lib/analytics-schema.ts); this file curates the journey-facing copy + icons.

import type { LucideIcon } from 'lucide-react'
import {
  Eye, FileText, GitCompareArrows, Search, Sparkles, PenLine, MousePointerClick,
  ExternalLink, Bookmark, UserPlus, LogIn, MessageSquare, Star, Mail, AlertTriangle,
  Hand, LogOut, ChevronsDown, Clock, Activity, Layers, Filter, ShoppingBag, Award,
  ThumbsUp, Send, BookOpen, Circle, DollarSign,
} from 'lucide-react'

export type EventTone = 'normal' | 'good' | 'warn' | 'bad'
// 3 = milestone (signup, plan complete), 2 = meaningful action, 1 = minor,
// 0 = passive/automatic (scroll, heartbeat) — folded by default in the UI.
export type EventImportance = 0 | 1 | 2 | 3

export type EventDisplay = {
  label: string
  icon: LucideIcon
  tone: EventTone
  importance: EventImportance
  /** Human sentence for this specific occurrence, built from its properties. */
  text: string
}

type Entry = {
  label: string
  icon: LucideIcon
  tone?: EventTone
  importance?: EventImportance
  describe?: (p: Record<string, unknown>) => string | null
}

const s = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null)
const prettyTool = (slug: unknown): string => {
  const t = s(slug)
  if (!t) return 'a tool'
  return t.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
const prettyPath = (path: unknown): string => {
  const p = s(path)
  if (!p || p === '/') return 'the homepage'
  const seg = p.split('?')[0].replace(/^\//, '')
  return `/${seg}`
}
const quote = (v: unknown, max = 120): string | null => {
  const t = s(v)
  if (!t) return null
  return `“${t.length > max ? t.slice(0, max) + '…' : t}”`
}

// Curated journey copy for the events that matter. Anything not here falls back
// to a humanized version of the event name (see eventDisplay).
const MAP: Record<string, Entry> = {
  page_viewed: { label: 'Viewed a page', icon: Eye, importance: 1, describe: (p) => `Viewed ${prettyPath(p.page_path)}` },
  tool_page_viewed: { label: 'Viewed a tool', icon: FileText, importance: 2, describe: (p) => `Viewed the ${prettyTool(p.tool_slug)} tool page` },
  tool_visit_clicked: { label: 'Clicked through to a tool', icon: ExternalLink, tone: 'good', importance: 2, describe: (p) => `Clicked through to ${prettyTool(p.tool_slug)}` },
  tool_visit_redirected: { label: 'Visited a tool (affiliate)', icon: ExternalLink, tone: 'good', importance: 2, describe: (p) => `Redirected out to ${prettyTool(p.tool_slug)}` },
  tool_saved: { label: 'Saved a tool', icon: Bookmark, tone: 'good', importance: 2, describe: (p) => `Saved ${prettyTool(p.tool_slug ?? p.tool_name)}` },
  comparison_viewed: { label: 'Compared tools', icon: GitCompareArrows, importance: 2, describe: (p) => { const t = p.tools; return Array.isArray(t) ? `Compared ${t.join(' vs ')}` : 'Viewed a comparison' } },
  compare_tool_added: { label: 'Added to compare', icon: GitCompareArrows, importance: 1, describe: (p) => `Added ${prettyTool(p.tool_slug)} to compare` },

  // Plan flow — the highest-intent journey
  plan_cta_impression: { label: 'Saw the plan CTA', icon: Sparkles, importance: 0, describe: () => 'Saw the “Plan your stack” prompt' },
  plan_cta_clicked: { label: 'Clicked the plan CTA', icon: MousePointerClick, tone: 'good', importance: 2, describe: () => 'Clicked “Plan your stack”' },
  plan_goal_typed: { label: 'Typed a goal', icon: PenLine, tone: 'good', importance: 3, describe: (p) => { const q = quote(p.current_text); return q ? `Typed a goal: ${q}` : 'Typed in the goal box' } },
  plan_started: { label: 'Started a plan', icon: Sparkles, tone: 'good', importance: 3, describe: () => 'Started building a plan' },
  plan_intake_submitted: { label: 'Submitted plan intake', icon: Send, tone: 'good', importance: 2, describe: (p) => { const q = quote(p.goal_text); return q ? `Submitted intake: ${q}` : 'Submitted the plan intake form' } },
  plan_completed: { label: 'Got a plan', icon: Award, tone: 'good', importance: 3, describe: (p) => { const q = quote(p.use_case); return q ? `Generated a plan for ${q}` : 'Generated a plan' } },
  plan_results_tool_clicked: { label: 'Clicked a recommended tool', icon: MousePointerClick, tone: 'good', importance: 2, describe: (p) => `Clicked recommended ${prettyTool(p.tool_slug)}` },
  plan_signup_modal_shown: { label: 'Hit the signup gate', icon: UserPlus, tone: 'warn', importance: 2, describe: () => 'Reached the signup gate' },

  // Search
  search_query_submitted: { label: 'Searched', icon: Search, importance: 2, describe: (p) => { const q = quote(p.query); const zero = Number(p.result_count) === 0; return `Searched ${q ?? ''}${zero ? ' — no results' : ''}`.trim() } },
  search_query_typed: { label: 'Typed in search', icon: Search, importance: 1, describe: (p) => { const q = quote(p.current_text); return q ? `Typed in search: ${q}` : 'Typed in the search box' } },
  search_result_clicked: { label: 'Clicked a result', icon: MousePointerClick, tone: 'good', importance: 2, describe: (p) => `Clicked search result ${prettyTool(p.tool_slug)}` },
  filter_applied: { label: 'Filtered the catalog', icon: Filter, importance: 1, describe: (p) => `Filtered by ${s(p.filter_type) ?? 'a facet'}` },

  // Auth
  signup_started: { label: 'Started signup', icon: UserPlus, importance: 2, describe: () => 'Started signing up' },
  signup_method_selected: { label: 'Chose a signup method', icon: UserPlus, tone: 'warn', importance: 2, describe: (p) => `Chose to sign up with ${s(p.method) ?? 'a method'}` },
  signup_completed: { label: 'Signed up', icon: UserPlus, tone: 'good', importance: 3, describe: (p) => `Signed up${s(p.method) ? ` with ${p.method}` : ''}` },
  login_completed: { label: 'Logged in', icon: LogIn, tone: 'good', importance: 2, describe: () => 'Logged in' },

  // Sentiment / revenue
  sentiment_card_viewed: { label: 'Saw sentiment card', icon: Activity, importance: 1, describe: (p) => `Saw the sentiment card for ${prettyTool(p.tool_slug)}` },
  sentiment_scan_started: { label: 'Ran a sentiment scan', icon: Activity, tone: 'good', importance: 2, describe: (p) => `Ran a sentiment scan on ${prettyTool(p.tool_slug)}` },
  sentiment_pay_clicked: { label: 'Clicked to pay', icon: DollarSign, tone: 'good', importance: 3, describe: () => 'Clicked the paywall button' },
  sentiment_payment_succeeded: { label: 'Paid', icon: DollarSign, tone: 'good', importance: 3, describe: () => 'Completed a payment' },

  // Chat / reviews / content
  ai_chat_message: { label: 'Sent a chat message', icon: MessageSquare, importance: 2, describe: (p) => { const q = quote(p.message_text); return q ? `Asked the AI: ${q}` : 'Sent a message to the AI chat' } },
  review_submitted: { label: 'Wrote a review', icon: Star, tone: 'good', importance: 2, describe: (p) => `Reviewed ${prettyTool(p.tool_slug)}${p.rating ? ` (${p.rating}★)` : ''}` },
  newsletter_subscribed: { label: 'Subscribed to newsletter', icon: Mail, tone: 'good', importance: 2, describe: () => 'Subscribed to the newsletter' },
  blog_post_viewed: { label: 'Read a blog post', icon: BookOpen, importance: 1, describe: (p) => `Read a blog post${s(p.slug) ? `: ${p.slug}` : ''}` },
  stack_saved: { label: 'Saved a stack', icon: Layers, tone: 'good', importance: 2, describe: () => 'Saved a stack' },
  category_viewed: { label: 'Browsed a category', icon: ShoppingBag, importance: 1, describe: (p) => `Browsed ${s(p.slug) ?? 'a category'}` },

  // Friction / pain signals
  error_encountered: { label: 'Hit an error', icon: AlertTriangle, tone: 'bad', importance: 2, describe: (p) => { const m = s(p.message); return m ? `Hit an error: ${m.slice(0, 80)}` : 'Hit an error' } },
  rage_click: { label: 'Rage-clicked', icon: Hand, tone: 'bad', importance: 2, describe: () => 'Rage-clicked (frustration signal)' },
  dead_click: { label: 'Dead click', icon: Hand, tone: 'warn', importance: 1, describe: () => 'Clicked something that did nothing' },
  exit_intent: { label: 'Made to leave', icon: LogOut, tone: 'warn', importance: 1, describe: () => 'Moved to leave the page' },
  form_abandoned: { label: 'Abandoned a form', icon: LogOut, tone: 'warn', importance: 2, describe: () => 'Started a form but didn’t submit' },

  // Passive / automatic — folded by default
  scroll_depth_reached: { label: 'Scrolled', icon: ChevronsDown, importance: 0, describe: (p) => `Scrolled ${s(p.depth) ?? ''}%`.trim() },
  time_on_page: { label: 'Time on page', icon: Clock, importance: 0, describe: (p) => `Spent ${s(p.seconds) ?? '?'}s on a page` },
  engaged_time_heartbeat: { label: 'Engaged', icon: Clock, importance: 0, describe: () => 'Active on a page' },
  web_vitals: { label: 'Page performance', icon: Activity, importance: 0, describe: () => 'Recorded page performance' },
  tab_visibility_changed: { label: 'Tab focus changed', icon: Eye, importance: 0, describe: () => 'Switched browser tabs' },
  plan_cta_dismissed: { label: 'Dismissed the CTA', icon: LogOut, importance: 0, describe: () => 'Dismissed the plan prompt' },
  plan_perf: { label: 'Plan timing', icon: Clock, importance: 0, describe: () => 'Plan pipeline timing' },
  plan_match_tier: { label: 'Plan matching', icon: Layers, importance: 0, describe: () => 'Plan matching tier recorded' },
  thumb_voted: { label: 'Voted', icon: ThumbsUp, importance: 1, describe: () => 'Left a thumbs vote' },
}

function humanize(eventName: string): string {
  return eventName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Plain-language display for one event occurrence. Never throws. */
export function eventDisplay(eventName: string, props: Record<string, unknown> = {}): EventDisplay {
  const e = MAP[eventName]
  if (e) {
    let text: string | null = null
    try {
      text = e.describe?.(props) ?? null
    } catch {
      text = null
    }
    return {
      label: e.label,
      icon: e.icon,
      tone: e.tone ?? 'normal',
      importance: e.importance ?? 1,
      text: text ?? e.label,
    }
  }
  const label = humanize(eventName)
  return { label, icon: Circle, tone: 'normal', importance: 1, text: label }
}

export const TONE_CLASS: Record<EventTone, string> = {
  normal: 'text-zinc-400',
  good: 'text-emerald-400',
  warn: 'text-amber-400',
  bad: 'text-red-400',
}
