-- ============================================================
-- RightAIChoice — Admin RLS Policies + Missing Policies
-- Step 3.5: Run this in Supabase → SQL Editor AFTER 001
-- ============================================================

-- Admin insert/update/delete on tools
create policy "admin insert tools" on tools
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admin update tools" on tools
  for update using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admin delete tools" on tools
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Admin manage categories and tags
create policy "admin insert categories" on categories
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admin update categories" on categories
  for update using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admin insert tags" on tags
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Admin manage tool_categories and tool_tags
create policy "admin manage tool_categories" on tool_categories
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admin manage tool_tags" on tool_tags
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admin manage alternatives" on tool_alternatives
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Admin read analytics tables
create policy "admin read search_logs" on search_logs
  for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admin read click_logs" on click_logs
  for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admin read page_views" on page_views
  for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- ============================================================
-- IMPORTANT: After running this migration, make yourself admin:
--
-- UPDATE profiles SET is_admin = true WHERE username = 'YOUR_USERNAME';
-- ============================================================
