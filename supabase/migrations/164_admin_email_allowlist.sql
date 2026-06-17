-- 164_admin_email_allowlist.sql — Phase 10 (Cowork QA)
-- Owner requirement: EXACTLY two emails may access the admin panel —
-- tanmayverma321@gmail.com and admin@rightaichoice.com — and the second must
-- gain access automatically the first time it logs in (no manual DB flip).
--
-- is_admin is the single source of truth for every admin gate (app/admin/layout.tsx
-- + every requireAdmin()). So we drive is_admin from a one-place email allowlist:
--   (1) is_admin_email(email)   — the canonical allowlist (edit here to change admins).
--   (2) handle_new_user()       — on signup, set is_admin = is_admin_email(new.email),
--                                 so admin@rightaichoice.com is admin on first login.
--   (3) one-time reconcile      — make existing profiles match the allowlist exactly:
--                                 the owner stays admin, anyone else is forced false.
-- The C1 guard (163) still blocks a logged-in user from self-granting is_admin; this
-- migration runs as postgres so its writes bypass that guard legitimately.

create or replace function public.is_admin_email(p_email text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select lower(coalesce(p_email, '')) in (
    'tanmayverma321@gmail.com',
    'admin@rightaichoice.com'
  );
$$;

-- (2) auto-grant on signup (function body replaced; trigger on_auth_user_created unchanged)
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, username, full_name, avatar_url, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    public.is_admin_email(new.email)
  );
  return new;
end;
$$;

-- (3) reconcile existing profiles to match the allowlist exactly
update public.profiles p
set is_admin = public.is_admin_email(u.email)
from auth.users u
where u.id = p.id
  and p.is_admin is distinct from public.is_admin_email(u.email);
