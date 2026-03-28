-- ============================================================
-- RightAIChoice — Seed: Tags + 30 AI Tools with Deep Metadata
-- Step 4: Run in Supabase SQL Editor AFTER 001 + 002
-- ============================================================

-- ============================================================
-- TAGS (use-case driven — critical for discovery)
-- ============================================================

INSERT INTO tags (name, slug) VALUES
  ('Text Generation',     'text-generation'),
  ('Image Generation',    'image-generation'),
  ('Code Generation',     'code-generation'),
  ('Chatbot',             'chatbot'),
  ('Summarization',       'summarization'),
  ('Translation',         'translation'),
  ('Transcription',       'transcription'),
  ('Voice Cloning',       'voice-cloning'),
  ('Video Editing',       'video-editing'),
  ('SEO',                 'seo'),
  ('Copywriting',         'copywriting'),
  ('Data Analysis',       'data-analysis'),
  ('Automation',          'automation'),
  ('No-Code',             'no-code'),
  ('API',                 'api-tool'),
  ('Open Source',         'open-source'),
  ('Workflow',            'workflow'),
  ('Research',            'research'),
  ('Design',              'design'),
  ('Presentation',        'presentation'),
  ('Email',               'email'),
  ('Meeting Assistant',   'meeting-assistant'),
  ('Writing Assistant',   'writing-assistant'),
  ('Photo Editing',       'photo-editing'),
  ('Music Generation',    'music-generation'),
  ('3D Generation',       '3d-generation'),
  ('Agent',               'agent'),
  ('RAG',                 'rag'),
  ('Fine-Tuning',         'fine-tuning'),
  ('Prototyping',         'prototyping');

-- ============================================================
-- TOOLS (30 tools with deep, accurate metadata)
-- ============================================================

-- 1. ChatGPT
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'ChatGPT',
  'chatgpt',
  'AI assistant for conversation, writing, analysis, and coding',
  'ChatGPT by OpenAI is one of the most widely used AI assistants. It can help with writing, brainstorming, coding, math, research, and creative tasks. GPT-4o supports text, image, and voice inputs. The Plus plan unlocks GPT-4o, DALL-E, browsing, and advanced data analysis.',
  NULL,
  'https://chat.openai.com',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["GPT-4o mini", "Limited messages"]}, {"plan": "Plus", "price": "$20/mo", "features": ["GPT-4o", "DALL-E", "Browsing", "Advanced Data Analysis"]}, {"plan": "Team", "price": "$25/user/mo", "features": ["Workspace", "Admin console", "Higher limits"]}]',
  'beginner',
  true,
  '{web, mobile, desktop, api}',
  '{"Natural language conversation", "Code generation and debugging", "Image generation via DALL-E", "File and image analysis", "Web browsing", "Advanced data analysis", "Custom GPTs", "Voice mode"}',
  '{"Zapier", "Slack", "Google Workspace", "Microsoft 365", "Notion"}',
  NULL,
  'https://platform.openai.com/docs',
  true,
  true
);

-- 2. Claude
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Claude',
  'claude',
  'AI assistant built for safety, accuracy, and long-form reasoning',
  'Claude by Anthropic excels at nuanced writing, careful analysis, and coding tasks. Known for its large context window (200K tokens), strong instruction-following, and reduced hallucination. Claude 4 Opus is one of the most capable models available for complex reasoning.',
  NULL,
  'https://claude.ai',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["Claude Sonnet", "Limited messages"]}, {"plan": "Pro", "price": "$20/mo", "features": ["Claude Opus", "Higher limits", "Priority access"]}, {"plan": "Team", "price": "$25/user/mo", "features": ["Workspace", "Admin", "Higher limits"]}]',
  'beginner',
  true,
  '{web, mobile, desktop, api}',
  '{"200K token context window", "Long-form document analysis", "Code generation and review", "Careful reasoning with citations", "Image understanding", "Artifact creation", "Claude Code CLI"}',
  '{"Slack", "Notion", "Zapier", "Google Workspace"}',
  NULL,
  'https://docs.anthropic.com',
  true,
  true
);

-- 3. Midjourney
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Midjourney',
  'midjourney',
  'Create stunning AI-generated images from text prompts',
  'Midjourney is the leading AI image generation tool known for its exceptional artistic quality and aesthetic output. It generates photorealistic and stylized images from natural language prompts. V6 introduced major improvements in coherence, prompt understanding, and text rendering.',
  NULL,
  'https://midjourney.com',
  'paid',
  '[{"plan": "Basic", "price": "$10/mo", "features": ["~200 images/mo", "3 concurrent jobs"]}, {"plan": "Standard", "price": "$30/mo", "features": ["15hr fast GPU", "Unlimited relaxed"]}, {"plan": "Pro", "price": "$60/mo", "features": ["30hr fast GPU", "Stealth mode"]}]',
  'beginner',
  false,
  '{web}',
  '{"Text-to-image generation", "Style tuning and customization", "Image upscaling", "Variation generation", "Pan and zoom", "Text rendering in images", "Consistent character generation"}',
  '{"Discord"}',
  NULL,
  'https://docs.midjourney.com',
  true,
  true
);

