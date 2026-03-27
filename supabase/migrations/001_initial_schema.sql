-- ============================================================
-- RightAIChoice — Initial Database Schema
-- Step 2: Run this ONCE in Supabase → SQL Editor → New Query
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";

-- ============================================================
-- ENUMS
-- ============================================================

create type pricing_type   as enum ('free', 'freemium', 'paid', 'contact');
create type skill_level    as enum ('beginner', 'intermediate', 'advanced');
create type platform_type  as enum ('web', 'mobile', 'desktop', 'api', 'plugin', 'cli');
create type badge_type     as enum ('contributor', 'expert', 'top_reviewer', 'early_adopter');
create type vote_direction as enum ('up', 'down');

-- ============================================================
-- LAYER 1 — DISCOVERY
-- ============================================================

create table categories (
  id          uuid        primary key default uuid_generate_v4(),
  name        text        not null unique,
  slug        text        not null unique,
  description text,
  icon        text,
  sort_order  int         default 0,
  created_at  timestamptz default now()
);

create table tags (
  id         uuid        primary key default uuid_generate_v4(),
  name       text        not null unique,
  slug       text        not null unique,
  created_at timestamptz default now()
);

create table tools (
  id               uuid          primary key default uuid_generate_v4(),
  name             text          not null,
  slug             text          not null unique,
  tagline          text          not null,
  description      text          not null,
  logo_url         text,
  website_url      text          not null,
  pricing_type     pricing_type  not null default 'freemium',
  pricing_details  jsonb         default '[]',
  skill_level      skill_level   not null default 'beginner',
  has_api          boolean       default false,
  platforms        platform_type[] default '{}',
  features         text[]        default '{}',
  integrations     text[]        default '{}',
  github_url       text,
  docs_url         text,
  changelog_url    text,
  github_stars     int           default 0,
  last_github_sync timestamptz,
  avg_rating       numeric(3,2)  default 0,
  review_count     int           default 0,
  view_count       int           default 0,
  save_count       int           default 0,
  is_featured      boolean       default false,
  is_sponsored     boolean       default false,
  is_published     boolean       default true,
  submitted_by     uuid          references auth.users(id) on delete set null,
  created_at       timestamptz   default now(),
  updated_at       timestamptz   default now()
);

create table tool_categories (
  tool_id     uuid not null references tools(id)      on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (tool_id, category_id)
);

create table tool_tags (
  tool_id uuid not null references tools(id) on delete cascade,
  tag_id  uuid not null references tags(id)  on delete cascade,
  primary key (tool_id, tag_id)
);

create table tool_alternatives (
  tool_id        uuid not null references tools(id) on delete cascade,
  alternative_id uuid not null references tools(id) on delete cascade,
  primary key (tool_id, alternative_id),
  check (tool_id <> alternative_id)
);

-- ============================================================
-- LAYER 2 — COMMUNITY
-- ============================================================

create table profiles (
  id             uuid        primary key references auth.users(id) on delete cascade,
  username       text        not null unique,
  full_name      text,
  avatar_url     text,
  bio            text,
  website_url    text,
  reputation     int         default 0,
  review_count   int         default 0,
  question_count int         default 0,
  answer_count   int         default 0,
  is_admin       boolean     default false,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create table user_badges (
  user_id    uuid       not null references profiles(id) on delete cascade,
  badge      badge_type not null,
  awarded_at timestamptz default now(),
  primary key (user_id, badge)
);

create table reputation_logs (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  delta      int         not null,
  reason     text        not null,
  ref_id     uuid,
  created_at timestamptz default now()
);

create table user_saved_tools (
  user_id    uuid        not null references profiles(id) on delete cascade,
  tool_id    uuid        not null references tools(id)    on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, tool_id)
);

-- Reviews
create table reviews (
  id          uuid        primary key default uuid_generate_v4(),
  tool_id     uuid        not null references tools(id)    on delete cascade,
  user_id     uuid        not null references profiles(id) on delete cascade,
  rating      int         not null check (rating between 1 and 5),
  pros        text        not null,
  cons        text        not null,
  use_case    text        not null,
  skill_level skill_level not null,
  upvotes     int         default 0,
  downvotes   int         default 0,
  is_flagged  boolean     default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (tool_id, user_id)
);

create table review_votes (
  review_id  uuid           not null references reviews(id)  on delete cascade,
  user_id    uuid           not null references profiles(id) on delete cascade,
  vote       vote_direction not null,
  created_at timestamptz    default now(),
  primary key (review_id, user_id)
);

