// Phase 9 Stage 1 (2026-05-16): shared DeepSeek caller for the /api/plan
// route + the quality-gate. Replaces direct Anthropic SDK usage in the
// user-facing planner so the LLM bill matches the data-layer's DeepSeek
// economics (~8× cheaper at parity quality on structured + editorial
// output — already proven in lib/cron/refresh.ts).
//
// DeepSeek's chat-completions API mirrors OpenAI's. We use:
//   - `response_format: { type: 'json_object' }` to force valid JSON
//     output (replaces the manual cleaning step the Anthropic path did)
//   - `max_tokens` honored as-is
//   - optional `timeout_ms` race for the quality-gate which has tight SLAs
//
// The Anthropic SDK + ANTHROPIC_API_KEY stay in the project for the
// /ai-chat route (latency-sensitive user chat) and as fallback if
// DeepSeek has an outage. Just not used in the planner.

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

export type DeepSeekArgs = {
  system?: string
  user: string
  /** max tokens to generate. DeepSeek hard cap is 8192. */
  max_tokens?: number
  /** when true, sets response_format: json_object. Default true. */
  json?: boolean
  /** optional race-timeout in ms. Used by quality-gate (1500ms cap). */
  timeout_ms?: number
}

export async function callDeepSeek(args: DeepSeekArgs): Promise<string> {
  const messages: Array<{ role: 'system' | 'user'; content: string }> = []
  if (args.system) messages.push({ role: 'system', content: args.system })
  messages.push({ role: 'user', content: args.user })

  const body: Record<string, unknown> = {
    model: DEEPSEEK_MODEL,
    max_tokens: args.max_tokens ?? 4096,
    messages,
  }
  if (args.json !== false) {
    body.response_format = { type: 'json_object' }
  }

  const fetchCall = fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const res = args.timeout_ms
    ? await Promise.race([
        fetchCall,
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error('deepseek_timeout')), args.timeout_ms),
        ),
      ])
    : await fetchCall

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`DeepSeek ${res.status}: ${text.slice(0, 300)}`)
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  return json.choices?.[0]?.message?.content ?? ''
}

/** Strip code fences + return what's left for downstream JSON.parse. */
export function stripJsonFences(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}
