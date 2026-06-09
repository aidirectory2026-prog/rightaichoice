-- Phase 10 #66 — bound onboarding retries.
--
-- A tool whose refresh/scrape keeps failing never gets onboarded_at set, so the
-- onboard lanes re-pick it every cycle and re-run the full premium SOP (paid
-- DeepSeek + sentiment scrape) forever with no progress. We add an attempt
-- counter; the lanes increment it and stop selecting a tool after a cap, so a
-- permanently-unscrapeable tool stops burning budget (and the draft-stuck alert
-- from migration 146 surfaces any draft that never made it).

alter table public.tools add column if not exists onboard_attempts integer not null default 0;

-- Rollback: alter table public.tools drop column if exists onboard_attempts;
