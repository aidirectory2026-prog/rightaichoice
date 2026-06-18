-- 164_registered_users.sql
-- Phase 11.1 (2026-06-18) — Members list + signup-loss prevention.
-- The admin had no list of registered accounts. insights_registered_users reads
-- auth.users DIRECTLY (the source of truth), so every signup appears the moment
-- the account exists — independent of whether the signup_completed analytics
-- event fired (5 of 7 historical accounts predate that instrumentation and have
-- no event, yet are real members). Admin-only (service_role); applied via MCP.

create or replace function public.insights_registered_users()
 returns table(user_id uuid, email text, full_name text, provider text, username text,
   signed_up timestamptz, last_sign_in timestamptz, email_confirmed boolean,
   distinct_id text, lifetime_events bigint, last_event timestamptz, has_signup_event boolean)
 language sql security definer set search_path to 'public'
as $function$
  select au.id, au.email::text,
    coalesce(pr.full_name, au.raw_user_meta_data->>'full_name')::text,
    coalesce(au.raw_app_meta_data->>'provider','email')::text,
    pr.username,
    au.created_at, au.last_sign_in_at, (au.email_confirmed_at is not null),
    (select uip.distinct_id from user_intent_profile uip where uip.user_id = au.id order by uip.last_active_at desc nulls last limit 1),
    (select count(*) from user_events e where e.user_id = au.id)::bigint,
    (select max(e.created_at) from user_events e where e.user_id = au.id),
    exists(select 1 from user_events e where e.user_id = au.id and e.event_name = 'signup_completed')
  from auth.users au
  left join profiles pr on pr.id = au.id
  order by au.created_at desc;
$function$;

grant execute on function public.insights_registered_users() to service_role;
