-- Phase 9 S3 — Market Sentiment Checker: per-user quota/credit ledger,
-- per-scan search log (results + tracking), and payment ledger.
--
-- Flow: a signed-in user gets 3 free scans (sentiment_quota.free_used <
-- free_limit), then each scan consumes a paid credit (paid_balance), bought
-- ₹20 (Razorpay) / $1 (PayPal). claim_sentiment_scan() decides free vs paid vs
-- payment_required atomically; grant_sentiment_credit() tops up paid_balance on
-- a verified payment (idempotent on the gateway payment id).

-- ── Quota / credit balance (one row per user) ───────────────────────────────
create table if not exists public.sentiment_quota (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  free_used int not null default 0,
  free_limit int not null default 3,
  paid_balance int not null default 0,
  updated_at timestamptz not null default now()
);

-- ── Per-scan log: results + tracking source-of-truth ────────────────────────
create table if not exists public.sentiment_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tool_id uuid references public.tools(id) on delete set null,
  tool_slug text not null,
  status text not null default 'running' check (status in ('running','ready','failed','partial')),
  charge_type text not null check (charge_type in ('free','paid')),
  result jsonb,
  sources jsonb,
  mention_count int,
  duration_ms int,
  country text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists idx_sentiment_searches_user on public.sentiment_searches (user_id, created_at desc);
create index if not exists idx_sentiment_searches_tool on public.sentiment_searches (tool_slug, created_at desc);

-- ── Payment ledger (reconciliation + idempotency) ───────────────────────────
create table if not exists public.sentiment_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  gateway text not null check (gateway in ('razorpay','paypal')),
  gateway_order_id text,
  gateway_payment_id text,
  amount_minor int not null,                 -- paise (INR) or cents (USD)
  currency text not null,                    -- 'INR' | 'USD'
  status text not null default 'created' check (status in ('created','paid','failed')),
  credits_granted int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- one paid grant per gateway payment id (webhook-retry safe)
create unique index if not exists uq_sentiment_payments_gw_pay
  on public.sentiment_payments (gateway, gateway_payment_id) where gateway_payment_id is not null;
create index if not exists idx_sentiment_payments_user on public.sentiment_payments (user_id, created_at desc);

-- ── RLS: users read only their own rows; writes are service-role only ───────
alter table public.sentiment_quota enable row level security;
alter table public.sentiment_searches enable row level security;
alter table public.sentiment_payments enable row level security;

drop policy if exists sel_own_quota on public.sentiment_quota;
create policy sel_own_quota on public.sentiment_quota for select using (auth.uid() = user_id);

drop policy if exists sel_own_searches on public.sentiment_searches;
create policy sel_own_searches on public.sentiment_searches for select using (auth.uid() = user_id);

drop policy if exists sel_own_payments on public.sentiment_payments;
create policy sel_own_payments on public.sentiment_payments for select using (auth.uid() = user_id);

-- ── Atomic credit claim: free → paid → payment_required ─────────────────────
create or replace function public.claim_sentiment_scan(p_user uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_free_used int;
  v_free_limit int;
  v_paid int;
begin
  insert into public.sentiment_quota (user_id) values (p_user)
    on conflict (user_id) do nothing;

  select free_used, free_limit, paid_balance
    into v_free_used, v_free_limit, v_paid
    from public.sentiment_quota where user_id = p_user for update;

  if v_free_used < v_free_limit then
    update public.sentiment_quota set free_used = free_used + 1, updated_at = now() where user_id = p_user;
    return 'free';
  elsif v_paid > 0 then
    update public.sentiment_quota set paid_balance = paid_balance - 1, updated_at = now() where user_id = p_user;
    return 'paid';
  else
    return 'payment_required';
  end if;
end;
$$;

-- ── Grant 1 paid credit on a verified payment (idempotent) ──────────────────
create or replace function public.grant_sentiment_credit(p_payment uuid, p_gateway_payment_id text)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid;
  v_status text;
begin
  select user_id, status into v_user, v_status
    from public.sentiment_payments where id = p_payment for update;
  if v_user is null then return 0; end if;
  if v_status = 'paid' then return 0; end if;  -- already granted

  update public.sentiment_payments
    set status = 'paid',
        gateway_payment_id = coalesce(p_gateway_payment_id, gateway_payment_id),
        credits_granted = 1, updated_at = now()
    where id = p_payment;

  insert into public.sentiment_quota (user_id, paid_balance) values (v_user, 1)
    on conflict (user_id) do update set paid_balance = public.sentiment_quota.paid_balance + 1, updated_at = now();
  return 1;
end;
$$;

-- Refund a claimed credit if the scan itself fails to produce a report, so a
-- user is never charged a free/paid use for a failed scan.
create or replace function public.refund_sentiment_scan(p_user uuid, p_charge_type text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_charge_type = 'free' then
    update public.sentiment_quota set free_used = greatest(free_used - 1, 0), updated_at = now() where user_id = p_user;
  elsif p_charge_type = 'paid' then
    update public.sentiment_quota set paid_balance = paid_balance + 1, updated_at = now() where user_id = p_user;
  end if;
end;
$$;

revoke execute on function public.claim_sentiment_scan(uuid) from public, anon, authenticated;
revoke execute on function public.grant_sentiment_credit(uuid, text) from public, anon, authenticated;
revoke execute on function public.refund_sentiment_scan(uuid, text) from public, anon, authenticated;
