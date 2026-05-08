-- Phase 5.4 (2026-05-08): full-text search infrastructure for /search.
--
-- Approach: regular tsvector column + BEFORE INSERT/UPDATE trigger to keep
-- it in sync with name/tagline/description/features. Generated columns
-- can't use to_tsvector here because Postgres marks the expression as
-- non-immutable (regconfig defaults can shift). Trigger is the canonical
-- workaround per PG docs.
--
-- Weights: A (name) > B (tagline) > C (description) > D (features). A tool
-- whose name matches the query outranks one that just has the term in its
-- description.

ALTER TABLE tools
ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION tools_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.tagline, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.features, ' '), '')), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql IMMUTABLE;

DROP TRIGGER IF EXISTS tools_search_vector_trigger ON tools;
CREATE TRIGGER tools_search_vector_trigger
BEFORE INSERT OR UPDATE OF name, tagline, description, features
ON tools
FOR EACH ROW
EXECUTE FUNCTION tools_search_vector_update();

-- Backfill existing rows so the column is populated for every published tool.
-- The trigger only fires on new writes; this UPDATE forces the trigger on
-- everything currently in the table.
UPDATE tools SET name = name;

CREATE INDEX IF NOT EXISTS idx_tools_search_vector
ON tools
USING GIN (search_vector);

COMMENT ON INDEX idx_tools_search_vector IS
'Phase 5.4 GIN index on tsvector for /search route full-text queries.';
