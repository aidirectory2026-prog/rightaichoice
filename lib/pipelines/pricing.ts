// Phase 8.d.3 — Single source of truth for per-token / per-event pricing.
// When a provider changes prices, edit ONLY this file.
//
// All token prices are USD per 1M tokens (provider convention).

export const TOKEN_PRICES_PER_M_USD = {
  // DeepSeek V3 — used for all bulk data-layer synthesis.
  // https://platform.deepseek.com/api-docs/pricing — May 2026.
  'deepseek-chat': { in: 0.27, out: 1.1 },

  // Anthropic — used for /plan flow + curate gate.
  // https://docs.anthropic.com/claude/docs/pricing — Opus 4.7 / Sonnet 4.6 / Haiku 4.5.
  'claude-opus-4-7': { in: 15.0, out: 75.0 },
  'claude-sonnet-4-6': { in: 3.0, out: 15.0 },
  'claude-haiku-4-5': { in: 0.8, out: 4.0 },
} as const

export type DeepSeekModel = 'deepseek-chat'
export type AnthropicModel = 'claude-opus-4-7' | 'claude-sonnet-4-6' | 'claude-haiku-4-5'

export function estimateTokenCostUsd(
  model: DeepSeekModel | AnthropicModel,
  tokensIn: number,
  tokensOut: number,
): number {
  const rate = TOKEN_PRICES_PER_M_USD[model]
  return (tokensIn / 1_000_000) * rate.in + (tokensOut / 1_000_000) * rate.out
}

// Apify pricing — per actor run, USD. Used by refresh-latest-updates.
// Update from https://apify.com/store on provider price changes.
export const APIFY_PRICE_USD = {
  'news-mentions': 0.004,
  'reddit-scrape': 0.002,
  'twitter-mentions': 0.008,
  'producthunt-discover': 0.005,
} as const
