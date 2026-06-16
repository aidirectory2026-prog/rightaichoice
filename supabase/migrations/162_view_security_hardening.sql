-- 162_view_security_hardening.sql — Fable-5 audit cleanup (2026-06-16)
-- Clears the last security-advisor flags that are safe to fix:
--   * security_definer_view (ERROR): pages_freshness_needs_isr ran with the
--     creator's privileges. Only cascade-hubs reads it, via the service_role
--     key (bypasses RLS regardless), so switching to security_invoker keeps the
--     pipeline working while removing anon's ability to read through it.
--     Verified post-apply: view returns the same row set as the underlying
--     table's needs-ISR filter (0 right now — cascade is caught up).
--   * materialized_view_in_api (WARN): v_field_freshness is admin/cron-only
--     (backs /admin/freshness via service_role); revoke anon/authenticated SELECT.
alter view public.pages_freshness_needs_isr set (security_invoker = true);
revoke select on public.v_field_freshness from anon, authenticated;
