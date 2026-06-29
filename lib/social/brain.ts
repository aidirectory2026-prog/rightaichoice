// Phase 13 Social — the brain. Research → select → write → gate → schedule → queue.
//
// Flow: build the candidate pool (sources.ts, from live verified data) → for each
// platform, rank + dedup candidates → DeepSeek writes platform-tailored copy
// (grounded in the candidate's facts) → preQueueGate enforces the SOPs → assign an
// optimal schedule slot → insert as a DRAFT in social_posts (status stays 'draft'
// until a human approves). Nothing here posts anything.

import { getAdminClient } from '../cron/supabase-admin'
import { buildPerformanceModel } from './insights'
import { callDeepSeek, stripJsonFences } from '../plan/deepseek'
import { PLATFORM_DEFAULT_SIZE, GRAPHIC_SIZES } from './graphics/templates'
import { buildSystemPrompt, buildUserPrompt, type BrainCopy } from './prompts'
import { buildCandidatePool, type Candidate } from './sources'
import { contentHash, preQueueGate, withinXBudget, PLATFORM_SOPS } from './sops'
import type { DraftProposal, Platform } from './types'

export type DraftOutcome = {
  platform: Platform
  candidateKey: string
  status: 'queued' | 'planned' | 'rejected' | 'skipped-duplicate' | 'skipped-budget' | 'error'
  id?: string
  scheduledAt?: string
  angle?: string
  reasons?: string[]
}

export type DraftRunResult = { poolSize: number; outcomes: DraftOutcome[] }

/** Suggested future slot: i+1 days out, at one of the platform's optimal UTC hours. */
function nextSlot(platform: Platform, i: number): string {
  const sop = PLATFORM_SOPS[platform]
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + i + 1)
  d.setUTCHours(sop.optimalHoursUTC[i % sop.optimalHoursUTC.length], 0, 0, 0)
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

export type DraftOptions = {
  platforms: Platform[]
  perPlatform: number
  dryRun?: boolean
  /** X budget governor inputs (draft-time): skip X candidates that can't fit the cap. */
  xMonthSpendUSD?: number
  xMonthlyCapUSD?: number | null
}

export async function draftPosts(opts: DraftOptions): Promise<DraftRunResult> {
  // Insights feedback loop: weight candidates by what's actually performed.
  const perf = await buildPerformanceModel()
  const pool = await buildCandidatePool({ perf })
  const recent = await loadRecent()
  const seen = new Set(recent.hashes)
  const supa = getAdminClient()
  const outcomes: DraftOutcome[] = []

  for (const platform of opts.platforms) {
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

      // X draft-time budget gate (the publisher re-checks at post time).
      if (platform === 'x' && opts.xMonthlyCapUSD != null) {
        const v = withinXBudget({
          monthSpendUSD: opts.xMonthSpendUSD ?? 0,
          monthlyCapUSD: opts.xMonthlyCapUSD,
          hasLink: !!c.link_url,
        })
        if (!v.ok) {
          outcomes.push({ platform, candidateKey: c.key, status: 'skipped-budget', reasons: v.reasons })
          continue
        }
      }

      if (opts.dryRun) {
        outcomes.push({ platform, candidateKey: c.key, status: 'planned', angle: c.topic })
        seen.add(hash)
        picked++
        continue
      }

      // Write the copy.
      let copy: BrainCopy | null = null
      try {
        const raw = await callDeepSeek({
          system: buildSystemPrompt(platform),
          user: buildUserPrompt(c, recent.angles),
          max_tokens: 700,
        })
        copy = parseCopy(raw)
      } catch (e) {
        outcomes.push({ platform, candidateKey: c.key, status: 'error', reasons: [e instanceof Error ? e.message : String(e)] })
        continue
      }
      if (!copy) {
        outcomes.push({ platform, candidateKey: c.key, status: 'error', reasons: ['unparseable model output'] })
        continue
      }

      // X counts hashtags toward 280 → fold them into the copy and clear the array.
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
        link_url: platform === 'instagram' ? undefined : c.link_url ?? undefined,
        graphic_template: c.graphic_template ?? undefined,
        graphic_data: c.graphic_data,
        subreddit: platform === 'reddit' ? copy.subreddit : undefined,
        source_refs: c.sources,
        content_hash: hash,
        brain_meta: { angle: copy.angle || c.topic, score: c.score, candidateKey: c.key, title: copy.title ?? null },
      }

      const gate = preQueueGate(draft, { recentHashes: [...seen] })
      if (!gate.ok) {
        outcomes.push({ platform, candidateKey: c.key, status: 'rejected', reasons: gate.reasons })
        continue
      }

      const scheduledAt = nextSlot(platform, picked)
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
      if (ins.error || !ins.data) {
        outcomes.push({ platform, candidateKey: c.key, status: 'error', reasons: [ins.error?.message ?? 'insert failed'] })
        continue
      }
      outcomes.push({
        platform,
        candidateKey: c.key,
        status: 'queued',
        id: (ins.data as { id: string }).id,
        scheduledAt,
        angle: draft.brain_meta.angle as string,
      })
      seen.add(hash)
      picked++
    }
  }

  return { poolSize: pool.length, outcomes }
}

export { buildCandidatePool }
export type { Candidate }