-- Q&A
create table questions (
  id           uuid        primary key default uuid_generate_v4(),
  tool_id      uuid        not null references tools(id)    on delete cascade,
  user_id      uuid        not null references profiles(id) on delete cascade,
  title        text        not null,
  body         text        not null,
  upvotes      int         default 0,
  answer_count int         default 0,
  is_answered  boolean     default false,
  is_flagged   boolean     default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table question_votes (
  question_id uuid           not null references questions(id) on delete cascade,
  user_id     uuid           not null references profiles(id)  on delete cascade,
  vote        vote_direction not null,
  created_at  timestamptz    default now(),
  primary key (question_id, user_id)
);

create table answers (
  id          uuid        primary key default uuid_generate_v4(),
  question_id uuid        not null references questions(id) on delete cascade,
  user_id     uuid        not null references profiles(id)  on delete cascade,
  body        text        not null,
  upvotes     int         default 0,
  is_accepted boolean     default false,
  is_flagged  boolean     default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table answer_votes (
  answer_id  uuid           not null references answers(id)  on delete cascade,
  user_id    uuid           not null references profiles(id) on delete cascade,
  vote       vote_direction not null,
  created_at timestamptz    default now(),
  primary key (answer_id, user_id)
);

-- Discussions
create table discussions (
  id          uuid        primary key default uuid_generate_v4(),
  tool_id     uuid        not null references tools(id)    on delete cascade,
  user_id     uuid        not null references profiles(id) on delete cascade,
  title       text        not null,
  body        text        not null,
  upvotes     int         default 0,
  reply_count int         default 0,
  is_pinned   boolean     default false,
  is_flagged  boolean     default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table discussion_replies (
  id            uuid        primary key default uuid_generate_v4(),
  discussion_id uuid        not null references discussions(id) on delete cascade,
  user_id       uuid        not null references profiles(id)    on delete cascade,
  body          text        not null,
  upvotes       int         default 0,
  is_flagged    boolean     default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Comparisons
create table tool_comparisons (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        references profiles(id) on delete set null,
  tool_ids   uuid[]      not null,
  slug       text        not null unique,
  view_count int         default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- LAYER 3 — AI / WORKFLOWS
-- ============================================================

create table workflows (
  id               uuid        primary key default uuid_generate_v4(),
  title            text        not null,
  description      text        not null,
  goal             text        not null,
  steps            jsonb       not null default '[]',
  user_id          uuid        references profiles(id) on delete set null,
  upvotes          int         default 0,
  is_ai_generated  boolean     default true,
  is_published     boolean     default true,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table workflow_votes (
  workflow_id uuid        not null references workflows(id) on delete cascade,
  user_id     uuid        not null references profiles(id)  on delete cascade,
  created_at  timestamptz default now(),
  primary key (workflow_id, user_id)
);

-- ============================================================
-- ANALYTICS
-- ============================================================

create table search_logs (
  id           uuid        primary key default uuid_generate_v4(),
  query        text        not null,
  user_id      uuid        references profiles(id) on delete set null,
  result_count int         default 0,
  created_at   timestamptz default now()
);

create table click_logs (
  id         uuid        primary key default uuid_generate_v4(),
  tool_id    uuid        not null references tools(id) on delete cascade,
  user_id    uuid        references profiles(id) on delete set null,
  source     text,
  created_at timestamptz default now()
);

create table page_views (
  id         uuid        primary key default uuid_generate_v4(),
  path       text        not null,
  tool_id    uuid        references tools(id) on delete cascade,
  user_id    uuid        references profiles(id) on delete set null,
  referrer   text,
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_tools_slug         on tools(slug);
create index idx_tools_pricing      on tools(pricing_type);
create index idx_tools_skill        on tools(skill_level);
create index idx_tools_has_api      on tools(has_api);
create index idx_tools_featured     on tools(is_featured);
create index idx_tools_published    on tools(is_published);
create index idx_tools_rating       on tools(avg_rating desc);
create index idx_tools_views        on tools(view_count desc);
create index idx_tools_created      on tools(created_at desc);

-- Full-text search
create index idx_tools_fts on tools using gin(
  to_tsvector('english', name || ' ' || tagline || ' ' || coalesce(description,''))
);

-- Trigram for fuzzy search
create index idx_tools_name_trgm on tools using gin(name gin_trgm_ops);

create index idx_categories_slug    on categories(slug);
create index idx_tags_slug          on tags(slug);
create index idx_reviews_tool       on reviews(tool_id);
create index idx_reviews_user       on reviews(user_id);
create index idx_reviews_rating     on reviews(rating desc);
create index idx_reviews_upvotes    on reviews(upvotes desc);
create index idx_questions_tool     on questions(tool_id);
create index idx_questions_upvotes  on questions(upvotes desc);
create index idx_answers_question   on answers(question_id);
create index idx_discussions_tool   on discussions(tool_id);
create index idx_search_query       on search_logs(query);
create index idx_search_created     on search_logs(created_at desc);
create index idx_clicks_tool        on click_logs(tool_id);
create index idx_pageviews_path     on page_views(path);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles           enable row level security;
alter table tools              enable row level security;
alter table categories         enable row level security;
alter table tags               enable row level security;
alter table tool_categories    enable row level security;
alter table tool_tags          enable row level security;
alter table tool_alternatives  enable row level security;
alter table reviews            enable row level security;
alter table review_votes       enable row level security;
alter table questions          enable row level security;
alter table question_votes     enable row level security;
alter table answers            enable row level security;
alter table answer_votes       enable row level security;
alter table discussions        enable row level security;
alter table discussion_replies enable row level security;
alter table user_saved_tools   enable row level security;
alter table tool_comparisons   enable row level security;
alter table workflows          enable row level security;
alter table workflow_votes     enable row level security;
alter table reputation_logs    enable row level security;
alter table user_badges        enable row level security;
alter table search_logs        enable row level security;
alter table click_logs         enable row level security;
alter table page_views         enable row level security;

-- Public read
create policy "public read tools"        on tools              for select using (is_published = true);
create policy "public read categories"   on categories         for select using (true);
create policy "public read tags"         on tags               for select using (true);
create policy "public read tool_cats"    on tool_categories    for select using (true);
create policy "public read tool_tags"    on tool_tags          for select using (true);
create policy "public read alternatives" on tool_alternatives  for select using (true);
create policy "public read reviews"      on reviews            for select using (true);
create policy "public read questions"    on questions          for select using (true);
create policy "public read answers"      on answers            for select using (true);
create policy "public read discussions"  on discussions        for select using (true);
create policy "public read replies"      on discussion_replies for select using (true);
create policy "public read profiles"     on profiles           for select using (true);
create policy "public read comparisons"  on tool_comparisons   for select using (true);
create policy "public read workflows"    on workflows          for select using (is_published = true);
create policy "public read badges"       on user_badges        for select using (true);

-- Authenticated write
create policy "auth write reviews"     on reviews            for insert with check (auth.uid() = user_id);
create policy "auth update reviews"    on reviews            for update using (auth.uid() = user_id);
create policy "auth delete reviews"    on reviews            for delete using (auth.uid() = user_id);

create policy "auth write questions"   on questions          for insert with check (auth.uid() = user_id);
create policy "auth update questions"  on questions          for update using (auth.uid() = user_id);
create policy "auth delete questions"  on questions          for delete using (auth.uid() = user_id);

create policy "auth write answers"     on answers            for insert with check (auth.uid() = user_id);
create policy "auth update answers"    on answers            for update using (auth.uid() = user_id);
create policy "auth delete answers"    on answers            for delete using (auth.uid() = user_id);

create policy "auth write discussions" on discussions        for insert with check (auth.uid() = user_id);
create policy "auth update discussions" on discussions       for update using (auth.uid() = user_id);
create policy "auth delete discussions" on discussions       for delete using (auth.uid() = user_id);

create policy "auth write replies"     on discussion_replies for insert with check (auth.uid() = user_id);
create policy "auth update replies"    on discussion_replies for update using (auth.uid() = user_id);
create policy "auth delete replies"    on discussion_replies for delete using (auth.uid() = user_id);

create policy "auth manage saved"      on user_saved_tools   for all    using (auth.uid() = user_id);
create policy "auth write comparisons" on tool_comparisons   for insert with check (true);
create policy "auth write workflows"   on workflows          for insert with check (auth.uid() = user_id or user_id is null);

create policy "auth review_votes"      on review_votes       for all using (auth.uid() = user_id);
create policy "auth answer_votes"      on answer_votes       for all using (auth.uid() = user_id);
create policy "auth question_votes"    on question_votes     for all using (auth.uid() = user_id);
create policy "auth workflow_votes"    on workflow_votes     for all using (auth.uid() = user_id);

create policy "users update profile"   on profiles           for update using (auth.uid() = id);
create policy "users read reputation"  on reputation_logs    for select using (auth.uid() = user_id);

-- Analytics (insert-only, no auth required)
create policy "insert search_logs" on search_logs for insert with check (true);
create policy "insert click_logs"  on click_logs  for insert with check (true);
create policy "insert page_views"  on page_views  for insert with check (true);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Recalculate tool avg_rating + review_count on review change
create or replace function sync_tool_rating()
returns trigger language plpgsql as $$
declare v_tool_id uuid;
begin
  v_tool_id := coalesce(new.tool_id, old.tool_id);
  update tools set
    avg_rating   = (select coalesce(round(avg(rating)::numeric, 2), 0) from reviews where tool_id = v_tool_id),
    review_count = (select count(*) from reviews where tool_id = v_tool_id),
    updated_at   = now()
  where id = v_tool_id;
  return coalesce(new, old);
end;
$$;

create trigger trg_sync_tool_rating
  after insert or update or delete on reviews
  for each row execute function sync_tool_rating();

-- Sync profile review_count
create or replace function sync_profile_review_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update profiles set review_count = review_count + 1 where id = new.user_id;
  elsif tg_op = 'DELETE' then
    update profiles set review_count = greatest(review_count - 1, 0) where id = old.user_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_sync_profile_reviews
  after insert or delete on reviews
  for each row execute function sync_profile_review_count();

-- Sync question answer_count + is_answered
create or replace function sync_question_answers()
returns trigger language plpgsql as $$
declare v_qid uuid;
begin
  v_qid := coalesce(new.question_id, old.question_id);
  update questions set
    answer_count = (select count(*) from answers where question_id = v_qid),
    is_answered  = (select exists(select 1 from answers where question_id = v_qid and is_accepted = true)),
    updated_at   = now()
  where id = v_qid;
  return coalesce(new, old);
end;
$$;

create trigger trg_sync_question_answers
  after insert or delete on answers
  for each row execute function sync_question_answers();

-- Auto updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_tools_updated        before update on tools             for each row execute function set_updated_at();
create trigger trg_reviews_updated      before update on reviews           for each row execute function set_updated_at();
create trigger trg_questions_updated    before update on questions         for each row execute function set_updated_at();
create trigger trg_answers_updated      before update on answers           for each row execute function set_updated_at();
create trigger trg_discussions_updated  before update on discussions       for each row execute function set_updated_at();
create trigger trg_profiles_updated     before update on profiles          for each row execute function set_updated_at();
create trigger trg_workflows_updated    before update on workflows         for each row execute function set_updated_at();

-- ============================================================
-- SEED: CATEGORIES (15 core categories)
-- ============================================================

insert into categories (name, slug, description, icon, sort_order) values
  ('Writing & Content',    'writing-content',    'AI tools for writing, copywriting, and content creation', '✍️',  1),
  ('Image Generation',     'image-generation',   'Generate and edit images with AI',                        '🎨',  2),
  ('Video & Audio',        'video-audio',        'AI-powered video editing and audio tools',                '🎬',  3),
  ('Code & Development',   'code-development',   'AI coding assistants and developer tools',                '💻',  4),
  ('Productivity',         'productivity',       'Automate tasks and boost your workflow',                  '⚡',  5),
  ('Marketing & SEO',      'marketing-seo',      'AI tools for marketing, ads, and SEO',                    '📈',  6),
  ('Data & Analytics',     'data-analytics',     'Analyze data and generate insights with AI',              '📊',  7),
  ('Customer Support',     'customer-support',   'Chatbots and AI support automation',                      '💬',  8),
  ('Research & Education', 'research-education', 'AI tools for research, learning, and summarization',      '🔬',  9),
  ('Design & UI',          'design-ui',          'AI-powered design and UI generation tools',               '🎭', 10),
  ('Voice & Speech',       'voice-speech',       'Text-to-speech, transcription, and voice cloning',        '🎙️', 11),
  ('Automation & Agents',  'automation-agents',  'AI agents, workflows, and no-code automation',            '🤖', 12),
  ('Business & Finance',   'business-finance',   'AI for business intelligence and financial analysis',     '💼', 13),
  ('Security & Privacy',   'security-privacy',   'AI-powered security and privacy tools',                   '🔒', 14),
  ('Healthcare',           'healthcare',         'AI tools for health, wellness, and medical research',     '🏥', 15);