-- 4. Cursor
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Cursor',
  'cursor',
  'The AI-first code editor that writes, edits, and debugs code with you',
  'Cursor is a VS Code fork rebuilt around AI. It understands your entire codebase and can write, refactor, and debug code using natural language. Features include tab completion, inline editing, multi-file changes, and codebase-aware chat. Popular with professional developers for its speed and accuracy.',
  NULL,
  'https://cursor.com',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["2000 completions", "50 premium requests"]}, {"plan": "Pro", "price": "$20/mo", "features": ["Unlimited completions", "500 premium requests/mo"]}, {"plan": "Business", "price": "$40/user/mo", "features": ["Admin dashboard", "SSO", "Usage analytics"]}]',
  'intermediate',
  false,
  '{desktop}',
  '{"AI-powered tab completion", "Natural language code editing", "Codebase-aware chat", "Multi-file editing", "Inline diff review", "Terminal command generation", "Custom model selection"}',
  '{"GitHub", "GitLab", "VS Code extensions"}',
  NULL,
  'https://docs.cursor.com',
  true,
  true
);

-- 5. Notion AI
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Notion AI',
  'notion-ai',
  'AI writing and knowledge assistant built into your workspace',
  'Notion AI integrates directly into the Notion workspace, letting you write, summarize, brainstorm, and search across all your docs. It can auto-fill databases, generate action items from meeting notes, and answer questions using your workspace as context.',
  NULL,
  'https://notion.so/product/ai',
  'paid',
  '[{"plan": "AI Add-on", "price": "$10/user/mo", "features": ["AI writing", "Q&A over workspace", "Autofill databases", "AI summaries"]}]',
  'beginner',
  true,
  '{web, mobile, desktop}',
  '{"AI writing assistance", "Workspace Q&A", "Autofill database properties", "Meeting notes summarization", "Translation", "Tone adjustment", "Action item extraction"}',
  '{"Slack", "Google Drive", "GitHub", "Figma", "Jira"}',
  NULL,
  'https://developers.notion.com',
  false,
  true
);

-- 6. Perplexity
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Perplexity',
  'perplexity',
  'AI-powered search engine that answers with sources',
  'Perplexity is an AI search engine that provides direct answers with cited sources. Unlike traditional search, it synthesizes information from multiple sources into coherent answers. Pro Search mode does multi-step research, and it can analyze uploaded files and images.',
  NULL,
  'https://perplexity.ai',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["Unlimited quick searches", "5 Pro searches/day"]}, {"plan": "Pro", "price": "$20/mo", "features": ["600+ Pro searches/day", "File upload", "Image generation"]}]',
  'beginner',
  true,
  '{web, mobile}',
  '{"Source-cited answers", "Multi-step Pro Search", "File and image analysis", "Collections for organizing research", "API access", "Focus modes (Academic, YouTube, Reddit)"}',
  '{"Chrome extension", "Arc browser"}',
  NULL,
  'https://docs.perplexity.ai',
  true,
  true
);

-- 7. Runway
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Runway',
  'runway',
  'AI video generation and editing for creative professionals',
  'Runway is a leading AI creative suite focused on video. Gen-3 Alpha produces high-quality video from text and image prompts. It also offers motion brush, inpainting, background removal, and frame interpolation. Widely used in film, advertising, and content creation.',
  NULL,
  'https://runwayml.com',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["125 credits", "3 projects"]}, {"plan": "Standard", "price": "$12/mo", "features": ["625 credits/mo", "Unlimited projects"]}, {"plan": "Pro", "price": "$28/mo", "features": ["2250 credits/mo", "4K upscale"]}]',
  'intermediate',
  true,
  '{web}',
  '{"Text-to-video generation", "Image-to-video", "Motion brush", "Video inpainting", "Background removal", "Frame interpolation", "4K upscaling", "Multi-motion brush"}',
  '{"Adobe Premiere (plugin)", "DaVinci Resolve"}',
  NULL,
  'https://docs.runwayml.com',
  false,
  true
);

-- 8. GitHub Copilot
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'GitHub Copilot',
  'github-copilot',
  'AI pair programmer that suggests code in your editor',
  'GitHub Copilot uses AI models to suggest code completions, entire functions, and tests directly in your IDE. Copilot Chat lets you ask coding questions in natural language. Supports 20+ languages and integrates into VS Code, JetBrains, Neovim, and more.',
  NULL,
  'https://github.com/features/copilot',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["2000 completions/mo", "50 chat messages/mo"]}, {"plan": "Pro", "price": "$10/mo", "features": ["Unlimited completions", "Unlimited chat"]}, {"plan": "Business", "price": "$19/user/mo", "features": ["Policy management", "SSO"]}]',
  'intermediate',
  false,
  '{desktop, plugin}',
  '{"Inline code completions", "Copilot Chat", "Multi-file context", "Test generation", "Code explanation", "Terminal assistance", "PR summaries"}',
  '{"VS Code", "JetBrains", "Neovim", "Xcode", "GitHub"}',
  NULL,
  'https://docs.github.com/en/copilot',
  false,
  true
);

-- 9. ElevenLabs
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'ElevenLabs',
  'elevenlabs',
  'The most realistic AI voice generation and cloning platform',
  'ElevenLabs produces the most natural-sounding AI speech available. Clone any voice from a short sample, generate speech in 29 languages, and create audiobooks, podcasts, or voiceovers. Used by creators, publishers, and enterprises for high-quality audio content.',
  NULL,
  'https://elevenlabs.io',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["10K characters/mo", "3 custom voices"]}, {"plan": "Starter", "price": "$5/mo", "features": ["30K characters/mo", "10 voices"]}, {"plan": "Pro", "price": "$22/mo", "features": ["100K characters/mo", "30 voices", "Commercial use"]}]',
  'beginner',
  true,
  '{web, api}',
  '{"Text-to-speech", "Voice cloning", "29 languages", "Voice design", "Speech-to-speech", "Dubbing", "Sound effects generation", "Audiobook creation"}',
  '{"Zapier", "API integrations"}',
  'https://github.com/elevenlabs/elevenlabs-python',
  'https://elevenlabs.io/docs',
  false,
  true
);

