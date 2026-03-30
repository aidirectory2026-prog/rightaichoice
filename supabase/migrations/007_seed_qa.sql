-- ============================================================
-- RightAIChoice — Seed: Q&A Questions + Answers
-- Step: Run AFTER 003_seed_tools.sql
-- Seeds realistic questions and answers for 8 popular tools.
-- All seeded as "admin" user - replace admin_user_id with an
-- actual user UUID from your auth.users table after running.
-- ============================================================

-- HOW TO RUN:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. First get your admin user's UUID:
--    SELECT id FROM auth.users LIMIT 1;
-- 3. Replace all instances of '00000000-0000-0000-0000-000000000001'
--    below with your real admin user UUID
-- 4. Run the SQL

-- ============================================================
-- ChatGPT Questions + Answers
-- ============================================================

INSERT INTO questions (id, tool_id, user_id, title, body, upvotes, answer_count, is_answered)
SELECT
  '11000000-0000-0000-0000-000000000001',
  t.id,
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'What''s the best way to use ChatGPT for writing long-form content without it losing context?',
  'I''m writing blog posts and articles (3000+ words) using ChatGPT but it seems to forget the earlier parts of what I asked by the time we get to the end. Is there a better workflow for long-form writing? Should I be using a different model?',
  12,
  2,
  true
FROM tools t WHERE t.slug = 'chatgpt'
ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (id, question_id, user_id, body, upvotes, is_accepted)
SELECT
  '21000000-0000-0000-0000-000000000001',
  '11000000-0000-0000-0000-000000000001',
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'The key is to work in sections and paste a "running summary" at the top of each new message. Something like: "Context: I''m writing a post titled X. So far I''ve covered [A, B, C]. Now write section D: ...". GPT-4o has a 128K context window so in theory it can hold a full article, but in practice quality degrades after ~8K tokens. The section-by-section approach with context injection gives much more consistent results.',
  18,
  true
FROM tools t WHERE t.slug = 'chatgpt'
ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (id, question_id, user_id, body, upvotes, is_accepted)
SELECT
  '21000000-0000-0000-0000-000000000002',
  '11000000-0000-0000-0000-000000000001',
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'Try creating a Custom GPT with your style guide and article structure baked in. That way you don''t need to re-explain context every session. For really long work I''ve switched to Claude — the 200K context window handles book-length content far better than GPT-4o does in practice.',
  9,
  false
FROM tools t WHERE t.slug = 'chatgpt'
ON CONFLICT (id) DO NOTHING;

INSERT INTO questions (id, tool_id, user_id, title, body, upvotes, answer_count, is_answered)
SELECT
  '11000000-0000-0000-0000-000000000002',
  t.id,
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'Is the ChatGPT Plus subscription worth it for developers?',
  'I''m a developer using ChatGPT mostly for code review, debugging, and writing documentation. The free tier feels limited lately. Is Plus worth the $20/month? Or should I just use the API directly?',
  8,
  1,
  false
FROM tools t WHERE t.slug = 'chatgpt'
ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (id, question_id, user_id, body, upvotes, is_accepted)
SELECT
  '21000000-0000-0000-0000-000000000003',
  '11000000-0000-0000-0000-000000000002',
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'For developers: the API is almost always the better choice if you''re doing anything systematic. You get GPT-4o at roughly $5-10 per million tokens which is way cheaper than $20/month if you''re using it heavily. Plus gives you the chat UI plus DALL-E and Advanced Data Analysis — useful if you need those tools. If it''s pure coding assistant work, also look at Cursor or GitHub Copilot — they''re purpose-built and outperform raw ChatGPT for in-editor workflows.',
  14,
  false
FROM tools t WHERE t.slug = 'chatgpt'
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Claude Questions + Answers
-- ============================================================

INSERT INTO questions (id, tool_id, user_id, title, body, upvotes, answer_count, is_answered)
SELECT
  '11000000-0000-0000-0000-000000000003',
  t.id,
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'How does Claude handle very large documents? What are the practical limits?',
  'I need to analyze lengthy legal contracts and research papers (sometimes 100+ pages). Claude claims 200K token context. Does it actually work well at that scale or does quality degrade?',
  22,
  2,
  true
