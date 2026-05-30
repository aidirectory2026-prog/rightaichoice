-- 127_new_categories.sql
-- Phase 9 (Automations & Catalog) — D1. Add 3 categories for the mainstream
-- clusters the catalog was missing (dev infra/hosting, PM/collaboration, BI).
-- Categories are 100% DB-driven (no code enum); the classifier (predictCategories
-- / lib/cron/curate.ts) reads all category slugs at runtime, so new tools can be
-- assigned to these immediately. They stay HIDDEN from the public /categories
-- listing until they contain ≥1 published tool (zero-count guard in the page),
-- so no empty thin pages surface before the P0 tools (D2) land.

insert into public.categories (name, slug, description, icon, sort_order) values
  ('Developer Infrastructure', 'developer-infrastructure',
   'Hosting, deployment, DevOps, databases, observability, and edge platforms with built-in AI features.',
   '⚙️', 16),
  ('Project Management', 'project-management',
   'Project, issue, and work-management tools with AI planning, triage, and reporting.',
   '📋', 17),
  ('Business Intelligence', 'business-intelligence',
   'Analytics, dashboards, and BI platforms with AI-driven insights and natural-language querying.',
   '🧮', 18)
on conflict (slug) do nothing;