-- 10. Jasper
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Jasper',
  'jasper',
  'AI marketing copilot for content creation at scale',
  'Jasper is built specifically for marketing teams. It generates blog posts, ad copy, social media content, and email campaigns while maintaining brand voice. Features include brand voice training, campaign workflows, and team collaboration with approval flows.',
  NULL,
  'https://jasper.ai',
  'paid',
  '[{"plan": "Creator", "price": "$49/mo", "features": ["1 brand voice", "SEO mode", "Browser extension"]}, {"plan": "Pro", "price": "$69/mo", "features": ["3 brand voices", "Collaboration", "Art generation"]}, {"plan": "Business", "price": "Custom", "features": ["Unlimited brand voices", "API", "SSO"]}]',
  'beginner',
  true,
  '{web, plugin}',
  '{"Brand voice training", "Marketing campaign workflows", "Blog post generator", "Ad copy generation", "Social media content", "SEO optimization", "Chrome extension", "Team collaboration"}',
  '{"Google Workspace", "Surfer SEO", "Grammarly", "Webflow", "HubSpot"}',
  NULL,
  'https://developers.jasper.ai',
  false,
  true
);

-- 11. Stable Diffusion
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Stable Diffusion',
  'stable-diffusion',
  'Open-source AI image generation you can run locally',
  'Stable Diffusion by Stability AI is the leading open-source image generation model. Run it locally with full control, fine-tune on your own data, or use through hosted services. SDXL and SD3 produce high-quality images with better prompt adherence and text rendering.',
  NULL,
  'https://stability.ai',
  'free',
  '[{"plan": "Open Source", "price": "$0", "features": ["Run locally", "Full model weights", "Commercial license"]}, {"plan": "Stability API", "price": "Pay-per-use", "features": ["Hosted inference", "SDXL", "SD3"]}]',
  'advanced',
  true,
  '{web, desktop, api, cli}',
  '{"Text-to-image", "Image-to-image", "Inpainting", "ControlNet support", "LoRA fine-tuning", "Local deployment", "Community models", "ComfyUI/A1111 support"}',
  '{"ComfyUI", "Automatic1111", "Hugging Face", "Replicate"}',
  'https://github.com/Stability-AI/stablediffusion',
  'https://platform.stability.ai/docs',
  false,
  true
);

-- 12. Zapier AI
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Zapier',
  'zapier',
  'Connect apps and automate workflows with AI assistance',
  'Zapier connects 6000+ apps and lets you build automated workflows (Zaps) without code. The AI features include natural language workflow creation, AI-powered data formatting, and built-in AI actions that can summarize, classify, or generate text within any workflow.',
  NULL,
  'https://zapier.com',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["5 Zaps", "100 tasks/mo"]}, {"plan": "Starter", "price": "$19.99/mo", "features": ["20 Zaps", "750 tasks/mo"]}, {"plan": "Professional", "price": "$49/mo", "features": ["Unlimited Zaps", "2K tasks/mo", "AI actions"]}]',
  'beginner',
  true,
  '{web}',
  '{"6000+ app integrations", "Natural language workflow builder", "AI-powered actions", "Multi-step Zaps", "Conditional logic", "Webhooks", "Schedule triggers", "Data formatting"}',
  '{"Slack", "Gmail", "Google Sheets", "Salesforce", "HubSpot", "Notion", "Airtable"}',
  NULL,
  'https://platform.zapier.com/docs',
  false,
  true
);

-- 13. Canva AI
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Canva',
  'canva',
  'AI-powered design platform for everyone',
  'Canva combines traditional design tools with AI features including Magic Design (auto-layout from prompts), Magic Write (AI copywriting), Magic Eraser, and text-to-image generation. It is the most accessible design tool for non-designers while remaining powerful for professionals.',
  NULL,
  'https://canva.com',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["250K+ templates", "Limited AI features"]}, {"plan": "Pro", "price": "$12.99/mo", "features": ["All AI features", "Brand Kit", "Background Remover"]}, {"plan": "Teams", "price": "$14.99/user/mo", "features": ["Brand controls", "Approval workflows"]}]',
  'beginner',
  true,
  '{web, mobile, desktop}',
  '{"Magic Design auto-layout", "Magic Write AI copywriting", "Text-to-image generation", "Background remover", "Magic Eraser", "Brand Kit", "250K+ templates", "Real-time collaboration"}',
  '{"Google Drive", "Dropbox", "HubSpot", "Slack", "Instagram", "YouTube"}',
  NULL,
  'https://www.canva.dev/docs',
  false,
  true
);

