// Phase 13 Social — the brain. Research → select → write → gate → schedule → queue.
//
// Flow: build the candidate pool (sources.ts, from live verified data) → for each
// platform, rank + dedup candidates → DeepSeek writes platform-tailored copy
// (grounded in the candidate's facts) → preQueueGate enforces the SOPs → assign a
// best-time schedule slot → insert as a DRAFT in social_posts. Nothing posts here.
// R2: best-time-from-data scheduling, UTM-tagged links, global+cross-platform link
// dedup, pause-aware, optional A/B variants, and evergreen recycling.

import { getAdminClient } from '../cron/supabase-admin'
import { buildPerformanceModel, engagementScore, type PerformanceModel } from './insights'
import { callDeepSeek, stripJsonFences } from '../plan/deepseek'
import { PLATFORM_DEFAULT_SIZE, GRAPHIC_SIZES } from './graphics/templates'
import { loadAccount } from './publishers'
import { notPaused } from './publishers/util'
import { buildSystemPrompt, buildUserPrompt, type BrainCopy } from './prompts'
import { buildCandidatePool, type Candidate } from './sources'
import { contentHash, isDuplicateLink, linkDedupKey, preQueueGate, withinXBudget, PLATFORM_SOPS } from './sops'
import { getCurrentStrategy, strategyHint } from './strategy'
import { withUtm } from './util'
import type { DraftProposal, Platform, SocialAccount } from './types'

export type DraftOutcome = {
  platform: Platform
  candidateKey: string
  status: 'queued' | 'planned' | 'rejected' | 'skipped-duplicate' | 'skipped-budget' | 'skipped-paused' | 'error'
  id?: string
  scheduledAt?: string
  angle?: string
  variant?: 'A' | 'B'
  reasons?: string[]
}

export type DraftRunResult = { poolSize: number; outcomes: DraftOutcome[] }

/**
 * Suggested future slot: i+1 days out. When we have engagement history, rank the
 * platform's optimal hours by what's actually performed (insights byHourUTC) and
 * take the best for the earliest posts; otherwise use the static rotation.
 */
export function nextSlot(platform: Platform, i: number, perf?: PerformanceModel): string {
  const sop = PLATFORM_SOPS[platform]
  let hours = sop.optimalHoursUTC
  if (perf && perf.sampleSize > 0) {
    hours = [...sop.optimalHoursUTC].sort(
      (a, b) => (perf.byHourUTC[b]?.avgScore ?? 0) - (perf.byHourUTC[a]?.avgScore ?? 0),
    )
  }
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + i + 1)
  d.setUTCHours(hours[i % hours.length], 0, 0, 0)
  return d.toISOString()
}

/** Recent post fingerprints + angles (variety window) — pure read. */
async function loadRecent(days = 14): Promise<{ hashes: string[]; angles: string[] }> {
  const supa = getAdminClient()
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  const res = await supa.from('social_posts').select('content_hash, brain_meta').gte('created_at', since)
  const rows = (res.data ?? []) as Array<{ content_hash: string; brain_meta: { angle?: string } | null }>
  return {
    hashes: rows.map((r) => r.content_hash),
    angles: rows.map((r) => r.brain_meta?.angle).filter(Boolean).slice(0, 12) as string[],
  }
}

/**
 * Link dedup keys (`platform|canonicalLink`) for links already COMMITTED to — i.e.
 * posted, or approved/scheduled to post. Tentative drafts don't block (they may be
 * rejected/edited); same-run dupes are caught separately by the in-memory set.
 */
async function loadPostedLinkKeys(): Promise<string[]> {
  const supa = getAdminClient()
  const res = await supa
    .from('social_posts')
    .select('platform, link_url')
    .not('link_url', 'is', null)
    .in('status', ['posted', 'approved', 'scheduled'])
  return ((res.data ?? []) as { platform: Platform; link_url: string | null }[]).map((r) => linkDedupKey(r.platform, r.link_url))
}

