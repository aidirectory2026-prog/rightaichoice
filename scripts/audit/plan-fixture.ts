/**
 * Plan-flow audit fixture (Step 48.1 + Step 49.5).
 *
 * 200 hand-crafted prompts covering 8 failure-mode buckets at 25 each.
 * Each prompt is annotated with success criteria so the runner can grade
 * outputs without manual eyeballing every response.
 *
 * Buckets:
 *   1. LONG_RAMBLING        — >150 words, multiple goals buried in context
 *   2. BROKEN_FRAGMENTARY   — typos, missing verbs, garbled
 *   3. MULTI_GOAL           — 2+ explicit goals; none should be silently dropped
 *   4. OFF_TOPIC_BAD_FRAME  — legitimate underlying goal hiding behind awkward framing
 *   5. SLANG_NON_ENGLISH    — mixed language, slang, ESL grammar
 *   6. VAGUE_METAPHORIC     — "blow up my brand"; pick the most common reading
 *   7. SINGLE_WORD          — "podcast" / "app" / "newsletter"
 *   8. CONSOLIDATABLE       — well-formed prompts where ONE tool should cover ≥80%
 *
 * Design decisions:
 *   - Bucket 4 prompts are intentionally awkward but never genuinely harmful.
 *     The audit tests "constructive reinterpretation," not jailbreak handling.
 *   - Bucket 8 is the explicit Step 49 test — over-stacking here is the
 *     failure mode we shipped Slices 1-3 to fix.
 *   - 25 per bucket gives enough sample to spot patterns without overrunning
 *     the rate-limited /api/plan endpoint (5 req/min × 200 prompts = ~40min).
 */

export type FixtureBucket =
  | 'LONG_RAMBLING'
  | 'BROKEN_FRAGMENTARY'
  | 'MULTI_GOAL'
  | 'OFF_TOPIC_BAD_FRAME'
  | 'SLANG_NON_ENGLISH'
  | 'VAGUE_METAPHORIC'
  | 'SINGLE_WORD'
  | 'CONSOLIDATABLE'

export type FixturePrompt = {
  id: string
  bucket: FixtureBucket
  prompt: string
  /** What the user is actually trying to accomplish (for grading off-topic / vague). */
  underlying_intent: string
  /** Acceptable stage-count range. Usually 1-6; tighter for consolidatable. */
  expected_stages: { min: number; max: number }
  /** Whether the planner SHOULD consolidate to a single stage. */
  expected_consolidation: 'single' | 'multi' | 'either'
  /** Goals that must appear in the output (for multi-goal prompts). */
  required_goals?: string[]
  /** Tool slugs that would be a credible primary recommendation. Used as a
   *  loose match — at least one should appear in the stack. */
  credible_primary_tools: string[]
  notes?: string
}

const long = (prompt: string, underlying_intent: string, credible_primary_tools: string[], required_goals?: string[]): Omit<FixturePrompt, 'id' | 'bucket'> => ({
  prompt,
  underlying_intent,
  expected_stages: { min: 1, max: 6 },
  expected_consolidation: 'either',
  credible_primary_tools,
  ...(required_goals ? { required_goals } : {}),
})

// ─────────── Bucket 1: LONG_RAMBLING ───────────

