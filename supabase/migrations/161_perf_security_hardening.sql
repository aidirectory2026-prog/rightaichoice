-- 161_perf_security_hardening.sql — Fable-5 audit cleanup (2026-06-16)
-- Two safe advisor fixes:
--   (1) auth_rls_initplan: 3 SELECT policies re-evaluated auth.uid() PER ROW.
--       Wrapping it in a scalar subquery makes Postgres evaluate it ONCE per
--       query — identical access semantics, faster on the user-scoped sentiment
--       tables. (verified policy defs: `(auth.uid() = user_id)`, role public)
--   (2) function_search_path_mutable: pin search_path on 2 non-SECURITY-DEFINER
--       helpers. Both reference only public.tools + pg_catalog builtins, so
--       `= public` (pg_catalog implicit) needs no body rewrite.

-- (1) RLS auth re-eval → once per query
drop policy if exists sel_own_quota on public.sentiment_quota;
create policy sel_own_quota on public.sentiment_quota for select
  using ((select auth.uid()) = user_id);

drop policy if exists sel_own_searches on public.sentiment_searches;
create policy sel_own_searches on public.sentiment_searches for select
  using ((select auth.uid()) = user_id);

drop policy if exists sel_own_payments on public.sentiment_payments;
create policy sel_own_payments on public.sentiment_payments for select
  using ((select auth.uid()) = user_id);

-- (2) pin search_path
alter function public.niche_tool_ids(p_niche text, p_limit integer) set search_path = public;
alter function public.insights_apply_filters(ue user_events, f jsonb) set search_path = public;