FROM tools t WHERE t.slug = 'claude'
ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (id, question_id, user_id, body, upvotes, is_accepted)
SELECT
  '21000000-0000-0000-0000-000000000004',
  '11000000-0000-0000-0000-000000000003',
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'Claude genuinely handles large documents better than any other model I''ve tested. I''ve run full 100-page contracts through it and asked targeted questions — the answers are accurate and reference specific sections correctly. The practical limit I''ve found is around 150-160K tokens before responses start getting slightly vaguer on edge cases. For most business documents this is well within range. One tip: put your specific questions at the END of the message, not the beginning — Claude performs noticeably better when the question follows the document.',
  31,
  true
FROM tools t WHERE t.slug = 'claude'
ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (id, question_id, user_id, body, upvotes, is_accepted)
SELECT
  '21000000-0000-0000-0000-000000000005',
  '11000000-0000-0000-0000-000000000003',
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'For legal work specifically, Claude Opus is the right choice over Sonnet. The quality gap on complex reasoning tasks is significant. Also worth knowing: Claude is less likely to hallucinate citations than GPT-4, which matters a lot when you need to verify specific clauses.',
  12,
  false
FROM tools t WHERE t.slug = 'claude'
ON CONFLICT (id) DO NOTHING;

INSERT INTO questions (id, tool_id, user_id, title, body, upvotes, answer_count, is_answered)
SELECT
  '11000000-0000-0000-0000-000000000004',
  t.id,
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'Claude vs ChatGPT for coding — which is actually better in 2025?',
  'I''ve seen this debated everywhere. I use an AI assistant for Python/TypeScript daily. Currently on ChatGPT Plus but considering switching to Claude Pro. Would genuinely appreciate an honest comparison from people who''ve used both seriously.',
  45,
  2,
  true
FROM tools t WHERE t.slug = 'claude'
ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (id, question_id, user_id, body, upvotes, is_accepted)
SELECT
  '21000000-0000-0000-0000-000000000006',
  '11000000-0000-0000-0000-000000000004',
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'Honest answer from someone who uses both daily: Claude wins on anything requiring deep understanding of large codebases — refactoring, architectural reviews, understanding unfamiliar code. ChatGPT is better for quick "generate this function" tasks and anything involving browsing current docs. The real answer for serious devs is neither — it''s Cursor (with Claude or GPT-4o under the hood) because it has the codebase context built in.',
  38,
  true
FROM tools t WHERE t.slug = 'claude'
ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (id, question_id, user_id, body, upvotes, is_accepted)
SELECT
  '21000000-0000-0000-0000-000000000007',
  '11000000-0000-0000-0000-000000000004',
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'For TypeScript specifically: Claude is noticeably better at type inference and writing idiomatic TS. GPT-4o tends to generate slightly more verbose types. For Python data science work (pandas, NumPy), ChatGPT''s Advanced Data Analysis feature is hard to beat since it can actually run code.',
  19,
  false
FROM tools t WHERE t.slug = 'claude'
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Midjourney Questions + Answers
-- ============================================================

INSERT INTO questions (id, tool_id, user_id, title, body, upvotes, answer_count, is_answered)
SELECT
  '11000000-0000-0000-0000-000000000005',
  t.id,
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'What aspect ratios work best for different use cases in Midjourney?',
  'I generate images for a variety of projects — social media, website headers, and print materials. I keep having to resize images after the fact. What are the best --ar settings to use for each context?',
  17,
  1,
  true
FROM tools t WHERE t.slug = 'midjourney'
ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (id, question_id, user_id, body, upvotes, is_accepted)
SELECT
  '21000000-0000-0000-0000-000000000008',
  '11000000-0000-0000-0000-000000000005',
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'Here''s the quick reference I use: Instagram square (1:1), Instagram/TikTok Stories (9:16), Twitter/X header (3:1), website hero banner (16:9 or 21:9), LinkedIn banner (4:1), Facebook cover (2.7:1), print A4/letter portrait (3:4). Always generate at native AR and avoid upscaling after — quality degrades. For print work, use --v 6 and add "--quality 2" to get maximum detail. One other tip: generate at the intended final ratio from the start; Midjourney composes differently depending on AR.',
  24,
  true
FROM tools t WHERE t.slug = 'midjourney'
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Cursor Questions + Answers
-- ============================================================

INSERT INTO questions (id, tool_id, user_id, title, body, upvotes, answer_count, is_answered)
SELECT
  '11000000-0000-0000-0000-000000000006',
  t.id,
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'How do you make Cursor actually understand your entire codebase and not just the open file?',
  'I have a medium-sized Next.js project (~40 files). Cursor sometimes gives suggestions that would work in isolation but break other parts of the app because it doesn''t know about those. How do you set it up to have full project context?',
  34,
  2,
  true