-- 14. Grammarly
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Grammarly',
  'grammarly',
  'AI writing assistant for grammar, clarity, and tone',
  'Grammarly catches grammar and spelling errors, suggests clarity improvements, and adjusts tone. GrammarlyGO adds generative AI for rewriting, composing, and replying. Works across email, docs, social media, and 500K+ apps via browser extension.',
  NULL,
  'https://grammarly.com',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["Basic grammar", "Spelling", "Tone detection"]}, {"plan": "Premium", "price": "$12/mo", "features": ["Full rewrites", "Tone adjustment", "Plagiarism check"]}, {"plan": "Business", "price": "$15/user/mo", "features": ["Brand tones", "Analytics", "SSO"]}]',
  'beginner',
  false,
  '{web, mobile, desktop, plugin}',
  '{"Grammar and spelling check", "Clarity suggestions", "Tone detection", "GrammarlyGO generative AI", "Plagiarism detection", "Style guide enforcement", "Works in 500K+ apps"}',
  '{"Chrome", "Safari", "Firefox", "Microsoft Office", "Google Docs", "Slack", "Gmail"}',
  NULL,
  'https://developer.grammarly.com',
  false,
  true
);

-- 15. Vercel v0
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'v0 by Vercel',
  'v0',
  'Generate UI components and full pages from text prompts',
  'v0 generates production-ready React components using shadcn/ui and Tailwind CSS from natural language descriptions. It produces clean, accessible code that you can copy directly into your Next.js project. Ideal for rapid prototyping and UI development.',
  NULL,
  'https://v0.dev',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["10 generations/mo"]}, {"plan": "Premium", "price": "$20/mo", "features": ["Unlimited generations", "Priority access"]}]',
  'intermediate',
  false,
  '{web}',
  '{"Text-to-UI generation", "React + Tailwind output", "shadcn/ui components", "Iterative refinement", "Copy-paste ready code", "Responsive design", "Dark mode support"}',
  '{"Next.js", "Vercel", "shadcn/ui", "Tailwind CSS"}',
  NULL,
  'https://v0.dev/docs',
  false,
  true
);

-- 16. Descript
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Descript',
  'descript',
  'Edit video and audio by editing text — powered by AI',
  'Descript transcribes your media and lets you edit video/audio by editing the transcript text. Cut a sentence from the transcript and it cuts the video. Features include filler word removal, eye contact correction, Studio Sound enhancement, and AI voice cloning for corrections.',
  NULL,
  'https://descript.com',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["1hr transcription", "Basic editing"]}, {"plan": "Hobbyist", "price": "$24/mo", "features": ["10hr transcription", "Filler word removal"]}, {"plan": "Pro", "price": "$33/mo", "features": ["30hr transcription", "4K export", "Green screen"]}]',
  'beginner',
  false,
  '{web, desktop}',
  '{"Text-based video editing", "AI transcription", "Filler word removal", "Eye contact correction", "Studio Sound enhancement", "AI voice cloning", "Screen recording", "Templates"}',
  '{"YouTube", "Vimeo", "Google Drive", "Dropbox"}',
  NULL,
  'https://www.descript.com/help',
  false,
  true
);

-- 17. Replit
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Replit',
  'replit',
  'AI-powered cloud IDE — build, deploy, and collaborate from your browser',
  'Replit is a browser-based IDE with built-in AI assistance. Replit Agent can build entire applications from natural language descriptions. It handles environment setup, package management, and deployment automatically. Great for learning, prototyping, and shipping fast.',
  NULL,
  'https://replit.com',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["Basic IDE", "Limited AI"]}, {"plan": "Replit Core", "price": "$25/mo", "features": ["Replit Agent", "Unlimited AI", "4x compute"]}]',
  'beginner',
  false,
  '{web}',
  '{"Browser-based IDE", "Replit Agent (build apps from text)", "50+ languages", "Instant deployment", "Multiplayer collaboration", "Built-in database", "GitHub import", "Mobile coding"}',
  '{"GitHub", "Google Cloud", "Nix"}',
  NULL,
  'https://docs.replit.com',
  false,
  true
);

-- 18. Otter.ai
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Otter.ai',
  'otter-ai',
  'AI meeting assistant that transcribes, summarizes, and captures action items',
  'Otter.ai joins your meetings to transcribe in real-time, generate summaries, and extract action items. OtterPilot automatically joins Zoom, Teams, and Meet calls. It identifies speakers, highlights key moments, and lets you search across all your meeting history.',
  NULL,
  'https://otter.ai',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["300 min/mo", "30 min/conversation"]}, {"plan": "Pro", "price": "$16.99/mo", "features": ["1200 min/mo", "90 min/conversation"]}, {"plan": "Business", "price": "$30/user/mo", "features": ["6000 min/mo", "4hr/conversation", "Admin"]}]',
  'beginner',
  false,
  '{web, mobile}',
  '{"Real-time transcription", "Automatic meeting join", "AI meeting summaries", "Action item extraction", "Speaker identification", "Searchable meeting history", "Highlight key moments"}',
  '{"Zoom", "Google Meet", "Microsoft Teams", "Slack", "Salesforce"}',
  NULL,
  'https://help.otter.ai',
  false,
  true
);

-- 19. Hugging Face
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Hugging Face',
  'hugging-face',
  'The open-source AI community — models, datasets, and deployment',
  'Hugging Face is the GitHub of machine learning. Host and discover 500K+ models, 100K+ datasets, and thousands of Spaces (demo apps). Run inference via API, fine-tune models, and deploy with Inference Endpoints. The essential platform for ML practitioners.',
  NULL,
  'https://huggingface.co',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["Model hosting", "Spaces", "Inference API (rate-limited)"]}, {"plan": "Pro", "price": "$9/mo", "features": ["Private models", "Faster inference"]}, {"plan": "Enterprise", "price": "Custom", "features": ["SSO", "Audit logs", "Dedicated infra"]}]',
  'advanced',
  true,
  '{web, api, cli}',
  '{"500K+ open models", "100K+ datasets", "Spaces demo hosting", "Inference API", "Fine-tuning", "Model evaluation", "Transformers library", "Auto-deploy"}',
  '{"AWS", "Google Cloud", "Azure", "GitHub Actions"}',
  'https://github.com/huggingface/transformers',
  'https://huggingface.co/docs',
  false,
  true
);