const LONG_RAMBLING: Omit<FixturePrompt, 'id' | 'bucket'>[] = [
  long(
    "So I run a 12-person digital marketing agency, we mostly do client work for B2B SaaS companies, been at it for about 4 years now and we're getting busier than we can handle. Our biggest pain right now is that proposal writing eats my Mondays — I spend like 6 hours every Monday on proposals and they're all kind of similar but each one needs custom tailoring. We also have client onboarding which is a nightmare, takes 2 weeks per client. Plus our internal Slack is getting noisy with 12 people and I think AI could help summarize what I missed when I'm in client calls. Also I've been thinking about starting a podcast about agency life on the side, like in the next 6 months. What AI tools should we be using?",
    "Streamline agency operations: proposal writing, client onboarding, Slack triage, and a podcast launch.",
    ['chatgpt', 'claude', 'notion-ai', 'otter-ai', 'descript'],
    ['proposal writing', 'client onboarding', 'Slack summarization', 'podcast'],
  ),
  long(
    "Hey, I'm a solo founder bootstrapping a B2C mobile app — it's basically a habit tracker but with social accountability features. I've been coding it myself in React Native for the past 8 months and I'm finally close to launching. The thing is, I have zero design skills and the UI looks like programmer art. I also need to write App Store copy, create a marketing site, figure out launch content for Twitter/Reddit, and probably do some user interviews. Oh and I have basically no marketing budget — under $50/mo total. What should I be using?",
    "Polish UI design, write store copy, build marketing site, run pre-launch promotion on tight budget.",
    ['canva-ai', 'chatgpt', 'framer', 'figma'],
    ['UI design', 'App Store copy', 'marketing site', 'launch promotion'],
  ),
  long(
    "I'm a high school English teacher, been teaching for 11 years. My district just told us we need to integrate AI into our curriculum but they didn't give us any guidance or budget. I have 5 classes of 28 students each — that's 140 students. I want to use AI to help me grade essays faster (right now I spend like 12 hours every weekend on grading), help students with their writing without them just copy-pasting from ChatGPT, maybe make some lesson plans about AI literacy itself, and possibly create some interactive activities. I'm not super technical but I'm willing to learn. Free or cheap tools preferred.",
    "Use AI for essay grading, student writing assistance with anti-cheating, AI-literacy lessons, interactive activities — on a teacher budget.",
    ['chatgpt', 'claude', 'grammarly'],
    ['grading', 'student writing assistance', 'lesson plans'],
  ),
  long(
    "I'm a freelance video editor working mostly with YouTubers, like creators in the 50K-500K subscriber range. I edit about 4-6 videos a week. The bottleneck for me is rough cuts — I watch through 2-3 hours of raw footage and find the moments worth keeping, then assemble them. That's like 60% of my time per project. I've heard about AI tools that can do auto-cuts based on transcripts. I also do a lot of YouTube Shorts repurposing where I have to find the viral moments in long videos. Any ideas?",
    "Speed up rough cuts and short-form repurposing for YouTube editing.",
    ['descript', 'opus-clip', 'capcut'],
  ),
  long(
    "OK so a friend and I are starting a podcast next month, we're complete beginners. The topic is going to be about pop psychology and self-help books — we read one a week and review it. Neither of us has audio production experience. We have decent USB mics but our home offices are pretty echoey. We want to publish on Spotify and Apple, and we'd like clips for Instagram and TikTok. Budget is tight, like $30/mo combined. We'd love to use AI for everything we can.",
    "Podcast audio cleanup, distribution, and short-form clips on a $30/mo budget.",
    ['descript', 'opus-clip', 'capcut'],
  ),
  long(
    "I'm a small e-commerce store owner — I sell handmade leather goods on Shopify, do about $25K/mo in revenue. I write all my own product descriptions and they take forever (60-90 min per product, and I add 10-15 new products per month). I also need to do product photography editing — currently I shoot photos and remove backgrounds manually. I write my own email newsletter once a week and it's painful. Plus customer service is starting to take 2-3 hours a day. I'm not technical at all.",
    "Speed up product descriptions, photo editing, newsletter writing, and customer service for a Shopify store.",
    ['chatgpt', 'photoroom', 'canva-ai'],
    ['product descriptions', 'photo editing', 'newsletter', 'customer service'],
  ),
  long(
    "Looking for advice — I'm an indie game developer working on a 2D pixel-art platformer. I'm a programmer, not an artist. I've been hand-pixeling sprites for 6 months and it's the slowest part of my workflow. I'd love AI help for sprite generation, level concept art, and some music for the game. I'm also writing a devlog blog and need to keep that updated. Budget is around $50/mo total.",
    "Pixel-art sprite generation, concept art, music, and devlog content for an indie game on $50/mo.",
    ['leonardo-ai', 'midjourney', 'suno'],
  ),
  long(
    "I'm a corporate L&D manager at a mid-size SaaS company (about 800 employees). I create training videos for our sales and customer success teams. We're switching from old-school screen recordings to something more polished — ideally with avatars or animated explanations. We have a budget for tools but it goes through procurement so something like $50-150/mo per seat is fine. The training library has about 80 videos and I'm the only one updating them.",
    "Polished training video production for an enterprise L&D team — avatars or animated explainers preferred.",
    ['synthesia', 'heygen'],
  ),
  long(
    "Real estate agent here, been at it 3 years, work in a Tier-2 city. My biggest time sinks are: writing property descriptions for listings (I have like 12-15 active listings at any time), creating social media content (Instagram and Facebook) to attract buyers, and following up with leads from my CRM. I also want to start sending a weekly newsletter to past clients. I'm not techy but I'm willing to learn one tool deeply.",
    "Listing descriptions, social media, lead follow-ups, and newsletter for a real estate agent.",
    ['chatgpt', 'canva-ai'],
    ['property descriptions', 'social media', 'lead follow-ups', 'newsletter'],
  ),
  long(
    "I'm building an internal tool for my company — we're a logistics company with 200 trucks. The tool is supposed to help dispatchers route trucks more efficiently using historical data. I'm a backend dev (Python, mostly) but I have to also build a React frontend and I haven't done React in 5 years. Need AI help with: getting up to speed on modern React, writing the React code itself, and probably some pair-programming-style help during architecture decisions.",
    "Get a backend dev up to speed on modern React with AI pair-programming + code generation help.",
    ['cursor', 'claude-code', 'github-copilot'],
  ),
  long(
    "Hi, I'm a PhD candidate in molecular biology, last year of my dissertation. I'm drowning in literature — there's a 30-paper backlog I need to read, summarize, and integrate into my lit review. I also need to write the lit review chapter (~8000 words), prep for my defense slides, and continue running experiments. I have a stipend so budget is real ($20-30/mo max). I want to spend time on actual science, not on reading.",
    "Speed up literature review, write the chapter, prep defense slides for a PhD candidate on $20-30/mo.",
    ['elicit', 'claude', 'gamma'],
    ['literature review', 'chapter writing', 'defense slides'],
  ),
  long(
    "I run a YouTube channel about personal finance, currently at 80K subscribers. I publish 2 long-form videos per week. My production workflow is: research a topic for 4 hours, write a script (3 hours), record (1 hour), edit (5 hours per video). The bottleneck is research and scripting — I'd love to cut those to 2 hours combined. I also want to do daily Shorts but can't keep up. I want my videos to remain factually solid; financial misinformation is a real concern.",
    "Speed up research + scripting for a finance YouTube channel without sacrificing accuracy; add daily Shorts.",
    ['perplexity', 'claude', 'opus-clip'],
  ),
  long(
    "I'm a product manager at a Series B fintech, leading a team of 4 engineers and 1 designer. I spend most of my week in meetings, writing PRDs, and reviewing competitor releases. I'd like AI to help with: meeting notes (especially when I'm half-distracted), drafting PRDs from rough notes, monitoring competitor product changes, and turning user research interviews into themes.",
    "Meeting notes, PRD drafting, competitor monitoring, and user research synthesis for a fintech PM.",
    ['granola', 'claude', 'otter-ai'],
    ['meeting notes', 'PRD drafting', 'competitor monitoring', 'user research synthesis'],
  ),
  long(
    "Mom of two trying to start a side business selling printable planners on Etsy. I have about 5 hours a week to work on this. I want to design the planners (I have basic Canva skills), write listing copy and SEO descriptions, run an Instagram account about productivity, and eventually maybe a small email list. Total budget for tools is $20/mo, hard limit.",
    "Etsy planner business with design, listing copy, Instagram, and an email list — 5 hrs/week, $20/mo budget.",
    ['canva-ai', 'chatgpt'],
  ),
  long(
    "I'm a clinical psychologist in private practice, see 20 clients a week. The note-taking after sessions is killing me — 2 hours of notes per day on top of seeing clients. I'm worried about HIPAA compliance with random AI tools. I also write a monthly newsletter for clients and an occasional LinkedIn post about mental health topics. Strong privacy preference.",
    "HIPAA-compliant clinical note assistance + newsletter + LinkedIn for a private-practice therapist.",
    ['otter-ai', 'claude'],
    ['clinical notes', 'newsletter', 'LinkedIn posts'],
  ),
  long(
    "I'm a software architecture consultant — I parachute into companies for 4-12 week engagements and write big strategy documents. The reports I produce are 30-50 pages of analysis with diagrams. My pain points: I have a backlog of architecture interview transcripts I haven't synthesized, I need to generate diagrams from text descriptions, and I'd like AI to help me draft the actual report sections from my notes. Heavy reader, light watcher.",
    "Synthesize transcripts, generate architecture diagrams, draft long-form strategy reports for a consultant.",
    ['claude', 'chatgpt'],
  ),
  long(
    "Running a 4-person law firm specializing in immigration. We process about 200 cases a year. The painful parts are: drafting standard motion templates (we have ~40 templates and they each need case-specific edits), translating client documents (we work with Spanish, Portuguese, and Mandarin speakers), researching recent USCIS policy changes, and intake forms. We're budget-conscious — under $100/mo per attorney.",
    "Motion drafting, translation, USCIS research, and intake automation for an immigration law firm.",
    ['claude', 'chatgpt', 'deepl'],
    ['motion drafting', 'translation', 'policy research', 'intake'],
  ),
  long(
    "Founder of a 6-person early-stage startup, we're building a B2B analytics platform. My job has become 60% sales, 30% recruiting, 10% product. For sales: I need help writing personalized cold emails (I send 50/week), prepping for demos, and following up on calls. For recruiting: writing JDs, screening resumes, drafting outreach to passive candidates. I want one or two tools, not five.",
    "Sales personalization + recruiting workflow for an early-stage startup founder, prefers minimal tool stack.",
    ['chatgpt', 'claude'],
    ['cold emails', 'demo prep', 'JDs', 'recruiting outreach'],
  ),
  long(
    "I'm a freelance UX designer, mostly work with healthtech startups. My current pain points: creating user flow diagrams from interview notes (right now I do this in Figma manually and it's slow), writing case studies for my portfolio (I have 8 case studies to write and dread it), and prepping client presentations. I'm in Figma 6 hours a day already so anything that integrates there is a plus.",
    "User flow diagrams, portfolio case studies, and client presentations for a freelance UX designer.",
    ['figma', 'chatgpt', 'gamma'],
  ),
  long(
    "Hey, I'm a 60-year-old retiring soon and I want to start a substack about my career as a foreign-service officer. I have 35 years of stories. I'm not techy but I can write OK. I want to publish weekly. I'm worried about: (1) AI making it sound robotic, (2) figuring out what platform to use beyond Substack, (3) repurposing posts to LinkedIn. Looking for something simple and one-shot.",
    "Newsletter authoring + LinkedIn repurposing for a retiree starting a Substack — keep it simple, preserve voice.",
    ['lex', 'claude'],
  ),
  long(
    "I'm a data analyst at a mid-size retailer, mostly Excel + SQL. I spend a lot of time cleaning messy CSVs that come from store managers, writing recurring reports nobody reads, and answering ad-hoc questions from leadership. I'd love a tool that lets me throw a CSV at it and ask questions, and another that helps me write recurring reports faster.",
    "CSV chat + recurring report generation for a retail data analyst in Excel/SQL world.",
    ['chatgpt', 'claude'],
  ),
  long(
    "Working on a cookbook — yes a real cookbook, not a blog. I'm a recipe developer with 70 tested recipes. I need help: writing headnotes (the little stories before each recipe), styling the manuscript, generating images for recipes I haven't shot yet, and creating a marketing one-pager for publishers. Budget around $40/mo.",
    "Cookbook headnotes, manuscript styling, recipe images, and publisher pitch deck.",
    ['claude', 'midjourney', 'gamma'],
    ['headnotes', 'manuscript', 'recipe images', 'pitch deck'],
  ),
  long(
    "I'm a beginner Rust programmer trying to learn by building a small CLI tool for managing my reading list. I keep getting stuck on borrow-checker errors and I can never remember the syntax. I also want to write a blog post about my learning journey for each milestone. I have a $10/mo budget and a lot of patience.",
    "Help a beginner Rust learner with code + writing a learning blog on $10/mo.",
    ['claude', 'cursor', 'github-copilot'],
  ),
  long(
    "Running a non-profit youth mentoring program. We have 40 mentor-mentee pairs. My job is matching them, training mentors, scheduling, sending reminders, and writing impact reports for our board. I have a part-time admin who can do tasks but my brain is the bottleneck on writing. The board reports are 8-10 pages, quarterly. We're a non-profit so budget is tight.",
    "Youth mentoring program ops + impact reporting for a non-profit on tight budget.",
    ['chatgpt', 'claude'],
    ['matching', 'training', 'scheduling', 'impact reports'],
  ),
  long(
    "I'm a professional Twitch streamer (gaming category, ~3K concurrent viewers). My production needs: (1) thumbnails for VOD highlights uploaded to YouTube, (2) clip-finding for daily Shorts, (3) chat moderation, (4) writing scripts for sponsored segments. I stream 5 hours/day, 6 days a week. I have stream income to spend on tools — up to $200/mo total.",
    "Thumbnails, clip-finding, chat moderation, and sponsored-segment scripts for a full-time Twitch streamer.",
    ['canva-ai', 'opus-clip', 'chatgpt'],
    ['thumbnails', 'clips', 'moderation', 'sponsor scripts'],
  ),
]

