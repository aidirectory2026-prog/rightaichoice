-- 163_lock_profile_is_admin.sql — Phase 10 (Cowork QA) C1
-- Privilege-escalation fix: the "users update profile" RLS policy on public.profiles
-- has a USING clause ((select auth.uid()) = id) but NO WITH CHECK and no column
-- restriction. The browser uses the anon key + the user's JWT, so a logged-in user
-- can run  supabase.from('profiles').update({ is_admin: true }).eq('id', MY_ID)
-- from devtools and self-grant admin. Every admin gate trusts profiles.is_admin.
--
-- is_admin is the ONLY privileged column on profiles (verified: no role / is_super_admin).
-- A BEFORE UPDATE trigger is the safe fix: it sees OLD and NEW natively (an RLS
-- WITH CHECK cannot reference OLD) and lets the service_role (admin panel) + postgres/cron
-- through cleanly. The RLS policy is left exactly as-is so the normal self-profile edit
-- path is untouched.
--
-- IMPORTANT: this function is SECURITY INVOKER (the default), NOT security definer. A
-- security-definer function runs as its owner (postgres), so current_user inside it would
-- ALWAYS be 'postgres' and the trusted-caller bypass below would match for everyone,
-- defeating the guard. As invoker, current_user is the real caller — 'authenticated'/'anon'
-- for a browser JWT (blocked) and 'service_role'/'postgres' for trusted callers (allowed).

create or replace function public.guard_profile_privileged_cols()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Trusted callers bypass: the admin panel mutates is_admin via the service_role
  -- key (PostgREST SET ROLE service_role); pg_cron / direct DB runs as postgres.
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;

  -- Anyone else (a browser JWT on the anon key) must not change is_admin.
  if new.is_admin is distinct from old.is_admin then
    raise exception 'permission denied: is_admin is not user-editable'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_guard_privileged on public.profiles;
create trigger trg_profiles_guard_privileged
  before update on public.profiles
  for each row
  execute function public.guard_profile_privileged_cols();
