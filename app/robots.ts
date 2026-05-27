import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/dashboard', '/auth/', '/api/'],
      },
      // Defensive explicit allow for AI / LLM crawlers + training bots.
      // `*` already covers them, but listing them by name is a stronger
      // signal to any intermediary (Cloudflare, CDN, etc) that might
      // someday default-deny "AI bots." We want to be discoverable by
      // every AI assistant + AI training pipeline.
      { userAgent: 'GPTBot', allow: '/' },              // OpenAI training
      { userAgent: 'ChatGPT-User', allow: '/' },        // ChatGPT browse + Search
      { userAgent: 'OAI-SearchBot', allow: '/' },       // ChatGPT Search indexer
      { userAgent: 'anthropic-ai', allow: '/' },        // Anthropic training (legacy)
      { userAgent: 'Claude-Web', allow: '/' },          // Claude browsing
      { userAgent: 'ClaudeBot', allow: '/' },           // Anthropic training
      { userAgent: 'PerplexityBot', allow: '/' },       // Perplexity index
      { userAgent: 'Perplexity-User', allow: '/' },     // Perplexity user fetches
      { userAgent: 'Google-Extended', allow: '/' },     // Bard/Gemini training
      { userAgent: 'CCBot', allow: '/' },               // Common Crawl (feeds many LLMs)
      { userAgent: 'Applebot-Extended', allow: '/' },   // Apple Intelligence
      { userAgent: 'cohere-ai', allow: '/' },           // Cohere training
      { userAgent: 'Meta-ExternalAgent', allow: '/' },  // Meta AI
      { userAgent: 'YouBot', allow: '/' },              // You.com
      // Phase 9 (2026-05-27): expanded AI-crawler allowlist. Bytespider
      // (TikTok/ByteDance), DuckAssistBot (DuckDuckGo AI Chat), Diffbot
      // (citation graphs feeding several LLMs), Amazonbot (Alexa+),
      // MistralAI-User (Le Chat) — all explicitly listed so we never get
      // accidentally blocked by a default-deny intermediary.
      { userAgent: 'Bytespider', allow: '/' },          // ByteDance / TikTok / Doubao
      { userAgent: 'DuckAssistBot', allow: '/' },       // DuckDuckGo AI Chat
      { userAgent: 'Diffbot', allow: '/' },             // Diffbot Knowledge Graph (feeds many LLMs)
      { userAgent: 'Amazonbot', allow: '/' },           // Alexa+ / Amazon AI
      { userAgent: 'MistralAI-User', allow: '/' },      // Mistral Le Chat
      { userAgent: 'Timpibot', allow: '/' },            // Timpi search/AI
    ],
    // Phase 7I (2026-05-16): point at the sitemap index, not the
    // monolithic sitemap. /sitemap-index.xml lists 8 per-type subsitemaps;
    // the legacy /sitemap.xml is now static-only and one of those entries.
    sitemap: 'https://rightaichoice.com/sitemap-index.xml',
  }
}