FROM tools t WHERE t.slug = 'cursor'
ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (id, question_id, user_id, body, upvotes, is_accepted)
SELECT
  '21000000-0000-0000-0000-000000000009',
  '11000000-0000-0000-0000-000000000006',
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'A few things that made a huge difference for me: 1) Use @codebase in your prompt — this triggers deep indexing and is much better than just having files open. 2) Create a .cursorrules file in your project root describing your architecture, key conventions, and patterns. Mine includes: tech stack, folder structure, naming conventions, and "don''t do X" rules. 3) Add core files to "Always include in context" in Cursor settings — I add my types/index.ts, constants, and main config. 4) Use Composer (Cmd+I) for multi-file changes rather than Chat for single-file edits.',
  41,
  true
FROM tools t WHERE t.slug = 'cursor'
ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (id, question_id, user_id, body, upvotes, is_accepted)
SELECT
  '21000000-0000-0000-0000-000000000010',
  '11000000-0000-0000-0000-000000000006',
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'The .cursorrules file is the single biggest unlock. Think of it as a system prompt for your codebase. I write mine as: "This is a [stack] project. Architecture: [description]. Key patterns: [patterns]. Always: [list]. Never: [list]." After adding this, Cursor stopped suggesting patterns that conflicted with my existing architecture.',
  22,
  false
FROM tools t WHERE t.slug = 'cursor'
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Notion AI Questions + Answers
-- ============================================================

INSERT INTO questions (id, tool_id, user_id, title, body, upvotes, answer_count, is_answered)
SELECT
  '11000000-0000-0000-0000-000000000007',
  t.id,
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'Is Notion AI worth the extra cost on top of the standard plan?',
  'Already paying for Notion Plus. The AI add-on is another $10/month. Is it genuinely useful or just a gimmick? Specifically curious about the Q&A feature that claims to search across all your pages.',
  19,
  2,
  false
FROM tools t WHERE t.slug = 'notion-ai'
ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (id, question_id, user_id, body, upvotes, is_accepted)
SELECT
  '21000000-0000-0000-0000-000000000011',
  '11000000-0000-0000-0000-000000000007',
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'Depends entirely on how much content is in your Notion. If you have a large personal knowledge base or company wiki (hundreds of pages), the Q&A feature genuinely saves time — I''ve found it more reliable than CMD+K search for finding specific information buried in old meeting notes. If your Notion is mostly templates and light notes, it''s not worth it. The writing assistant parts (summarize, improve writing, etc.) are decent but not better than just using Claude or ChatGPT directly.',
  15,
  false
FROM tools t WHERE t.slug = 'notion-ai'
ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (id, question_id, user_id, body, upvotes, is_accepted)
SELECT
  '21000000-0000-0000-0000-000000000012',
  '11000000-0000-0000-0000-000000000007',
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'The Q&A across workspace is the main selling point and it''s genuinely useful for teams. For solo use, I''d say try the 7-day trial and test it against your actual content before committing. One honest downside: it doesn''t handle tables and databases as well as plain text pages.',
  8,
  false
FROM tools t WHERE t.slug = 'notion-ai'
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Perplexity Questions + Answers
-- ============================================================

INSERT INTO questions (id, tool_id, user_id, title, body, upvotes, answer_count, is_answered)
SELECT
  '11000000-0000-0000-0000-000000000008',
  t.id,
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'When should I use Perplexity instead of ChatGPT for research?',
  'I use both but I''m not totally sure when Perplexity is the right choice vs just using ChatGPT with browsing. What are the cases where Perplexity is clearly better?',
  27,
  2,
  true
FROM tools t WHERE t.slug = 'perplexity'
ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (id, question_id, user_id, body, upvotes, is_accepted)
SELECT
  '21000000-0000-0000-0000-000000000013',
  '11000000-0000-0000-0000-000000000008',
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'Perplexity wins when: 1) You need current information (news, pricing, product releases in the last few months). 2) You need citations — Perplexity always shows sources, making it easy to verify. 3) Quick factual lookups where you want a direct answer with the source visible. ChatGPT browsing wins when: 1) You need more nuanced synthesis (Perplexity tends to be surface-level on complex topics). 2) You want to go deep on a specific URL or document. My workflow: use Perplexity to quickly surface sources and get up to date, then use Claude/ChatGPT to actually analyze and synthesize the findings.',
  33,
  true
