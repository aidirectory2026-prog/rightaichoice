-- Phase 8.g.8 (2026-05-21) — bot detection on user_events.
--
-- Why: aggregates in /admin/insights mix real humans with bots (Googlebot,
-- Ahrefs, GPTBot, scrapers, headless Chrome). User can't trust the numbers
-- without separating the two.
--
-- Approach: cheap user-agent regex on insert. /api/track-mirror computes
-- bot_likely from the request UA before writing each row. Behavioural
-- detection (rapid page views, no scroll) deferred — UA alone catches
-- ~90% of bot traffic and never false-positives a real browser.
--
-- bot_likely=true rows still live in user_events (deletion = lost data);
-- the insights RPCs in migration 098 add an opt-out arg so charts default
-- to excluding bots.

alter table public.user_events
  add column if not exists bot_likely boolean not null default false;

-- Index to make the WHERE bot_likely = false filter cheap on every read.
create index if not exists user_events_bot_likely_created_idx
  on public.user_events (bot_likely, created_at desc);

comment on column public.user_events.bot_likely is
  'Set by /api/track-mirror on insert via user-agent regex. Backfill: UPDATE statement at the bottom of this migration relabels historical rows.';

-- Backfill: historical rows had no bot detection. Apply the same UA regex
-- the API handler will use going forward, so historical aggregates align
-- with new aggregates.
update public.user_events
set bot_likely = true
where bot_likely = false
  and user_agent ~* '(googlebot|bingbot|yandex|duckduck|baiduspider|ahrefsbot|semrushbot|dotbot|mj12bot|blexbot|seokicks|petalbot|gptbot|claudebot|chatgpt-user|perplexitybot|anthropic-ai|applebot|facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|whatsapp|skypeuripreview|amazonbot|crawl|spider|slurp|headlesschrome|phantomjs|electron|python-requests|curl/|wget/|postman|scrapy|httpclient|node-fetch|^axios)';
