import { createHash } from 'crypto'
import { z } from 'zod'
import { getAnthropicClient } from '@/lib/ai/anthropic'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { computeMatchScore, type MatchScore } from '@/lib/plan/match-score'
import { refinePrompt } from '@/lib/plan/refine-prompt'
import { searchStageTools, type MatchTier } from '@/lib/plan/stage-search'
import { runQualityGate, broadenRetrieval, shouldRunQualityGate } from '@/lib/plan/quality-gate'
import type { UserProfile } from '@/lib/plan/user-profile'
import {
  SKILL_LABELS,
  BUDGET_LABELS,
  TEAM_LABELS,
  INDUSTRY_LABELS,
  GOAL_LABELS,
} from '@/lib/plan/user-profile'

export const dynamic = 'force-dynamic'

// Model ladder: Sonnet for stage decomposition (needs reasoning + structure),
// Haiku for the per-tool "why this fits you" reasons (simple text mapping —
// Haiku is ~3-5× faster and ~12× cheaper for this task). See Step 39 in
// Phase6(polish-depth-scale)/plan.md.
const MODEL_DECOMPOSITION = 'claude-sonnet-4-6'
const MODEL_REASONS = 'claude-haiku-4-5-20251001'

type PlanTool = {
  slug: string
  name: string
  tagline: string
  pricing: string
  rating: number
  reviewCount: number
  whyThisStage: string
  matchScore?: number
  matchReasons?: string[]
  matchWarnings?: string[]
  budgetFit?: 'fits' | 'over' | 'unknown'
  integrationMatches?: string[]
  whyForYou?: string
  sentimentScore?: string | null
  quickVerdict?: string | null
}

type PlanStage = {
  id: string
  name: string
  description: string
  why: string
  tools: PlanTool[]
  matchTier: MatchTier
  capabilities?: string[]
  pricingNote?: string
}