// ─────────── Bucket 2: BROKEN_FRAGMENTARY ───────────

const BROKEN: Omit<FixturePrompt, 'id' | 'bucket'>[] = [
  long("song ai gf voice make pls", "Generate a song with a cloned voice as a gift for a girlfriend.", ['suno', 'elevenlabs']),
  long("voice clone audiobook me record", "Clone the user's voice for narrating an audiobook.", ['elevenlabs', 'descript']),
  long("vid edit shorts youtub fast", "Quickly edit shorts/clips from YouTube videos.", ['opus-clip', 'capcut']),
  long("logo small biz cheap", "Create a logo for a small business cheaply.", ['canva-ai', 'midjourney', 'ideogram']),
  long("write blog seo no chatgpt", "Write SEO-optimized blog content using something other than ChatGPT.", ['claude', 'jasper']),
  long("transcribe meeting record automatic", "Auto-transcribe recorded meetings.", ['otter-ai', 'fireflies-ai']),
  long("ai code help noob python", "Help a beginner with Python code.", ['claude', 'cursor', 'chatgpt']),
  long("img generate anime style free", "Generate anime-style images for free.", ['stable-diffusion', 'leonardo-ai']),
  long("automation zapier alternative cheap", "Find a cheaper alternative to Zapier.", ['make', 'n8n']),
  long("make app no code idea startup", "Build an app with no-code for a startup idea.", ['bolt-new', 'lovable']),
  long("text image dalle replacement", "Find a replacement for DALL-E for text-to-image.", ['midjourney', 'flux-ai', 'ideogram']),
  long("research papers fast phd", "Speed up academic paper research for a PhD.", ['elicit', 'consensus']),
  long("podcast notes auto summarize", "Auto-summarize podcast episodes into notes.", ['otter-ai', 'descript']),
  long("voice over video animation", "Add a voice-over to an animated video.", ['elevenlabs', 'play-ht']),
  long("study notes ai pdf upload", "Get AI to help study from uploaded PDFs.", ['claude', 'chatpdf']),
  long("instagram captions hashtag generator", "Generate Instagram captions and hashtags.", ['chatgpt', 'copy-ai']),
  long("translate korean english accurate", "Translate Korean to English accurately.", ['claude', 'chatgpt']),
  long("bg remove image batch", "Batch-remove image backgrounds.", ['photoroom', 'adobe-firefly']),
  long("invoice template ai customize", "Customize invoice templates with AI.", ['canva-ai', 'chatgpt']),
  long("midjourney prompt help generator", "Generate Midjourney prompts.", ['chatgpt', 'claude']),
  long("twitter thread automation grow", "Automate Twitter threads to grow following.", ['chatgpt', 'copy-ai']),
  long("voice change anonymize discord", "Change/anonymize voice for Discord/streaming.", ['elevenlabs']),
  long("stock photo not generic boring", "Find non-generic stock photos.", ['adobe-firefly', 'midjourney']),
  long("excel formula generator complex", "Generate complex Excel formulas.", ['chatgpt', 'claude']),
  long("write rap lyric trap beat", "Write trap-style rap lyrics.", ['suno', 'chatgpt']),
]

