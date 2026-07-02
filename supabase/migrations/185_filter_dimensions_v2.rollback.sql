-- Rollback for 185_filter_dimensions_v2.sql — restores the migration-181
-- predicate body and removes the match() helper.

create or replace function public.insights_apply_filters(ue public.user_events, f jsonb)
returns boolean
language sql
immutable
as $$
  select f is null or (
        (f->'device' is null or (
          case jsonb_typeof(f->'device')
            when 'array' then
              ue.device_type = any (array(select jsonb_array_elements_text(f->'device')))
              or ((f->'device') ? 'unknown' and ue.device_type is null)
            else
              case when f->>'device' = 'unknown' then ue.device_type is null
                   else ue.device_type = f->>'device' end
          end))
    and (f->'country' is null or (
          case jsonb_typeof(f->'country')
            when 'array' then ue.country = any (array(select jsonb_array_elements_text(f->'country')))
            else ue.country = f->>'country'
          end))
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
    and (f->'event' is null or (
          case jsonb_typeof(f->'event')
            when 'array' then ue.event_name = any (array(select jsonb_array_elements_text(f->'event')))
            else ue.event_name = f->>'event'
          end))
    and (f->'distinct_ids' is null or
          ue.distinct_id = any (array(select jsonb_array_elements_text(f->'distinct_ids'))))
  )
$$;

revoke all on function public.insights_apply_filters(public.user_events, jsonb) from public, anon, authenticated;
grant execute on function public.insights_apply_filters(public.user_events, jsonb) to service_role;

drop function if exists public.insights_filter_match(public.user_events, jsonb);
