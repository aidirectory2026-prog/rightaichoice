-- ============================================================
-- 1.1 freshness-cascade — foundation tables, functions, triggers
--
-- Spec: RAC_complete_automations/01-catalog/1.1-freshness-cascade/SPEC.md
-- Locked decisions: 2026-05-23
--
-- Two tables:
--   pages_freshness     — one row per public URL; the SoT for "when did
--                         this page last meaningfully change"
--   page_tool_mentions  — bridge: which tool slugs are mentioned on which
--                         pages (db_join | code_config | blog_frontmatter)
--
-- Three trigger paths feed pages_freshness:
--   A) tools.UPDATE OF <whitelisted user-visible columns>
--   B) tool_comparisons.UPDATE OF <editorial columns + last_reviewed_at>
--   C) Vercel cron `cascade-hubs` (safety re-sweep + revalidate + IndexNow)
--   D) Admin "Bump freshness" panel (direct INSERT/UPDATE with reason)
--
-- A and B are wired in this migration. C and D are app-layer.
--
-- Triggers are exception-safe: any error inside propagate_freshness() is
-- swallowed so the UPDATE on tools/comparisons always succeeds. The
-- next cron sweep (path C) catches what triggers missed.
--
-- Backfill is run separately (scripts/backfill-pages-freshness.ts) with
-- ON CONFLICT (page_path) DO NOTHING — so any rows that triggers have
-- already populated stay untouched.
-- ============================================================

