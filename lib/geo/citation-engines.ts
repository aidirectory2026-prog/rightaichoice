// Phase 13 D3.4 — pluggable AI-citation engines.
//
// An engine takes a prompt, asks an AI assistant that searches the web, and
// returns the ordered list of URLs it CITED in its answer plus the URLs it
// RETRIEVED. The orchestrator (track-citations.ts) turns that into our/competitor
// analysis. v1 ships `claude_websearch` (runs on the existing ANTHROPIC_API_KEY).
// perplexity/openai/gemini are scaffolded and stay disabled until their keys are
// added — so we build the full architecture without new spend ("free/organic for now").

import Anthropic from '@anthropic-ai/sdk'

export type EngineResult = {
  /** URLs the engine CITED inline in its answer, in order of first appearance. */
  citedUrls: string[]
  /** URLs the engine RETRIEVED (saw) while searching — superset of cited. */
  retrievedUrls: string[]
  /** First ~600 chars of the answer text. */
  answerExcerpt: string
  /** Exact model/string used, for the snapshot row. */
  model: string
  tokensIn: number
  tokensOut: number
}

export type EngineId = 'claude_websearch' | 'perplexity' | 'openai' | 'gemini'

export interface CitationEngine {
  id: EngineId
  /** True when the engine has the credentials it needs to run. */
  isEnabled(): boolean
  run(prompt: string): Promise<EngineResult>
}

// ── claude_websearch (v1, runs on ANTHROPIC_API_KEY) ─────────────────────────

const CLAUDE_MODEL = process.env.GEO_CLAUDE_MODEL || 'claude-opus-4-8'
const MAX_PAUSE_CONTINUATIONS = 4

class ClaudeWebSearchEngine implements CitationEngine {
  id = 'claude_websearch' as const
  private client: Anthropic | null = null

  isEnabled(): boolean {
    return !!process.env.ANTHROPIC_API_KEY
  }

  private get anthropic(): Anthropic {
    if (!this.client) this.client = new Anthropic()
    return this.client
  }

  async run(prompt: string): Promise<EngineResult> {
    const citedUrls: string[] = []
    const retrievedUrls: string[] = []
    const answerChunks: string[] = []
    let tokensIn = 0
    let tokensOut = 0

    // web_search is a server-side tool; the API may return stop_reason
    // "pause_turn" after its internal loop cap — re-send to resume.
    let messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]
    for (let i = 0; i <= MAX_PAUSE_CONTINUATIONS; i++) {
      const resp = await this.anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 12000,
        thinking: { type: 'adaptive' },
        // web_search_20260209 is supported by the installed SDK; cast keeps us
        // resilient to any param-type drift across SDK minor versions.
        tools: [{ type: 'web_search_20260209', name: 'web_search' }] as never,
        messages,
      })
      tokensIn += resp.usage?.input_tokens ?? 0
      tokensOut += resp.usage?.output_tokens ?? 0
      harvestBlocks(resp.content as unknown[], citedUrls, retrievedUrls, answerChunks)

      if (resp.stop_reason === 'pause_turn') {
        messages = [...messages, { role: 'assistant', content: resp.content as never }]
        continue
      }
      break
    }

    return {
      citedUrls,
      retrievedUrls,
      answerExcerpt: answerChunks.join('').slice(0, 600),
      model: CLAUDE_MODEL,
      tokensIn,
      tokensOut,
    }
  }
}

/** Pull cited URLs (from text-block citations) + retrieved URLs (from web_search results) out of a response. */
function harvestBlocks(
  blocks: unknown[],
  citedUrls: string[],
  retrievedUrls: string[],
  answerChunks: string[],
): void {
  for (const raw of blocks ?? []) {
    const block = raw as Record<string, unknown>
    if (block.type === 'text') {
      if (typeof block.text === 'string') answerChunks.push(block.text)
      const citations = (block.citations as Array<Record<string, unknown>>) ?? []
      for (const c of citations) {
        const url = c.url as string | undefined
        if (url) pushUnique(citedUrls, url)
      }
    } else if (block.type === 'web_search_tool_result') {
      const content = block.content
      if (Array.isArray(content)) {
        for (const r of content as Array<Record<string, unknown>>) {
          const url = r.url as string | undefined
          if (url) pushUnique(retrievedUrls, url)
        }
      }
    }
  }
}

