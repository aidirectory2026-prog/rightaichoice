-- Phase 10 #24 — reconcile claim_sentiment_scan migration drift.
--
-- Production had TWO overloads: claim_sentiment_scan(p_user) [from 136] and
-- claim_sentiment_scan(p_user, p_free_limit) [added out-of-band]. The app calls
-- the 2-arg form, so it works in prod — but a fresh DB / restore from the
-- committed migrations would only have the 1-arg form and break every scan.
-- This migration captures the 2-arg version into source control and drops the
-- now-dead 1-arg overload to remove the ambiguity.

create or replace function public.claim_sentiment_scan(p_user uuid, p_free_limit integer)
  returns text
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  v_free_used int;
  v_paid int;
  v_limit int := greatest(coalesce(p_free_limit, 5), 0);
begin
  insert into public.sentiment_quota (user_id, free_limit) values (p_user, v_limit)
    on conflict (user_id) do update set free_limit = v_limit, updated_at = now();

  select free_used, paid_balance
    into v_free_used, v_paid
    from public.sentiment_quota where user_id = p_user for update;

  if v_free_used < v_limit then
    update public.sentiment_quota set free_used = free_used + 1, updated_at = now() where user_id = p_user;
    return 'free';
  elsif v_paid > 0 then
    update public.sentiment_quota set paid_balance = paid_balance - 1, updated_at = now() where user_id = p_user;
    return 'paid';
  else
    return 'payment_required';
  end if;
end;
$function$;

-- Drop the dead single-arg overload (nothing calls it; the app always passes p_free_limit).
drop function if exists public.claim_sentiment_scan(uuid);

-- Rollback: re-create the 1-arg overload from migration 136 if needed; the 2-arg
-- form is harmless to keep.
