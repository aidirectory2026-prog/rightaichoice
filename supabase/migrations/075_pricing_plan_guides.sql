-- 075_pricing_plan_guides.sql
-- Phase 3 / Phase 4 SOP — adds the structured "Plans compared" surface.
--
-- Existing tools.pricing_details holds the raw [{plan, price, features}]
-- shape from earlier curation. We deliberately keep that untouched
-- (fabrication risk on prices is too high) and add a new sibling column
-- that DeepSeek populates per SOP run:
--
--   tools.pricing_plan_guides jsonb
--     [{ plan_name, ideal_for, key_difference }]
--
-- Components join the two arrays by plan_name when rendering the
-- Plans-compared section. Tools whose pricing_details is empty
-- (free-only or contact-sales tools) get an empty pricing_plan_guides.

ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS pricing_plan_guides jsonb;

COMMENT ON COLUMN tools.pricing_plan_guides IS
  'Phase 4 SOP: per-tier guidance — [{plan_name, ideal_for, key_difference}]. plan_name matches a plan in pricing_details so components can join the two for a unified Plans-compared section. ideal_for = which persona/stage this tier fits. key_difference = what this tier adds vs the previous tier.';
