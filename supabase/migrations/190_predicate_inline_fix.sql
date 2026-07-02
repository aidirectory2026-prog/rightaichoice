-- 190: HOTFIX — restore predicate inlining (Phase 14b post-merge).
--
-- Migration 185 split insights_apply_filters into apply_filters →
-- filter_match (+ a NOT EXISTS over jsonb_object_keys for negation). Postgres
-- cannot inline SQL functions whose body contains sub-selects, so EVERY
-- filter-aware RPC started paying a per-row function call over its whole
-- user_events scan: measured live 2026-07-02, a 30-day country filter went
-- from 17ms (flat WHERE) to 10,242ms (589×). With ~5–22 RPCs per admin page,
-- the entire admin "stopped working nicely".
--
-- Fix: ONE flat, SUBLINK-FREE expression, so the function truly inlines:
--   • equality dims (country/device/utm*/event/city/region/browser/os/
--     source_kind/session_id/distinct_ids) use the jsonb `?` operator, which
--     means "equals the scalar OR is an element of the array" — one branch
--     covers both shapes, no jsonb_array_elements_text sub-select.
--   • contains dims (source, page_path) and props unroll to 8 explicit
--     slots (the TS parser caps arrays at 8 — lib/admin/filters.ts).
--   • negation (`not` object) is per-key flat blocks: `(cond) IS FALSE`
--     keeps the "≠ excludes unknown-dimension rows" three-valued semantics
--     that the PostgREST mirror (.not) has.
-- Verified: EXPLAIN shows the expanded expression (inlined + constant-folded:
-- p_filters NULL folds to TRUE and the filter disappears entirely), and the
-- 97-check filter-matrix verifier proves byte-equal results vs hand SQL.

