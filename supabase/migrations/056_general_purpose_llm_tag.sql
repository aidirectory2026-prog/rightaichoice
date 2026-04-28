-- ============================================================
-- 056 — Add general-purpose-llm tag, link the 10 LLMs
-- ============================================================
-- Replaces the hand-maintained GENERAL_LLM_SLUGS Set in
-- lib/data/tools.ts:282 with a data-driven tag. The set is used by
-- the Alternatives ranker as a hard whitelist: when the source tool
-- is a general-purpose LLM (Claude, ChatGPT, Gemini, …), only OTHER
-- general-purpose LLMs surface as alternatives. Specialized tools
-- like Sourcegraph Cody (which has a `chatbot` tag for its UI) and
-- INK Editor (which has `text-generation` because it generates SEO
-- copy) get filtered out.
--
-- Code-side change in the same Phase 7 commit replaces:
--   GENERAL_LLM_SLUGS.has(slug)
-- with:
--   tagSet.has('general-purpose-llm')
--
-- Slug-existence pre-check (per feedback_slug_existence_validation.md):
--   SELECT slug FROM tools WHERE slug IN (
--     'chatgpt','claude','gemini','cohere','mistral','perplexity',
--     'ai21-labs','deepseek','zhipu-ai','moonshot-ai'
--   );
-- Expected rowcount: 10.
--
-- Idempotent — re-running is a no-op via ON CONFLICT.
-- ============================================================

INSERT INTO tags (name, slug)
VALUES ('General-Purpose LLM', 'general-purpose-llm')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tag.id
FROM tools t, tags tag
WHERE t.slug IN (
  'chatgpt',
  'claude',
  'gemini',
  'cohere',
  'mistral',
  'perplexity',
  'ai21-labs',
  'deepseek',
  'zhipu-ai',
  'moonshot-ai'
)
AND tag.slug = 'general-purpose-llm'
ON CONFLICT (tool_id, tag_id) DO NOTHING;

-- Verification (run separately):
--   SELECT t.slug FROM tools t
--   JOIN tool_tags tt ON tt.tool_id = t.id
--   JOIN tags tag ON tag.id = tt.tag_id
--   WHERE tag.slug = 'general-purpose-llm'
--   ORDER BY t.slug;
-- Expected: 10 rows (one per LLM above).
