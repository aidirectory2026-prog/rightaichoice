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
  perplexity: new DisabledEngine('perplexity', 'PERPLEXITY_API_KEY'),
  openai: new DisabledEngine('openai', 'OPENAI_API_KEY'),
  gemini: new DisabledEngine('gemini', 'GEMINI_API_KEY'),
}

export function getEngine(id: EngineId): CitationEngine {
  const e = ENGINES[id]
  if (!e) throw new Error(`unknown engine: ${id}`)
  return e
}