-- 20. Copy.ai
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Copy.ai',
  'copy-ai',
  'AI-powered GTM platform for marketing and sales teams',
  'Copy.ai has evolved from a copywriting tool into a full go-to-market AI platform. It automates sales outreach, generates marketing content, enriches leads, and builds multi-step AI workflows. Workflows feature lets you chain AI actions for complex automation.',
  NULL,
  'https://copy.ai',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["2000 words/mo", "1 seat"]}, {"plan": "Starter", "price": "$49/mo", "features": ["Unlimited words", "5 seats"]}, {"plan": "Advanced", "price": "$249/mo", "features": ["Workflows", "API access", "15 seats"]}]',
  'beginner',
  true,
  '{web}',
  '{"Marketing copy generation", "Sales outreach automation", "AI workflows builder", "Lead enrichment", "Blog post generator", "Social media content", "Product descriptions", "Email campaigns"}',
  '{"HubSpot", "Salesforce", "Zapier", "Shopify"}',
  NULL,
  'https://docs.copy.ai',
  false,
  true
);

-- 21. Suno
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Suno',
  'suno',
  'Create full songs with vocals, instruments, and lyrics using AI',
  'Suno generates complete songs — vocals, instruments, and lyrics — from a text description. V3.5 produces radio-quality tracks up to 4 minutes. You can specify genre, mood, lyrics, or let it create everything. The most accessible music creation tool available.',
  NULL,
  'https://suno.com',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["10 songs/day", "Non-commercial"]}, {"plan": "Pro", "price": "$10/mo", "features": ["500 songs/mo", "Commercial use"]}, {"plan": "Premier", "price": "$30/mo", "features": ["2000 songs/mo", "Commercial use"]}]',
  'beginner',
  true,
  '{web}',
  '{"Full song generation", "Custom lyrics support", "Multiple genres and styles", "Vocal generation", "Instrumental tracks", "Extend and remix songs", "Up to 4-minute tracks"}',
  '{}',
  NULL,
  NULL,
  false,
  true
);

-- 22. Lovable
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Lovable',
  'lovable',
  'Build full-stack web apps from natural language descriptions',
  'Lovable (formerly GPT Engineer) turns natural language into production-ready full-stack applications. It generates React frontends with Tailwind CSS, connects to Supabase backends, and deploys instantly. Ideal for MVPs, internal tools, and rapid prototyping without coding.',
  NULL,
  'https://lovable.dev',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["5 generations/day"]}, {"plan": "Starter", "price": "$20/mo", "features": ["100 generations/mo"]}, {"plan": "Pro", "price": "$50/mo", "features": ["500 generations/mo", "Custom domains"]}]',
  'beginner',
  false,
  '{web}',
  '{"Natural language to full-stack app", "React + Tailwind output", "Supabase integration", "Instant deployment", "Iterative refinement", "Authentication built-in", "Database schema generation"}',
  '{"Supabase", "GitHub", "Vercel", "Netlify"}',
  NULL,
  'https://docs.lovable.dev',
  false,
  true
);

-- 23. Gamma
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Gamma',
  'gamma',
  'AI-powered presentations, documents, and websites in seconds',
  'Gamma creates polished presentations, documents, and web pages from a simple prompt. No more fighting with slide layouts — describe your content and Gamma designs it. Features nested cards, embeds, analytics, and one-click publishing.',
  NULL,
  'https://gamma.app',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["400 AI credits", "Gamma branding"]}, {"plan": "Plus", "price": "$10/mo", "features": ["Unlimited AI", "No branding", "Export PDF"]}, {"plan": "Pro", "price": "$20/mo", "features": ["Advanced analytics", "Custom fonts", "Priority support"]}]',
  'beginner',
  false,
  '{web}',
  '{"AI presentation generation", "AI document creation", "Web page builder", "Nested card layouts", "Embed support", "Analytics", "One-click publish", "Custom branding"}',
  '{"Google Drive", "YouTube", "Figma", "Airtable"}',
  NULL,
  'https://help.gamma.app',
  false,
  true
);

-- 24. Synthesia
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Synthesia',
  'synthesia',
  'Create AI videos with realistic avatars — no camera needed',
  'Synthesia generates professional videos with AI avatars that speak your script in 130+ languages. No filming required. Used by enterprises for training, onboarding, and marketing videos. Create custom avatars from a short recording of yourself.',
  NULL,
  'https://synthesia.io',
  'paid',
  '[{"plan": "Starter", "price": "$22/mo", "features": ["120 min/year", "90+ avatars"]}, {"plan": "Creator", "price": "$67/mo", "features": ["360 min/year", "Custom avatar"]}, {"plan": "Enterprise", "price": "Custom", "features": ["Unlimited", "API", "SSO"]}]',
  'beginner',
  true,
  '{web, api}',
  '{"160+ AI avatars", "130+ languages", "Custom avatar creation", "Script-to-video", "Screen recording overlay", "Templates", "Brand kit", "Team collaboration"}',
  '{"PowerPoint", "Google Slides", "LMS platforms", "Zapier"}',
  NULL,
  'https://docs.synthesia.io',
  false,
  true
);

