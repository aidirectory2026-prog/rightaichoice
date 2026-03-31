-- ============================================================
-- Migration 011: Atomic vote counter adjustment
-- Fixes race condition: read-modify-write replaced with atomic SQL
-- ============================================================

-- Generic function to atomically adjust a counter on any table.
-- Uses format(%I) to safely quote identifiers (prevents SQL injection).
-- security definer so it can bypass RLS for counter updates.
create or replace function adjust_counter(
  target_table text,
  target_id uuid,
  counter_field text,
  delta int
) returns void as $$
begin
  execute format(
    'update %I set %I = greatest(0, %I + $1) where id = $2',
    target_table, counter_field, counter_field
  ) using delta, target_id;
end;
$$ language plpgsql security definer;
