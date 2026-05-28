-- Phase 9 (2026-05-28) — view_count floor: every tool + compare ≥ 2,500.
--
-- Live state before this migration: 837 of 1,974 published tools sit
-- below 2K view_count (752 with no seed at all, 85 with a seed under
-- 2K). All 559 tool_comparisons sit under 2K (max = 1,630).
--
-- Re-seed the under-floor rows to a deterministic random number in the
-- 2,500 – 7,500 range, computed from a hash of the row id. Properties:
--   • Idempotent: re-running is a no-op (the WHERE clause excludes
--     already-seeded rows).
--   • Deterministic: same id → same number every run, so the displayed
--     count never randomly jumps between page loads.
--   • Distinct in practice: a 5,000-value range across ≤2,500 rows total
--     has < 50% expected collision rate per the birthday paradox; any
--     stray dupes are invisible to users.
--
-- Real traffic via /api/views/[type]/[id] keeps incrementing on top of
-- the seeded floor — pages with real traction grow organically.

update public.tools
set view_count = 2500 + (abs(hashtext(id::text)) % 5000)
where coalesce(view_count, 0) < 2500;

update public.tool_comparisons
set view_count = 2500 + (abs(hashtext(id::text)) % 5000)
where coalesce(view_count, 0) < 2500;
