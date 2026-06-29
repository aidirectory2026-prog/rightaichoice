-- Phase 13 Round 2 — publish claim/lock to prevent double-posting.
--
-- The social-publish cron selects status='approved' rows whose time has come and
-- posts them. Without a claim, two overlapping cron runs (or a manual trigger
-- racing the schedule) could both fetch and post the SAME row. publish_started_at
-- is set atomically (UPDATE ... WHERE status='approved' AND (publish_started_at IS
-- NULL OR publish_started_at < now() - 10min) RETURNING id) so exactly one runner
-- claims a row; a stale claim (crashed mid-publish) is reclaimable after 10 min.
-- Reverse: 179_social_round2.rollback.sql

alter table public.social_posts add column if not exists publish_started_at timestamptz;

-- The publish cron's hot query filters approved + due + unclaimed.
create index if not exists idx_social_posts_claim
  on public.social_posts (status, scheduled_at, publish_started_at);

comment on column public.social_posts.publish_started_at is
  'Phase 13 R2 — publish claim timestamp; set atomically before posting so overlapping cron runs cannot double-post. Reclaimable after 10 min if a run crashed.';