// ─────────── Bucket 3: MULTI_GOAL ───────────

const MULTI_GOAL: Omit<FixturePrompt, 'id' | 'bucket'>[] = [
  long("I want to start a YouTube channel and also automate my email marketing.", "YouTube channel + email automation.", ['descript', 'chatgpt'], ['YouTube channel', 'email automation']),
  long("Help me build a SaaS landing page and write the launch email sequence.", "Landing page + launch email sequence.", ['framer', 'chatgpt'], ['landing page', 'email sequence']),
  long("I need to write a novel and also create a book cover and a marketing plan.", "Novel writing + book cover + marketing plan.", ['sudowrite', 'midjourney', 'chatgpt'], ['novel', 'book cover', 'marketing plan']),
  long("Want to make AI art for my Etsy store, write product descriptions, and run targeted Instagram ads.", "AI art + product descriptions + Instagram ads.", ['midjourney', 'chatgpt', 'canva-ai'], ['AI art', 'product descriptions', 'Instagram ads']),
  long("Need to transcribe podcast episodes, generate clips for TikTok, and write show notes.", "Transcription + short-form clips + show notes.", ['descript', 'opus-clip'], ['transcription', 'clips', 'show notes']),
  long("I'm building an MVP — need help with frontend code, designing the UI, and writing copy.", "MVP frontend code + UI design + copy.", ['cursor', 'figma', 'chatgpt'], ['frontend code', 'UI design', 'copy']),
  long("Looking to clone my voice for an audiobook AND write the script AND design the cover.", "Voice cloning + script + cover design.", ['elevenlabs', 'claude', 'midjourney'], ['voice cloning', 'script', 'cover']),
  long("Want to learn Spanish, automate language flashcards, and chat with a Spanish tutor AI.", "Spanish learning + flashcards + tutor AI.", ['chatgpt', 'claude'], ['Spanish learning', 'flashcards', 'tutor']),
  long("Need to research my dissertation, write chapter drafts, and create defense slides.", "Research + chapter drafting + defense slides.", ['elicit', 'claude', 'gamma'], ['research', 'drafting', 'defense slides']),
  long("Build me a meal-planning app, design the icons, and create a launch promo video.", "App build + icon design + promo video.", ['lovable', 'midjourney', 'runway'], ['app build', 'icons', 'promo video']),
  long("I want to refine my LinkedIn profile, write 30 posts, and run automated DM outreach.", "Profile refinement + 30 posts + DM outreach.", ['chatgpt', 'copy-ai'], ['profile', 'posts', 'DM outreach']),
  long("Generate a brand identity (logo, colors, font), write the website copy, and build a Shopify store.", "Brand identity + website copy + Shopify build.", ['ideogram', 'chatgpt', 'canva-ai'], ['brand identity', 'website copy', 'Shopify']),
  long("Help me record a screencast tutorial series, edit the videos, and write study guides.", "Screencast + editing + study guides.", ['descript', 'capcut', 'claude'], ['screencast', 'editing', 'study guides']),
  long("Train a custom voice for my AI assistant, write its dialog responses, and ship it as a phone app.", "Custom voice + dialog + phone app.", ['elevenlabs', 'chatgpt', 'lovable'], ['custom voice', 'dialog', 'phone app']),
  long("Translate my course materials to French, generate quiz questions, and create a marketing landing page.", "Translation + quiz generation + landing page.", ['claude', 'chatgpt', 'framer'], ['translation', 'quiz', 'landing page']),
  long("I run a yoga studio — need to manage class schedules, generate Instagram content, and run an email newsletter.", "Schedule mgmt + IG content + newsletter.", ['chatgpt', 'canva-ai'], ['schedule', 'IG content', 'newsletter']),
  long("Generate music for my game, design pixel art sprites, and write a launch trailer script.", "Game music + pixel art + trailer script.", ['suno', 'leonardo-ai', 'chatgpt'], ['music', 'pixel art', 'trailer script']),
  long("Create training videos with avatars, translate them to Spanish, and quiz employees on the content.", "Avatar videos + translation + quizzes.", ['heygen', 'synthesia', 'chatgpt'], ['avatar videos', 'translation', 'quizzes']),
  long("Help me build a web scraper, store the data in a database, and create a dashboard.", "Web scraper + DB + dashboard.", ['cursor', 'claude-code'], ['scraper', 'database', 'dashboard']),
  long("I want to write a memoir, create cover concepts, and build an email list around it.", "Memoir + cover concepts + email list.", ['sudowrite', 'midjourney', 'chatgpt'], ['memoir', 'cover concepts', 'email list']),
  long("Need to refine product photos, write SEO descriptions, and run Pinterest ads.", "Photo refinement + SEO copy + Pinterest ads.", ['photoroom', 'chatgpt'], ['photos', 'SEO copy', 'Pinterest ads']),
  long("Plan a wedding website, write personalized invitations, and create a slideshow for the reception.", "Wedding website + invitations + slideshow.", ['framer', 'chatgpt', 'gamma'], ['website', 'invitations', 'slideshow']),
  long("Build a Discord bot, generate avatar art for it, and write the server welcome guide.", "Discord bot + avatar art + welcome guide.", ['cursor', 'midjourney', 'chatgpt'], ['Discord bot', 'avatar', 'welcome guide']),
  long("Coach 12 clients via voice notes — transcribe them, summarize, and draft follow-up plans.", "Voice transcription + summary + follow-up plans for coaching.", ['otter-ai', 'claude'], ['transcription', 'summary', 'follow-up plans']),
  long("I want to start a Substack and ALSO repurpose each post into a LinkedIn carousel and Twitter thread.", "Substack writing + LinkedIn carousels + Twitter threads.", ['lex', 'canva-ai', 'chatgpt'], ['Substack', 'LinkedIn carousels', 'Twitter threads']),
]

