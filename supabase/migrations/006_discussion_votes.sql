-- ============================================================
-- Migration 006: Discussion vote tracking + reply_count trigger
-- ============================================================

-- Vote tracking for discussions (matches question_votes / answer_votes pattern)
create table if not exists discussion_votes (
  discussion_id uuid not null references discussions(id) on delete cascade,
  user_id       uuid not null references profiles(id)    on delete cascade,
  vote          vote_direction not null,
  created_at    timestamptz default now(),
  primary key (discussion_id, user_id)
);

create table if not exists discussion_reply_votes (
  reply_id   uuid not null references discussion_replies(id) on delete cascade,
  user_id    uuid not null references profiles(id)           on delete cascade,
  vote       vote_direction not null,
  created_at timestamptz default now(),
  primary key (reply_id, user_id)
);

-- RLS
alter table discussion_votes       enable row level security;
alter table discussion_reply_votes enable row level security;

create policy "public read discussion_votes"       on discussion_votes       for select using (true);
create policy "auth write discussion_votes"        on discussion_votes       for insert with check (auth.uid() = user_id);
create policy "auth update discussion_votes"       on discussion_votes       for update using (auth.uid() = user_id);
create policy "auth delete discussion_votes"       on discussion_votes       for delete using (auth.uid() = user_id);

create policy "public read discussion_reply_votes" on discussion_reply_votes for select using (true);
create policy "auth write discussion_reply_votes"  on discussion_reply_votes for insert with check (auth.uid() = user_id);
create policy "auth update discussion_reply_votes" on discussion_reply_votes for update using (auth.uid() = user_id);
create policy "auth delete discussion_reply_votes" on discussion_reply_votes for delete using (auth.uid() = user_id);

-- Indexes
create index idx_discussion_votes_user       on discussion_votes(user_id);
create index idx_discussion_reply_votes_user on discussion_reply_votes(user_id);

-- Trigger: auto-sync reply_count on discussions after insert/delete on discussion_replies
create or replace function sync_discussion_replies()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update discussions
      set reply_count = reply_count + 1
    where id = new.discussion_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update discussions
      set reply_count = greatest(0, reply_count - 1)
    where id = old.discussion_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_sync_discussion_replies
  after insert or delete on discussion_replies
  for each row execute function sync_discussion_replies();
