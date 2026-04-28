-- ============================================================
-- 043 — Clean hijacked affiliate / tracker URLs from seeded tools
-- ============================================================
-- Audit (2026-04-28) found 15 tool rows seeded from batches 13-17
-- whose website_url carries third-party affiliate or UTM tracking
-- that we did not author. Two failure modes:
--
--   1. Futurepedia UTM/fpr tags  → outbound clicks credit Futurepedia,
--      not RightAIChoice. Attribution leak.
--   2. monica `?ref_aff=yzawntq` → someone else's personal affiliate
--      code; every click earns THEM, not us. Revenue leak.
--
-- This migration rewrites each contaminated website_url to the
-- canonical bare domain. Idempotent — re-running on already-clean
-- rows updates 0 rows because of the LIKE guards.
--
-- Affiliate metadata stays in RightAIChoice_Affiliate_Master.xlsx,
-- not in tools.website_url. The website_url column is the public
-- canonical link only.
-- ============================================================

UPDATE tools SET website_url = 'https://www.coursebox.ai/pricing', updated_at = now()
WHERE slug = 'ai-flashcard-maker-by-coursebox' AND website_url LIKE '%fpr=%';

UPDATE tools SET website_url = 'https://meshcapade.com', updated_at = now()
WHERE slug = 'meshcapade' AND website_url LIKE '%futurepedia%';

UPDATE tools SET website_url = 'https://janitorai.com', updated_at = now()
WHERE slug = 'janitorai' AND website_url LIKE '%futurepedia%';

UPDATE tools SET website_url = 'https://audiosocket.com', updated_at = now()
WHERE slug = 'audiosocket' AND website_url LIKE '%fpr=%';

UPDATE tools SET website_url = 'https://customgpt.ai', updated_at = now()
WHERE slug = 'customgpt-ai' AND website_url LIKE '%fpr=%';

UPDATE tools SET website_url = 'https://recruitcrm.io', updated_at = now()
WHERE slug = 'recruit-crm' AND website_url LIKE '%fpr=%';

UPDATE tools SET website_url = 'https://thunderbit.com', updated_at = now()
WHERE slug = 'thunderbit' AND website_url LIKE '%fpr=%';

UPDATE tools SET website_url = 'https://aicoursecreator.eskilled.io', updated_at = now()
WHERE slug = 'eskilled-ai-course-creator' AND website_url LIKE '%fpr=%';

UPDATE tools SET website_url = 'https://monica.im', updated_at = now()
WHERE slug = 'monica' AND website_url LIKE '%ref_aff=%';

UPDATE tools SET website_url = 'https://creatify.ai/features/product-video', updated_at = now()
WHERE slug = 'creatify-ai-product-video-generator' AND website_url LIKE '%futurepedia%';

UPDATE tools SET website_url = 'https://www.ifoto.ai', updated_at = now()
WHERE slug = 'ifoto' AND website_url LIKE '%futurepedia%';

UPDATE tools SET website_url = 'https://postly.ai', updated_at = now()
WHERE slug = 'postly' AND website_url LIKE '%fpr=%';

UPDATE tools SET website_url = 'https://videogen.io', updated_at = now()
WHERE slug = 'videogen' AND website_url LIKE '%fpr=%';

UPDATE tools SET website_url = 'https://meetcody.ai', updated_at = now()
WHERE slug = 'cody' AND website_url LIKE '%fpr=%';

UPDATE tools SET website_url = 'https://www.videoleapapp.com', updated_at = now()
WHERE slug = 'videoleap' AND website_url LIKE '%futurepedia%';

-- Verification query (run separately, not part of migration):
--   SELECT slug, website_url FROM tools
--   WHERE website_url ~* 'utm_|ref_aff|fpr=|via=futurepedia';
-- Expected rowcount after this migration: 0.
