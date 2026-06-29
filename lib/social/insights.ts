// Phase 13 Social — insights feedback loop ("the smart brain that analyses
// everything"). Reads what actually performed (social_metrics × social_posts) and
// produces a PerformanceModel the brain uses to weight future drafts: formats and
// angles that earned engagement get ranked up. With no data yet it returns a
// neutral model, so the brain behaves exactly as before until signal accrues.

import { getAdminClient } from '../cron/supabase-admin'
import type { Platform, PostKind } from './types'

export type DimStat = { n: number; avgScore: number }
export type PerformanceModel = {
  byPlatformKind: Record<string, DimStat> // key `${platform}:${kind}`
  byPlatform: Record<string, DimStat>
  byKind: Record<string, DimStat>
  byHourUTC: Record<number, DimStat>
  maxAvg: number // for normalisation
  sampleSize: number
}

/** Weighted engagement score for one captured metric snapshot. Pure. */
export function engagementScore(m: {
  impressions?: number | null
  likes?: number | null
  comments?: number | null
  shares?: number | null
  clicks?: number | null
}): number {
  return (
    (m.likes ?? 0) * 1 +
    (m.comments ?? 0) * 3 +
    (m.shares ?? 0) * 5 +
    (m.clicks ?? 0) * 2 +
    (m.impressions ?? 0) * 0.005
  )
}

function emptyModel(): PerformanceModel {
  return { byPlatformKind: {}, byPlatform: {}, byKind: {}, byHourUTC: {}, maxAvg: 0, sampleSize: 0 }
}

function add(map: Record<string, DimStat>, key: string, score: number) {
  const cur = map[key] ?? { n: 0, avgScore: 0 }
  const n = cur.n + 1
  map[key] = { n, avgScore: (cur.avgScore * cur.n + score) / n }
}

type PostRow = { id: string; platform: string; kind: string; posted_at: string | null }
type MetricRow = { post_id: string; captured_at: string; impressions: number | null; likes: number | null; comments: number | null; shares: number | null; clicks: number | null }

/** Pure: assemble the model from posts + their LATEST metric snapshot. */
export function buildModel(posts: PostRow[], metrics: MetricRow[]): PerformanceModel {
  // latest metric per post
  const latest = new Map<string, MetricRow>()
  for (const m of metrics) {
    const cur = latest.get(m.post_id)
    if (!cur || m.captured_at > cur.captured_at) latest.set(m.post_id, m)
  }
  const model = emptyModel()
  const postById = new Map(posts.map((p) => [p.id, p]))
  for (const [postId, m] of latest) {
    const p = postById.get(postId)
    if (!p) continue
    const score = engagementScore(m)
    add(model.byPlatformKind, `${p.platform}:${p.kind}`, score)
    add(model.byPlatform, p.platform, score)
    add(model.byKind, p.kind, score)
    if (p.posted_at) add(model.byHourUTC as unknown as Record<string, DimStat>, String(new Date(p.posted_at).getUTCHours()), score)
    model.sampleSize++
  }
  model.maxAvg = Math.max(0, ...Object.values(model.byPlatformKind).map((d) => d.avgScore))
  return model
}

/** DB-backed: load the performance model from the last `days` of posted content. */
export async function buildPerformanceModel(days = 60): Promise<PerformanceModel> {
  const db = getAdminClient()
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  const postsRes = await db
    .from('social_posts')
    .select('id, platform, kind, posted_at')
    .eq('status', 'posted')
    .gte('posted_at', since)
  const posts = (postsRes.data ?? []) as PostRow[]
  if (posts.length === 0) return emptyModel()
  const metricsRes = await db
    .from('social_metrics')
    .select('post_id, captured_at, impressions, likes, comments, shares, clicks')
    .in('post_id', posts.map((p) => p.id))
  return buildModel(posts, (metricsRes.data ?? []) as MetricRow[])
}

/**
 * Expected performance of a (platform, kind) draft, 0..1. Falls back
 * platform:kind → platform → neutral 0.5 when there isn't enough signal yet.
 */
export function expectedPerformance(model: PerformanceModel, platform: Platform, kind: PostKind): number {
  if (model.maxAvg <= 0) return 0.5
  const pk = model.byPlatformKind[`${platform}:${kind}`]
  if (pk && pk.n >= 2) return Math.min(1, pk.avgScore / model.maxAvg)
  const p = model.byPlatform[platform]
  if (p && p.n >= 2) return Math.min(1, p.avgScore / model.maxAvg)
  return 0.5
}

/** Platform-agnostic (kind-level) expected performance, 0..1 — used at pool-build
 *  time before a platform is assigned. Neutral 0.5 until signal accrues. */
export function expectedPerformanceByKind(model: PerformanceModel, kind: PostKind): number {
  if (model.maxAvg <= 0) return 0.5
  const k = model.byKind[kind]
  if (k && k.n >= 2) return Math.min(1, k.avgScore / model.maxAvg)
  return 0.5
}
