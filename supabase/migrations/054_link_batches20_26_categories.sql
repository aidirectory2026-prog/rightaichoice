-- ============================================================
-- 054 — Link batches 20-26 tools to their categories
-- ============================================================
-- Audit (2026-04-28) found 175 tools seeded in batches 20-26
-- (migrations 042-050) had no rows in tool_categories, so they
-- never appeared on /categories/[slug] pages or in the
-- "related tools" sidebar (lib/data/tools.ts:25-30, 247-251).
--
-- This migration adds the missing junction rows. Categories
-- chosen by hand from each tool's tagline + first description
-- paragraph. Most tools get one category; some get two when
-- they span domains (e.g. webinar tools = marketing-seo + video-audio).
--
-- Idempotent — primary key (tool_id, category_id) makes
-- ON CONFLICT DO NOTHING re-runs free.
-- ============================================================

-- automation-agents (15 tools)
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'exa' AND c.slug = 'automation-agents' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'firecrawl' AND c.slug = 'automation-agents' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'pabbly-connect' AND c.slug = 'automation-agents' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'albato' AND c.slug = 'automation-agents' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'integrately' AND c.slug = 'automation-agents' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = '11x-ai' AND c.slug = 'automation-agents' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'lindy-ai' AND c.slug = 'automation-agents' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'multion' AND c.slug = 'automation-agents' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'ema' AND c.slug = 'automation-agents' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'cassidy-ai' AND c.slug = 'automation-agents' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'stack-ai' AND c.slug = 'automation-agents' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'decagon' AND c.slug = 'automation-agents' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'sierra' AND c.slug = 'automation-agents' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'moveworks' AND c.slug = 'automation-agents' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'genspark-ai' AND c.slug = 'automation-agents' ON CONFLICT (tool_id, category_id) DO NOTHING;

-- business-finance (28 tools)
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'avoma' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'reply-io' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'pipedrive' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'manatal' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'workable' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'recruitee' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'hunter-io' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'snov-io' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'freshbooks' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'wave' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'xero' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'quickbooks' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'expensify' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'deel' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'rippling' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'lattice' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'bamboohr' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'gusto' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'cresta' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'nooks' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'sybill-ai' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = '11x-ai' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'second-nature-ai' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'robin-ai' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'evenup' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'alexi' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'lexis-ai' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'briefcatch' AND c.slug = 'business-finance' ON CONFLICT (tool_id, category_id) DO NOTHING;

-- code-development (10 tools)
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'cartesia' AND c.slug = 'code-development' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'lobehub' AND c.slug = 'code-development' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'exa' AND c.slug = 'code-development' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'firecrawl' AND c.slug = 'code-development' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'magic-dev' AND c.slug = 'code-development' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'windsurf-editor' AND c.slug = 'code-development' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'greptile' AND c.slug = 'code-development' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'qodo-ai' AND c.slug = 'code-development' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'ellipsis-ai' AND c.slug = 'code-development' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'subframe-ai' AND c.slug = 'code-development' ON CONFLICT (tool_id, category_id) DO NOTHING;

-- customer-support (11 tools)
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'reamaze' AND c.slug = 'customer-support' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'liveagent' AND c.slug = 'customer-support' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'tawk-to' AND c.slug = 'customer-support' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'document360' AND c.slug = 'customer-support' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'stonly' AND c.slug = 'customer-support' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'cresta' AND c.slug = 'customer-support' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'decagon' AND c.slug = 'customer-support' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'sierra' AND c.slug = 'customer-support' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'moveworks' AND c.slug = 'customer-support' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'cognigy' AND c.slug = 'customer-support' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'ada' AND c.slug = 'customer-support' ON CONFLICT (tool_id, category_id) DO NOTHING;

-- data-analytics (10 tools)
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'posthog' AND c.slug = 'data-analytics' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'plausible' AND c.slug = 'data-analytics' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'mixpanel' AND c.slug = 'data-analytics' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'hotjar' AND c.slug = 'data-analytics' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'customers-ai' AND c.slug = 'data-analytics' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'userpilot' AND c.slug = 'data-analytics' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'pendo' AND c.slug = 'data-analytics' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'userflow' AND c.slug = 'data-analytics' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'fullstory' AND c.slug = 'data-analytics' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'maze' AND c.slug = 'data-analytics' ON CONFLICT (tool_id, category_id) DO NOTHING;

-- design-ui (16 tools)
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'recraft' AND c.slug = 'design-ui' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'leadpages' AND c.slug = 'design-ui' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'instapage' AND c.slug = 'design-ui' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'carrd' AND c.slug = 'design-ui' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'hostinger' AND c.slug = 'design-ui' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'wix' AND c.slug = 'design-ui' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'squarespace' AND c.slug = 'design-ui' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'mixo' AND c.slug = 'design-ui' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'envato' AND c.slug = 'design-ui' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'decktopus' AND c.slug = 'design-ui' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'maze' AND c.slug = 'design-ui' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'khroma-ai' AND c.slug = 'design-ui' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'relume-ai' AND c.slug = 'design-ui' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'magician-ai' AND c.slug = 'design-ui' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'galileo-ai-design' AND c.slug = 'design-ui' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'subframe-ai' AND c.slug = 'design-ui' ON CONFLICT (tool_id, category_id) DO NOTHING;

