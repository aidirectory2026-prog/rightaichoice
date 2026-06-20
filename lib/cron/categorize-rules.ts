/**
 * Single source of truth for how a tool is mapped to its categories.
 *
 * Phase 11 (2026-06-20): the original categorize prompts (in onboard.ts and the
 * backfill script) fed DeepSeek only the bare slug names with "pick 1-3" and no
 * disambiguation. That over-assigned (most tools got 3 categories) and mis-bucketed
 * by surface keywords — e.g. a radiology-analysis tool ("medical IMAGING") and an
 * LLM leaderboard both landed in Image Generation, and video generators (Runway,
 * Kling) were filed under Image Generation instead of Video & Audio.
 *
 * These rules are imported by BOTH the live onboarding path (lib/cron/onboard.ts)
 * and the bulk re-classifier (scripts/reclassify-categories.ts) so new tools and
 * the existing catalog are judged by the exact same standard.
 */

export const CATEGORIZE_SYSTEM_PROMPT =
  'You are a precise classifier for an AI-tool decision engine. You map each tool to ' +
  'the category (or categories) that describe what the tool actually DOES for its user — ' +
  'never by keywords that merely appear in its name or tagline. You prefer a single, most-specific ' +
  'category and only add more when the tool genuinely serves distinct domains. You use ONLY slugs ' +
  'from the provided list and reply with strict JSON.'

/**
 * The disambiguation rules. Kept terse — these are the failure modes observed in
 * the live catalog, stated as hard rules the model must not violate.
 */
export const CATEGORIZE_RULES = `Classification rules — follow EXACTLY:
- Judge the tool by its PRIMARY job for the user, not by words in its name/tagline.
- Always choose the single best PRIMARY category. Add ONE secondary category only when a clear,
  distinct second domain genuinely applies (e.g. an AI coding assistant that is also a hosting
  platform → code-development + developer-infrastructure). Use a 3rd only for true multi-domain
  platforms. Prefer precision over coverage — never pad to hit a number; most focused tools get 1–2.
- Order the slugs by relevance, primary category first.
- image-generation = tools that GENERATE or EDIT static images/art/photos. A tool that generates
  VIDEO (e.g. text-to-video, video models) belongs in video-audio, NOT image-generation. A tool that
  ANALYZES medical/other images (e.g. radiology, facial analysis) is NOT image-generation — use the
  closest domain (healthcare, data-analytics, etc.).
- video-audio = video editing/generation, music, and general audio. voice-speech = text-to-speech,
  transcription, and voice cloning specifically.
- healthcare = clinical, medical, drug-discovery, therapy, or patient-care tools. A general tool
  (notes, scheduling, CRM) is NOT healthcare just because it can be used in a hospital.
- automation-agents = AI agents, agent frameworks, and workflow/no-code automation platforms. Do NOT
  tag a tool "automation" merely because it automates one task within another domain.
- productivity = personal/team productivity (notes, docs, scheduling, email). It is NOT a catch-all —
  do not use it for tools that have a more specific home.
- data-analytics / business-intelligence = analyzing data and producing insights/dashboards.
- A parked domain, a "for sale" page, or anything that is not a real working AI tool: return an empty
  slug list.`

/** Render the fixed category list (slug: name — description) for the prompt. */
export function renderCategoryList(
  categories: Array<{ slug: string; name: string; description?: string | null }>,
): string {
  return categories
    .map((c) => `- ${c.slug}: ${c.name} — ${c.description ?? ''}`)
    .join('\n')
}
