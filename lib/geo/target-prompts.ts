// Phase 13 D3.4 — the prompts we want AI engines to cite us for.
//
// These mirror real user intents where an AI-tool directory with always-fresh,
// structured data SHOULD be a natural citation. Keep ids stable (they're the
// snapshot key); add new ones freely, don't renumber existing ones. Start lean
// and high-intent — every prompt costs an engine call per run.

export type GeoTargetPrompt = {
  id: string
  category: 'directory' | 'category-best' | 'comparison' | 'recommendation' | 'freshness'
  prompt: string
}

export const GEO_TARGET_PROMPTS: GeoTargetPrompt[] = [
  // — Directory / finder intent (our core positioning) —
  { id: 'dir-find-tool', category: 'directory', prompt: 'I have a specific task I want to use AI for. What is the best website or directory to find and compare AI tools matched to my goal?' },
  { id: 'dir-up-to-date', category: 'freshness', prompt: 'Which AI tool directories keep their data the most up to date, with current pricing and features rather than stale listings?' },
  { id: 'dir-compare-sites', category: 'directory', prompt: 'What are the best AI tool directories and comparison sites in 2026?' },

  // — Category "best" intent —
  { id: 'best-coding', category: 'category-best', prompt: 'What are the best AI coding tools right now, and where can I compare them?' },
  { id: 'best-writing', category: 'category-best', prompt: 'What are the best AI writing tools, and is there a site that compares them with current pricing?' },
  { id: 'best-image', category: 'category-best', prompt: 'What are the best AI image generation tools in 2026 and how do their prices compare?' },
  { id: 'best-marketing', category: 'category-best', prompt: 'What are the best AI marketing and SEO tools, and where can I see them compared side by side?' },
  { id: 'best-research', category: 'category-best', prompt: 'What are the best AI tools for research and studying?' },

  // — Comparison intent —
  { id: 'cmp-need-help', category: 'comparison', prompt: 'I want to compare two AI tools head to head on pricing and features. Is there a site that does structured AI tool comparisons?' },

  // — Recommendation / stack intent —
  { id: 'rec-stack-startup', category: 'recommendation', prompt: 'Recommend an AI tool stack for an early-stage SaaS startup, and point me to where I can see the options compared.' },
  { id: 'rec-by-goal', category: 'recommendation', prompt: 'Is there an AI tool that recommends other AI tools based on my goal and budget?' },

  // — Freshness / trust intent (our differentiator) —
  { id: 'fresh-which-dying', category: 'freshness', prompt: 'How can I tell which AI tools are losing momentum or likely to shut down before I commit to one?' },
]