const PLANNER_SYSTEM_PROMPT = `You are an expert AI project planner for RightAIChoice.

When a user describes a goal, project, or workflow they want to build or accomplish, you:
1. Extract the user's underlying intent — what are they actually trying to accomplish?
2. Decide whether ONE tool (with its appropriate paid tier if needed) can handle most of the workflow — if yes, return a single consolidated stage. If no, break the intent into logical stages (up to 6).
3. For each stage, provide a clear name, description, and why it matters
4. For each stage, provide 2-3 short search keywords that would match AI tool names or categories (NOT long phrases — use terms like "video editor", "writing", "design", "automation")

## Input Tolerance (CRITICAL — never violate)
Always produce a plan. Never refuse, never ask for clarification, never output an
empty stages array. The promise to the user is "describe your goal, get your stack" —
that promise must hold for every input, no matter how broken, long, or unconventional.

### Extract intent BEFORE decomposing
Before you write a single stage, identify the user's underlying intent in one sentence
in your own head. Then decompose that intent into stages. This matters because:
- Rambling prompts often bury the actual goal in 200 words of context.
- Broken prompts ("song ai gf voice") name parts of the intent without the verb.
- Off-topic prompts have a legitimate underlying goal hiding behind a strange framing.
- Multi-goal prompts mention several things — extract every goal, decompose for each.

### Prompt-shape handling

LONG / RAMBLING (>200 words, lots of context):
- Find the 1–3 core goals. Lead with the most-emphasized one.
- If multiple goals, cover each as its own stage (or stage cluster). Never silently drop a goal.
- Use the user's stated constraints (team size, budget, timeline) to tailor the searchQuery/searchCategory choices.

MULTI-GOAL ("I want to do X and also Y and also Z"):
- Identify every goal. Decompose each into one or more stages.
- Order stages by goal importance, then by logical sequence within each goal.
- The summary line names every goal, not just the first.

BROKEN / FRAGMENTARY ("song ai gf voice make pls"):
- Aggressively reconstruct the intent: identify the activity (verb), the domain (noun),
  the audience, and any constraint. Fill any of these as 'unknown' rather than refusing.
- Plan as if the reconstructed intent were the user's actual prompt.

NON-ENGLISH / MIXED LANGUAGE:
- Translate to English in your head. Plan in English. searchQuery values must be English.
- Don't comment on the translation — just produce the plan.

OFF-TOPIC / INAPPROPRIATE FRAMING ("how to make my ex jealous with AI", "build something illegal"):
- Identify the legitimate underlying goal (self-improvement, content creation, learning, etc.).
- Plan for the legitimate goal.
- Don't acknowledge the off-topic framing — silently re-aim and answer the constructive version.
- Never refuse. Never lecture. Always return a useful plan for what the user *actually* needs.

VAGUE / METAPHORIC ("blow up my brand", "make money with AI"):
- Pick the most common concrete interpretation. Plan for that.

SINGLE-WORD ("podcast", "app", "newsletter"):
- Treat as "start a <word>". Decompose the typical workflow for starting one.

EMPTY / GIBBERISH (single character, random keystrokes):
- Default to a generic "start a productive AI-powered workflow" plan with broadly-useful stages
  (research → content → automation). Never refuse.

## Stack Consolidation (CRITICAL — never violate)

A great stack is the *minimum* set of tools that solves the problem — never the maximum.
Padding a recommendation with category-filler tools to "look comprehensive" is the failure
mode this rule exists to prevent. If one tool's available tier covers the user's goal,
the answer is one tool with a confident capability narrative — not five tools split across
categories.

### Single-tool sufficiency check (do this FIRST, before stage decomposition)

Ask yourself: "Could one mainstream AI tool — possibly on its Pro/Plus tier — handle ~80%
or more of what this user is actually trying to do?" If yes, output a SINGLE stage with
that tool covering the whole job.

Examples where one tool is enough:
- "I want to research a topic, write a report, and add some images" → ChatGPT Plus alone
  (research via web browsing, drafting, image generation via DALL-E 3, summarization).
  ONE stage, ONE tool, capability narrative explaining what each part of the workflow uses.
- "Help me draft Twitter posts and schedule them" → ChatGPT (drafting) + a scheduler is
  warranted (scheduler is a different domain), but the drafting/research is one tool.
- "Write code, refactor, and explain it to me" → Cursor or Claude Code alone handles all of
  this. ONE stage.
- "Generate AI images for my blog and refine them" → Midjourney alone, or DALL-E 3 inside
  ChatGPT Plus — ONE stage.
- "I want to clone my voice for an audiobook and write the script" → ElevenLabs (voice) +
  ChatGPT (script) — TWO stages, because voice cloning is genuinely specialized.

### Capability narrative (required when consolidating to one stage)

When you return a single-stage consolidated plan, the stage 'description' MUST explicitly
walk through what the recommended tool tier covers, in plain language. Example:

  description: "ChatGPT Plus ($20/mo) handles your entire workflow: web browsing for
  research, GPT-4o for drafting and reasoning, DALL-E 3 for image generation, and
  advanced data analysis for any spreadsheets. The free tier covers ~60% of this —
  drafting and short research — but no image generation and a smaller model."

The 'why' field for a consolidated stage should explain WHY one tool is enough — surface
the leverage, don't hide it: "One subscription covers everything you need; no juggling
five different tools."

### When to add additional stages (be strict)

Only add a second/third/etc. stage when there's a *materially* better dedicated tool for
a subintent AND the gap is large enough to justify a second signup. Examples of legitimate
specialization gaps:
- Voice cloning (ElevenLabs > general LLMs)
- Video generation (Runway/Pika/Veo > general LLMs)
- Music generation (Suno/Udio > general LLMs)
- Realtime collaborative design (Figma > Canva-via-ChatGPT)
- Specialized code IDEs (Cursor > web ChatGPT for serious dev work)
- Workflow automation (Zapier/n8n > LLMs for cross-app triggers)

If the additional stage isn't crossing one of these specialization gaps, do NOT add it.

### Honest pricing disclosure

When the consolidation hinges on a paid tier, the 'description' must state the cost
explicitly and explain the free-vs-paid gap if a free tier exists. Never imply free
covers what only paid covers.

### Anti-padding hard rule

If you find yourself writing a stage like "Final Polish" or "Review and Refine" or
"Optimization" that adds a tool just to fill out the stack — STOP. Cut that stage.
The user does not need a tool for "polishing" if their primary tool already does it.

## Stage Decomposition Rules (when multi-tool is genuinely warranted)
- Be practical and specific (not generic)
- Each stage must be a distinct phase of work that crosses a real specialization gap
- Name stages clearly: use action + noun format (e.g., "UI Design", "Content Creation", "Automation Setup")
- Stages should flow logically from first to last
- Keep searchQuery to 1-3 simple words that match tool names/categories
- searchQuery/searchCategory MUST be English keywords matching real tool categories
- Output 1-6 stages total; default to fewer when one tool can do more

## Response Format
You MUST respond with ONLY valid JSON in this exact structure:
{
  "title": "Project plan title",
  "summary": "2-sentence summary that names every goal you detected. If consolidating to one tool, the summary should celebrate that — e.g. 'One subscription covers your entire workflow.'",
  "stages": [
    {
      "id": "stage-1",
      "name": "Stage Name (or 'Your Complete AI Workflow' for consolidated single-stage plans)",
      "description": "What happens in this stage. For consolidated stages, explicitly walk through what the tool tier covers (research, drafting, image gen, etc.) and disclose pricing honestly.",
      "why": "Why this stage is important — for consolidated stages, explain why one tool is enough.",
      "searchQuery": "simple keyword",
      "searchCategory": "optional category slug",
      "capabilities": ["optional", "array of 3-6 short bullet items naming what the recommended tool covers in this stage. REQUIRED for consolidated single-stage plans. Example: 'Web research via browsing', 'Drafting and reasoning with GPT-4o', 'Image generation via DALL-E 3', 'Spreadsheet analysis'. Omit for narrow specialty stages."],
      "pricingNote": "optional short string stating the relevant cost when paid tier is needed, e.g. '$20/mo for Plus; free tier covers ~60% (no image gen, smaller model).' Omit when free tier is sufficient."
    }
  ]
}

The 'stages' array can have 1 to 6 items. Prefer FEWER stages when one tool genuinely
covers more of the workflow. Single-stage consolidated plans MUST include the
'capabilities' array (3-6 items) and the 'pricingNote' field if the recommended
tier is paid.

IMPORTANT: Return ONLY the JSON. No markdown, no explanation outside the JSON.`

