// Phase 13 D2.2b — DeepSeek pitch drafter.
//
// Given a data angle + a target (with its method/beat), drafts a short, specific,
// data-led pitch the operator can review and send. Method-aware: newsletter/email
// → subject + email; inbound_query → a ready-to-paste expert answer; community_post
// → a post title + body that leads with the finding (not a promo). No hype, no
// unbackable claims. Uses the existing DeepSeek key (cheap, ~$0.001/draft).

import type { StoryAngle } from './story-angles'
import { REPORT_URL } from './story-angles'
import type { PrTarget } from './targets'

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

const SYSTEM_PROMPT = `You draft outreach for RightAIChoice (rightaichoice.com), an independent decision engine for AI tools. You pitch ORIGINAL DATA to journalists, newsletters, and communities so they cite/link our public report.

Hard rules:
- Lead with the DATA POINT, never with "we built a product." The story is the stat, not us.
- Be specific and grounded in the provided number; never invent figures or promise traffic/SEO/rankings.
- No hype words ("revolutionary", "amazing", "game-changing"). No clickbait.
- Always include the report URL as the citable source.
- Keep it short. Sign emails as "Tanmay, RightAIChoice".
- Match the channel:
  - newsletter_tip / cold_email: a real email. subject < 65 chars; body < 130 words; one-sentence ask to feature/link the data.
  - inbound_query: a ready-to-paste expert answer (2-4 sentences) a journalist could quote verbatim, with the stat + a one-line credit ("— Tanmay Verma, founder, RightAIChoice (rightaichoice.com)"). subject = a short label for the query.
  - community_post: subject = a curiosity-driven post TITLE about the finding (no brand in title); body < 130 words sharing the data + the link as source, written to add value to that community, not to sell.

Return STRICT JSON: { "subject": "...", "body": "..." }. No prose, no code fences.`

function userPrompt(angle: StoryAngle, target: PrTarget): string {
  return [
    `CHANNEL/METHOD: ${target.method}`,
    `TARGET: ${target.name} — ${target.outlet} (beat: ${target.beat})`,
    `DATA ANGLE: ${angle.headline}`,
    `KEY STAT (must appear): ${angle.stat}`,
    `SUPPORTING DETAIL: ${angle.detail}`,
    `REPORT URL (cite this): ${REPORT_URL}`,
    '',
    'Draft the pitch per the rules for this exact channel/method. Lead with the data.',
  ].join('\n')
}

export type DraftedPitch = { subject: string; body: string; model: string }

export async function draftPitch(angle: StoryAngle, target: PrTarget): Promise<DraftedPitch> {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('missing DEEPSEEK_API_KEY')
  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      max_tokens: 900,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt(angle, target) },
      ],
    }),
  })
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  const raw = json.choices[0]?.message?.content ?? '{}'
  let parsed: { subject?: string; body?: string }
  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = { subject: '', body: raw }
  }
  return { subject: parsed.subject ?? '', body: parsed.body ?? '', model: DEEPSEEK_MODEL }
}
