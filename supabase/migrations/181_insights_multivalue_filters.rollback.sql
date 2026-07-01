-- Rollback of 181 — restore the scalar-only shared predicate from migration 154.
-- Safe: array-form and distinct_ids payloads simply stop being honoured; all
-- scalar/NULL callers are unchanged.

create or replace function public.insights_apply_filters(ue public.user_events, f jsonb)
returns boolean
language sql
immutable
as $$
  select f is null or (
        (f->>'device' is null or
          case when f->>'device' = 'unknown' then ue.device_type is null
               else ue.device_type = f->>'device' end)
    and (f->>'country' is null or ue.country = f->>'country')
    and (f->>'source' is null or ue.referrer ilike '%' || (f->>'source') || '%')
    and (f->>'utm_source' is null or ue.utm_source = f->>'utm_source')
    and (f->>'utm_medium' is null or ue.utm_medium = f->>'utm_medium')
    and (f->>'utm_campaign' is null or ue.utm_campaign = f->>'utm_campaign')
    and (f->>'auth' is null or
          case f->>'auth' when 'known' then ue.user_id is not null
                          when 'anon'  then ue.user_id is null
                          else true end)
    and (f->>'event' is null or ue.event_name = f->>'event')
  )
$$;

revoke all on function public.insights_apply_filters(public.user_events, jsonb) from public, anon, authenticated;
grant execute on function public.insights_apply_filters(public.user_events, jsonb) to service_role;
