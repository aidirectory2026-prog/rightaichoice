/**
 * Phase 9 Tier-1 (2026-05-29) — curated batch title approvals.
 *
 * Claude reviewed the 2026-05-29 regenerated tier1-rewrites.json and curated
 * the best title per page (intent-match to the top GSC query, <=62 visible
 * chars, no clickbait, fixes the literal "&amp;" HTML-entity bug present in
 * many live titles). This applies them the same way /admin/tier1-review's
 * approve action does — insert one active title_overrides row per path — then
 * fires the recrawl signal (bump pages_freshness -> sitemap lastmod + IndexNow
 * ping) so the change is actually seen by crawlers. Idempotent: re-running
 * soft-reverts the prior active override and inserts the curated one.
 *
 * USAGE:
 *   npm run tier1:approve:dry
 *   npm run tier1:approve
 *
 * REQUIRED ENV: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
export {}

import { getAdminClient } from '../lib/cron/supabase-admin'
import { bumpFreshness, type FreshnessPageType } from '../lib/seo/freshness'
import { submitToIndexNow } from '../lib/indexnow'

const ADMIN_ID = '8c4c5b71-12ca-4e17-ac06-fe91fe74171b' // founder, is_admin
const BASE_URL = 'https://rightaichoice.com'
const BRAND = ' | RightAIChoice'
const isDry = process.argv.includes('--dry') || process.argv.includes('--dry-run')

type Approval = { path: string; title: string; bucket: '1A' | '1B' | '1C' }

// Curated titles. Bare titles (no brand suffix) get BRAND appended below.
const APPROVALS: Approval[] = [
  // --- Title-bound compares + blog (page-1, high leverage) ---
  { path: '/compare/duolingo-vs-loora', title: 'Duolingo vs Loora: Which Is Better for Speaking?', bucket: '1A' },
  { path: '/compare/duolingo-vs-talkpal', title: 'Duolingo vs TalkPal: Which App Wins in 2026?', bucket: '1A' },
  { path: '/compare/openhands-vs-devin', title: 'OpenHands vs Devin: CLI & Chat Showdown (2026)', bucket: '1A' },
  { path: '/compare/dify-vs-langflow-vs-fastgpt', title: 'FastGPT vs Dify vs Langflow: Best RAG Builder 2026', bucket: '1A' },
  { path: '/compare/clay-vs-phantombuster', title: 'PhantomBuster vs Clay: Safe on LinkedIn? (2026)', bucket: '1A' },
  { path: '/blog/ai-coding-assistant-leaderboard-swe-bench-humaneval-2026', title: 'AI Coding Leaderboard 2026: Aider Polyglot & SWE-bench', bucket: '1A' },
  // (held — current titles already optimal: cost-math blog, open-source-agents blog, moises-vs-suno)

  // --- Tool pages ranking pos 1-20 (fix &amp; bug + tighten to query intent) ---
  { path: '/tools/parspec', title: 'Parspec Integrations: Eclipse, Prophet 21, SAP ERP', bucket: '1B' },
  { path: '/tools/autodesk-forma', title: 'Autodesk Forma Pricing 2026: Plans & Features', bucket: '1B' },
  { path: '/tools/motiff', title: 'Motiff Discontinued June 2026: Official News', bucket: '1A' },
  { path: '/tools/socket-dev', title: 'Socket.dev Pricing 2026: Plans & Cost', bucket: '1B' },
  { path: '/tools/assemblyai', title: 'AssemblyAI Pricing: Speech-to-Text & Diarization', bucket: '1B' },
  { path: '/tools/fontjoy', title: 'Fontjoy Founders: Who Created It?', bucket: '1B' },
  { path: '/tools/starwriter-ai', title: 'StarWriter AI Pricing & Plans 2026', bucket: '1B' },
  { path: '/tools/sightsai', title: 'SightsAI Pricing & Features 2026', bucket: '1B' },
  { path: '/tools/autosana', title: 'Autosana Pricing: Plans & Costs 2026', bucket: '1A' },
  { path: '/tools/letterbook', title: 'Letterbook: Best Features & Pricing 2026', bucket: '1B' },
  { path: '/tools/spiritt', title: 'Spiritt Founder Review: Pricing & Features 2026', bucket: '1A' },
  { path: '/tools/nanaimage', title: 'NanaImage Pricing & Features (2026)', bucket: '1A' },
  { path: '/tools/creative-fast-aid', title: 'Creative Fast AID: Pricing & Features 2026', bucket: '1B' },
  { path: '/tools/rightjoin', title: 'RightJoin Pricing 2026 & Features', bucket: '1B' },
  { path: '/tools/thinkdiffusion', title: 'ThinkDiffusion Pricing 2026: ComfyUI Cloud GPU', bucket: '1B' },
  { path: '/tools/chromox', title: 'Chromox: Pricing & Key Features (2026)', bucket: '1B' },
  { path: '/tools/portfoliogpt', title: 'PortfolioGPT Pricing & Alternatives 2026', bucket: '1B' },
  { path: '/tools/velona', title: 'Velona AI: Pricing & Features 2026', bucket: '1B' },
  { path: '/tools/superhuman', title: 'Superhuman Pricing 2026: Plans, Costs & Value', bucket: '1B' },
  { path: '/tools/post-boost', title: 'PostBoost 2026: Pricing, Features & Reviews', bucket: '1B' },
  { path: '/tools/civitai', title: 'CivitAI vs Red: Which AI Model Hub Wins?', bucket: '1A' },
  { path: '/tools/context7', title: 'Context7 Pricing & Plans 2026', bucket: '1A' },
  { path: '/tools/muze-ai', title: 'Muze AI CMO: Pricing & Features 2026', bucket: '1A' },
  { path: '/tools/pdf-ai', title: 'PDF.ai Pricing 2026: Official Plans & Cost', bucket: '1A' },
  { path: '/tools/option-alpha', title: 'Option Alpha: Pricing & Features 2026', bucket: '1A' },
  { path: '/tools/tensor-art', title: 'Tensor.art Free Daily Credits 2026', bucket: '1A' },
  { path: '/tools/andi', title: 'Andi AI: Pricing, Features & Search Alternatives', bucket: '1B' },
  { path: '/tools/coinfeeds', title: 'Coinfeeds: Crypto News API Pricing 2026', bucket: '1B' },
  { path: '/tools/mem0', title: 'Mem0 Pricing: Plans & Cost 2026', bucket: '1B' },
  { path: '/tools/postly', title: 'Postly Pricing 2026: Plans & Cost', bucket: '1B' },
  { path: '/tools/recursion-pharma', title: 'Recursion Pharma Dataset Size in Petabytes', bucket: '1B' },
  { path: '/tools/shipixen', title: 'Shipixen Pricing 2026: Plans & Features', bucket: '1B' },
  { path: '/tools/rowspeak', title: 'RowSpeak Pricing, Features & More', bucket: '1B' },
]

function pageType(path: string): FreshnessPageType {
  if (path.startsWith('/compare/')) return 'compare'
  if (path.startsWith('/blog/')) return 'blog'
  return 'tool'
}

function withBrand(title: string): string {
  return title.includes('RightAIChoice') ? title : `${title}${BRAND}`
}

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getAdminClient() as any
  console.log(`[tier1:approve] ${APPROVALS.length} curated approvals (dry=${isDry})`)

  let applied = 0
  for (const a of APPROVALS) {
    const finalTitle = withBrand(a.title)
    if (finalTitle.length > 80) {
      console.warn(`[tier1:approve] SKIP (>80c): ${a.path} — ${finalTitle.length}c`)
      continue
    }
    console.log(`  ${a.path}  →  ${finalTitle}  (${finalTitle.length}c)`)
    if (isDry) continue

    // 1. Soft-revert prior active override (unique partial index guard).
    await db
      .from('title_overrides')
      .update({ reverted_at: new Date().toISOString() })
      .eq('page_path', a.path)
      .is('reverted_at', null)

    // 2. Insert the curated override.
    const { error } = await db.from('title_overrides').insert({
      page_path: a.path,
      override_title: finalTitle,
      source_bucket: a.bucket,
      approved_by: ADMIN_ID,
      notes: 'Claude curated batch 2026-05-29 (Tier-1 pos 1-20 + title-bound)',
    })
    if (error) {
      console.warn(`[tier1:approve] FAIL ${a.path}: ${error.message}`)
      continue
    }

    // 3. Recrawl signal.
    try {
      await bumpFreshness(a.path, {
        pageType: pageType(a.path),
        source: 'admin_manual',
        event: 'tier1_title_approved_batch',
        reason: 'tier1 curated title rewrite',
      })
    } catch (e) {
      console.warn(`  bumpFreshness failed: ${(e as Error).message}`)
    }
    applied++
  }

  if (isDry) {
    console.log('[tier1:approve] dry-run — no writes')
    return
  }

  // 4. IndexNow ping for all approved URLs in one batch (Bing/Yandex instant).
  const urls = APPROVALS.map((a) => `${BASE_URL}${a.path}`)
  try {
    await submitToIndexNow(urls)
    console.log(`[tier1:approve] IndexNow pinged ${urls.length} URLs`)
  } catch (e) {
    console.warn(`[tier1:approve] IndexNow failed: ${(e as Error).message}`)
  }

  console.log(`[tier1:approve] done — ${applied} overrides applied + recrawl signalled`)
}

main().catch((e) => {
  console.error('[tier1:approve] fatal:', e)
  process.exit(1)
})
