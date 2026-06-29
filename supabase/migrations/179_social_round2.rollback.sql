-- Reverse of 179_social_round2.sql
drop index if exists public.idx_social_posts_claim;
alter table public.social_posts drop column if exists publish_started_at;