create or replace function public.insights_apply_filters(ue public.user_events, f jsonb)
returns boolean
language sql
immutable
as $$
  select f is null or (
    -- device: `?` covers scalar + array; 'unknown' member → device_type IS NULL
        (f->'device' is null or (
          (f->'device' ? ue.device_type)
          or (f->'device' ? 'unknown' and ue.device_type is null)))
    and (f->'country' is null or f->'country' ? ue.country)
    and (f->'utm_source' is null or f->'utm_source' ? ue.utm_source)
    and (f->'utm_medium' is null or f->'utm_medium' ? ue.utm_medium)
    and (f->'utm_campaign' is null or f->'utm_campaign' ? ue.utm_campaign)
    and (f->>'auth' is null or
          case f->>'auth' when 'known' then ue.user_id is not null
                          when 'anon'  then ue.user_id is null
                          else true end)
    and (f->'event' is null or f->'event' ? ue.event_name)
    and (f->'city' is null or f->'city' ? ue.city)
    and (f->'region' is null or f->'region' ? ue.region)
    and (f->'browser' is null or f->'browser' ? ue.browser)
    and (f->'os' is null or f->'os' ? ue.os)
    and (f->'source_kind' is null or f->'source_kind' ? ue.source_kind)
    and (f->'session_id' is null or f->'session_id' ? (ue.properties->>'session_id'))
    and (f->'distinct_ids' is null or f->'distinct_ids' ? ue.distinct_id)
    -- source: ilike-contains; array unrolled to 8 slots (TS caps at 8)
    and (f->'source' is null or (
          case jsonb_typeof(f->'source')
            when 'array' then
                 (ue.referrer ilike '%' || (f->'source'->>0) || '%')
              or (ue.referrer ilike '%' || (f->'source'->>1) || '%')
              or (ue.referrer ilike '%' || (f->'source'->>2) || '%')
              or (ue.referrer ilike '%' || (f->'source'->>3) || '%')
              or (ue.referrer ilike '%' || (f->'source'->>4) || '%')
              or (ue.referrer ilike '%' || (f->'source'->>5) || '%')
              or (ue.referrer ilike '%' || (f->'source'->>6) || '%')
              or (ue.referrer ilike '%' || (f->'source'->>7) || '%')
            else ue.referrer ilike '%' || (f->>'source') || '%'
          end))
    -- page_path: same contains pattern
    and (f->'page_path' is null or (
          case jsonb_typeof(f->'page_path')
            when 'array' then
                 (ue.page_path ilike '%' || (f->'page_path'->>0) || '%')
              or (ue.page_path ilike '%' || (f->'page_path'->>1) || '%')
              or (ue.page_path ilike '%' || (f->'page_path'->>2) || '%')
              or (ue.page_path ilike '%' || (f->'page_path'->>3) || '%')
              or (ue.page_path ilike '%' || (f->'page_path'->>4) || '%')
              or (ue.page_path ilike '%' || (f->'page_path'->>5) || '%')
              or (ue.page_path ilike '%' || (f->'page_path'->>6) || '%')
              or (ue.page_path ilike '%' || (f->'page_path'->>7) || '%')
            else ue.page_path ilike '%' || (f->>'page_path') || '%'
          end))
    -- props: every {k,v} pair must match; unrolled to 8 slots (TS caps at 8)
    and (f->'props'->0 is null or (ue.properties->>(f->'props'->0->>'k')) = (f->'props'->0->>'v'))
    and (f->'props'->1 is null or (ue.properties->>(f->'props'->1->>'k')) = (f->'props'->1->>'v'))
    and (f->'props'->2 is null or (ue.properties->>(f->'props'->2->>'k')) = (f->'props'->2->>'v'))
    and (f->'props'->3 is null or (ue.properties->>(f->'props'->3->>'k')) = (f->'props'->3->>'v'))
    and (f->'props'->4 is null or (ue.properties->>(f->'props'->4->>'k')) = (f->'props'->4->>'v'))
    and (f->'props'->5 is null or (ue.properties->>(f->'props'->5->>'k')) = (f->'props'->5->>'v'))
    and (f->'props'->6 is null or (ue.properties->>(f->'props'->6->>'k')) = (f->'props'->6->>'v'))
    and (f->'props'->7 is null or (ue.properties->>(f->'props'->7->>'k')) = (f->'props'->7->>'v'))
    -- negation: per-key, `IS FALSE` so unknown-dimension rows are EXCLUDED
    -- (same as the PostgREST mirror's not.eq — required for equivalence)
    and (f->'not'->'device' is null or (
          (f->'not'->'device' ? ue.device_type)
          or (f->'not'->'device' ? 'unknown' and ue.device_type is null)) is false)
    and (f->'not'->'country' is null or (f->'not'->'country' ? ue.country) is false)
    and (f->'not'->'utm_source' is null or (f->'not'->'utm_source' ? ue.utm_source) is false)
    and (f->'not'->'utm_medium' is null or (f->'not'->'utm_medium' ? ue.utm_medium) is false)
    and (f->'not'->'utm_campaign' is null or (f->'not'->'utm_campaign' ? ue.utm_campaign) is false)
    and (f->'not'->'event' is null or (f->'not'->'event' ? ue.event_name) is false)
    and (f->'not'->'city' is null or (f->'not'->'city' ? ue.city) is false)
    and (f->'not'->'region' is null or (f->'not'->'region' ? ue.region) is false)
    and (f->'not'->'browser' is null or (f->'not'->'browser' ? ue.browser) is false)
    and (f->'not'->'os' is null or (f->'not'->'os' ? ue.os) is false)
    and (f->'not'->'source' is null or (
          case jsonb_typeof(f->'not'->'source')
            when 'array' then
                 (ue.referrer ilike '%' || (f->'not'->'source'->>0) || '%')
              or (ue.referrer ilike '%' || (f->'not'->'source'->>1) || '%')
              or (ue.referrer ilike '%' || (f->'not'->'source'->>2) || '%')
              or (ue.referrer ilike '%' || (f->'not'->'source'->>3) || '%')
              or (ue.referrer ilike '%' || (f->'not'->'source'->>4) || '%')
              or (ue.referrer ilike '%' || (f->'not'->'source'->>5) || '%')
              or (ue.referrer ilike '%' || (f->'not'->'source'->>6) || '%')
              or (ue.referrer ilike '%' || (f->'not'->'source'->>7) || '%')
            else ue.referrer ilike '%' || (f->'not'->>'source') || '%'
          end) is false)
    and (f->'not'->'page_path' is null or (
          case jsonb_typeof(f->'not'->'page_path')
            when 'array' then
                 (ue.page_path ilike '%' || (f->'not'->'page_path'->>0) || '%')
              or (ue.page_path ilike '%' || (f->'not'->'page_path'->>1) || '%')
              or (ue.page_path ilike '%' || (f->'not'->'page_path'->>2) || '%')
              or (ue.page_path ilike '%' || (f->'not'->'page_path'->>3) || '%')
              or (ue.page_path ilike '%' || (f->'not'->'page_path'->>4) || '%')
              or (ue.page_path ilike '%' || (f->'not'->'page_path'->>5) || '%')
              or (ue.page_path ilike '%' || (f->'not'->'page_path'->>6) || '%')
              or (ue.page_path ilike '%' || (f->'not'->'page_path'->>7) || '%')
            else ue.page_path ilike '%' || (f->'not'->>'page_path') || '%'
          end) is false)
  )
$$;

revoke all on function public.insights_apply_filters(public.user_events, jsonb) from public, anon, authenticated;
grant execute on function public.insights_apply_filters(public.user_events, jsonb) to service_role;

-- filter_match is no longer referenced by anything.
drop function if exists public.insights_filter_match(public.user_events, jsonb);
