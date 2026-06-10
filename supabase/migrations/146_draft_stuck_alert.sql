-- Phase 10 #51 (risk mitigation) — alert if draft-until-green tools pile up.
--
-- With new tools inserting as is_published=false, a bug in the onboarding gate
-- could strand them unpublished forever. This hourly pg_cron check raises an
-- alert (synthetic failure row → existing alerter) if any NON-merged draft has
-- been stuck >48h. merged_into IS NOT NULL tools are intentionally unpublished
-- (410 redirects) and excluded.

do $$
begin
  perform cron.schedule('draft-stuck-alert', '23 * * * *', $cron$
    insert into public.pipeline_runs (source, pipeline_key, status, error_class, error_message, started_at, finished_at)
    select 'vercel_cron', 'draft-stuck', 'failure', 'unknown',
      (select count(*) from public.tools
         where is_published = false and merged_into is null and created_at < now() - interval '48 hours')
      || ' tool(s) stuck unpublished >48h — failing onboarding gates',
      now(), now()
    where (select count(*) from public.tools
             where is_published = false and merged_into is null and created_at < now() - interval '48 hours') > 0
      and not exists (
        select 1 from public.pipeline_runs r
        where r.pipeline_key = 'draft-stuck' and r.started_at > now() - interval '24 hours'
      );
  $cron$);
exception when others then null;
end $$;

-- Rollback: select cron.unschedule('draft-stuck-alert');
