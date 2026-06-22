-- 171_sentiment_faqs.sql — Phase 12 Bug-3 (2026-06-23)
-- The sentiment report now generates dynamic, in-depth buyer FAQs (replacing the
-- old static generic block). Persist them on the shared cache so the
-- server-rendered FAQ section (sentiment-related.tsx) can read real, tool-specific
-- Q&A for SEO + the free preview. `themes` already stores JSON and now also carries
-- a per-theme `sentiment` — no DDL needed for that (JSONB is shape-flexible).

alter table public.tool_sentiment_cache
  add column if not exists faqs jsonb default '[]'::jsonb;

-- Rollback: alter table public.tool_sentiment_cache drop column if exists faqs;
