-- 185: Filter dimensions v2 (Phase 14b Wave 2).
--
-- Extends the ONE shared filter predicate with the founder's headline ask —
-- "filter ANY event by geo / person / page / property, on EVERY screen":
--
--   NEW KEYS (each scalar-or-array, exactly like the 181 keys):
--     page_path    ilike-contains on ue.page_path (value sanitized app-side
--                  to [a-z0-9/_.-]; same contains pattern as `source`)
--     city         equality on ue.city
--     region       equality on ue.region
--     browser      equality on ue.browser  (migration 184 column)
--     os           equality on ue.os       (migration 184 column)
--     source_kind  equality on ue.source_kind ('client'|'server')
--     session_id   equality on ue.properties->>'session_id'
--     props        array of {"k":..., "v":...} — every pair must match
--                  ue.properties->>k = v exactly. Keys are allowlisted +
--                  charset-checked app-side; the accessor here is parameter-
--                  safe (no dynamic SQL).
--
--   NEGATION: a sibling `not` object holding any of the above keys (or the
--   181 keys). A row matches when it matches the positive keys AND does NOT
--   match the `not` object. SQL three-valued logic note: `not (country='CN')`
--   is NULL for rows with NULL country, so ≠ excludes unknown-dimension rows —
--   the PostgREST mirror (.not(...)) has identical semantics, which is what
--   the equivalence proof requires. Keep lib/admin/filters.ts in sync.
--
-- Structure: the whole per-key match list moves into insights_filter_match();
-- insights_apply_filters() keeps its exact signature + NULL fast-path and is
-- now match(f) AND NOT match(f->'not'). All 181 key semantics byte-identical.

create or replace function public.insights_filter_match(ue public.user_events, f jsonb)
returns boolean
language sql
immutable
as $$
  select
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
    -- ── Wave 2 additions ────────────────────────────────────────────────
    -- page_path: ilike-contains, OR across values (like source)
    and (f->'page_path' is null or (
          case jsonb_typeof(f->'page_path')
            when 'array' then exists (
              select 1 from jsonb_array_elements_text(f->'page_path') p
              where ue.page_path ilike '%' || p || '%')
            else ue.page_path ilike '%' || (f->>'page_path') || '%'
          end))
    and (f->'city' is null or (
          case jsonb_typeof(f->'city')
            when 'array' then ue.city = any (array(select jsonb_array_elements_text(f->'city')))
            else ue.city = f->>'city'
          end))
    and (f->'region' is null or (
          case jsonb_typeof(f->'region')
            when 'array' then ue.region = any (array(select jsonb_array_elements_text(f->'region')))
            else ue.region = f->>'region'
          end))
    and (f->'browser' is null or (
          case jsonb_typeof(f->'browser')
            when 'array' then ue.browser = any (array(select jsonb_array_elements_text(f->'browser')))
            else ue.browser = f->>'browser'
          end))
    and (f->'os' is null or (
          case jsonb_typeof(f->'os')
            when 'array' then ue.os = any (array(select jsonb_array_elements_text(f->'os')))
            else ue.os = f->>'os'
          end))
    and (f->'source_kind' is null or (
          case jsonb_typeof(f->'source_kind')
            when 'array' then ue.source_kind = any (array(select jsonb_array_elements_text(f->'source_kind')))
            else ue.source_kind = f->>'source_kind'
          end))
    and (f->'session_id' is null or (
          case jsonb_typeof(f->'session_id')
            when 'array' then (ue.properties->>'session_id') = any (array(select jsonb_array_elements_text(f->'session_id')))
            else (ue.properties->>'session_id') = f->>'session_id'
          end))
    -- props: every {k,v} pair must match exactly (AND across pairs)
    and (f->'props' is null or not exists (
          select 1 from jsonb_array_elements(f->'props') p
          where (ue.properties->>(p->>'k')) is distinct from (p->>'v')))
$$;

revoke all on function public.insights_filter_match(public.user_events, jsonb) from public, anon, authenticated;
grant execute on function public.insights_filter_match(public.user_events, jsonb) to service_role;

create or replace function public.insights_apply_filters(ue public.user_events, f jsonb)
returns boolean
language sql
immutable
as $$
  select f is null or (
    public.insights_filter_match(ue, f)
    -- Negation is PER KEY: {"not":{"country":"CN","browser":"chrome"}} means
    -- country ≠ CN AND browser ≠ chrome (independent exclusions — matching the
    -- TS mirror's chained .not() calls), NOT "not(CN and chrome)". Each key is
    -- evaluated as a singleton object through the same match() branch; keys
    -- outside the allowlist are ignored (belt — TS never emits them).
    and (f->'not' is null or not exists (
          select 1 from jsonb_object_keys(f->'not') k
          where k = any (array['device','country','source','utm_source','utm_medium',
                               'utm_campaign','event','page_path','city','region',
                               'browser','os'])
            -- `is not false`: a NULL dimension makes match() NULL, and ≠ must
            -- EXCLUDE unknown-dimension rows — same as PostgREST not.eq (the
            -- TS mirror), which is what keeps the two sides provably equal.
            and public.insights_filter_match(ue, jsonb_build_object(k, f->'not'->k)) is not false
        ))
  )
$$;

revoke all on function public.insights_apply_filters(public.user_events, jsonb) from public, anon, authenticated;
grant execute on function public.insights_apply_filters(public.user_events, jsonb) to service_role;
