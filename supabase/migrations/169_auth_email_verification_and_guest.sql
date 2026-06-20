-- 169 — Phase 11 (2026-06-21): instant-signup verification layer + guest (anonymous) support.
-- Already applied to prod via MCP (project's migration approach); idempotent so a
-- later batch apply is a safe no-op.

-- 1) Our own email-verified flag. With Supabase "Confirm email" OFF, signup is
--    instant but Supabase auto-marks the email confirmed, so it can't model
--    "logged in but not yet verified" — we track that here.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

UPDATE public.profiles p SET email_verified = true
FROM auth.users u
WHERE u.id = p.id AND u.email_confirmed_at IS NOT NULL AND p.email_verified = false;

-- 2) One-time verification tokens (server-side only; RLS on, no client policies →
--    only the service role can read/write).
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  email text,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evt_token_hash ON public.email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_evt_user ON public.email_verification_tokens(user_id);
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- 3) Lead capture — emails typed on signup even if the signup is abandoned.
CREATE TABLE IF NOT EXISTS public.email_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text,
  converted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);
ALTER TABLE public.email_leads ENABLE ROW LEVEL SECURITY;

-- 4) New-user trigger: collision-proof UNIQUE username, provider-aware
--    email_verified, anonymous-guest safe (NULL email no longer breaks the insert).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_provider text := coalesce(new.raw_app_meta_data->>'provider', '');
  v_username text;
  v_verified boolean;
begin
  v_username := coalesce(
    nullif(new.raw_user_meta_data->>'username', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'guest_' || left(replace(new.id::text, '-', ''), 12)
  );
  if exists (select 1 from public.profiles where username = v_username) then
    v_username := left(v_username, 24) || '_' || left(replace(new.id::text, '-', ''), 6);
  end if;

  v_verified := (new.email is not null and v_provider in ('google', 'linkedin_oidc'));

  insert into public.profiles (id, username, full_name, avatar_url, is_admin, email_verified)
  values (
    new.id,
    v_username,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    public.is_admin_email(new.email),
    v_verified
  );
  return new;
end;
$function$;