-- 25. Supabase
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Supabase',
  'supabase',
  'Open-source Firebase alternative with Postgres, Auth, and Realtime',
  'Supabase provides a full backend-as-a-service built on PostgreSQL. Includes authentication, auto-generated APIs, realtime subscriptions, storage, edge functions, and vector embeddings. Open source and self-hostable. The go-to backend for modern web apps.',
  NULL,
  'https://supabase.com',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["500MB database", "1GB storage", "50K MAUs"]}, {"plan": "Pro", "price": "$25/mo", "features": ["8GB database", "100GB storage", "100K MAUs"]}, {"plan": "Team", "price": "$599/mo", "features": ["Priority support", "SOC2", "SSO"]}]',
  'intermediate',
  true,
  '{web, api, cli}',
  '{"PostgreSQL database", "Authentication", "Auto-generated REST API", "Realtime subscriptions", "Storage", "Edge Functions", "Vector embeddings", "Row Level Security"}',
  '{"Next.js", "React", "Flutter", "Swift", "Kotlin", "Stripe", "Vercel"}',
  'https://github.com/supabase/supabase',
  'https://supabase.com/docs',
  false,
  true
);

-- 26. Framer
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Framer',
  'framer',
  'AI-powered website builder with production-grade output',
  'Framer lets you design and publish production websites visually or from AI prompts. It generates responsive layouts, handles SEO, and produces fast-loading sites. The AI feature creates complete multi-page sites from a description. Popular for portfolios, landing pages, and startups.',
  NULL,
  'https://framer.com',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["Framer subdomain", "1000 visitors"]}, {"plan": "Mini", "price": "$5/mo", "features": ["Custom domain", "1K visitors"]}, {"plan": "Basic", "price": "$15/mo", "features": ["10K visitors", "CMS"]}, {"plan": "Pro", "price": "$30/mo", "features": ["200K visitors", "Advanced SEO"]}]',
  'beginner',
  false,
  '{web}',
  '{"AI website generation", "Visual design editor", "Responsive layouts", "CMS built-in", "SEO optimization", "Custom code components", "Animations", "Fast hosting"}',
  '{"Google Analytics", "Mailchimp", "Stripe", "HubSpot"}',
  NULL,
  'https://www.framer.com/developers',
  false,
  true
);

-- 27. Tavily
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Tavily',
  'tavily',
  'Search API built for AI agents and LLM applications',
  'Tavily provides a search API specifically designed for AI agents and RAG applications. Returns clean, relevant results optimized for LLM consumption — no scraping needed. Used in LangChain, CrewAI, and other agent frameworks as the default search tool.',
  NULL,
  'https://tavily.com',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["1000 searches/mo"]}, {"plan": "Starter", "price": "$40/mo", "features": ["5000 searches/mo"]}, {"plan": "Scale", "price": "$150/mo", "features": ["20K searches/mo", "Priority support"]}]',
  'advanced',
  true,
  '{api}',
  '{"AI-optimized search results", "Clean content extraction", "Real-time web search", "Topic-focused search", "News search", "Site-specific search", "RAG-ready output"}',
  '{"LangChain", "CrewAI", "LlamaIndex", "AutoGPT"}',
  'https://github.com/tavily-ai/tavily-python',
  'https://docs.tavily.com',
  false,
  true
);

-- 28. Bolt.new
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Bolt.new',
  'bolt-new',
  'Prompt-to-app builder that runs a full dev environment in the browser',
  'Bolt.new by StackBlitz runs a full Node.js environment in your browser and uses AI to build complete applications from prompts. Unlike other tools, it installs packages, writes code, and runs the app all in one step. Deploy to Netlify or download the code.',
  NULL,
  'https://bolt.new',
  'freemium',
  '[{"plan": "Free", "price": "$0", "features": ["Limited tokens/day"]}, {"plan": "Pro", "price": "$20/mo", "features": ["10M tokens/mo"]}, {"plan": "Team", "price": "$40/user/mo", "features": ["50M tokens/mo", "Team sharing"]}]',
  'beginner',
  false,
  '{web}',
  '{"Full Node.js in browser", "Prompt-to-app generation", "Package installation", "Live preview", "One-click deploy", "Code download", "Framework support (React, Vue, Svelte)"}',
  '{"Netlify", "GitHub", "StackBlitz"}',
  NULL,
  'https://bolt.new/docs',
  false,
  true
);

-- 29. Whisper
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'Whisper',
  'whisper',
  'Open-source speech recognition by OpenAI — fast and accurate',
  'Whisper is OpenAI''s open-source speech recognition model. It transcribes audio in 99 languages with high accuracy, handles accents and background noise well, and can be run locally or via API. The foundation for many transcription products and workflows.',
  NULL,
  'https://openai.com/research/whisper',
  'free',
  '[{"plan": "Open Source", "price": "$0", "features": ["Run locally", "99 languages", "Full model weights"]}, {"plan": "OpenAI API", "price": "$0.006/min", "features": ["Hosted inference", "Turbo model"]}]',
  'advanced',
  true,
  '{api, cli, desktop}',
  '{"99 language transcription", "Translation to English", "Timestamp generation", "Speaker diarization (via extensions)", "Multiple model sizes", "Local deployment", "Noise-robust"}',
  '{"Python", "Hugging Face", "Replicate", "OpenAI API"}',
  'https://github.com/openai/whisper',
  'https://platform.openai.com/docs/guides/speech-to-text',
  false,
  true
);

