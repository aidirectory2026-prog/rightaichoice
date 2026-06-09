import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/lib/env'

let client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!client) {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set')
    }
    // Phase 10 #2 — bound every Anthropic call so a slow/hung provider can't
    // leave a user staring at a spinner (or keep a paid function alive) forever.
    // Covers /ai-chat and the recommender, which share this client.
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 30_000, maxRetries: 1 })
  }
  return client
}