const profileSchema = z
  .object({
    skill: z.enum(['beginner', 'intermediate', 'expert']),
    budget: z.enum(['free', 'under_50', '50_200', 'over_200', 'no_limit']),
    team: z.enum(['solo', '2_5', '6_20', '20_plus']),
    industry: z.enum(['marketing', 'dev', 'design', 'sales', 'education', 'content', 'other']),
    goalType: z.enum(['build', 'automate', 'learn', 'create', 'research']),
    existingTools: z.array(z.string()).default([]),
  })
  .optional()
  .nullable()

const planSchema = z.object({
  query: z.string().trim().min(1, 'Query is required').max(5000, 'Query is too long'),
  profile: profileSchema,
})

// Cache key = sha256 of normalized goal + canonical profile signature.
// Same prompt + same profile → same cache entry. Different profiles get their
// own entries so match scores stay correct.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24h

function makeCacheKey(normalizedGoal: string, profile: UserProfile | null | undefined): string {
  const profileSig = profile
    ? JSON.stringify({
        skill: profile.skill,
        budget: profile.budget,
        team: profile.team,
        industry: profile.industry,
        goalType: profile.goalType,
        existingTools: [...profile.existingTools].sort(),
      })
    : 'anonymous'
  const raw = `${normalizedGoal.trim().toLowerCase()}::${profileSig}`
  return createHash('sha256').update(raw).digest('hex')
}

