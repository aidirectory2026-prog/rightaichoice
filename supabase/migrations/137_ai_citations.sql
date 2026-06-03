-- Phase 9 Smart SEO / doc 08 (AEO/GEO) + doc 11 (KPIs): AI citation log.
--
-- "Being cited is the new being ranked." The 30-day KPI target is 10 logged
-- AI-Overview / assistant citations, but we had no place to record them. This
-- is the manual-first tracking store (doc 08 "Citation tracking → Manual"):
-- run representative queries through ChatGPT / Claude / Perplexity / Google AI
-- Overview, and log whether RAC was cited, by which engine, and where in the
-- answer. Programmatic capture (Perplexity API, SerpAPI AI-Overview detect) is
-- doc-08 "Week 4+" and can write to the same table later.
--
-- Powers /admin/ai-citations. Admin-only: RLS on with no policies =
-- service-role-only; the admin page reads/writes via getAdminClient().

create table if not exists public.ai_citations (
  id uuid primary key default gen_random_uuid(),
  checked_on date not null default current_date,        -- date the query was run
  engine text not null check (engine in (
    'chatgpt', 'claude', 'perplexity', 'google_aio', 'gemini', 'copilot', 'other'
  )),
  query text not null,
  cited boolean not null default true,                  -- did RAC appear at all?
  cited_url text,                                       -- the RAC URL surfaced (null if brand-mention only)
  position_in_answer int,                               -- 1 = first cited source, etc. (null = unknown)
  brand_mention boolean not null default false,         -- named without a link
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_citations_checked on public.ai_citations (checked_on desc);
create index if not exists idx_ai_citations_engine on public.ai_citations (engine, checked_on desc);

-- RLS on, no policies → service-role-only (admin pages use getAdminClient).
alter table public.ai_citations enable row level security;