-- ------------------------------------------------------------
-- pages_freshness — one row per public URL
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pages_freshness (
  page_path           TEXT        PRIMARY KEY,
  page_type           TEXT        NOT NULL,
  last_changed_at     TIMESTAMPTZ NOT NULL,
  change_source       TEXT        NOT NULL,
  change_reason       TEXT,
  source_tool_slug    TEXT,
  source_event        TEXT,
  last_revalidated_at TIMESTAMPTZ,
  last_indexnow_at    TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  pages_freshness IS '1.1 freshness-cascade — single source of truth for per-URL last-changed timestamps. Read by sitemaps, JSON-LD dateModified, ISR cron, IndexNow.';
COMMENT ON COLUMN pages_freshness.page_path           IS 'Canonical path (e.g. /tools/cursor, /compare/cursor-vs-copilot)';
COMMENT ON COLUMN pages_freshness.page_type           IS 'tool | compare | best | category | role | stack | blog';
COMMENT ON COLUMN pages_freshness.change_source       IS 'tool_update | compare_update | admin_manual | cron_sweep | backfill';
COMMENT ON COLUMN pages_freshness.change_reason       IS 'Free text; required when change_source=admin_manual';
COMMENT ON COLUMN pages_freshness.source_tool_slug    IS 'Tool slug that triggered the bump (NULL for non-tool sources)';
COMMENT ON COLUMN pages_freshness.source_event        IS 'Field name that fired the trigger (e.g. pricing_details, description)';
COMMENT ON COLUMN pages_freshness.last_revalidated_at IS 'Last time cascade-hubs called revalidatePath for this URL';
COMMENT ON COLUMN pages_freshness.last_indexnow_at    IS 'Last IndexNow push for this URL';

CREATE INDEX IF NOT EXISTS idx_pages_freshness_changed_at
  ON pages_freshness (last_changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_pages_freshness_source_tool
  ON pages_freshness (source_tool_slug);

CREATE INDEX IF NOT EXISTS idx_pages_freshness_type_changed
  ON pages_freshness (page_type, last_changed_at DESC);

-- "Needs ISR" set — read by the cascade-hubs cron each hour
CREATE INDEX IF NOT EXISTS idx_pages_freshness_unrevalidated
  ON pages_freshness (last_changed_at)
  WHERE last_revalidated_at IS NULL OR last_revalidated_at < last_changed_at;

-- ------------------------------------------------------------
-- page_tool_mentions — bridge table (real, not a view)
-- Populated by: DB joins, code-config sync, blog-frontmatter sync
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS page_tool_mentions (
  page_path      TEXT NOT NULL,
  page_type      TEXT NOT NULL,
  tool_slug      TEXT NOT NULL REFERENCES tools(slug) ON DELETE CASCADE,
  mention_source TEXT NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (page_path, tool_slug)
);

COMMENT ON TABLE  page_tool_mentions IS '1.1 bridge — every (page_path, tool_slug) pair where the page meaningfully mentions the tool. Refreshed by sync_page_tool_mentions_db() and scripts/sync-page-mentions-from-{code,blog}.ts.';
COMMENT ON COLUMN page_tool_mentions.mention_source IS 'db_join | code_config | blog_frontmatter';

CREATE INDEX IF NOT EXISTS idx_ptm_tool
  ON page_tool_mentions (tool_slug);

CREATE INDEX IF NOT EXISTS idx_ptm_type
  ON page_tool_mentions (page_type);

-- ------------------------------------------------------------
-- propagate_freshness(p_tool_slug, p_source, p_event, p_reason)
-- Called by tools/comparisons triggers AND by the admin bump endpoint.
-- Reads page_tool_mentions, upserts pages_freshness for every match.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION propagate_freshness(
  p_tool_slug TEXT,
  p_source    TEXT,
  p_event     TEXT DEFAULT NULL,
  p_reason    TEXT DEFAULT NULL
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
BEGIN
  -- Upsert one row per mentioning page. Existing rows are bumped to NOW().
  INSERT INTO pages_freshness AS pf (
    page_path, page_type, last_changed_at,
    change_source, change_reason, source_tool_slug, source_event, updated_at
  )
  SELECT
    ptm.page_path,
    ptm.page_type,
    NOW(),
    p_source,
    p_reason,
    p_tool_slug,
    p_event,
    NOW()
  FROM page_tool_mentions ptm
  WHERE ptm.tool_slug = p_tool_slug
  ON CONFLICT (page_path) DO UPDATE SET
    last_changed_at  = NOW(),
    change_source    = EXCLUDED.change_source,
    change_reason    = EXCLUDED.change_reason,
    source_tool_slug = EXCLUDED.source_tool_slug,
    source_event     = EXCLUDED.source_event,
    updated_at       = NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;

EXCEPTION WHEN OTHERS THEN
  -- Never block the underlying UPDATE.
  RAISE WARNING 'propagate_freshness(% , %) failed: %', p_tool_slug, p_source, SQLERRM;
  RETURN 0;
END;
$$;

COMMENT ON FUNCTION propagate_freshness(TEXT, TEXT, TEXT, TEXT)
  IS '1.1 freshness-cascade — bumps pages_freshness for every page mentioning the given tool. Exception-safe; never blocks the calling UPDATE.';

-- ------------------------------------------------------------
-- tools UPDATE trigger — fires only on user-visible columns
-- (locked decision #1; column list per SPEC §4)
--
-- Note: we use a single trigger with a WHEN clause that checks each
-- whitelisted column for an OLD/NEW change. Internal counters
-- (view_count, click_count, last_*_at meta) are NOT in the list,
-- so they never fire — preventing trigger recursion via updated_at.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_tools_propagate_freshness()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event TEXT;
BEGIN
  -- Build a coarse event label naming the first column that differs.
  -- (Cheap diagnostic — not exhaustive. Pages still get the bump regardless.)
  IF NEW.name              IS DISTINCT FROM OLD.name              THEN v_event := 'name';
  ELSIF NEW.tagline        IS DISTINCT FROM OLD.tagline           THEN v_event := 'tagline';
  ELSIF NEW.description    IS DISTINCT FROM OLD.description       THEN v_event := 'description';
  ELSIF NEW.our_views      IS DISTINCT FROM OLD.our_views         THEN v_event := 'our_views';
  ELSIF NEW.editorial_verdict IS DISTINCT FROM OLD.editorial_verdict THEN v_event := 'editorial_verdict';
  ELSIF NEW.pricing_type   IS DISTINCT FROM OLD.pricing_type      THEN v_event := 'pricing_type';
  ELSIF NEW.pricing_details IS DISTINCT FROM OLD.pricing_details  THEN v_event := 'pricing_details';
  ELSIF NEW.pricing_plan_guides IS DISTINCT FROM OLD.pricing_plan_guides THEN v_event := 'pricing_plan_guides';
  ELSIF NEW.features       IS DISTINCT FROM OLD.features          THEN v_event := 'features';
  ELSIF NEW.integrations   IS DISTINCT FROM OLD.integrations      THEN v_event := 'integrations';
  ELSIF NEW.best_for       IS DISTINCT FROM OLD.best_for          THEN v_event := 'best_for';
  ELSIF NEW.not_for        IS DISTINCT FROM OLD.not_for           THEN v_event := 'not_for';
  ELSIF NEW.viability_score IS DISTINCT FROM OLD.viability_score  THEN v_event := 'viability_score';
  ELSIF NEW.viability_signals IS DISTINCT FROM OLD.viability_signals THEN v_event := 'viability_signals';
  ELSIF NEW.latest_updates IS DISTINCT FROM OLD.latest_updates    THEN v_event := 'latest_updates';
  ELSIF NEW.faqs_long_tail IS DISTINCT FROM OLD.faqs_long_tail    THEN v_event := 'faqs_long_tail';
  ELSIF NEW.logo_url       IS DISTINCT FROM OLD.logo_url          THEN v_event := 'logo_url';
  ELSIF NEW.website_url    IS DISTINCT FROM OLD.website_url       THEN v_event := 'website_url';
  ELSIF NEW.github_url     IS DISTINCT FROM OLD.github_url        THEN v_event := 'github_url';
  ELSIF NEW.docs_url       IS DISTINCT FROM OLD.docs_url          THEN v_event := 'docs_url';
  ELSIF NEW.changelog_url  IS DISTINCT FROM OLD.changelog_url     THEN v_event := 'changelog_url';
  ELSIF NEW.blog_url       IS DISTINCT FROM OLD.blog_url          THEN v_event := 'blog_url';
  ELSIF NEW.hidden_costs   IS DISTINCT FROM OLD.hidden_costs      THEN v_event := 'hidden_costs';
  ELSIF NEW.migration_in   IS DISTINCT FROM OLD.migration_in      THEN v_event := 'migration_in';
  ELSIF NEW.migration_out  IS DISTINCT FROM OLD.migration_out     THEN v_event := 'migration_out';
  ELSIF NEW.setup_time_text IS DISTINCT FROM OLD.setup_time_text  THEN v_event := 'setup_time_text';
  ELSIF NEW.recent_changes IS DISTINCT FROM OLD.recent_changes    THEN v_event := 'recent_changes';
  ELSIF NEW.skip_if        IS DISTINCT FROM OLD.skip_if           THEN v_event := 'skip_if';
  ELSIF NEW.pricing_power_text IS DISTINCT FROM OLD.pricing_power_text THEN v_event := 'pricing_power_text';
  ELSIF NEW.workflow_scenarios IS DISTINCT FROM OLD.workflow_scenarios THEN v_event := 'workflow_scenarios';
  ELSIF NEW.tutorial_videos IS DISTINCT FROM OLD.tutorial_videos  THEN v_event := 'tutorial_videos';
  ELSIF NEW.tutorial_urls  IS DISTINCT FROM OLD.tutorial_urls     THEN v_event := 'tutorial_urls';
  ELSIF NEW.use_cases      IS DISTINCT FROM OLD.use_cases         THEN v_event := 'use_cases';
  ELSIF NEW.limitations    IS DISTINCT FROM OLD.limitations       THEN v_event := 'limitations';
  ELSIF NEW.models         IS DISTINCT FROM OLD.models            THEN v_event := 'models';
  ELSIF NEW.community_links IS DISTINCT FROM OLD.community_links  THEN v_event := 'community_links';
  ELSIF NEW.seo_keywords   IS DISTINCT FROM OLD.seo_keywords      THEN v_event := 'seo_keywords';
  ELSIF NEW.platforms      IS DISTINCT FROM OLD.platforms         THEN v_event := 'platforms';
  ELSIF NEW.has_api        IS DISTINCT FROM OLD.has_api           THEN v_event := 'has_api';
  ELSIF NEW.skill_level    IS DISTINCT FROM OLD.skill_level       THEN v_event := 'skill_level';
  ELSE
    -- No user-visible column changed — bail out without cascading.
    RETURN NEW;
  END IF;

  PERFORM propagate_freshness(NEW.slug, 'tool_update', v_event, NULL);
  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_tools_propagate_freshness for slug=% failed: %', NEW.slug, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tools_freshness_cascade ON tools;
CREATE TRIGGER trg_tools_freshness_cascade
  AFTER UPDATE ON tools
  FOR EACH ROW
  WHEN (OLD.slug IS NOT DISTINCT FROM NEW.slug)
  EXECUTE FUNCTION trg_tools_propagate_freshness();

-- (Slug renames are rare and trigger an explicit redirect path; we skip
-- the cascade in that case to avoid orphan rows pointing at the old slug.)

-- ------------------------------------------------------------
-- tool_comparisons UPDATE trigger — fires when editorial content changes
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_comparisons_propagate_freshness()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event TEXT;
BEGIN
  IF NEW.tldr             IS DISTINCT FROM OLD.tldr             THEN v_event := 'tldr';
  ELSIF NEW.verdict       IS DISTINCT FROM OLD.verdict          THEN v_event := 'verdict';
  ELSIF NEW.feature_analysis IS DISTINCT FROM OLD.feature_analysis THEN v_event := 'feature_analysis';
  ELSIF NEW.pricing_analysis IS DISTINCT FROM OLD.pricing_analysis THEN v_event := 'pricing_analysis';
  ELSIF NEW.use_cases     IS DISTINCT FROM OLD.use_cases        THEN v_event := 'use_cases';
  ELSIF NEW.benchmarks    IS DISTINCT FROM OLD.benchmarks       THEN v_event := 'benchmarks';
  ELSIF NEW.faqs          IS DISTINCT FROM OLD.faqs             THEN v_event := 'faqs';
  ELSIF NEW.last_reviewed_at IS DISTINCT FROM OLD.last_reviewed_at THEN v_event := 'last_reviewed_at';
  ELSE
    RETURN NEW;
  END IF;

  -- Upsert a single row keyed by /compare/<slug>.
  INSERT INTO pages_freshness AS pf (
    page_path, page_type, last_changed_at,
    change_source, source_event, updated_at
  ) VALUES (
    '/compare/' || NEW.slug,
    'compare',
    NOW(),
    'compare_update',
    v_event,
    NOW()
  )
  ON CONFLICT (page_path) DO UPDATE SET
    last_changed_at  = NOW(),
    change_source    = EXCLUDED.change_source,
    source_event     = EXCLUDED.source_event,
    updated_at       = NOW();

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg_comparisons_propagate_freshness for slug=% failed: %', NEW.slug, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comparisons_freshness_cascade ON tool_comparisons;
CREATE TRIGGER trg_comparisons_freshness_cascade
  AFTER UPDATE ON tool_comparisons
  FOR EACH ROW
  WHEN (OLD.slug IS NOT DISTINCT FROM NEW.slug)
  EXECUTE FUNCTION trg_comparisons_propagate_freshness();

-- ------------------------------------------------------------
-- sync_page_tool_mentions_db() — refreshes the db_join rows in
-- page_tool_mentions from canonical relationships in the schema:
--
--   • /tools/<slug>            ← every published tool
--   • /categories/<slug>       ← every tool in that category (via tool_categories)
--   • /compare/<slug>          ← every tool in tool_comparisons.tool_ids
--
-- best-of / role / stack mentions come from code configs and are
-- written by scripts/sync-page-mentions-from-code.ts. Blog mentions
-- come from MDX frontmatter via scripts/sync-page-mentions-from-blog.ts.
--
-- This function is idempotent — safe to call from pg_cron + on-demand.
-- It only touches rows where mention_source='db_join'.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_page_tool_mentions_db()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted INT := 0;
  v_deleted  INT := 0;
BEGIN
  -- Compute the desired db_join set in a CTE, then sync via diff.
  WITH desired AS (
    -- Tool pages
    SELECT
      '/tools/' || t.slug AS page_path,
      'tool'::TEXT         AS page_type,
      t.slug               AS tool_slug
    FROM tools t
    WHERE t.is_published = true

    UNION

    -- Category hub pages
    SELECT
      '/categories/' || c.slug AS page_path,
      'category'::TEXT          AS page_type,
      t.slug                    AS tool_slug
    FROM tool_categories tc
    JOIN tools      t ON t.id = tc.tool_id      AND t.is_published = true
    JOIN categories c ON c.id = tc.category_id

    UNION

    -- Compare pages — tool_comparisons.tool_ids is uuid[]; unnest then resolve to slug
    SELECT
      '/compare/' || tcomp.slug AS page_path,
      'compare'::TEXT            AS page_type,
      t.slug                     AS tool_slug
    FROM tool_comparisons tcomp
    CROSS JOIN LATERAL UNNEST(tcomp.tool_ids) AS tid
    JOIN tools t ON t.id = tid AND t.is_published = true
  ),
  ins AS (
    INSERT INTO page_tool_mentions (page_path, page_type, tool_slug, mention_source, updated_at)
    SELECT d.page_path, d.page_type, d.tool_slug, 'db_join', NOW()
    FROM desired d
    ON CONFLICT (page_path, tool_slug) DO UPDATE
      SET page_type      = EXCLUDED.page_type,
          mention_source = 'db_join',
          updated_at     = NOW()
    RETURNING 1
  ),
  del AS (
    DELETE FROM page_tool_mentions ptm
    WHERE ptm.mention_source = 'db_join'
      AND NOT EXISTS (
        SELECT 1 FROM desired d
        WHERE d.page_path = ptm.page_path
          AND d.tool_slug = ptm.tool_slug
      )
    RETURNING 1
  )
  SELECT
    (SELECT COUNT(*) FROM ins),
    (SELECT COUNT(*) FROM del)
  INTO v_inserted, v_deleted;

  RAISE NOTICE 'sync_page_tool_mentions_db: upserted=%, deleted=%', v_inserted, v_deleted;
  RETURN v_inserted;
END;
$$;

COMMENT ON FUNCTION sync_page_tool_mentions_db()
  IS '1.1 freshness-cascade — rebuilds the db_join slice of page_tool_mentions from tools, tool_categories, tool_comparisons. Idempotent. Best-of/role/stack/blog mentions are written by sync scripts, not this function.';

-- ------------------------------------------------------------
-- RLS — pages_freshness and page_tool_mentions are server-side only.
-- Reads happen via server components / API routes using the service role.
-- ------------------------------------------------------------
ALTER TABLE pages_freshness     ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_tool_mentions  ENABLE ROW LEVEL SECURITY;

-- No policies = no anon/authenticated access. Service role bypasses RLS.