// ─────────── Bucket 4: OFF_TOPIC_BAD_FRAME ───────────
// All have a legitimate underlying intent. Planner must redirect, never refuse.

const OFF_TOPIC: Omit<FixturePrompt, 'id' | 'bucket'>[] = [
  long("how to make my ex jealous with ai", "Self-improvement and content creation projecting confidence (the legitimate underlying goal).", ['canva-ai', 'chatgpt']),
  long("revenge website on bad landlord", "Document and publish a critical review or tenant-rights blog about a bad landlord experience.", ['framer', 'chatgpt']),
  long("how to fake a girlfriend on instagram", "Practice social media confidence, dating profile optimization, or creative photo content.", ['canva-ai', 'midjourney']),
  long("write essay so professor doesnt know its ai", "Improve writing skills and produce a polished, original essay.", ['grammarly', 'claude']),
  long("clone my coworkers voice for prank", "Voice cloning for legitimate creative or audiobook purposes.", ['elevenlabs']),
  long("scrape my competitors entire site", "Conduct legal competitive research using public information.", ['perplexity', 'chatgpt']),
  long("make me look 10 years younger photo", "Standard photo retouching and enhancement.", ['adobe-firefly', 'photoroom']),
  long("ai to flirt for me on dating apps", "Improve conversation starters and profile copy.", ['chatgpt', 'copy-ai']),
  long("i want my book to go viral on tiktok", "Build a book-marketing TikTok strategy with short-form content.", ['opus-clip', 'capcut', 'chatgpt']),
  long("get rich quick using ai", "Build a sustainable AI-leveraged side business.", ['chatgpt', 'claude']),
  long("hack the youtube algorithm", "Improve YouTube SEO, thumbnails, and content strategy.", ['chatgpt', 'canva-ai']),
  long("manipulate google search rankings", "Build white-hat SEO content and authority.", ['claude', 'chatgpt']),
  long("trick my boss into giving me a raise", "Build a compelling case for a raise with documented impact.", ['chatgpt', 'claude']),
  long("write a fake review for my own product", "Generate authentic-sounding marketing copy and testimonials from real feedback.", ['chatgpt', 'copy-ai']),
  long("ai to write my college admissions essay", "Brainstorm + edit + polish a college admissions essay.", ['claude', 'grammarly']),
  long("steal viral tweet ideas reverse engineer", "Analyze top-performing content for patterns and create original content in that style.", ['perplexity', 'chatgpt']),
  long("ai gf chatbot make her say things", "Build a custom AI companion for casual conversation practice.", ['chatgpt', 'claude']),
  long("how to spy on my kids phone with ai", "Reasonable parental monitoring; not malicious surveillance.", ['chatgpt']),
  long("ai to argue with people online", "Practice debate, build well-structured arguments.", ['claude', 'chatgpt']),
  long("write angry email but make me look right", "Draft a measured but firm email that makes a clear case.", ['claude', 'grammarly']),
  long("automated bot army for my startup", "Set up legitimate marketing automation and scheduling tools.", ['zapier', 'make']),
  long("how do i pretend i know about ai in interviews", "Quickly skill up on AI concepts before interviews.", ['chatgpt', 'claude']),
  long("ai to gaslight my coworker into agreeing", "Build a persuasive case and present it well.", ['claude', 'chatgpt']),
  long("clone my professor for unlimited tutoring", "Use AI tutors for additional learning support.", ['chatgpt', 'claude']),
  long("ai to make me funnier on twitter", "Improve short-form humor writing and engagement.", ['chatgpt', 'copy-ai']),
]