function pushUnique(arr: string[], v: string): void {
  if (!arr.includes(v)) arr.push(v)
}

// ── gemini (free tier + Google Search grounding) ─────────────────────────────
//
// Enable by creating a FREE key at https://aistudio.google.com/apikey and setting
// GEMINI_API_KEY. Gemini's google_search grounding returns the sources it used to
// ground the answer — those are our "cited" set. Grounding URIs are Vertex redirect
// links, so we resolve each to its final domain (falling back to the chunk title).

const GEMINI_MODEL = process.env.GEO_GEMINI_MODEL || 'gemini-2.5-flash'

class GeminiEngine implements CitationEngine {
  id = 'gemini' as const

  isEnabled(): boolean {
    return !!process.env.GEMINI_API_KEY
  }

  async run(prompt: string): Promise<EngineResult> {
    const key = process.env.GEMINI_API_KEY
    if (!key) throw new Error('GEMINI_API_KEY not set')
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
    })
    if (!resp.ok) {
      throw new Error(`gemini ${resp.status}: ${(await resp.text()).slice(0, 300)}`)
    }
    const data = (await resp.json()) as Record<string, unknown>
    const candidates = (data.candidates as Array<Record<string, unknown>>) ?? []
    const cand = candidates[0] ?? {}
    const parts =
      ((cand.content as Record<string, unknown>)?.parts as Array<Record<string, unknown>>) ?? []
    const answer = parts
      .map((p) => p.text)
      .filter((t): t is string => typeof t === 'string')
      .join('')

    const grounding = (cand.groundingMetadata as Record<string, unknown>) ?? {}
    const chunks = (grounding.groundingChunks as Array<Record<string, unknown>>) ?? []
    const rawSources = chunks.map((c) => {
      const web = (c.web as Record<string, unknown>) ?? {}
      return { uri: web.uri as string | undefined, title: web.title as string | undefined }
    })
    const resolved = await resolveGroundingSources(rawSources)

    const usage = (data.usageMetadata as Record<string, unknown>) ?? {}
    return {
      // Gemini grounding chunks are the sources it used to ground the answer ≈ cited.
      citedUrls: resolved,
      retrievedUrls: resolved,
      answerExcerpt: answer.slice(0, 600),
      model: GEMINI_MODEL,
      tokensIn: (usage.promptTokenCount as number) ?? 0,
      tokensOut: (usage.candidatesTokenCount as number) ?? 0,
    }
  }
}

/** Gemini grounding URIs are Vertex redirects — resolve each to its final URL; fall back to the title. */
async function resolveGroundingSources(
  sources: Array<{ uri?: string; title?: string }>,
): Promise<string[]> {
  const out: string[] = []
  for (const s of sources) {
    let resolved = s.title || s.uri || ''
    if (s.uri && /grounding-api-redirect|vertexaisearch/.test(s.uri)) {
      try {
        const r = await fetch(s.uri, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(8000) })
        if (r.url) resolved = r.url
      } catch {
        // keep the title fallback
      }
    }
    if (resolved && !out.includes(resolved)) out.push(resolved)
  }
  return out
}

// ── Scaffolded engines (disabled until keys are added) ───────────────────────

class DisabledEngine implements CitationEngine {
  constructor(
    public id: EngineId,
    private envVar: string,
  ) {}
  isEnabled(): boolean {
    return !!process.env[this.envVar]
  }
  async run(): Promise<EngineResult> {
    throw new Error(
      `engine ${this.id} not implemented yet (set ${this.envVar} and implement the adapter to enable)`,
    )
  }
}

export const ENGINES: Record<EngineId, CitationEngine> = {
  claude_websearch: new ClaudeWebSearchEngine(),
  gemini: new GeminiEngine(),
  perplexity: new DisabledEngine('perplexity', 'PERPLEXITY_API_KEY'),
  openai: new DisabledEngine('openai', 'OPENAI_API_KEY'),
}

export function getEngine(id: EngineId): CitationEngine {
  const e = ENGINES[id]
  if (!e) throw new Error(`unknown engine: ${id}`)
  return e
}
