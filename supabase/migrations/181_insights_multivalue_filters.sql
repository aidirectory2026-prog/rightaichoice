-- Phase 14 P2.1 + P2.2 (2026-07-01) — Mixpanel-grade filtering foundation.
--
-- Extends the ONE shared filter predicate, public.insights_apply_filters(ue,f),
-- that every filter-aware insights RPC calls via `p_filters jsonb`. Two additions,
-- both fully backward-compatible (the scalar and NULL fast-paths are byte-for-byte
-- identical to migration 154, so existing single-value filters and the Phase-2
-- baseline snapshots are unaffected — verified by scripts/audit/verify-filters.ts):
--
--   1. MULTI-VALUE (P2.1): each dimension now accepts EITHER a scalar (as before)
--      OR a JSON array → IN / OR semantics. e.g. {"country":["IN","US"]} matches
--      either; {"device":["mobile","unknown"]} matches mobile OR NULL device_type;
--      {"source":["reddit","google"]} matches referrer ILIKE any. jsonb_typeof
--      decides scalar-vs-array per key, so mixed payloads are fine.
--
--   2. COHORT-AS-FILTER (P2.2): optional {"distinct_ids":[...]} constrains rows to
--      a resolved cohort's members (ANDed with everything else). The caller
--      resolves a saved cohort (admin_saved_views + insights_cohort, migration 163)
--      to its distinct_id set and passes it here — so any dashboard can be pinned
--      to a cohort. NULL/absent → no constraint (unchanged behaviour).
--
-- Keep the SEMANTICS table in lib/admin/filters.ts in sync; the filter-matrix
-- verifier asserts SQL == the TS mirror (applyFilters).

create or replace function public.insights_apply_filters(ue public.user_events, f jsonb)
returns boolean
language sql
immutable
as $$
  select f is null or (
    -- device: scalar or array; 'unknown' → device_type IS NULL
        (f->'device' is null or (
          case jsonb_typeof(f->'device')
            when 'array' then
              ue.device_type = any (array(select jsonb_array_elements_text(f->'device')))
              or ((f->'device') ? 'unknown' and ue.device_type is null)
            else
              case when f->>'device' = 'unknown' then ue.device_type is null
                   else ue.device_type = f->>'device' end
          end))
    -- country: scalar or array (IN)
    and (f->'country' is null or (
          case jsonb_typeof(f->'country')
            when 'array' then ue.country = any (array(select jsonb_array_elements_text(f->'country')))
            else ue.country = f->>'country'
          end))
    -- source: scalar or array; ilike-contains, OR across values
    and (f->'source' is null or (
          case jsonb_typeof(f->'source')
            when 'array' then exists (
              select 1 from jsonb_array_elements_text(f->'source') s
              where ue.referrer ilike '%' || s || '%')
            else ue.referrer ilike '%' || (f->>'source') || '%'
          end))
    and (f->'utm_source' is null or (
          case jsonb_typeof(f->'utm_source')
            when 'array' then ue.utm_source = any (array(select jsonb_array_elements_text(f->'utm_source')))
            else ue.utm_source = f->>'utm_source'
          end))
    and (f->'utm_medium' is null or (
          case jsonb_typeof(f->'utm_medium')
            when 'array' then ue.utm_medium = any (array(select jsonb_array_elements_text(f->'utm_medium')))
            else ue.utm_medium = f->>'utm_medium'
          end))
    and (f->'utm_campaign' is null or (
          case jsonb_typeof(f->'utm_campaign')
            when 'array' then ue.utm_campaign = any (array(select jsonb_array_elements_text(f->'utm_campaign')))
            else ue.utm_campaign = f->>'utm_campaign'
          end))
    and (f->>'auth' is null or
          case f->>'auth' when 'known' then ue.user_id is not null
                          when 'anon'  then ue.user_id is null
                          else true end)
    -- event: scalar or array (IN)
    and (f->'event' is null or (
          case jsonb_typeof(f->'event')
            when 'array' then ue.event_name = any (array(select jsonb_array_elements_text(f->'event')))
            else ue.event_name = f->>'event'
          end))
    -- cohort membership: constrain to a resolved distinct_id set
    and (f->'distinct_ids' is null or
          ue.distinct_id = any (array(select jsonb_array_elements_text(f->'distinct_ids'))))
  )
$$;

revoke all on function public.insights_apply_filters(public.user_events, jsonb) from public, anon, authenticated;
grant execute on function public.insights_apply_filters(public.user_events, jsonb) to service_role;
