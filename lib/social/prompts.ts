// Phase 13 Social — DeepSeek prompt builders for the brain.
//
// The system prompt encodes our editorial voice + the platform's SOP formatting +
// truth-only rules + a strict JSON output contract. The graphic is already chosen
// (by sources.ts, from real numbers) — the model only writes the surrounding copy,
// so it cannot invent a statistic.

import { EDITORIAL_VOICE } from '../copy/editorial-voice'
import { PLATFORM_SOPS, REDDIT_ALLOWLIST } from './sops'
import type { Platform } from './types'
import type { Candidate } from './sources'

function platformRules(platform: Platform): string {
  const sop = PLATFORM_SOPS[platform]
  switch (platform) {
    case 'linkedin':
      return `LinkedIn: professional, data-led, credible. Up to ${sop.maxChars} chars but aim for 3–6 tight sentences. Max ${sop.maxHashtags} hashtags. A link is fine. Open with the insight, not a greeting.`
    case 'x':
      return `X/Twitter: ONE punchy post, hard limit ${sop.maxChars} characters INCLUDING hashtags. Hook in the first line. Max ${sop.maxHashtags} hashtags. No thread.`
    case 'instagram':
      return `Instagram caption: the graphic carries the headline, so the caption adds context + a soft CTA. Up to ${sop.maxChars} chars. Up to ${sop.maxHashtags} relevant hashtags at the end. No inline links (link-in-bio).`
    case 'reddit':
      return `Reddit: value-first, framed as data/discussion — NEVER an ad. NO hashtags. Write a post TITLE (curiosity-driven, no brand) and a body that shares the finding and invites discussion. Suggest the single best subreddit from this allowlist: ${REDDIT_ALLOWLIST.map((s) => 'r/' + s).join(', ')}.`
  }
}

export function buildSystemPrompt(platform: Platform): string {
  const reddit = platform === 'reddit'
  const jsonContract = reddit
    ? `Return STRICT JSON only: { "copy": "<post body>", "title": "<post title>", "subreddit": "<one sub from the allowlist, no r/ prefix>", "hashtags": [], "angle": "<3-6 word label of the angle>" }`
    : `Return STRICT JSON only: { "copy": "<the post text>", "hashtags": ["#Example"], "angle": "<3-6 word label of the angle>" }`

  return [
    `You write social posts for RightAIChoice (rightaichoice.com), an independent decision engine that helps people pick the right AI tools. You are a sharp analyst, not a hype account.`,
    ``,
    EDITORIAL_VOICE,
    ``,
    `HARD RULES:`,
    `- Ground every claim ONLY in the KEY FACTS provided. Never invent or round numbers; never add stats that aren't given.`,
    `- No hype, no clickbait, no emoji spam (at most one tasteful emoji, usually none).`,
    `- Don't repeat the angle of recent posts (listed below).`,
    `- ${platformRules(platform)}`,
    ``,
    jsonContract,
    `No prose, no code fences — JSON object only.`,
  ].join('\n')
}

export function buildUserPrompt(candidate: Candidate, recentAngles: string[]): string {
  return [
    `TOPIC: ${candidate.topic}`,
    `KEY FACTS (ground the copy strictly in these):`,
    candidate.facts,
    candidate.link_url ? `LINK (cite/use where the platform allows): ${candidate.link_url}` : `NO LINK for this post.`,
    candidate.graphic_template
      ? `A branded graphic (${candidate.graphic_template}) accompanies this post — don't restate the whole graphic in the copy; complement it.`
      : `Text-only post (no graphic).`,
    recentAngles.length ? `RECENT ANGLES TO AVOID REPEATING: ${recentAngles.join(' | ')}` : ``,
    ``,
    `Write the post now per the rules.`,
  ]
    .filter(Boolean)
    .join('\n')
}

export type BrainCopy = {
  copy: string
  hashtags: string[]
  angle: string
  title?: string // reddit
  subreddit?: string // reddit
}