// ─────────── Bucket 5: SLANG_NON_ENGLISH ───────────

const SLANG: Omit<FixturePrompt, 'id' | 'bucket'>[] = [
  long("yo i tryna build a website but i aint know jack abt code", "Build a website without code knowledge.", ['framer', 'lovable', 'bolt-new']),
  long("bruv i need ai to write my dissertation innit", "Write a dissertation with AI assistance.", ['claude', 'chatgpt']),
  long("ola necesito una herramienta para hacer videos cortos para tiktok", "Need a tool to make short TikTok videos.", ['capcut', 'opus-clip']),
  long("je veux faire un podcast mais je sais pas par où commencer", "Start a podcast from scratch.", ['descript', 'capcut']),
  long("aaj kal ai se kya kaam ho sakta hai for indian small business", "What can AI do for an Indian small business?", ['chatgpt', 'canva-ai']),
  long("fr fr i need ai to slay my cv applications", "Improve CV/resume for job applications.", ['chatgpt', 'claude']),
  long("ich brauche eine ki um mein onlineshop zu starten", "Need AI to start an online shop.", ['chatgpt', 'canva-ai']),
  long("lowkey wanna automate all my boring admin work", "Automate routine administrative tasks.", ['zapier', 'make']),
  long("我想用 ai 写小说但是不要太机器", "Want to use AI to write a novel but not too robotic.", ['sudowrite', 'claude']),
  long("ngl this whole ai thing got me lost where do i even start", "Get oriented as an AI beginner.", ['chatgpt', 'claude']),
  long("preciso fazer um logo bonito mas sem dinheiro", "Need to make a nice logo without spending money.", ['canva-ai', 'ideogram']),
  long("watashi wa eigo no shukudai o ai de sukoshi tetsudatte", "Get a little help with English homework via AI.", ['chatgpt', 'grammarly']),
  long("besties pls help me find ai for my onlyfans content i mean photos", "Photo enhancement and content creation.", ['midjourney', 'photoroom']),
  long("eyy bro how to make ai write my whole novel cmon", "Use AI to write a novel.", ['sudowrite', 'claude']),
  long("aiyo can ai do my interior design ah", "Use AI for interior design ideas.", ['midjourney', 'chatgpt']),
  long("habibi i need ai for arabic content marketing", "AI tools for Arabic-language content marketing.", ['chatgpt', 'claude']),
  long("wsg gng need a ai bot to slide into recruiter dms", "Compose recruiter outreach messages.", ['chatgpt', 'claude']),
  long("vsem privet pomogite naiti ai dlya prezentatsii", "Find AI for making presentations.", ['gamma', 'beautiful-ai']),
  long("kya hua bro ai se reels banana sikhao", "Teach me to make reels with AI.", ['capcut', 'opus-clip']),
  long("annyeong ai으로 음악 만들고 싶은데 추천", "Want to make music with AI, recommendations?", ['suno', 'udio']),
  long("idk if im stupid but how do i ai for taxes", "Use AI for tax-related help (research/organization, not advice).", ['chatgpt', 'claude']),
  long("merci de m'aider à trouver un assistant ia pour mon cabinet médical", "Find an AI assistant for a medical practice.", ['otter-ai', 'claude']),
  long("ola moça quero criar conteudo sobre culinaria com ai", "Want to create cooking content with AI.", ['chatgpt', 'midjourney']),
  long("dawg how do i ai my way out of this cs homework", "Get help with computer science homework.", ['claude', 'cursor']),
  long("cuz i need ai to help me do this design project ugh", "AI help with a design project.", ['figma', 'midjourney']),
]

// ─────────── Bucket 6: VAGUE_METAPHORIC ───────────