-- 30. LangChain
INSERT INTO tools (name, slug, tagline, description, logo_url, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, github_url, docs_url, is_featured, is_published)
VALUES (
  'LangChain',
  'langchain',
  'Framework for building LLM-powered applications and agents',
  'LangChain is the most popular framework for building applications with large language models. It provides abstractions for chains, agents, RAG, memory, and tool use. LangSmith adds observability and testing. Essential for developers building AI-powered products.',
  NULL,
  'https://langchain.com',
  'free',
  '[{"plan": "Open Source", "price": "$0", "features": ["Full framework", "Python + JS"]}, {"plan": "LangSmith", "price": "$39/mo", "features": ["Tracing", "Testing", "Monitoring"]}, {"plan": "Enterprise", "price": "Custom", "features": ["SSO", "SLA", "Dedicated support"]}]',
  'advanced',
  true,
  '{api, cli}',
  '{"LLM chains and agents", "RAG pipelines", "Tool use / function calling", "Memory management", "Document loaders", "Vector store integrations", "LangSmith observability", "LangGraph for complex agents"}',
  '{"OpenAI", "Anthropic", "Pinecone", "Weaviate", "Supabase", "AWS Bedrock"}',
  'https://github.com/langchain-ai/langchain',
  'https://python.langchain.com/docs',
  false,
  true
);

-- ============================================================
-- LINK TOOLS → CATEGORIES
-- ============================================================

-- ChatGPT → Writing & Content, Code & Development, Productivity
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'chatgpt' AND c.slug = 'writing-content'
UNION ALL
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'chatgpt' AND c.slug = 'code-development'
UNION ALL
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'chatgpt' AND c.slug = 'productivity';

-- Claude → Writing & Content, Code & Development, Research & Education
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'claude' AND c.slug = 'writing-content'
UNION ALL
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'claude' AND c.slug = 'code-development'
UNION ALL
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'claude' AND c.slug = 'research-education';

-- Midjourney → Image Generation, Design & UI
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'midjourney' AND c.slug = 'image-generation'
UNION ALL
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'midjourney' AND c.slug = 'design-ui';

-- Cursor → Code & Development
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'cursor' AND c.slug = 'code-development';

-- Notion AI → Productivity, Writing & Content
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'notion-ai' AND c.slug = 'productivity'
UNION ALL
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'notion-ai' AND c.slug = 'writing-content';

-- Perplexity → Research & Education
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'perplexity' AND c.slug = 'research-education';

-- Runway → Video & Audio
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'runway' AND c.slug = 'video-audio';

-- GitHub Copilot → Code & Development
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'github-copilot' AND c.slug = 'code-development';

-- ElevenLabs → Voice & Speech, Video & Audio
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'elevenlabs' AND c.slug = 'voice-speech'
UNION ALL
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'elevenlabs' AND c.slug = 'video-audio';

-- Jasper → Marketing & SEO, Writing & Content
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'jasper' AND c.slug = 'marketing-seo'
UNION ALL
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'jasper' AND c.slug = 'writing-content';

-- Stable Diffusion → Image Generation
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'stable-diffusion' AND c.slug = 'image-generation';

-- Zapier → Automation & Agents, Productivity
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'zapier' AND c.slug = 'automation-agents'
UNION ALL
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'zapier' AND c.slug = 'productivity';

-- Canva → Design & UI, Image Generation
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'canva' AND c.slug = 'design-ui'
UNION ALL
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'canva' AND c.slug = 'image-generation';

-- Grammarly → Writing & Content
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'grammarly' AND c.slug = 'writing-content';

-- v0 → Code & Development, Design & UI
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'v0' AND c.slug = 'code-development'
UNION ALL
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'v0' AND c.slug = 'design-ui';

-- Descript → Video & Audio
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'descript' AND c.slug = 'video-audio';

-- Replit → Code & Development
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'replit' AND c.slug = 'code-development';

-- Otter.ai → Productivity, Voice & Speech
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'otter-ai' AND c.slug = 'productivity'
UNION ALL
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'otter-ai' AND c.slug = 'voice-speech';

-- Hugging Face → Code & Development, Research & Education
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'hugging-face' AND c.slug = 'code-development'
UNION ALL
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'hugging-face' AND c.slug = 'research-education';

-- Copy.ai → Marketing & SEO, Writing & Content
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'copy-ai' AND c.slug = 'marketing-seo'
UNION ALL
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'copy-ai' AND c.slug = 'writing-content';

-- Suno → Video & Audio
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'suno' AND c.slug = 'video-audio';

-- Lovable → Code & Development
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'lovable' AND c.slug = 'code-development';

-- Gamma → Productivity, Design & UI
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'gamma' AND c.slug = 'productivity'
UNION ALL
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'gamma' AND c.slug = 'design-ui';

-- Synthesia → Video & Audio
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'synthesia' AND c.slug = 'video-audio';

-- Supabase → Code & Development
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'supabase' AND c.slug = 'code-development';

-- Framer → Design & UI
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'framer' AND c.slug = 'design-ui';

-- Tavily → Code & Development, Research & Education
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'tavily' AND c.slug = 'code-development'
UNION ALL
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'tavily' AND c.slug = 'research-education';

-- Bolt.new → Code & Development
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'bolt-new' AND c.slug = 'code-development';

-- Whisper → Voice & Speech
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'whisper' AND c.slug = 'voice-speech';

-- LangChain → Code & Development, Automation & Agents
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'langchain' AND c.slug = 'code-development'
UNION ALL
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'langchain' AND c.slug = 'automation-agents';