function parseCopy(raw: string): BrainCopy | null {
  try {
    const o = JSON.parse(stripJsonFences(raw)) as Partial<BrainCopy>
    if (!o || typeof o.copy !== 'string' || !o.copy.trim()) return null
    return {
      copy: o.copy.trim(),
      hashtags: Array.isArray(o.hashtags) ? o.hashtags.filter((h) => typeof h === 'string') : [],
      angle: typeof o.angle === 'string' ? o.angle : '',
      title: typeof o.title === 'string' ? o.title : undefined,
      subreddit: typeof o.subreddit === 'string' ? o.subreddit.replace(/^r\//, '') : undefined,
    }
  } catch {
    return null
  }
}

/** DeepSeek copy with one retry on transient error / malformed JSON. */
async function writeCopy(
  platform: Platform,
  c: Candidate,
  recentAngles: string[],
  variant?: 'A' | 'B',
  weeklyStrategy?: string,
): Promise<BrainCopy | null> {
  const base = buildUserPrompt(c, recentAngles, weeklyStrategy)
  for (let attempt = 1; attempt <= 2; attempt++) {
    const nudge =
      variant === 'B' ? '\n\nWrite a DISTINCT alternative angle/hook from the obvious one (this is the B variant of an A/B test).' : ''
    const fix = attempt === 2 ? '\n\nIMPORTANT: your previous reply was not valid JSON. Return ONLY the JSON object, no prose, no code fences.' : ''
    try {
      const raw = await callDeepSeek({ system: buildSystemPrompt(platform), user: base + nudge + fix, max_tokens: 700 })
      const parsed = parseCopy(raw)
      if (parsed) return parsed
    } catch {
      /* retry */
    }
  }
  return null
}

export type DraftOptions = {
  platforms: Platform[]
  perPlatform: number
  dryRun?: boolean
  xMonthSpendUSD?: number
  xMonthlyCapUSD?: number | null
  /** Also draft a B variant per picked candidate (A/B test). */
  abVariants?: boolean
}

export async function draftPosts(opts: DraftOptions): Promise<DraftRunResult> {
  const perf = await buildPerformanceModel()
  const pool = await buildCandidatePool({ perf })
  const recent = await loadRecent()
  const seen = new Set(recent.hashes)
  const linkKeys = new Set(await loadPostedLinkKeys())
  const supa = getAdminClient()
  const outcomes: DraftOutcome[] = []

  // Accounts (for the pause switch). Absent account → not paused (drafting is fine
  // before connection); only an explicitly paused account suppresses drafting.
  const accounts = new Map<Platform, SocialAccount | null>()
  const strategyHints = new Map<Platform, string | undefined>()
  for (const p of opts.platforms) {
    accounts.set(p, await loadAccount(p))
    // This week's strategy steers what the brain drafts for the platform (S2).
    strategyHints.set(p, strategyHint(await getCurrentStrategy(p)))
  }

  // Insert one draft (a variant). Returns the outcome; mutates seen/linkKeys.
  async function createDraft(
    c: Candidate,
    platform: Platform,
    slotIndex: number,
    variant?: 'A' | 'B',
    variantGroup?: string,
  ): Promise<DraftOutcome> {
    const angleKey = variant ? `${c.topic} [${variant}]` : c.topic
    const hash = contentHash({ platform, kind: c.kind, angle: angleKey })
    // UTM-tag the link up front and pass it to the model so X embeds the tagged
    // URL in the copy (X wraps it to 23 chars via t.co; xEffectiveLength accounts
    // for that in the SOP gate). Other platforms carry it in the structured field.
    const utmLink = c.link_url ? withUtm(c.link_url, platform) : null
    const copy = await writeCopy(platform, { ...c, link_url: utmLink }, recent.angles, variant, strategyHints.get(platform))
    if (!copy) return { platform, candidateKey: c.key, status: 'error', reasons: ['unparseable model output'], variant }

    let finalCopy = copy.copy
    let finalTags = copy.hashtags
    if (platform === 'x' && finalTags.length) {
      finalCopy = `${finalCopy} ${finalTags.join(' ')}`.trim()
      finalTags = []
    }

    const draft: DraftProposal = {
      platform,
      kind: c.kind,
      copy: finalCopy,
      hashtags: finalTags,
      link_url: utmLink ?? undefined,
      graphic_template: c.graphic_template ?? undefined,
      graphic_data: c.graphic_data,
      subreddit: platform === 'reddit' ? copy.subreddit : undefined,
      source_refs: c.sources,
      content_hash: hash,
      brain_meta: {
        angle: copy.angle || c.topic,
        score: c.score,
        candidateKey: c.key,
        title: copy.title ?? null,
        ...(variant ? { variant, variant_group: variantGroup } : {}),
      },
    }

    const gate = preQueueGate(draft, { recentHashes: [...seen] })
    if (!gate.ok) return { platform, candidateKey: c.key, status: 'rejected', reasons: gate.reasons, variant }

    const scheduledAt = nextSlot(platform, slotIndex, perf)
    const size = c.graphic_template ? PLATFORM_DEFAULT_SIZE[platform] : null
    const row = {
      platform,
      kind: draft.kind,
      status: 'draft',
      copy: draft.copy,
      hashtags: draft.hashtags,
      link_url: draft.link_url ?? null,
      graphic_template: draft.graphic_template ?? null,
      graphic_data: draft.graphic_data,
      graphic_size: size && size in GRAPHIC_SIZES ? `${GRAPHIC_SIZES[size].width}x${GRAPHIC_SIZES[size].height}` : null,
      subreddit: draft.subreddit ?? null,
      source_refs: draft.source_refs,
      content_hash: draft.content_hash,
      brain_meta: draft.brain_meta,
      scheduled_at: scheduledAt,
    }
    const ins = (await supa.from('social_posts').insert(row as never).select('id').single()) as {
      data: { id: string } | null
      error: { message: string } | null
    }
    if (ins.error || !ins.data) return { platform, candidateKey: c.key, status: 'error', reasons: [ins.error?.message ?? 'insert failed'], variant }

    seen.add(hash)
    if (utmLink) linkKeys.add(linkDedupKey(platform, c.link_url))
    return { platform, candidateKey: c.key, status: 'queued', id: ins.data.id, scheduledAt, angle: draft.brain_meta.angle as string, variant }
  }

  for (const platform of opts.platforms) {
    if (!notPaused(accounts.get(platform) ?? null)) {
      outcomes.push({ platform, candidateKey: '-', status: 'skipped-paused' })
      continue
    }
    // Instagram is image-mandatory → only candidates with a graphic qualify.
    const candidates = pool.filter((c) => platform !== 'instagram' || c.graphic_template)
    let picked = 0

    for (const c of candidates) {
      if (picked >= opts.perPlatform) break
      const hash = contentHash({ platform, kind: c.kind, angle: c.topic })
      if (seen.has(hash)) {
        outcomes.push({ platform, candidateKey: c.key, status: 'skipped-duplicate' })
        continue
      }
      // Global/cross-date link dedup (same destination already posted on this platform).
      const linkDup = isDuplicateLink(platform, c.link_url, [...linkKeys])
      if (!linkDup.ok) {
        outcomes.push({ platform, candidateKey: c.key, status: 'skipped-duplicate', reasons: linkDup.reasons })
        continue
      }
      // X draft-time budget gate (the publisher re-checks at post time).
      if (platform === 'x' && opts.xMonthlyCapUSD != null) {
        const v = withinXBudget({ monthSpendUSD: opts.xMonthSpendUSD ?? 0, monthlyCapUSD: opts.xMonthlyCapUSD, hasLink: !!c.link_url })
        if (!v.ok) {
          outcomes.push({ platform, candidateKey: c.key, status: 'skipped-budget', reasons: v.reasons })
          continue
        }
      }

      if (opts.dryRun) {
        outcomes.push({ platform, candidateKey: c.key, status: 'planned', angle: c.topic })
        if (opts.abVariants) outcomes.push({ platform, candidateKey: c.key, status: 'planned', angle: c.topic, variant: 'B' })
        seen.add(hash)
        picked++
        continue
      }

      if (opts.abVariants) {
        const group = `${platform}-${c.key}-${picked}`
        outcomes.push(await createDraft(c, platform, picked, 'A', group))
        outcomes.push(await createDraft(c, platform, picked + 1, 'B', group))
      } else {
        outcomes.push(await createDraft(c, platform, picked))
      }
      picked++
    }
  }

  return { poolSize: pool.length, outcomes }
}

// ── Evergreen recycling ────────────────────────────────────────────────────────
export type RecycleCandidate = { id: string; platform: Platform; copy: string; score: number }

/** Pure: posted items older than `olderThanDays` ranked by latest engagement, top first. */
export function rankRecyclable(
  posts: Array<{ id: string; platform: Platform; copy: string; posted_at: string | null }>,
  latestMetricByPost: Map<string, { impressions?: number | null; likes?: number | null; comments?: number | null; shares?: number | null; clicks?: number | null }>,
  olderThanDays: number,
  nowMs: number,
): RecycleCandidate[] {
  const cutoff = nowMs - olderThanDays * 86_400_000
  return posts
    .filter((p) => p.posted_at && new Date(p.posted_at).getTime() <= cutoff)
    .map((p) => ({ id: p.id, platform: p.platform, copy: p.copy, score: engagementScore(latestMetricByPost.get(p.id) ?? {}) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
}

/**
 * Re-queue top-performing posts as fresh drafts, REPHRASED by DeepSeek (variation,
 * never a verbatim repost). No-op until there's posted+metrics history.
 */
export async function recycleTopPerformers(opts: { olderThanDays?: number; max?: number; dryRun?: boolean }): Promise<DraftOutcome[]> {
  const supa = getAdminClient()
  const olderThanDays = opts.olderThanDays ?? 30
  const max = opts.max ?? 1
  const postsRes = await supa
    .from('social_posts')
    .select('id, platform, copy, link_url, graphic_template, graphic_data, graphic_size, kind, source_refs, posted_at, brain_meta')
    .eq('status', 'posted')
  const posts = (postsRes.data ?? []) as Array<{
    id: string; platform: Platform; copy: string; link_url: string | null; graphic_template: string | null
    graphic_data: Record<string, unknown>; graphic_size: string | null; kind: string; source_refs: unknown
    posted_at: string | null; brain_meta: Record<string, unknown> | null
  }>
  if (!posts.length) return []

  const metricsRes = await supa.from('social_metrics').select('post_id, captured_at, impressions, likes, comments, shares, clicks').in('post_id', posts.map((p) => p.id))
  const latest = new Map<string, { captured_at: string; impressions?: number | null; likes?: number | null; comments?: number | null; shares?: number | null; clicks?: number | null }>()
  for (const m of (metricsRes.data ?? []) as Array<{ post_id: string; captured_at: string }>) {
    const cur = latest.get((m as { post_id: string }).post_id)
    if (!cur || (m as { captured_at: string }).captured_at > cur.captured_at) latest.set((m as { post_id: string }).post_id, m as never)
  }
  const ranked = rankRecyclable(posts, latest as never, olderThanDays, Date.now()).slice(0, max)
  const out: DraftOutcome[] = []

  for (const r of ranked) {
    const original = posts.find((p) => p.id === r.id)!
    if (opts.dryRun) {
      out.push({ platform: r.platform, candidateKey: `recycle:${r.id}`, status: 'planned', angle: 'evergreen recycle' })
      continue
    }
    let rephrased = original.copy
    try {
      const raw = await callDeepSeek({
        system: `You rewrite a high-performing social post in a fresh way for ${r.platform}, keeping the same facts and link but a different hook/wording. Return STRICT JSON {"copy":"..."}. No prose.`,
        user: `Original post:\n${original.copy}`,
        max_tokens: 500,
      })
      const j = JSON.parse(stripJsonFences(raw)) as { copy?: string }
      if (j.copy?.trim()) rephrased = j.copy.trim()
    } catch {
      /* fall back to original copy */
    }
    const row = {
      platform: r.platform,
      kind: original.kind,
      status: 'draft',
      copy: rephrased,
      hashtags: [],
      link_url: original.link_url,
      graphic_template: original.graphic_template,
      graphic_data: original.graphic_data,
      graphic_size: original.graphic_size,
      source_refs: original.source_refs,
      content_hash: contentHash({ platform: r.platform, kind: original.kind as never, angle: `recycle ${r.id} ${Date.now()}` }),
      brain_meta: { ...(original.brain_meta ?? {}), recycledFrom: r.id, angle: 'evergreen recycle' },
      scheduled_at: nextSlot(r.platform, 0),
    }
    const ins = (await supa.from('social_posts').insert(row as never).select('id').single()) as { data: { id: string } | null; error: { message: string } | null }
    out.push(
      ins.error || !ins.data
        ? { platform: r.platform, candidateKey: `recycle:${r.id}`, status: 'error', reasons: [ins.error?.message ?? 'insert failed'] }
        : { platform: r.platform, candidateKey: `recycle:${r.id}`, status: 'queued', id: ins.data.id },
    )
  }
  return out
}

export { buildCandidatePool }
export type { Candidate }