function profileToPromptContext(profile: UserProfile): string {
  return `User profile:
- Skill level: ${SKILL_LABELS[profile.skill]}
- Monthly budget: ${BUDGET_LABELS[profile.budget]}
- Team size: ${TEAM_LABELS[profile.team]}
- Role/Industry: ${INDUSTRY_LABELS[profile.industry]}
- Primary goal: ${GOAL_LABELS[profile.goalType]}
- Already uses: ${profile.existingTools.length > 0 ? profile.existingTools.join(', ') : 'none specified'}`
}

export async function POST(request: Request) {
  const rl = rateLimit('plan', request, { limit: 5, windowMs: 60_000 })
  if (!rl.ok) return rateLimitResponse(rl)

  try {
    const body = await request.json()
    const parsed = planSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { query, profile } = parsed.data

    // Stream NDJSON (one JSON object per line). Events in order:
    //   {type: 'outline',  title, summary, stages:[...tools w/o reasons/sentiment/match]}
    //   {type: 'enriched', stages:[...same stages w/ reasons + sentiment + match]}
    //   {type: 'done',     _timings}
    //   {type: 'error',    status, message}  -- on failure, stream closes after
    //
    // Emitting `outline` as soon as tool search finishes means the user sees
    // the plan structure ~3-5s sooner than before (reasons + sentiment +
    // scoring were previously blocking the whole response).
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const write = (obj: unknown) => {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
        }
        const closeWithError = (status: number, message: string) => {
          write({ type: 'error', status, message })
          controller.close()
        }

        const t0 = performance.now()
        const timings: Record<string, number> = {}
        const mark = (phase: string, start: number) => {
          timings[phase] = Math.round(performance.now() - start)
        }

        try {
          const anthropic = getAnthropicClient()
          const supabase = await createClient()

          const profileContext = profile ? profileToPromptContext(profile) : ''
          const tRefine = performance.now()
          const refined = refinePrompt(query)
          mark('refine_ms', tRefine)

          // ── Cache lookup (24h TTL) ──
          // Uses admin client because plan_cache has RLS locked to service role.
          // Cast because the admin client isn't generic-typed against our schema.
          const cacheKey = makeCacheKey(refined.normalizedGoal, profile)
          const admin = getAdminClient() as unknown as {
            from: (table: string) => {
              select: (cols: string) => {
                eq: (col: string, val: string) => {
                  maybeSingle: () => Promise<{
                    data: { payload: unknown; created_at: string } | null
                    error: unknown
                  }>
                }
              }
              upsert: (
                values: Record<string, unknown>,
                opts?: { onConflict?: string }
              ) => Promise<{ error: unknown }>
            }
          }
          const tCache = performance.now()
          let cacheHit = false
          try {
            const { data: cached } = await admin
              .from('plan_cache')
              .select('payload, created_at')
              .eq('cache_key', cacheKey)
              .maybeSingle()
            if (cached) {
              const age = Date.now() - new Date(cached.created_at).getTime()
              if (age < CACHE_TTL_MS) {
                const payload = cached.payload as {
                  title: string
                  summary: string
                  stages: PlanStage[]
                }
                // Emit outline + enriched instantly from cache. Client hides
                // WaitingState as soon as `outline` arrives, so this is a
                // sub-200ms round trip for repeat queries.
                const outlineStages: PlanStage[] = payload.stages.map((s) => ({
                  ...s,
                  tools: s.tools.map((t) => ({
                    slug: t.slug,
                    name: t.name,
                    tagline: t.tagline,
                    pricing: t.pricing,
                    rating: t.rating,
                    reviewCount: t.reviewCount,
                    whyThisStage: '',
                  })),
                }))
                write({
                  type: 'outline',
                  title: payload.title,
                  summary: payload.summary,
                  stages: outlineStages,
                })
                write({ type: 'enriched', stages: payload.stages })
                mark('cache_lookup_ms', tCache)
                timings.cache_hit = 1
                timings.total_ms = Math.round(performance.now() - t0)
                write({ type: 'done', _timings: timings })
                console.log('[plan_perf]', JSON.stringify(timings))
                controller.close()
                cacheHit = true
              }
            }
          } catch {
            // Cache miss on error — fall through to full pipeline.
          }
          if (cacheHit) return
          mark('cache_lookup_ms', tCache)
          timings.cache_hit = 0

          // Speculative DB warm-up — fire a cheap query in parallel with Sonnet
          // so the Supabase connection pool is hot when searchStageTools hits it.
          // Fire-and-forget; its result is ignored, its side effect is the warm
          // connection. Saves ~50-100ms on cold invocations.
          void supabase.from('tools').select('id').limit(1)

          // Step 1: Decompose goal into stages (Sonnet).
          // System prompt is cached via Anthropic prompt caching (ephemeral,
          // 5-min TTL) — subsequent calls within the window skip re-processing
          // the 1.3K-token system block. max_tokens tightened (1500 → 900)
          // since JSON output is ~600 tokens; smaller cap = faster stream.
          const tDecomposition = performance.now()
          const planResponse = await anthropic.messages.create({
            model: MODEL_DECOMPOSITION,
            max_tokens: 900,
            system: [
              {
                type: 'text',
                text: PLANNER_SYSTEM_PROMPT,
                cache_control: { type: 'ephemeral' },
              },
            ],
            messages: [
              {
                role: 'user',
                content: profile
                  ? `Create a detailed AI tool plan for: "${refined.normalizedGoal}"\n\n${profileContext}\n\nTailor the stages and keywords to match this user's skill, budget, and goal. If they're on a free budget, avoid enterprise-only workflows. If they're solo, skip team-collaboration stages.`
                  : `Create a detailed AI tool plan for: "${refined.normalizedGoal}"`,
              },
            ],
          })
          mark('decomposition_ms', tDecomposition)

          const planText = planResponse.content
            .filter((b) => b.type === 'text')
            .map((b) => (b as { type: 'text'; text: string }).text)
            .join('')

          type RawStage = { id: string; name: string; description: string; why: string; searchQuery?: string; searchCategory?: string; capabilities?: string[]; pricingNote?: string }
          type RawPlan = { title: string; summary: string; stages: RawStage[] }

          let plan: RawPlan
          try {
            const cleaned = planText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
            plan = JSON.parse(cleaned) as RawPlan
          } catch {
            closeWithError(500, 'Failed to generate plan. Please try again.')
            return
          }

          // Step 2: Parallel DB search per stage (no Claude)
          const tSearch = performance.now()
          let stagesWithTools = await Promise.all(
            plan.stages.map(async (stage) => {
              const { results, tier } = await searchStageTools({
                searchQuery: stage.searchQuery ?? stage.name,
                ...(stage.searchCategory ? { searchCategory: stage.searchCategory } : {}),
                fallbackKeywords: refined.intentKeywords,
              })
              return {
                id: stage.id,
                name: stage.name,
                description: stage.description,
                why: stage.why,
                searchQuery: stage.searchQuery ?? stage.name,
                toolResults: results.slice(0, 3),
                matchTier: tier,
                capabilities: stage.capabilities,
                pricingNote: stage.pricingNote,
              }
            })
          )
          mark('search_ms', tSearch)

          // Step 2b: Quality gate (Step 48.6).
          // Only fires when at least one stage has weak retrieval — well-formed
          // traffic skips this entirely. On fail, broaden retrieval (drop
          // category, lean on intent keywords) and accept the retried result.
          // Hard latency cap: ~3.5s worst case; ~500ms in the pass case.
          timings.gate_ran = 0
          timings.gate_passed = 1
          timings.regenerated = 0
          if (shouldRunQualityGate(stagesWithTools)) {
            timings.gate_ran = 1
            const tGate = performance.now()
            const verdict = await runQualityGate({
              anthropic,
              query: refined.normalizedGoal,
              stages: stagesWithTools,
            })
            mark('gate_ms', tGate)
            if (!verdict.pass) {
              timings.gate_passed = 0
              const tRetry = performance.now()
              stagesWithTools = await broadenRetrieval({
                stages: stagesWithTools,
                intentKeywords: refined.intentKeywords,
              })
              mark('gate_retry_ms', tRetry)
              timings.regenerated = 1
            }
          }

          // ── Emit outline now: structure + tools without reasons/sentiment/match ──
          const outlineStages: PlanStage[] = stagesWithTools.map((stage) => ({
            id: stage.id,
            name: stage.name,
            description: stage.description,
            why: stage.why,
            matchTier: stage.matchTier,
            ...(stage.capabilities ? { capabilities: stage.capabilities } : {}),
            ...(stage.pricingNote ? { pricingNote: stage.pricingNote } : {}),
            tools: stage.toolResults.map((tool) => ({
              slug: tool.slug,
              name: tool.name,
              tagline: tool.tagline,
              pricing: tool.pricing_type,
              rating: tool.avg_rating,
              reviewCount: tool.review_count,
              whyThisStage: '',
            })),
          }))
          write({ type: 'outline', title: plan.title, summary: plan.summary, stages: outlineStages })
          timings.outline_ms = Math.round(performance.now() - t0)

          // Step 3: Haiku reasons — run in parallel with sentiment lookup
          const tReasons = performance.now()
          const tSentiment = performance.now()
          const toolSummaryInput = stagesWithTools
            .filter((s) => s.toolResults.length > 0)
            .map(
              (s) =>
                `Stage "${s.name}" (${s.description}):\n${s.toolResults.map((t) => `  - ${t.name}: ${t.tagline} [${t.pricing_type}, ${t.skill_level}]`).join('\n')}`
            )
            .join('\n\n')

          const reasonsPromise: Promise<Record<string, string>> = (async () => {
            if (!toolSummaryInput) return {}
            try {
              const promptBody = profile
                ? `For the project "${query}", I have these tools matched to stages. Give each tool a personalized one-sentence reason (max 20 words) explaining why it fits THIS specific user based on their profile below. Reference their actual constraints (skill, budget, team, existing tools) when relevant.

${profileContext}

${toolSummaryInput}

Respond with ONLY a JSON object mapping "ToolName" to "reason string". Example: {"ChatGPT": "Free tier handles your solo content needs, and its simple UI matches your beginner level.", "Canva": "Works with your existing Notion setup and stays within your $50 budget."}`
                : `For the project "${query}", I have these tools matched to stages. Give a one-sentence reason (max 15 words) why each tool fits its stage.

${toolSummaryInput}

Respond with ONLY a JSON object mapping "ToolName" to "reason string". Example: {"ChatGPT": "Great for brainstorming and drafting initial content ideas", "Canva": "Quick professional designs without design skills"}`

              const reasonResponse = await anthropic.messages.create({
                model: MODEL_REASONS,
                // Reasons are short (~15-20 words × up to ~10 tools = ~400 tokens).
                // Tighter cap keeps latency tied to actual output length.
                max_tokens: 800,
                messages: [{ role: 'user', content: promptBody }],
              })
              const reasonText = reasonResponse.content
                .filter((b) => b.type === 'text')
                .map((b) => (b as { type: 'text'; text: string }).text)
                .join('')
              const cleaned = reasonText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
              return JSON.parse(cleaned) as Record<string, string>
            } catch {
              return {}
            }
          })()

          // Step 4: Sentiment lookup — parallel with Haiku
          const allToolIds = stagesWithTools.flatMap((s) => s.toolResults.map((t) => t.id))
          const sentimentPromise: Promise<Record<string, { sentiment_score: string; ai_verdict: string }>> = (async () => {
            if (allToolIds.length === 0) return {}
            try {
              const { data } = await supabase
                .from('tool_sentiment_cache')
                .select('tool_id, sentiment_score, ai_verdict')
                .in('tool_id', allToolIds)
                .eq('status', 'ready')
              if (!data) return {}
              return Object.fromEntries(
                data.map((s: { tool_id: string; sentiment_score: string; ai_verdict: string }) => [
                  s.tool_id,
                  { sentiment_score: s.sentiment_score, ai_verdict: s.ai_verdict },
                ])
              )
            } catch {
              return {}
            }
          })()

          const [reasons, sentimentMap] = await Promise.all([reasonsPromise, sentimentPromise])
          mark('reasons_ms', tReasons)
          mark('sentiment_ms', tSentiment)

          // Step 5: Final enrichment — reasons + sentiment + match score
          const tScoring = performance.now()
          const finalStages: PlanStage[] = stagesWithTools.map((stage) => {
            const toolsWithScores = stage.toolResults.map((tool) => {
              const sentimentScore = sentimentMap[tool.id]?.sentiment_score ?? null
              const quickVerdict = sentimentMap[tool.id]?.ai_verdict
                ? sentimentMap[tool.id].ai_verdict.split('.')[0] + '.'
                : null

              let match: MatchScore | null = null
              if (profile) {
                match = computeMatchScore(
                  {
                    name: tool.name,
                    pricing_type: tool.pricing_type,
                    skill_level: tool.skill_level,
                    best_for: tool.best_for,
                    integrations: tool.integrations,
                    sentimentScore,
                  },
                  profile
                )
              }

              const reason = reasons[tool.name] ?? ''
              return {
                slug: tool.slug,
                name: tool.name,
                tagline: tool.tagline,
                pricing: tool.pricing_type,
                rating: tool.avg_rating,
                reviewCount: tool.review_count,
                whyThisStage: reason,
                whyForYou: profile ? reason : undefined,
                sentimentScore,
                quickVerdict,
                matchScore: match?.score,
                matchReasons: match?.reasons,
                matchWarnings: match?.warnings,
                budgetFit: match?.budgetFit,
                integrationMatches: match?.integrationMatches,
                _score: match?.score ?? 0,
              }
            })

            if (profile) {
              toolsWithScores.sort((a, b) => b._score - a._score)
            }
            const tools: PlanTool[] = toolsWithScores.map(({ _score, ...t }) => {
              void _score
              return t
            })
            return {
              id: stage.id,
              name: stage.name,
              description: stage.description,
              why: stage.why,
              tools,
              matchTier: stage.matchTier,
              ...(stage.capabilities ? { capabilities: stage.capabilities } : {}),
              ...(stage.pricingNote ? { pricingNote: stage.pricingNote } : {}),
            }
          })

          mark('scoring_ms', tScoring)
          timings.total_ms = Math.round(performance.now() - t0)
          timings.stage_count = finalStages.length

          write({ type: 'enriched', stages: finalStages })
          write({ type: 'done', _timings: timings })
          console.log('[plan_perf]', JSON.stringify(timings))
          controller.close()

          // ── Cache write (fire-and-forget, post-stream) ──
          // Runs after the response is flushed so cache I/O doesn't
          // extend user-visible latency.
          void admin.from('plan_cache').upsert(
            {
              cache_key: cacheKey,
              payload: { title: plan.title, summary: plan.summary, stages: finalStages },
              created_at: new Date().toISOString(),
            },
            { onConflict: 'cache_key' }
          )
        } catch (err) {
          console.error('Plan API error:', err)
          const message = err instanceof Error ? err.message : 'Unexpected error'
          if (message.includes('credit balance') || message.includes('billing') || message.includes('authentication') || message.includes('401')) {
            closeWithError(503, 'AI service temporarily unavailable. Please try again later.')
          } else {
            closeWithError(500, 'Something went wrong. Please try again.')
          }
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error('Plan API error:', error)
    // Friendly error messages — never expose raw API errors
    const message = error instanceof Error ? error.message : 'Unexpected error'
    if (message.includes('credit balance') || message.includes('billing') || message.includes('authentication') || message.includes('401')) {
      return Response.json(
        { error: 'AI service temporarily unavailable. Please try again later.' },
        { status: 503 }
      )
    }
    return Response.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
