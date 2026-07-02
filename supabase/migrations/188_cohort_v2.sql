-- 188: Cohort engine v2 (Phase 14b Wave 5).
--
-- insights_cohort (163) learns three founder asks — same signature, payload
-- grows (older saved cohorts keep working unchanged):
--
--   did_event gains:
--     min_count — "did X at least N times" (grouped HAVING; default 1 = old
--                 behaviour exactly)
--     where {k,v} — per-event property condition ("tool_page_viewed where
--                 tool_slug = notion"). k is charset-checked here AND
--                 schema-allowlisted app-side; the accessor is a variable
--                 (parameter-safe), values never interpolated.
--   new condition types:
--     geo    {field: country|city|region, value} — equality (format %I on an
--            in-function allowlist only)
--     device {value: desktop|mobile|tablet|unknown} — 'unknown' → NULL

create or replace function public.insights_cohort(p_conditions jsonb, p_cutoff timestamptz, p_end timestamptz default null::timestamptz, p_include_bots boolean default false, p_limit int default 500)
 returns table(distinct_id text, user_id uuid, email text, full_name text, events bigint, last_seen timestamptz)
 language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_op text := lower(coalesce(p_conditions->>'op','and'));
  v_cond jsonb; v_ctype text; v_ids text[]; v_set text[]; v_first boolean := true; v_sql text; v_field text; v_key text;
  v_propcols text[] := array['plan_budget_segment','plan_team_segment','plan_industry_segment','plan_skill_segment','email_domain','searches_count','plans_completed_count','saves_count','tools_visited_count','comparisons_count','chat_messages_count'];
begin
  if v_op <> 'or' then v_op := 'and'; end if;
  for v_cond in select * from jsonb_array_elements(coalesce(p_conditions->'conditions','[]'::jsonb)) loop
    v_ctype := v_cond->>'type'; v_set := '{}';
    if v_ctype = 'did_event' then
      -- v2: optional min_count + optional per-event property where {k,v}.
      v_key := case when v_cond->'where' is not null then v_cond->'where'->>'k' end;
      if v_cond->'where' is not null and (v_key is null or v_key !~ '^[a-z0-9_]{1,64}$') then
        v_set := '{}'; -- malformed where → match nobody, never match everybody
      else
        select array_agg(t.did) into v_set from (
          select ue.distinct_id as did from user_events ue
          where ue.event_name = v_cond->>'event'
            and ue.created_at >= p_cutoff and (p_end is null or ue.created_at < p_end)
            and (p_include_bots or not ue.bot_likely)
            and (v_cond->'where' is null or ue.properties->>v_key = v_cond->'where'->>'v')
          group by 1
          having count(*) >= greatest(coalesce(nullif(v_cond->>'min_count','')::int, 1), 1)
        ) t;
      end if;
    elsif v_ctype = 'not_event' then
      select array_agg(distinct ue.distinct_id) into v_set from user_events ue
      where ue.created_at >= p_cutoff and (p_end is null or ue.created_at < p_end) and (p_include_bots or not ue.bot_likely)
        and ue.distinct_id not in (select ue2.distinct_id from user_events ue2 where ue2.event_name = v_cond->>'event' and ue2.created_at >= p_cutoff and (p_end is null or ue2.created_at < p_end));
    elsif v_ctype = 'sequence' then
      select array_agg(distinct a.distinct_id) into v_set from user_events a join user_events b on b.distinct_id = a.distinct_id and b.created_at > a.created_at
      where a.event_name = v_cond->>'first' and b.event_name = v_cond->>'then' and a.created_at >= p_cutoff and (p_end is null or b.created_at < p_end) and (p_include_bots or (not a.bot_likely and not b.bot_likely));
    elsif v_ctype = 'property' then
      v_field := v_cond->>'field';
      if v_field = any(v_propcols) then
        v_sql := format('select array_agg(distinct uip.distinct_id) from user_intent_profile uip where uip.%I %s $1', v_field, case v_cond->>'op' when 'contains' then 'ilike' when 'gt' then '>' when 'lt' then '<' else '=' end);
        if v_cond->>'op' = 'contains' then execute v_sql into v_set using '%'||(v_cond->>'value')||'%';
        elsif v_cond->>'op' in ('gt','lt') then execute v_sql into v_set using (v_cond->>'value')::numeric;
        else execute v_sql into v_set using v_cond->>'value'; end if;
      end if;
    elsif v_ctype = 'geo' then
      v_field := v_cond->>'field';
      if v_field in ('country','city','region') then
        v_sql := format('select array_agg(distinct ue.distinct_id) from user_events ue where ue.%I = $1 and ue.created_at >= $2 and ($3::timestamptz is null or ue.created_at < $3) and ($4 or not ue.bot_likely)', v_field);
        execute v_sql into v_set using v_cond->>'value', p_cutoff, p_end, p_include_bots;
      end if;
    elsif v_ctype = 'device' then
      if v_cond->>'value' = 'unknown' then
        select array_agg(distinct ue.distinct_id) into v_set from user_events ue
        where ue.device_type is null and ue.created_at >= p_cutoff and (p_end is null or ue.created_at < p_end) and (p_include_bots or not ue.bot_likely);
      elsif v_cond->>'value' in ('desktop','mobile','tablet') then
        select array_agg(distinct ue.distinct_id) into v_set from user_events ue
        where ue.device_type = v_cond->>'value' and ue.created_at >= p_cutoff and (p_end is null or ue.created_at < p_end) and (p_include_bots or not ue.bot_likely);
      end if;
    end if;
    v_set := coalesce(v_set, '{}');
    if v_first then v_ids := v_set; v_first := false;
    elsif v_op = 'or' then v_ids := array(select unnest(v_ids) union select unnest(v_set));
    else v_ids := array(select unnest(v_ids) intersect select unnest(v_set)); end if;
  end loop;
  if v_first then return; end if;
  -- v2 fix: group by distinct_id ONLY. The old group-by included the joined
  -- email/full_name, so a visitor with both anon and logged-in events got TWO
  -- rows (once per identity face) — inflating cohort counts and CSV exports.
  return query
    select ue.distinct_id, (max(ue.user_id::text))::uuid,
      max(au.email)::text,
      max(coalesce(pr.full_name, au.raw_user_meta_data->>'full_name'))::text,
      count(*)::bigint, max(ue.created_at)
    from user_events ue
    left join auth.users au on au.id = ue.user_id
    left join profiles pr on pr.id = ue.user_id
    where ue.distinct_id = any(v_ids) and ue.created_at >= p_cutoff and (p_end is null or ue.created_at < p_end) and (p_include_bots or not ue.bot_likely)
    group by ue.distinct_id
    order by max(ue.created_at) desc limit p_limit;
end;
$function$;

grant execute on function public.insights_cohort(jsonb, timestamptz, timestamptz, boolean, int) to service_role;