FROM tools t WHERE t.slug = 'perplexity'
ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (id, question_id, user_id, body, upvotes, is_accepted)
SELECT
  '21000000-0000-0000-0000-000000000014',
  '11000000-0000-0000-0000-000000000008',
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'I use Perplexity Pro as my default Google replacement now. It''s genuinely better for research queries than Google because it synthesizes instead of giving you 10 blue links. The Pro plan with GPT-4o and Claude as engine options is worth it if you do a lot of research work.',
  16,
  false
FROM tools t WHERE t.slug = 'perplexity'
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- GitHub Copilot Questions + Answers
-- ============================================================

INSERT INTO questions (id, tool_id, user_id, title, body, upvotes, answer_count, is_answered)
SELECT
  '11000000-0000-0000-0000-000000000009',
  t.id,
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'GitHub Copilot vs Cursor — which is better for a professional developer in 2025?',
  'I''m a full-stack developer and currently on GitHub Copilot Individual ($10/month). Cursor is $20/month. Is it worth switching? What are the actual differences in day-to-day use?',
  52,
  3,
  true
FROM tools t WHERE t.slug = 'github-copilot'
ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (id, question_id, user_id, body, upvotes, is_accepted)
SELECT
  '21000000-0000-0000-0000-000000000015',
  '11000000-0000-0000-0000-000000000009',
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'Switched from Copilot to Cursor 8 months ago. Key differences: Cursor''s Composer feature (multi-file edits with a single instruction) is a fundamentally different capability — Copilot still can''t do this. Cursor also lets you choose your model (Claude 3.5, GPT-4o, etc.) while Copilot uses their own stack. The @codebase context in Cursor gives dramatically better project-aware suggestions. If you only want inline completions, Copilot is fine and cheaper. If you want a true AI pair programmer that can refactor across files, Cursor is worth the extra $10.',
  47,
  true
FROM tools t WHERE t.slug = 'github-copilot'
ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (id, question_id, user_id, body, upvotes, is_accepted)
SELECT
  '21000000-0000-0000-0000-000000000016',
  '11000000-0000-0000-0000-000000000009',
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'One thing worth knowing: if you use VS Code and don''t want to change editors, Copilot is more polished in that environment. Cursor is a VS Code fork but it''s not identical. Some extensions don''t work perfectly and the UI differs slightly. Cursor is worth it if you''re flexible about tooling; Copilot if you want to stay native VS Code.',
  21,
  false
FROM tools t WHERE t.slug = 'github-copilot'
ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (id, question_id, user_id, body, upvotes, is_accepted)
SELECT
  '21000000-0000-0000-0000-000000000017',
  '11000000-0000-0000-0000-000000000009',
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'For enterprises: Copilot Business has better compliance and audit trail features (important for regulated industries). If you''re on a team where data privacy matters, Copilot''s enterprise tier has stronger guarantees than Cursor currently.',
  13,
  false
FROM tools t WHERE t.slug = 'github-copilot'
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Runway Questions + Answers
-- ============================================================

INSERT INTO questions (id, tool_id, user_id, title, body, upvotes, answer_count, is_answered)
SELECT
  '11000000-0000-0000-0000-000000000010',
  t.id,
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'What''s the realistic maximum quality I can get from Runway Gen-3 for professional work?',
  'I make short-form content for brands. Wondering if Runway Gen-3 is at a quality level where I can actually use it in client deliverables, or if it''s still clearly AI-generated in a way clients will notice.',
  28,
  1,
  true
FROM tools t WHERE t.slug = 'runway'
ON CONFLICT (id) DO NOTHING;

INSERT INTO answers (id, question_id, user_id, body, upvotes, is_accepted)
SELECT
  '21000000-0000-0000-0000-000000000018',
  '11000000-0000-0000-0000-000000000010',
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'Gen-3 is at the "usable for specific shots" stage for professional work. Where it works well: abstract visuals, product floating in space, atmospheric B-roll, futuristic/sci-fi sequences. Where it still fails: human faces in motion (the uncanny valley is very obvious), hands, text in frame, and fast-moving sports content. My approach: use Gen-3 for B-roll and abstract sequences, shoot real footage for any human-centered shots. The best use case right now is extending real footage — use Gen-3 to extend a clip a few extra seconds where you ran out of footage.',
  35,
  true
FROM tools t WHERE t.slug = 'runway'
ON CONFLICT (id) DO NOTHING;

-- Update answer_counts and is_answered flags
UPDATE questions SET answer_count = (
  SELECT COUNT(*) FROM answers WHERE answers.question_id = questions.id
);

UPDATE questions SET is_answered = true WHERE EXISTS (
  SELECT 1 FROM answers WHERE answers.question_id = questions.id AND answers.is_accepted = true
);