-- healthcare (6 tools)
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'heidi-health' AND c.slug = 'healthcare' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'freed-ai' AND c.slug = 'healthcare' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'augmedix' AND c.slug = 'healthcare' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'corti' AND c.slug = 'healthcare' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'deepscribe' AND c.slug = 'healthcare' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'saner-ai' AND c.slug = 'healthcare' ON CONFLICT (tool_id, category_id) DO NOTHING;

-- image-generation (7 tools)
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'magnific-ai' AND c.slug = 'image-generation' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'recraft' AND c.slug = 'image-generation' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'pixelcut' AND c.slug = 'image-generation' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'remini' AND c.slug = 'image-generation' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'headshotpro' AND c.slug = 'image-generation' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'photoai' AND c.slug = 'image-generation' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'tryitonai' AND c.slug = 'image-generation' ON CONFLICT (tool_id, category_id) DO NOTHING;

-- marketing-seo (35 tools)
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'surfer-seo' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'neuronwriter' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'tavus' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'vidyard' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'wistia' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'kit' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'mailerlite' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'getresponse' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'reply-io' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'kajabi' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'leadpages' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'instapage' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'systeme-io' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'demio' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'livestorm' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'webinarjam' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'restream' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'ewebinar' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'hunter-io' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'zerobounce' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'neverbounce' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'snov-io' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'mangools' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'sitebulb' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'moz-pro' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'refersion' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'tapfiliate' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'rewardful' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'leaddyno' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'klaviyo' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'madgicx' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'customers-ai' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'smartly-io' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'postscript' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'userpilot' AND c.slug = 'marketing-seo' ON CONFLICT (tool_id, category_id) DO NOTHING;

-- productivity (37 tools)
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'lex' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'avoma' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'circleback' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'tana' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'reflect' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'heptabase' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'humata-ai' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'chatpdf' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'you-com' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'kagi' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'glasp' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'circle-so' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'calendly' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'cal-com' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'typeform' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'tally-so' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'hostinger' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'bluehost' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'namecheap' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'kinsta' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'cloudways' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'wrike' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'decktopus' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'smallpdf' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'ilovepdf' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'pdf-ai' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'sunsama' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'akiflow' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'vimcal' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'read-ai' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'genspark-ai' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'felo-ai' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'granola-ai' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'bluedot-ai' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'rewind-ai' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'voicenotes-ai' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'saner-ai' AND c.slug = 'productivity' ON CONFLICT (tool_id, category_id) DO NOTHING;

-- research-education (13 tools)
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'paperpal' AND c.slug = 'research-education' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'humata-ai' AND c.slug = 'research-education' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'you-com' AND c.slug = 'research-education' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'glasp' AND c.slug = 'research-education' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'teachable' AND c.slug = 'research-education' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'thinkific' AND c.slug = 'research-education' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'kajabi' AND c.slug = 'research-education' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'skool' AND c.slug = 'research-education' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'circle-so' AND c.slug = 'research-education' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'felo-ai' AND c.slug = 'research-education' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'consensus-app' AND c.slug = 'research-education' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'elicit-com' AND c.slug = 'research-education' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'undermind-ai' AND c.slug = 'research-education' ON CONFLICT (tool_id, category_id) DO NOTHING;

-- video-audio (21 tools)
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'submagic' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'klap' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'tavus' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'vidyard' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'wistia' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'demio' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'livestorm' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'restream' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'envato' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'storyblocks' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'epidemic-sound' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'mubert' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'loudly' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'beatoven' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'rask-ai' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'squadcast' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'hailuo-ai' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'vidu-ai' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'hedra-ai' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'argil-ai' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'mureka' AND c.slug = 'video-audio' ON CONFLICT (tool_id, category_id) DO NOTHING;

-- voice-speech (3 tools)
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'cartesia' AND c.slug = 'voice-speech' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'rask-ai' AND c.slug = 'voice-speech' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'voicenotes-ai' AND c.slug = 'voice-speech' ON CONFLICT (tool_id, category_id) DO NOTHING;

-- writing-content (6 tools)
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'surfer-seo' AND c.slug = 'writing-content' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'neuronwriter' AND c.slug = 'writing-content' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'paperpal' AND c.slug = 'writing-content' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'rytr' AND c.slug = 'writing-content' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'lex' AND c.slug = 'writing-content' ON CONFLICT (tool_id, category_id) DO NOTHING;
INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'briefcatch' AND c.slug = 'writing-content' ON CONFLICT (tool_id, category_id) DO NOTHING;

-- Verification queries (run separately, not part of migration):
--   -- tools from batches 20-26 with no category linkage
--   SELECT t.slug FROM tools t LEFT JOIN tool_categories tc ON tc.tool_id = t.id
--   WHERE tc.tool_id IS NULL AND t.slug IN ('surfer-seo','neuronwriter','paperpal',...);
--
--   -- category distribution
--   SELECT c.slug, COUNT(*) FROM tool_categories tc JOIN categories c ON c.id=tc.category_id
--   GROUP BY c.slug ORDER BY count DESC;
