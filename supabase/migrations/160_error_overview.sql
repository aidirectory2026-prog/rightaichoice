-- 160_error_overview.sql
-- Phase 2 (2026-06-16) — Error monitoring. Powers /admin/insights/errors.
--
-- Classifies error_encountered events so genuine APP bugs don't drown in the
-- ~95% of volume that is 3rd-party noise:
--   app       — real bugs: react_boundary, or js_error/unhandled_rejection whose
--               source is a /_next/static bundle chunk (or empty/cross-origin).
--   resource  — first-party asset load failures (mostly transient _next/image
--               optimizer hiccups). Low severity.
--   extension — js_error whose source_url is the page document (not a chunk):
--               browser extensions (SEO/schema validators) running on the page.
--
-- Admin-only: SECURITY DEFINER, EXECUTE granted to service_role only. Called
-- through the service-role admin client behind the /admin is_admin gate.
-- Applied to prod via MCP (repo migration history drifts from prod).

create or replace function public.insights_error_overview(p_cutoff timestamptz, p_end timestamptz default null::timestamptz, p_include_bots boolean default false)
 returns table(category text, message text, error_type text, occurrences bigint, page_count bigint, sample_page text, first_seen timestamptz, last_seen timestamptz)
 language sql
 security definer
 set search_path to 'public'
as $function$
  with e as (
    select
      left(coalesce(nullif(properties->>'message',''), '(no message)'), 300) as message,
      properties->>'error_type' as etype,
      coalesce(properties->>'source_url','') as src,
      coalesce(page_path, properties->>'page_path') as page,
      created_at
    from user_events
    where event_name = 'error_encountered'
      and created_at >= p_cutoff
      and (p_end is null or created_at < p_end)
      and (p_include_bots or not bot_likely)
  ),
  classified as (
    select e.*,
      case
        when etype = 'resource_error' then 'resource'
        when etype = 'react_boundary' then 'app'
        when etype in ('js_error','unhandled_rejection') and (src ~ '/_next/static/' or src = '') then 'app'
        when src ~ '^(chrome-extension|moz-extension|safari-web-extension)' then 'extension'
        when etype = 'js_error' then 'extension'
        else 'app'
      end as category
    from e
  )
  select
    category,
    message,
    (array_agg(etype order by created_at desc))[1] as error_type,
    count(*)::bigint as occurrences,
    count(distinct page)::bigint as page_count,
    (array_agg(page order by created_at desc))[1] as sample_page,
    min(created_at) as first_seen,
    max(created_at) as last_seen
  from classified
  group by category, message
  order by occurrences desc;
$function$;

grant execute on function public.insights_error_overview(timestamptz, timestamptz, boolean) to service_role;