-- ============================================================
-- LINK TOOLS → TAGS
-- ============================================================

-- ChatGPT tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'chatgpt' AND tg.slug IN ('text-generation', 'code-generation', 'chatbot', 'summarization', 'writing-assistant');

-- Claude tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'claude' AND tg.slug IN ('text-generation', 'code-generation', 'chatbot', 'research', 'writing-assistant');

-- Midjourney tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'midjourney' AND tg.slug IN ('image-generation', 'design');

-- Cursor tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'cursor' AND tg.slug IN ('code-generation', 'automation');

-- Notion AI tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'notion-ai' AND tg.slug IN ('writing-assistant', 'summarization', 'automation');

-- Perplexity tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'perplexity' AND tg.slug IN ('research', 'chatbot', 'summarization');

-- Runway tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'runway' AND tg.slug IN ('video-editing', 'image-generation');

-- GitHub Copilot tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'github-copilot' AND tg.slug IN ('code-generation', 'automation');

-- ElevenLabs tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'elevenlabs' AND tg.slug IN ('voice-cloning', 'transcription', 'api-tool');

-- Jasper tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'jasper' AND tg.slug IN ('copywriting', 'seo', 'email', 'writing-assistant');

-- Stable Diffusion tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'stable-diffusion' AND tg.slug IN ('image-generation', 'open-source', 'api-tool');

-- Zapier tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'zapier' AND tg.slug IN ('automation', 'no-code', 'workflow');

-- Canva tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'canva' AND tg.slug IN ('design', 'image-generation', 'presentation');

-- Grammarly tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'grammarly' AND tg.slug IN ('writing-assistant', 'email');

-- v0 tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'v0' AND tg.slug IN ('code-generation', 'design', 'prototyping');

-- Descript tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'descript' AND tg.slug IN ('video-editing', 'transcription');

-- Replit tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'replit' AND tg.slug IN ('code-generation', 'agent', 'no-code');

-- Otter.ai tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'otter-ai' AND tg.slug IN ('transcription', 'meeting-assistant', 'summarization');

-- Hugging Face tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'hugging-face' AND tg.slug IN ('open-source', 'api-tool', 'fine-tuning', 'rag');

-- Copy.ai tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'copy-ai' AND tg.slug IN ('copywriting', 'email', 'seo', 'workflow');

-- Suno tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'suno' AND tg.slug IN ('music-generation');

-- Lovable tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'lovable' AND tg.slug IN ('code-generation', 'no-code', 'prototyping');

-- Gamma tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'gamma' AND tg.slug IN ('presentation', 'design', 'writing-assistant');

-- Synthesia tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'synthesia' AND tg.slug IN ('video-editing', 'translation');

-- Supabase tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'supabase' AND tg.slug IN ('open-source', 'api-tool', 'rag');

-- Framer tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'framer' AND tg.slug IN ('design', 'no-code', 'prototyping');

-- Tavily tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'tavily' AND tg.slug IN ('api-tool', 'research', 'rag', 'agent');

-- Bolt.new tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'bolt-new' AND tg.slug IN ('code-generation', 'no-code', 'prototyping');

-- Whisper tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'whisper' AND tg.slug IN ('transcription', 'open-source', 'api-tool', 'translation');

-- LangChain tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'langchain' AND tg.slug IN ('agent', 'rag', 'open-source', 'api-tool', 'workflow');

-- ============================================================
-- SET FEATURED TOOLS (top 6 for homepage)
-- ============================================================

UPDATE tools SET is_featured = true WHERE slug IN ('chatgpt', 'claude', 'midjourney', 'cursor', 'perplexity', 'runway');

-- ============================================================
-- SEED: TOOL ALTERNATIVES
-- ============================================================

-- ChatGPT ↔ Claude
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'chatgpt' AND b.slug = 'claude';
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'claude' AND b.slug = 'chatgpt';

-- ChatGPT ↔ Perplexity
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'chatgpt' AND b.slug = 'perplexity';
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'perplexity' AND b.slug = 'chatgpt';

-- Cursor ↔ GitHub Copilot
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'cursor' AND b.slug = 'github-copilot';
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'github-copilot' AND b.slug = 'cursor';

-- Cursor ↔ Replit
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'cursor' AND b.slug = 'replit';
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'replit' AND b.slug = 'cursor';

-- Midjourney ↔ Stable Diffusion
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'midjourney' AND b.slug = 'stable-diffusion';
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'stable-diffusion' AND b.slug = 'midjourney';

-- Runway ↔ Synthesia
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'runway' AND b.slug = 'synthesia';
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'synthesia' AND b.slug = 'runway';

-- Jasper ↔ Copy.ai
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'jasper' AND b.slug = 'copy-ai';
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'copy-ai' AND b.slug = 'jasper';

-- Lovable ↔ Bolt.new
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'lovable' AND b.slug = 'bolt-new';
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'bolt-new' AND b.slug = 'lovable';

-- Lovable ↔ v0
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'lovable' AND b.slug = 'v0';
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'v0' AND b.slug = 'lovable';

-- Descript ↔ Otter.ai
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'descript' AND b.slug = 'otter-ai';
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'otter-ai' AND b.slug = 'descript';

-- Canva ↔ Framer
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'canva' AND b.slug = 'framer';
INSERT INTO tool_alternatives (tool_id, alternative_id)
SELECT a.id, b.id FROM tools a, tools b WHERE a.slug = 'framer' AND b.slug = 'canva';