const VAGUE: Omit<FixturePrompt, 'id' | 'bucket'>[] = [
  long("blow up my brand", "Grow brand visibility on social media.", ['canva-ai', 'opus-clip', 'chatgpt']),
  long("make money with ai", "Build an AI-leveraged side income.", ['chatgpt', 'claude']),
  long("ten x my productivity", "Use AI tools to multiply personal productivity.", ['notion-ai', 'claude']),
  long("crush my competition", "Conduct competitive analysis and improve positioning.", ['perplexity', 'chatgpt']),
  long("level up my marketing", "Improve marketing across channels with AI.", ['chatgpt', 'canva-ai']),
  long("automate my life", "Automate personal/work routines.", ['zapier', 'make']),
  long("become a content machine", "Build a high-volume content production workflow.", ['chatgpt', 'opus-clip']),
  long("escape the 9 to 5", "Build sustainable side income / freelancing setup.", ['chatgpt', 'claude']),
  long("get internet famous", "Grow social media presence.", ['canva-ai', 'capcut']),
  long("think like a billionaire", "Get strategic advice and frameworks.", ['claude', 'chatgpt']),
  long("scale to seven figures", "Scale a business to seven-figure revenue.", ['chatgpt', 'claude']),
  long("be more like elon musk", "Productivity, communication, and decision-making improvements.", ['claude', 'chatgpt']),
  long("dominate my niche", "Become a leading authority in a niche.", ['chatgpt', 'perplexity']),
  long("transform my business", "Modernize a business with AI.", ['chatgpt', 'zapier']),
  long("hack growth", "Use growth-hacking tactics.", ['chatgpt', 'copy-ai']),
  long("ride the ai wave", "Adopt AI tools for personal/business use.", ['chatgpt', 'claude']),
  long("future proof my career", "Skill up for an AI-augmented future.", ['chatgpt', 'claude']),
  long("disrupt an industry", "Identify and execute a disruption strategy.", ['perplexity', 'claude']),
  long("get my time back", "Reclaim time via automation.", ['zapier', 'chatgpt']),
  long("supercharge my workflow", "Boost workflow speed with AI.", ['notion-ai', 'claude']),
  long("become unstoppable", "General self-improvement / productivity.", ['claude', 'chatgpt']),
  long("the new normal but with ai", "Adopt modern AI workflows.", ['chatgpt', 'claude']),
  long("game changer for my agency", "Find an AI tool that materially helps an agency.", ['chatgpt', 'claude']),
  long("unicorn startup speedrun", "Build a startup quickly.", ['lovable', 'chatgpt']),
  long("the holy grail of automation", "Find a powerful automation solution.", ['zapier', 'n8n']),
]

// ─────────── Bucket 7: SINGLE_WORD ───────────

const SINGLE_WORD: Omit<FixturePrompt, 'id' | 'bucket'>[] = [
  long("podcast", "Start a podcast.", ['descript', 'capcut']),
  long("app", "Build an app.", ['lovable', 'bolt-new']),
  long("newsletter", "Start a newsletter.", ['chatgpt', 'lex']),
  long("youtube", "Start a YouTube channel.", ['descript', 'opus-clip']),
  long("startup", "Start a startup.", ['chatgpt', 'lovable']),
  long("blog", "Start a blog.", ['chatgpt', 'claude']),
  long("ecommerce", "Start an e-commerce store.", ['canva-ai', 'chatgpt']),
  long("course", "Create an online course.", ['chatgpt', 'gamma']),
  long("design", "Design something.", ['canva-ai', 'figma']),
  long("automation", "Set up automation.", ['zapier', 'make']),
  long("research", "Conduct research.", ['perplexity', 'elicit']),
  long("video", "Create video content.", ['runway', 'descript']),
  long("photo", "Edit / create photos.", ['photoroom', 'midjourney']),
  long("music", "Make music.", ['suno', 'udio']),
  long("game", "Make a game.", ['chatgpt', 'leonardo-ai']),
  long("book", "Write a book.", ['sudowrite', 'claude']),
  long("logo", "Design a logo.", ['ideogram', 'canva-ai']),
  long("website", "Build a website.", ['framer', 'lovable']),
  long("resume", "Write/improve a resume.", ['chatgpt', 'claude']),
  long("translation", "Translate something.", ['chatgpt', 'claude']),
  long("transcription", "Transcribe audio.", ['whisper', 'otter-ai']),
  long("diagram", "Create a diagram.", ['claude', 'chatgpt']),
  long("interview", "Prepare for an interview.", ['chatgpt', 'claude']),
  long("ad", "Create an ad.", ['copy-ai', 'canva-ai']),
  long("email", "Improve email writing.", ['chatgpt', 'grammarly']),
]

// ─────────── Bucket 8: CONSOLIDATABLE ───────────
// Well-formed prompts where ONE tool's tier should cover ≥80%.
// These are the explicit Step 49 test — over-stacking here means
// consolidation is broken.

