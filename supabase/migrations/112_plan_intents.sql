-- Phase 9 (2026-05-28) — Durable capture of every typed goal from the
-- global Plan-Your-Stack CTA flow, INCLUDING anonymous users who skip
-- the signup modal. Pairs with /api/plan/intent (POST) + /api/plan/intent/link.
--
-- The user_events table already mirrors a `plan_goal_typed` keystroke event
-- for the same data, but events tables are noisy and lossy. plan_intents is
-- the canonical, queryable record of "every human who told us their goal" —
-- pre-auth and post-auth — for the admin Plan-Funnel page.

CREATE TABLE IF NOT EXISTS public.plan_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distinct_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  typed_goal text NOT NULL,
  char_count int NOT NULL,
  source_surface text NOT NULL,
  source_path text,
  signup_outcome text,
  referrer text,
  user_agent text,
  country text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_intents_distinct_id ON public.plan_intents (distinct_id);
CREATE INDEX IF NOT EXISTS idx_plan_intents_user_id ON public.plan_intents (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plan_intents_created_at ON public.plan_intents (created_at DESC);

ALTER TABLE public.plan_intents ENABLE ROW LEVEL SECURITY;

-- Default deny. Only the service role (used by /api/plan/intent server route)
-- can INSERT/UPDATE. Authenticated users can SELECT their own rows so the
-- /dashboard can show "your past goals" if we surface that later. Anon: no
-- access (writes go through the server route which uses service_role).
DROP POLICY IF EXISTS plan_intents_select_own ON public.plan_intents;
CREATE POLICY plan_intents_select_own ON public.plan_intents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.plan_intents IS
  'Phase 9 — every typed goal from Plan-Your-Stack CTA, persisted regardless of signup outcome. distinct_id stays even when user_id is null; reconciled on signup via /api/plan/intent/link.';
COMMENT ON COLUMN public.plan_intents.source_surface IS
  'sticky_bar | inline_card | navbar | homepage';
COMMENT ON COLUMN public.plan_intents.signup_outcome IS
  'completed_google | completed_linkedin | skipped | unknown — populated by client/auth callback';
