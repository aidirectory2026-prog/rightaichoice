-- Phase 13 D3.4 — GEO citation tracking (the GEO equivalent of gsc_snapshots).
--
-- One row per (snapshot_date, engine, prompt_id). For each curated high-intent
-- prompt we ask an AI engine that searches the web (v1: Claude + web_search) and
-- record whether rightaichoice.com is CITED in the answer, whether it was merely
-- RETRIEVED, its rank among cited domains, which competitors appeared, and a
-- share-of-voice. This is the persistent baseline that lets us prove GEO movement
-- the same way gsc_snapshots/gsc_diffs prove SEO movement.
--
-- Admin/service-role only: RLS enabled, no anon policies (service role bypasses
-- RLS), mirroring gsc_snapshots. Reverse migration: 172_geo_citation_snapshots.rollback.sql

create table if not exists public.geo_citation_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  engine text not null,                              -- claude_websearch | perplexity | openai | gemini
  model text,                                        -- e.g. claude-opus-4-8
  prompt_id text not null,                           -- stable id from lib/geo/target-prompts.ts
  prompt text not null,
  prompt_category text,
  cited boolean not null default false,              -- our domain appears in the ANSWER's inline citations (strong signal)
  retrieved boolean not null default false,          -- our domain appears in the engine's RETRIEVED results (weaker signal)
  citation_rank int,                                 -- rank of our first cited URL among distinct cited domains (1 = first); null if not cited
  our_urls jsonb not null default '[]'::jsonb,        -- our cited/retrieved URLs
  competitors jsonb not null default '[]'::jsonb,     -- [{ domain, cited, retrieved, rank }]
  all_sources jsonb not null default '[]'::jsonb,     -- ordered distinct domains the engine cited
  share_of_voice numeric,                            -- our cited URL count / total cited sources (0..1)
  answer_excerpt text,                               -- first ~600 chars of the engine's answer
  error text,                                        -- non-null if this prompt's run failed (engine error / no key)
  created_at timestamptz not null default now()
);

create index if not exists idx_geo_citation_snap_date
  on public.geo_citation_snapshots (snapshot_date desc);
create index if not exists idx_geo_citation_snap_engine_prompt
  on public.geo_citation_snapshots (engine, prompt_id, snapshot_date desc);
create unique index if not exists uq_geo_citation_snap
  on public.geo_citation_snapshots (snapshot_date, engine, prompt_id);

alter table public.geo_citation_snapshots enable row level security;

comment on table public.geo_citation_snapshots is
  'Phase 13 D3.4 — per-prompt AI-engine citation snapshots (GEO equivalent of gsc_snapshots). Admin/service-role only.';