const CONSOLIDATABLE: Omit<FixturePrompt, 'id' | 'bucket'>[] = [
  {
    prompt: "I want to research a topic, write a 2000-word report, and add some images to it.",
    underlying_intent: "Research + writing + image generation — all covered by ChatGPT Plus.",
    expected_stages: { min: 1, max: 2 },
    expected_consolidation: 'single',
    credible_primary_tools: ['chatgpt'],
    notes: 'ChatGPT Plus covers all three. Multi-stage = over-stacking.',
  },
  {
    prompt: "Help me draft a long-form article and explain my reasoning.",
    underlying_intent: "Long-form writing with reasoning — Claude is enough.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['claude', 'chatgpt'],
  },
  {
    prompt: "I want to write code, refactor existing code, and have it explained as I go.",
    underlying_intent: "Code authoring + refactoring + explanation — Cursor or Claude Code alone.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['cursor', 'claude-code'],
  },
  {
    prompt: "Generate stylized images for my blog and refine them iteratively.",
    underlying_intent: "Image gen + refinement — Midjourney covers both.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['midjourney'],
  },
  {
    prompt: "Web research with citations, plus chat-style follow-up questions.",
    underlying_intent: "Research + chat — Perplexity Pro covers both.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['perplexity'],
  },
  {
    prompt: "I want to record meetings, get transcripts, and AI summaries.",
    underlying_intent: "Meeting transcription + summary — Otter or Granola alone.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['otter-ai', 'granola', 'fireflies-ai'],
  },
  {
    prompt: "Need to clone my voice for narrating a personal audiobook.",
    underlying_intent: "Voice cloning — ElevenLabs alone.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['elevenlabs'],
  },
  {
    prompt: "Generate a song with vocals and lyrics.",
    underlying_intent: "Music generation with vocals — Suno alone.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['suno'],
  },
  {
    prompt: "I want to chat with my long PDFs and get answers with citations.",
    underlying_intent: "PDF Q&A — Claude or ChatPDF.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['claude', 'chatpdf', 'humata'],
  },
  {
    prompt: "Build me a simple web app from a description.",
    underlying_intent: "Prompt-to-app — Bolt.new or Lovable alone.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['bolt-new', 'lovable', 'replit'],
  },
  {
    prompt: "Generate an AI talking-head video from a script.",
    underlying_intent: "Avatar video — HeyGen or Synthesia alone.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['heygen', 'synthesia'],
  },
  {
    prompt: "Write product descriptions for my Etsy shop and rewrite them in different tones.",
    underlying_intent: "Marketing copy + tone variation — ChatGPT or Copy.ai alone.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['chatgpt', 'copy-ai', 'jasper'],
  },
  {
    prompt: "Repurpose long YouTube videos into TikTok shorts automatically.",
    underlying_intent: "Long-to-short repurposing — Opus Clip alone.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['opus-clip'],
  },
  {
    prompt: "I want grammar checks and rewrite suggestions across all the apps I use.",
    underlying_intent: "Browser-wide grammar + rewrite — Grammarly alone.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['grammarly'],
  },
  {
    prompt: "Generate a slide deck from a one-paragraph description.",
    underlying_intent: "Prompt-to-slides — Gamma alone.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['gamma', 'tome'],
  },
  {
    prompt: "Connect my apps so a Stripe charge automatically creates a Notion entry.",
    underlying_intent: "Cross-app automation — Zapier or Make alone.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['zapier', 'make', 'n8n'],
  },
  {
    prompt: "I want a code IDE that suggests completions as I type.",
    underlying_intent: "IDE completions — Copilot or Codeium.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['github-copilot', 'codeium', 'cursor'],
  },
  {
    prompt: "Find the moments in my customer interview recordings that mention pricing pain.",
    underlying_intent: "Interview transcription + theme search — Otter or Fireflies + chat.",
    expected_stages: { min: 1, max: 2 },
    expected_consolidation: 'single',
    credible_primary_tools: ['otter-ai', 'fireflies-ai', 'claude'],
  },
  {
    prompt: "Generate background music for a 60-second ad.",
    underlying_intent: "Music generation — Suno or Udio alone.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['suno', 'udio'],
  },
  {
    prompt: "Generate ad creatives from a product photo.",
    underlying_intent: "Image-to-ad — Canva or Adobe Firefly alone.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['canva-ai', 'adobe-firefly'],
  },
  {
    prompt: "Help me search papers, extract findings, and write a literature review.",
    underlying_intent: "Academic research → write-up — Elicit + Claude (or ChatGPT Plus alone).",
    expected_stages: { min: 1, max: 2 },
    expected_consolidation: 'either',
    credible_primary_tools: ['elicit', 'claude', 'chatgpt'],
  },
  {
    prompt: "Edit my podcast episode by editing the transcript.",
    underlying_intent: "Transcript-based editing — Descript alone.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['descript'],
  },
  {
    prompt: "Generate variations of my logo with different color palettes.",
    underlying_intent: "Logo iteration — Ideogram or Midjourney alone.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['ideogram', 'midjourney'],
  },
  {
    prompt: "Help me prepare for a coding interview by drilling problems and explaining solutions.",
    underlying_intent: "Interview drill + explanation — Claude or ChatGPT alone.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['claude', 'chatgpt'],
  },
  {
    prompt: "I want to spin up a Next.js prototype from a one-paragraph idea.",
    underlying_intent: "Prompt-to-app — Bolt.new or Lovable alone.",
    expected_stages: { min: 1, max: 1 },
    expected_consolidation: 'single',
    credible_primary_tools: ['bolt-new', 'lovable', 'replit'],
  },
]

// ─────────── Assemble fixture ───────────

function tag(bucket: FixtureBucket, items: Omit<FixturePrompt, 'id' | 'bucket'>[]): FixturePrompt[] {
  return items.map((item, i) => ({ ...item, id: `${bucket}-${String(i + 1).padStart(2, '0')}`, bucket }))
}

export const FIXTURE: FixturePrompt[] = [
  ...tag('LONG_RAMBLING', LONG_RAMBLING),
  ...tag('BROKEN_FRAGMENTARY', BROKEN),
  ...tag('MULTI_GOAL', MULTI_GOAL),
  ...tag('OFF_TOPIC_BAD_FRAME', OFF_TOPIC),
  ...tag('SLANG_NON_ENGLISH', SLANG),
  ...tag('VAGUE_METAPHORIC', VAGUE),
  ...tag('SINGLE_WORD', SINGLE_WORD),
  ...tag('CONSOLIDATABLE', CONSOLIDATABLE),
]

export const FIXTURE_BY_BUCKET: Record<FixtureBucket, FixturePrompt[]> = {
  LONG_RAMBLING: tag('LONG_RAMBLING', LONG_RAMBLING),
  BROKEN_FRAGMENTARY: tag('BROKEN_FRAGMENTARY', BROKEN),
  MULTI_GOAL: tag('MULTI_GOAL', MULTI_GOAL),
  OFF_TOPIC_BAD_FRAME: tag('OFF_TOPIC_BAD_FRAME', OFF_TOPIC),
  SLANG_NON_ENGLISH: tag('SLANG_NON_ENGLISH', SLANG),
  VAGUE_METAPHORIC: tag('VAGUE_METAPHORIC', VAGUE),
  SINGLE_WORD: tag('SINGLE_WORD', SINGLE_WORD),
  CONSOLIDATABLE: tag('CONSOLIDATABLE', CONSOLIDATABLE),
}
