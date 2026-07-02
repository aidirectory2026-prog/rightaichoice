-- Rollback for 184_browser_os_columns.sql
alter table public.user_events
  drop column if exists browser,
  drop column if exists os;
