-- ============================================================
-- Batch 8: 55 AI tools
-- Categories: Voice & Speech, Video & Audio (more),
--   Image Generation (more), Productivity (more)
-- ============================================================

-- ─── VOICE & SPEECH ─────────────────────────────────────────

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES

('Murf AI', 'murf-ai', 'AI voiceover studio for videos and presentations', 'Murf AI is a professional AI voice generator with 120+ realistic voices in 20+ languages. It lets you create studio-quality voiceovers for videos, e-learning, presentations, and marketing content without hiring voice actors. Features include voice emphasis control, pitch adjustment, and timeline-based editing.', 'https://murf.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["10 min generation","Trial voices","Watermarked"]},{"plan":"Creator","price":"$23/mo","features":["2 hours/mo","120+ voices","No watermark"]},{"plan":"Business","price":"$79/mo","features":["4 hours/mo","Voice cloning","API access","Team collaboration"]}]', 'beginner', true, '{web,api}', '{"120+ AI voices","20+ languages","Voice emphasis control","Pitch and speed adjustment","Timeline editor","Background music","Pronunciation editor","Commercial license"}', '{"Google Slides","PowerPoint","Canva"}', 'https://murf.ai/resources/api', true, '{"E-learning creators","Marketing teams","Video producers"}', '{"Musicians needing singing voices","Live voice acting"}', 'Murf AI delivers natural-sounding voiceovers quickly and affordably. Best suited for e-learning and explainer videos rather than creative audio work.', now()),

('Play.ht', 'play-ht', 'Ultra-realistic AI text-to-speech platform', 'Play.ht converts text to speech using state-of-the-art AI voice models with over 900 voices in 142 languages. Supports voice cloning from short audio samples and offers a WordPress plugin, Chrome extension, and robust API for developers building voice-enabled applications.', 'https://play.ht', 'freemium', '[{"plan":"Free","price":"$0","features":["12500 chars/mo","Standard voices"]},{"plan":"Creator","price":"$31.20/mo","features":["Unlimited downloads","Premium voices","Voice cloning"]},{"plan":"Unlimited","price":"$49.50/mo","features":["Everything unlimited","Commercial license","API"]}]', 'beginner', true, '{web,api}', '{"900+ AI voices","142 languages","Voice cloning","WordPress plugin","Chrome extension","SSML support","Podcast hosting","Embeddable audio player"}', '{"WordPress","Medium","Zapier","Chrome"}', 'https://docs.play.ht', true, '{"Content creators","Bloggers wanting audio versions","App developers"}', '{"Real-time conversational AI","High-emotion voice acting"}', 'Play.ht offers one of the largest voice libraries available with solid quality. The voice cloning feature is impressive but requires careful tuning for best results.', now()),

('Resemble AI', 'resemble-ai', 'AI voice cloning and speech synthesis platform', 'Resemble AI specializes in custom AI voice cloning, letting you create a digital replica of any voice from just a few minutes of audio. Used by enterprises for call centers, media localization, and content creation. Includes neural speech synthesis, real-time voice conversion, and deepfake detection.', 'https://resemble.ai', 'paid', '[{"plan":"Basic","price":"$0.006/sec","features":["Pay per second","1 voice clone","API access"]},{"plan":"Pro","price":"$29/mo","features":["60 min/mo","10 voice clones","Priority support"]},{"plan":"Enterprise","price":"Custom","features":["Unlimited clones","On-premise deployment","SLA"]}]', 'intermediate', true, '{web,api}', '{"Voice cloning","Real-time voice conversion","Neural TTS","Deepfake detection","Emotion control","SSML support","Multi-language synthesis","Localization dubbing"}', '{"Twilio","Amazon Connect","Unity","Unreal Engine"}', 'https://docs.resemble.ai', true, '{"Enterprise call centers","Media localization teams","Game developers"}', '{"Quick one-off voiceovers","Non-technical users"}', 'Resemble AI is a serious voice cloning platform with enterprise-grade features. The deepfake detection tool is a responsible addition that sets it apart from competitors.', now()),

('WellSaid Labs', 'wellsaid-labs', 'Enterprise-grade AI voice generation', 'WellSaid Labs creates hyper-realistic AI voices designed specifically for enterprise use cases like corporate training, marketing videos, and product experiences. Voices are created ethically with consent from real voice actors, and the platform emphasizes brand-safe, consistent output.', 'https://wellsaidlabs.com', 'paid', '[{"plan":"Individual","price":"Custom","features":["Personal use","Select voices"]},{"plan":"Team","price":"Custom","features":["Shared workspace","Brand voices","Collaboration"]},{"plan":"Enterprise","price":"Custom","features":["Custom voice creation","SSO","API access","SLA"]}]', 'beginner', true, '{web,api}', '{"Hyper-realistic voices","Ethical voice creation","Brand voice consistency","Team collaboration","Pronunciation studio","SSML support","API integration","SOC 2 compliance"}', '{"Articulate","Adobe","LMS platforms"}', 'https://wellsaidlabs.com/api', true, '{"Corporate training teams","Enterprise marketing","L&D departments"}', '{"Budget-conscious individuals","Hobbyist projects"}', 'WellSaid Labs focuses on quality and ethics over quantity. The voices are among the most natural-sounding available, but the enterprise pricing puts it out of reach for solo creators.', now()),

('Speechify', 'speechify', 'AI text-to-speech reader for any content', 'Speechify converts any text into natural-sounding audio, including web pages, PDFs, Google Docs, emails, and physical books via OCR scanning. Popular with people with dyslexia and ADHD, as well as busy professionals who prefer listening over reading. Supports 30+ languages with celebrity voice options.', 'https://speechify.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Standard voices","1x speed"]},{"plan":"Premium","price":"$139/yr","features":["60+ AI voices","4.5x speed","AI summaries","Offline mode","Celebrity voices"]}]', 'beginner', false, '{web,mobile,desktop}', '{"Text-to-speech","OCR scanning","Speed control up to 4.5x","AI summaries","30+ languages","Celebrity voices","Chrome extension","Offline mode"}', '{"Google Drive","Dropbox","Google Docs","Notion","Chrome","Safari"}', 'https://speechify.com/blog', true, '{"Students with learning disabilities","Busy professionals","Avid readers"}', '{"Professional voice production","Enterprise TTS needs"}', 'Speechify is the best text-to-speech reader for personal use. The speed control and OCR features are genuinely useful for consuming more content, though the premium price is steep.', now()),

('LOVO AI', 'lovo-ai', 'AI voiceover and text-to-speech with video editing', 'LOVO AI combines a powerful text-to-speech engine with 500+ AI voices and a built-in video editor called Genny. Create professional voiceovers in 100+ languages, clone your voice, and edit videos with AI-generated narration all in one platform. Used by enterprise teams and content creators.', 'https://lovo.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["14-day trial","Limited generations"]},{"plan":"Basic","price":"$19/mo","features":["2 hours/mo","100+ voices"]},{"plan":"Pro","price":"$48/mo","features":["5 hours/mo","500+ voices","Voice cloning","Video editor"]}]', 'beginner', true, '{web,api}', '{"500+ AI voices","100+ languages","Voice cloning","Built-in video editor","Pronunciation editor","Emphasis control","Background music","Batch processing"}', '{"YouTube","Vimeo","Zapier"}', 'https://lovo.ai/api', true, '{"Marketing teams","E-learning developers","YouTube creators"}', '{"Live broadcasting","Conversational AI bots"}', 'LOVO AI packs both voiceover and video editing into one tool, which is convenient but means neither feature is best-in-class. Good value for teams needing both capabilities.', now()),

('Coqui', 'coqui', 'Open-source text-to-speech and voice cloning', 'Coqui was an open-source voice AI company that released industry-leading TTS models including XTTS, which supports voice cloning in 17 languages from just 6 seconds of audio. Though the company shut down, the open-source models remain available on GitHub and Hugging Face for self-hosting.', 'https://coqui.ai', 'free', '[{"plan":"Open Source","price":"$0","features":["Self-hosted","Full model access","17 languages","Voice cloning"]}]', 'advanced', true, '{api,cli}', '{"Open-source TTS","Voice cloning from 6s audio","17 languages","XTTS model","Emotion control","Speed control","Fine-tuning support","Python API"}', '{"Hugging Face","Python","Docker","CUDA"}', 'https://github.com/coqui-ai/TTS', true, '{"ML engineers","Developers needing self-hosted TTS","Open-source enthusiasts"}', '{"Non-technical users","Those wanting managed service"}', 'Coqui''s XTTS model is remarkable for open-source voice cloning quality. Requires technical skill to deploy but offers unmatched flexibility and zero ongoing costs.', now()),

('Podcastle', 'podcastle', 'AI-powered podcast creation studio', 'Podcastle is an all-in-one podcast studio that uses AI for recording, editing, and enhancing audio. Features include AI-powered background noise removal, automatic leveling, magic dust audio enhancement, text-based audio editing, and an AI voice skin that converts your voice to professional studio quality.', 'https://podcastle.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["1 hour recording","Basic editing"]},{"plan":"Storyteller","price":"$11.99/mo","features":["Unlimited recording","AI editing","Magic Dust"]},{"plan":"Team","price":"$23.99/mo","features":["Collaboration","Priority support","Advanced features"]}]', 'beginner', false, '{web}', '{"AI noise removal","Magic Dust enhancement","Text-based editing","Automatic leveling","Revoice AI skin","Multitrack recording","Transcription","Remote interviews"}', '{"Spotify","Apple Podcasts","Google Podcasts","YouTube"}', 'https://podcastle.ai/blog', true, '{"Podcasters","Content creators","Journalists"}', '{"Music producers","Enterprise call centers"}', 'Podcastle simplifies podcast production impressively. The Magic Dust feature genuinely transforms amateur recordings into professional-sounding audio.', now()),

('AssemblyAI', 'assemblyai', 'Production-ready speech-to-text API', 'AssemblyAI provides a suite of speech AI APIs including speech-to-text, speaker diarization, sentiment analysis, topic detection, and LeMUR for applying LLMs to audio data. Known for high accuracy and developer-friendly documentation, used by companies like Spotify, BBC, and CallRail.', 'https://assemblyai.com', 'freemium', '[{"plan":"Free","price":"$0","features":["100 hours free","Core transcription"]},{"plan":"Pay-as-you-go","price":"$0.37/hr","features":["All features","Speaker diarization","Sentiment analysis"]},{"plan":"Enterprise","price":"Custom","features":["Volume discounts","SLA","On-premise"]}]', 'advanced', true, '{api}', '{"Speech-to-text API","Speaker diarization","Sentiment analysis","Topic detection","LeMUR (LLM + audio)","Real-time transcription","Content moderation","PII redaction"}', '{"Python","Node.js","Go","Java","Twilio","Zoom"}', 'https://docs.assemblyai.com', true, '{"Developers building speech apps","Data teams analyzing calls","Podcast platforms"}', '{"Non-developers","One-off transcription needs"}', 'AssemblyAI is the developer''s choice for speech-to-text. The LeMUR feature that combines LLMs with audio data is genuinely innovative and opens up powerful use cases.', now()),

('Deepgram', 'deepgram', 'Fast and accurate speech recognition API', 'Deepgram provides enterprise speech recognition powered by end-to-end deep learning models. Offers streaming and batch transcription with industry-leading speed, accuracy, and cost efficiency. Features include real-time transcription, text-to-speech, and audio intelligence APIs used by NASA, Twilio, and Auth0.', 'https://deepgram.com', 'freemium', '[{"plan":"Pay-as-you-go","price":"$0.0043/min","features":["All models","Streaming","Batch"]},{"plan":"Growth","price":"$4/hr committed","features":["Volume discounts","Priority support"]},{"plan":"Enterprise","price":"Custom","features":["On-premise","Custom models","SLA"]}]', 'advanced', true, '{api}', '{"Real-time streaming STT","Batch transcription","Text-to-speech","Speaker diarization","Language detection","Topic detection","Summarization","Custom vocabulary"}', '{"Twilio","Vonage","Zoom","Python","Node.js","Go"}', 'https://developers.deepgram.com', true, '{"Developers building real-time voice apps","Contact center platforms","Enterprise telephony"}', '{"Non-technical users","Simple transcription tasks"}', 'Deepgram offers the fastest speech-to-text API on the market. Speed and cost advantages are real, though accuracy can vary by accent and domain compared to Whisper.', now()),

('Rev', 'rev', 'AI and human-powered transcription service', 'Rev combines AI-generated transcription with optional human review for maximum accuracy. Supports audio and video files with speaker identification, timestamps, and multiple output formats. Known for its quality guarantee and used by media companies, legal teams, and researchers.', 'https://rev.com', 'paid', '[{"plan":"AI Transcription","price":"$0.25/min","features":["AI-generated","90%+ accuracy","5-minute turnaround"]},{"plan":"Human Transcription","price":"$1.50/min","features":["99% accuracy","Human reviewed","12-hour turnaround"]},{"plan":"Enterprise","price":"Custom","features":["API access","Volume pricing","Custom SLA"]}]', 'beginner', true, '{web,api}', '{"AI transcription","Human transcription","Speaker identification","Timestamps","Closed captions","Subtitles","Foreign subtitles","Multiple export formats"}', '{"Zoom","Vimeo","YouTube","Dropbox","Google Drive"}', 'https://docs.rev.ai', true, '{"Legal teams needing accuracy","Media companies","Researchers"}', '{"Budget-conscious bulk transcription","Real-time streaming needs"}', 'Rev remains a reliable choice when accuracy matters more than speed. The hybrid AI+human model delivers the best of both worlds, though pricing is higher than pure AI alternatives.', now()),

('Sonix', 'sonix', 'Automated transcription in 40+ languages', 'Sonix is an automated transcription platform that transcribes, translates, and organizes audio and video files in over 40 languages. Features include an inline editor for corrections, speaker labeling, automated subtitles, and translation. Used by Stanford, ESPN, and Adobe for content workflows.', 'https://sonix.ai', 'paid', '[{"plan":"Standard","price":"$10/hr","features":["Pay per hour","All features","5 free trial hours"]},{"plan":"Premium","price":"$5/hr + $22/mo","features":["Lower per-hour rate","Priority processing"]},{"plan":"Enterprise","price":"Custom","features":["Volume pricing","SSO","API"]}]', 'beginner', true, '{web,api}', '{"40+ language transcription","Inline editor","Speaker labeling","Automated subtitles","Translation","Multi-user collaboration","API access","Custom dictionary"}', '{"Zoom","Zapier","Adobe Premiere","Final Cut Pro"}', 'https://sonix.ai/developers', true, '{"Global media companies","Researchers with multilingual content","Podcast networks"}', '{"Real-time transcription needs","Developers wanting low-level API control"}', 'Sonix strikes a good balance between accuracy and affordability across many languages. The inline editor makes corrections fast, though it is not the cheapest option for English-only work.', now()),

('Trint', 'trint', 'AI transcription platform for media professionals', 'Trint provides AI-powered transcription with a powerful online editor designed for journalists and media teams. Features include real-time collaboration, highlight reels, story-building tools, and integration with major editing software. Trusted by the BBC, Washington Post, and Associated Press.', 'https://trint.com', 'paid', '[{"plan":"Starter","price":"$52/mo","features":["7 files/mo","Transcription","Editor"]},{"plan":"Advanced","price":"$60/mo","features":["Unlimited files","Collaboration","Highlights"]},{"plan":"Enterprise","price":"Custom","features":["SSO","Admin controls","API"]}]', 'intermediate', true, '{web,api}', '{"AI transcription","Collaborative editor","Highlight reels","Story builder","Real-time collaboration","30+ languages","Speaker separation","Translation"}', '{"Adobe Premiere","Avid","Final Cut Pro","Zapier"}', 'https://trint.com/resources', true, '{"Journalists","News organizations","Documentary filmmakers"}', '{"Budget-conscious users","Developer-focused integrations"}', 'Trint is purpose-built for newsrooms and media teams. The story-building and highlight reel features are unique, but the pricing reflects its enterprise media focus.', now()),

('Happy Scribe', 'happy-scribe', 'AI transcription and subtitling platform', 'Happy Scribe offers both AI-generated and human-made transcription and subtitling in 120+ languages. Features include an interactive editor, subtitle export in all major formats, speaker identification, and a public marketplace for professional transcribers. Used by the BBC, Forbes, and United Nations.', 'https://happyscribe.com', 'paid', '[{"plan":"AI Transcription","price":"$0.20/min","features":["AI-generated","85%+ accuracy","Minutes-fast"]},{"plan":"Human Transcription","price":"$1.70/min","features":["99% accuracy","Human-made","24h turnaround"]},{"plan":"Business","price":"$25/user/mo","features":["Team workspace","API","Priority"]}]', 'beginner', true, '{web,api}', '{"120+ language transcription","AI and human options","Subtitle export (SRT/VTT/STL)","Interactive editor","Speaker identification","Translation","Vocabulary customization","API access"}', '{"YouTube","Vimeo","Wistia","Zapier","Adobe Premiere"}', 'https://dev.happyscribe.com', true, '{"Video production teams","International organizations","E-learning companies"}', '{"Real-time transcription needs","Developers wanting streaming API"}', 'Happy Scribe is a reliable European transcription platform with excellent subtitle support. The hybrid AI and human model and 120+ languages make it particularly good for international content.', now()),

('Krisp', 'krisp', 'AI noise cancellation and meeting assistant', 'Krisp uses AI to remove background noise, echo, and other distractions from calls in real time. Works with any communication app as a virtual microphone and speaker. Also provides meeting transcription, AI notes, and action items. Used by 200k+ professionals for cleaner calls.', 'https://krisp.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["60 min/day noise cancellation","Unlimited transcription"]},{"plan":"Pro","price":"$8/mo","features":["Unlimited noise cancellation","AI notes","Action items"]},{"plan":"Enterprise","price":"Custom","features":["Admin dashboard","SSO","Analytics"]}]', 'beginner', false, '{desktop}', '{"AI noise cancellation","Echo removal","Meeting transcription","AI notes and summaries","Action items","Works with any app","Virtual microphone","Call analytics"}', '{"Zoom","Microsoft Teams","Google Meet","Slack","Discord","Webex"}', 'https://krisp.ai/blog', true, '{"Remote workers","Sales teams on calls","Customer support agents"}', '{"Studio recording environments","Offline-only workflows"}', 'Krisp is a must-have for anyone who takes calls in noisy environments. The noise cancellation is remarkably effective, and the recent addition of AI meeting notes makes it even more valuable.', now())

ON CONFLICT (slug) DO NOTHING;

-- ─── VIDEO & AUDIO ──────────────────────────────────────────

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES

('Pictory', 'pictory', 'Turn long-form content into short branded videos', 'Pictory uses AI to automatically create short, shareable branded videos from long-form content like blog posts, scripts, and recordings. It selects relevant stock footage, adds captions, and applies your brand kit. Ideal for repurposing content into video format without video editing skills.', 'https://pictory.ai', 'paid', '[{"plan":"Starter","price":"$19/mo","features":["30 videos/mo","10 min each","1080p"]},{"plan":"Professional","price":"$39/mo","features":["60 videos/mo","20 min each","Brand kits"]},{"plan":"Teams","price":"$99/mo","features":["90 videos/mo","Collaboration","Priority"]}]', 'beginner', true, '{web,api}', '{"Blog-to-video","Script-to-video","Auto-captioning","Stock footage library","Brand kit","AI voiceover","Video highlighting","Aspect ratio templates"}', '{"Hootsuite","WordPress","Hubspot","Zapier"}', 'https://pictory.ai/api', true, '{"Content marketers","Social media managers","Bloggers repurposing content"}', '{"Professional video editors","Cinematic content creators"}', 'Pictory is excellent at one thing: turning written content into video quickly. It is not a full video editor, but for content repurposing it saves hours of work.', now()),

('Fliki', 'fliki', 'Text to video with lifelike AI voices', 'Fliki transforms text content into videos with AI-generated voiceovers in minutes. Input a blog post, script, or even a tweet, and Fliki creates a video with matching visuals, AI narration, and subtitles. Supports 75+ languages and 2000+ realistic AI voices.', 'https://fliki.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["5 min/mo","720p","Watermarked"]},{"plan":"Standard","price":"$28/mo","features":["180 min/mo","1080p","No watermark"]},{"plan":"Premium","price":"$88/mo","features":["600 min/mo","4K","Brand kit","Voice cloning"]}]', 'beginner', true, '{web,api}', '{"Text-to-video","2000+ AI voices","75+ languages","Blog-to-video","Tweet-to-video","Stock media library","Voice cloning","Auto subtitles"}', '{"WordPress","Zapier","YouTube"}', 'https://fliki.ai/resources', true, '{"Social media marketers","Course creators","Small businesses"}', '{"Film production","High-end commercial work"}', 'Fliki combines text-to-video with an impressive voice library. The output quality is good for social media and training content, but not for broadcast-quality production.', now()),

('Colossyan', 'colossyan', 'AI video platform for workplace learning', 'Colossyan creates AI-powered training videos with realistic AI avatars and voiceovers. Designed specifically for corporate learning and development, it supports 70+ languages, offers diverse avatar options, and integrates with major LMS platforms. Used by companies like Novartis and Heineken.', 'https://colossyan.com', 'paid', '[{"plan":"Starter","price":"$27/mo","features":["5 min/mo","Draft watermark","1 seat"]},{"plan":"Pro","price":"$87/mo","features":["Unlimited videos","50+ avatars","Brand kit"]},{"plan":"Enterprise","price":"Custom","features":["Custom avatars","SCORM export","SSO","API"]}]', 'beginner', true, '{web,api}', '{"AI avatar presenters","70+ languages","SCORM/xAPI export","LMS integration","Brand kit","Script-to-video","Diverse avatars","Auto-translation"}', '{"Cornerstone","SAP SuccessFactors","Moodle","Docebo"}', 'https://colossyan.com/api', true, '{"L&D teams","Corporate trainers","HR departments"}', '{"Creative video projects","Entertainment content"}', 'Colossyan is laser-focused on corporate training videos and it shows. The SCORM export and LMS integrations make it the best AI video tool for L&D teams specifically.', now()),

('D-ID', 'd-id', 'AI-powered talking avatar video creation', 'D-ID creates realistic talking head videos from a single photo and text or audio input. Their Creative Reality Studio animates still photos with AI-generated speech, making it possible to create personalized video messages, digital humans, and interactive AI agents at scale.', 'https://d-id.com', 'freemium', '[{"plan":"Free","price":"$0","features":["5 min free","Trial avatars"]},{"plan":"Lite","price":"$5.90/mo","features":["10 min/mo","Premium avatars"]},{"plan":"Pro","price":"$29.99/mo","features":["15 min/mo","API access","Custom avatars"]},{"plan":"Enterprise","price":"Custom","features":["Unlimited","Streaming API","Custom models"]}]', 'beginner', true, '{web,api}', '{"Photo-to-video animation","AI avatars","Streaming API","Custom avatar creation","100+ languages","Real-time interaction","Express mode","Presenter selection"}', '{"PowerPoint","Canva","LMS platforms","ChatGPT"}', 'https://docs.d-id.com', true, '{"Sales teams needing personalized video","Customer support","Marketing agencies"}', '{"Feature film production","Full-body video generation"}', 'D-ID''s talking avatar technology is impressive for creating personalized videos at scale. Quality is best for head-and-shoulders content; full-body or action scenes are not its strength.', now()),

('Elai.io', 'elai-io', 'AI video generation from text with digital avatars', 'Elai.io generates professional videos from text using AI-powered digital avatars. Upload a script or URL and get a complete video with a realistic AI presenter, background, and transitions. Supports 75+ languages and offers avatar customization for brand consistency.', 'https://elai.io', 'freemium', '[{"plan":"Free","price":"$0","features":["1 min free","Watermarked"]},{"plan":"Basic","price":"$23/mo","features":["15 min/mo","50+ avatars"]},{"plan":"Advanced","price":"$100/mo","features":["50 min/mo","Custom avatars","API"]}]', 'beginner', true, '{web,api}', '{"Text-to-video","75+ languages","50+ AI avatars","Custom avatar creation","URL-to-video","SCORM export","Brand kit","Auto-translation"}', '{"Zapier","PowerPoint","HTML embed"}', 'https://docs.elai.io', true, '{"E-learning teams","Marketing departments","Internal communications"}', '{"Entertainment production","Complex video editing"}', 'Elai.io is a solid HeyGen and Synthesia alternative with competitive pricing. The URL-to-video feature is convenient for turning landing pages into video pitches.', now()),

('Hour One', 'hour-one', 'AI video generation for enterprise communication', 'Hour One creates AI-powered videos with virtual human presenters for enterprise training, marketing, and internal communications. Features include real-time video generation, multi-language support, and the ability to create custom digital twins of real presenters.', 'https://hourone.ai', 'paid', '[{"plan":"Lite","price":"$30/mo","features":["3 videos/mo","Standard presenters"]},{"plan":"Business","price":"$112/mo","features":["10 videos/mo","Premium presenters","Custom branding"]},{"plan":"Enterprise","price":"Custom","features":["Unlimited","Digital twins","API","SSO"]}]', 'beginner', true, '{web,api}', '{"Virtual human presenters","Digital twins","Real-time generation","Multi-language","Custom branding","Enterprise templates","Batch creation","Analytics"}', '{"LMS platforms","Salesforce","HubSpot"}', 'https://hourone.ai/developers', true, '{"Enterprise L&D","Internal communications","Scaled video marketing"}', '{"Creative filmmakers","Consumer-facing content creators"}', 'Hour One targets the enterprise segment of AI video with features like digital twins and batch creation. Production quality is professional but the pricing reflects its enterprise positioning.', now()),

('VEED.io', 'veed-io', 'Online video editor with AI-powered features', 'VEED.io is an online video editor that integrates AI tools including auto-subtitles, background removal, eye contact correction, noise removal, and text-to-video. No downloads required. Popular with social media creators and marketers for its ease of use and quick output.', 'https://veed.io', 'freemium', '[{"plan":"Free","price":"$0","features":["10 min export","250MB upload","Watermarked"]},{"plan":"Basic","price":"$12/mo","features":["25 min export","No watermark","1080p"]},{"plan":"Pro","price":"$24/mo","features":["Unlimited exports","4K","Brand kit","AI tools"]}]', 'beginner', false, '{web}', '{"Auto-subtitles","Background removal","Eye contact correction","AI noise removal","Screen recording","Video templates","Green screen","Text-to-video"}', '{"YouTube","TikTok","Instagram","Dropbox","Google Drive"}', 'https://veed.io/tools', true, '{"Social media creators","Marketers","Small businesses"}', '{"Professional post-production","Feature film editors"}', 'VEED.io is the Swiss Army knife of online video editing. It does many things well enough for social media without the complexity of professional editing software.', now()),

('Kapwing', 'kapwing', 'Collaborative online video editor with AI tools', 'Kapwing is a collaborative online video and content creation platform with AI features including auto-subtitles, smart cut (removing silences), background removal, and AI-powered resizing for different platforms. Used by teams at Spotify, Shopify, and Square for creating social content.', 'https://kapwing.com', 'freemium', '[{"plan":"Free","price":"$0","features":["2 exports/mo","720p","Watermark"]},{"plan":"Pro","price":"$16/mo","features":["Unlimited exports","1080p","No watermark","100GB storage"]},{"plan":"Business","price":"$50/seat/mo","features":["4K","Brand kit","Team workspace","Priority support"]}]', 'beginner', false, '{web}', '{"Auto-subtitles","Smart cut silence removal","Background removal","AI resizing","Team collaboration","Brand kit","Meme generator","Video templates"}', '{"Google Drive","Dropbox","YouTube","TikTok","Instagram"}', 'https://kapwing.com/resources', true, '{"Social media teams","Content creation agencies","Collaborative video projects"}', '{"Professional film editing","Long-form video production"}', 'Kapwing excels at collaborative social media content creation. The smart cut feature alone saves significant editing time for talking-head videos.', now()),

('CapCut', 'capcut', 'Free video editor with AI features by ByteDance', 'CapCut is a free video editor from ByteDance (TikTok parent company) with powerful AI features including auto-captions, background removal, text-to-speech, and style transfers. Available on mobile, desktop, and web with no watermarks even on the free plan. Has become the go-to editor for TikTok and Reels creators.', 'https://capcut.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Full editor","No watermark","Cloud storage"]},{"plan":"Pro","price":"$7.99/mo","features":["Premium effects","Advanced AI","1TB cloud","Priority export"]}]', 'beginner', false, '{web,mobile,desktop}', '{"Auto-captions","Background removal","AI text-to-speech","Style transfer","Video templates","Green screen","Speed curves","Keyframe animation"}', '{"TikTok","YouTube","Instagram"}', 'https://capcut.com/tools', true, '{"TikTok creators","Social media influencers","Mobile-first video editors"}', '{"Professional production studios","Enterprise video teams"}', 'CapCut is genuinely impressive for a free editor. The AI features rival paid tools, though the tight TikTok integration makes it best suited for short-form social content.', now()),

('Topaz Video AI', 'topaz-video-ai', 'AI-powered video upscaling and enhancement', 'Topaz Video AI uses deep learning to upscale, denoise, deinterlace, and enhance video quality. Can upscale footage up to 16K resolution, restore old or low-quality video, convert frame rates, and stabilize shaky footage. Runs locally on your hardware using GPU acceleration.', 'https://topazlabs.com', 'paid', '[{"plan":"Perpetual License","price":"$299","features":["One-time purchase","All AI models","Unlimited use","1 year updates"]}]', 'intermediate', false, '{desktop}', '{"Video upscaling to 16K","AI denoising","Frame rate conversion","Stabilization","Deinterlacing","Slow motion","Face recovery","Batch processing"}', '{"DaVinci Resolve","Premiere Pro","Final Cut Pro","FFmpeg"}', 'https://docs.topazlabs.com', true, '{"Filmmakers restoring footage","YouTubers upscaling content","Archivists digitizing video"}', '{"Real-time processing needs","Budget-conscious hobbyists"}', 'Topaz Video AI produces genuinely stunning upscaling results. The one-time price is fair for professionals, and the local processing means no cloud dependency or recurring costs.', now()),

('Riverside', 'riverside-fm', 'Studio-quality remote podcast and video recording', 'Riverside records podcast and video interviews in studio quality by capturing each participant locally in up to 4K video and 48kHz audio, then syncing everything in the cloud. AI features include transcription, auto-leveling, Magic Clips for social media highlights, and text-based editing.', 'https://riverside.fm', 'freemium', '[{"plan":"Free","price":"$0","features":["2 hours recording","720p","Separate tracks"]},{"plan":"Standard","price":"$15/mo","features":["Unlimited recording","4K","Transcription"]},{"plan":"Pro","price":"$24/mo","features":["Magic Clips","Text-based editing","Custom branding"]}]', 'beginner', false, '{web}', '{"Local recording up to 4K","Separate audio tracks","AI transcription","Magic Clips","Text-based editing","Auto-leveling","Screen sharing","Live streaming"}', '{"Spotify","Apple Podcasts","YouTube","Descript","Zoom"}', 'https://riverside.fm/blog', true, '{"Podcasters","Video interviewers","Media companies"}', '{"Solo music recording","Large virtual events"}', 'Riverside solves the biggest problem in remote recording: quality loss. The local recording approach ensures studio-quality output regardless of internet connection.', now()),

('Cleanvoice', 'cleanvoice', 'AI-powered podcast audio cleaning', 'Cleanvoice automatically removes filler words (um, uh), mouth sounds, stuttering, long pauses, and background noise from podcast recordings. Supports multiple languages and accents. Upload your audio and get a clean version in minutes without manual editing.', 'https://cleanvoice.ai', 'paid', '[{"plan":"Pay-as-you-go","price":"$0.10/min","features":["All cleaning features","No subscription"]},{"plan":"Large","price":"$20/mo","features":["30 hours/mo","All features"]},{"plan":"Extra Large","price":"$40/mo","features":["80 hours/mo","Priority processing"]}]', 'beginner', false, '{web}', '{"Filler word removal","Mouth sound removal","Stutter removal","Dead air trimming","Background noise removal","Multi-language support","Timeline export","Batch processing"}', '{"Descript","Riverside","Buzzsprout","Podbean"}', 'https://cleanvoice.ai/docs', true, '{"Podcasters","Audio content creators","Video editors"}', '{"Music producers","Live broadcast engineers"}', 'Cleanvoice does one thing exceptionally well: cleaning up podcast audio. The filler word detection across multiple languages is impressive and saves hours of manual editing.', now()),

('Adobe Podcast', 'adobe-podcast', 'AI-powered podcast recording and enhancement', 'Adobe Podcast (formerly Project Shasta) provides AI audio tools including Enhance Speech, which dramatically improves audio quality with one click, and a web-based recording studio. The Enhance Speech feature can make phone-quality audio sound like it was recorded in a professional studio.', 'https://podcast.adobe.com', 'free', '[{"plan":"Free","price":"$0","features":["Enhance Speech","Recording studio","Transcription","Mic check"]}]', 'beginner', false, '{web}', '{"AI Enhance Speech","Web recording studio","Transcription","Mic check tool","Background noise removal","Echo removal","Auto-leveling","Free unlimited use"}', '{"Adobe Creative Cloud","Adobe Premiere Pro","Adobe Audition"}', 'https://podcast.adobe.com', true, '{"Podcasters wanting quick cleanup","Remote interviewers","Content creators with poor mic setups"}', '{"Professional mastering","Music production"}', 'Adobe Podcast''s Enhance Speech is genuinely magical for improving bad audio. It is free and works surprisingly well, making it a no-brainer for anyone with audio quality issues.', now()),

('Soundraw', 'soundraw', 'AI music generator for content creators', 'Soundraw lets you generate royalty-free music by selecting mood, genre, tempo, and length. Edit individual instruments and song structure in real time, then download for commercial use. Creates unique tracks that won''t trigger content ID claims on YouTube or other platforms.', 'https://soundraw.io', 'freemium', '[{"plan":"Free","price":"$0","features":["Unlimited generation","No downloads"]},{"plan":"Creator","price":"$16.99/mo","features":["Unlimited downloads","Commercial license","All genres"]}]', 'beginner', true, '{web,api}', '{"AI music generation","Mood-based creation","Genre selection","BPM control","Instrument editing","Song structure editing","Royalty-free","Commercial license"}', '{"YouTube","TikTok","Adobe Premiere","Final Cut Pro"}', 'https://soundraw.io/api', true, '{"YouTubers needing background music","Podcast producers","Video editors"}', '{"Professional musicians","Music for streaming platforms"}', 'Soundraw is the easiest way to get royalty-free background music. The real-time instrument editing adds useful customization, though output quality suits background music more than foreground listening.', now()),

('AIVA', 'aiva', 'AI music composition for films, games, and media', 'AIVA (Artificial Intelligence Virtual Artist) composes emotional soundtracks for films, TV, games, and advertising. Choose from style presets or upload a reference track, and AIVA generates orchestral and cinematic compositions. One of the first AIs recognized as a composer by a music rights society.', 'https://aiva.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["3 downloads/mo","MP3 only","AIVA owns copyright"]},{"plan":"Standard","price":"$11/mo","features":["15 downloads/mo","Commercial license"]},{"plan":"Pro","price":"$33/mo","features":["300 downloads/mo","Full copyright ownership","WAV/MIDI"]}]', 'beginner', false, '{web}', '{"Orchestral composition","Film scoring","Style presets","Reference track upload","MIDI export","Influence editing","Multi-track output","Copyright ownership option"}', '{"YouTube","Unity","Unreal Engine"}', 'https://help.aiva.ai', true, '{"Film composers needing inspiration","Game developers","Ad agencies"}', '{"Pop or vocal music production","Live performance"}', 'AIVA specializes in orchestral and cinematic music where it truly excels. The compositions feel genuinely emotional, though the free plan''s copyright restrictions are worth noting.', now()),

('Boomy', 'boomy', 'Create and release original AI songs in seconds', 'Boomy lets anyone create original AI music tracks in seconds by selecting a style and mood. Save songs, submit to streaming platforms like Spotify and Apple Music, and earn royalties. Over 14 million songs created by the community, making it the most accessible AI music tool.', 'https://boomy.com', 'freemium', '[{"plan":"Free","price":"$0","features":["25 song releases","Basic styles"]},{"plan":"Creator","price":"$2.99/mo","features":["Unlimited releases","More styles"]},{"plan":"Pro","price":"$9.99/mo","features":["Advanced editing","Custom samples","Priority distribution"]}]', 'beginner', false, '{web,mobile}', '{"AI song creation","Streaming distribution","Royalty earning","Style selection","Song editing","Cover art generation","Social sharing","Community features"}', '{"Spotify","Apple Music","YouTube Music","TikTok","Amazon Music"}', 'https://boomy.com/faq', true, '{"Casual music creators","Social media content makers","Hobbyists exploring music creation"}', '{"Professional musicians","Serious music production"}', 'Boomy democratizes music creation like nothing else. Songs are simple but the ability to distribute to streaming platforms and earn royalties is genuinely novel.', now()),

('Amper Music', 'amper-music', 'AI music composition platform by Shutterstock', 'Amper Music, now part of Shutterstock, is an AI music composition tool that creates custom, royalty-free music for videos, podcasts, and games. Select genre, mood, instrumentation, and duration, and Amper generates a unique track. All music comes with a commercial license through Shutterstock.', 'https://shutterstock.com/discover/ampermusic', 'paid', '[{"plan":"Shutterstock Subscription","price":"$29/mo","features":["Music + stock assets","Commercial license","Unlimited downloads"]}]', 'beginner', false, '{web}', '{"AI music composition","Genre and mood selection","Instrument customization","Duration control","Commercial license","Royalty-free","Shutterstock integration","Batch generation"}', '{"Shutterstock","Adobe Premiere","Final Cut Pro","DaVinci Resolve"}', 'https://shutterstock.com/discover/ampermusic', true, '{"Video producers with Shutterstock subscriptions","Marketers needing licensed music","Corporate video teams"}', '{"Independent musicians","Those wanting standalone music tool"}', 'Amper Music makes most sense as part of a Shutterstock subscription. The AI compositions are serviceable for background music, but it lacks the creative control of standalone alternatives.', now()),

('Moises', 'moises', 'AI music practice and stem separation tool', 'Moises uses AI to separate any song into individual stems (vocals, drums, bass, guitar, etc.) in seconds. Musicians use it to isolate parts for practice, create backing tracks, remix songs, and transcribe chords. Also features smart metronome, pitch shifting, and speed control.', 'https://moises.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["5 separations/mo","Basic features"]},{"plan":"Premium","price":"$3.99/mo","features":["Unlimited separations","HD audio","All AI features"]},{"plan":"Pro","price":"$12.49/mo","features":["Lossless audio","Priority processing","API"]}]', 'beginner', true, '{web,mobile,api}', '{"AI stem separation","Chord detection","Smart metronome","Pitch shifting","Speed control","Click track","Setlist management","Lyrics sync"}', '{"Spotify","Apple Music","YouTube","GarageBand"}', 'https://developer.moises.ai', true, '{"Musicians practicing songs","DJs creating remixes","Music teachers"}', '{"Full music production","Podcast editing"}', 'Moises is indispensable for musicians. The stem separation quality is impressive and the practice features like smart metronome and chord detection make it more than just a splitter.', now()),

('Lalal.ai', 'lalal-ai', 'AI vocal and music stem separation', 'Lalal.ai uses AI to extract vocals, drums, bass, piano, guitar, synth, and other stems from any audio track. Known for producing clean separations with minimal artifacts. Used by musicians, DJs, karaoke enthusiasts, and content creators who need to isolate specific elements from recordings.', 'https://lalal.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["10 min processing","MP3 output"]},{"plan":"Lite","price":"$15","features":["90 min total","Lossless output"]},{"plan":"Plus","price":"$30","features":["300 min total","Batch processing"]},{"plan":"Master","price":"$60","features":["600 min total","Priority"]}]', 'beginner', false, '{web}', '{"Vocal extraction","8-stem separation","Noise removal","Lossless output","Batch processing","Multiple format support","Echo removal","Instrument isolation"}', '{}', 'https://lalal.ai/faq', true, '{"DJs needing acapellas","Karaoke creators","Music remixers"}', '{"Real-time processing","Professional mastering"}', 'Lalal.ai offers the cleanest vocal separation we have tested. The pay-per-minute model is fair for occasional use, though heavy users should consider the subscription alternatives.', now()),

('Udio', 'udio', 'AI music generation with fine-grained style control', 'Udio generates high-quality music from text prompts with fine-grained control over style, instruments, and composition. Built by ex-Google DeepMind researchers, it excels at complex musical styles and longer tracks. Produces remarkably coherent compositions with realistic vocals across many genres.', 'https://udio.com', 'freemium', '[{"plan":"Free","price":"$0","features":["1200 credits/mo","Standard quality","Non-commercial"]},{"plan":"Standard","price":"$10/mo","features":["Unlimited credits","Commercial license","High quality"]},{"plan":"Pro","price":"$30/mo","features":["Priority generation","Stem downloads","Premium features"]}]', 'beginner', false, '{web}', '{"Text-to-music","Genre blending","Vocal generation","Instrumental tracks","Long-form tracks","Style mixing","Lyrics input","Stem separation"}', '{}', 'https://udio.com', true, '{"Musicians seeking inspiration","Content creators needing custom music","AI music experimenters"}', '{"Those needing guaranteed copyright clarity","Live performers"}', 'Udio rivals Suno for AI music quality and arguably surpasses it for complex genres. The compositions show impressive musical understanding, though copyright questions around AI music remain unresolved.', now())

ON CONFLICT (slug) DO NOTHING;

-- ─── IMAGE GENERATION (MORE) ────────────────────────────────

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES

('Flux', 'flux', 'State-of-the-art open image generation by Black Forest Labs', 'Flux is a family of text-to-image models from Black Forest Labs (founded by the creators of Stable Diffusion). Flux.1 Pro and Dev models produce photorealistic images with excellent text rendering, prompt adherence, and composition. Available via API and through platforms like Replicate and fal.ai.', 'https://blackforestlabs.ai', 'freemium', '[{"plan":"Open (Schnell)","price":"$0","features":["Open source","Fast generation","Self-hosted"]},{"plan":"API (Dev)","price":"$0.025/image","features":["High quality","Commercial use"]},{"plan":"API (Pro)","price":"$0.05/image","features":["Best quality","Priority"]}]', 'intermediate', true, '{api,web}', '{"Photorealistic generation","Excellent text rendering","Multiple model tiers","Open-source option","Fast generation","Strong prompt adherence","High resolution","API access"}', '{"Replicate","fal.ai","ComfyUI","Automatic1111"}', 'https://docs.bfl.ml', true, '{"AI artists wanting top quality","Developers building image apps","Those needing text in images"}', '{"Non-technical users wanting simple UI","Beginners"}', 'Flux has quickly become the gold standard for open image generation. Text rendering quality is a genuine breakthrough, and the open-source Schnell model democratizes access.', now()),

('Krea AI', 'krea-ai', 'Real-time AI image generation and enhancement', 'Krea AI offers real-time AI image generation where you see the image form as you type your prompt. Features include upscaling, background removal, logo illusions, and AI training on your own images. The real-time canvas lets you sketch and see AI interpret your drawing instantly.', 'https://krea.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["50 images/day","Real-time generation","720p"]},{"plan":"Pro","price":"$24/mo","features":["Unlimited images","4K upscaling","Fast generation","Video"]}]', 'beginner', true, '{web,api}', '{"Real-time generation","AI upscaling","Logo illusions","Background removal","Image-to-image","Custom model training","Sketch-to-image","Pattern generation"}', '{"Figma","Photoshop","ComfyUI"}', 'https://krea.ai', true, '{"Designers exploring ideas quickly","Creative professionals","Brand designers"}', '{"Batch production workflows","Print-resolution needs"}', 'Krea AI''s real-time generation is mesmerizing and genuinely useful for creative exploration. It feels like the future of AI-assisted design, though output quality trails Midjourney for final production.', now()),

('Tensor.art', 'tensor-art', 'AI art community with free image generation', 'Tensor.art is a community-driven AI art platform where users can generate images using thousands of community-shared models, LoRAs, and checkpoints. Offers free daily credits, a model marketplace, and ComfyUI workflows in the browser. Popular for anime and character art generation.', 'https://tensor.art', 'freemium', '[{"plan":"Free","price":"$0","features":["100 daily credits","Community models","Basic generation"]},{"plan":"Standard","price":"$9.99/mo","features":["600 credits/day","Priority GPU","Private mode"]},{"plan":"Pro","price":"$29.99/mo","features":["2000 credits/day","Fastest GPU","API"]}]', 'beginner', true, '{web,api}', '{"Community model library","Free daily generation","ComfyUI in browser","LoRA support","Model training","Image-to-image","Inpainting","Workflow sharing"}', '{"ComfyUI","Stable Diffusion models","LoRA networks"}', 'https://tensor.art', true, '{"AI art enthusiasts","Anime artists","Model experimenters"}', '{"Enterprise commercial use","Those wanting guaranteed consistency"}', 'Tensor.art offers remarkable value with free daily credits and access to thousands of community models. Best for exploring diverse AI art styles rather than consistent production work.', now()),

('CivitAI', 'civitai', 'Open-source AI art model hub and community', 'CivitAI is the largest community hub for sharing and discovering Stable Diffusion and Flux models, LoRAs, embeddings, and other AI art resources. Features model reviews, image galleries, and on-site generation. The go-to platform for the open-source AI art community with thousands of specialized models.', 'https://civitai.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Model downloads","Community access","Limited on-site generation"]},{"plan":"Member","price":"$5/mo","features":["Faster downloads","More generation credits"]},{"plan":"Supporter","price":"$15/mo","features":["Priority generation","Early access","No ads"]}]', 'intermediate', true, '{web,api}', '{"Model sharing hub","On-site generation","LoRA library","Embedding marketplace","Image gallery","Model reviews","Bounty system","API access"}', '{"Automatic1111","ComfyUI","Stable Diffusion","Flux"}', 'https://github.com/civitai/civitai/wiki', true, '{"AI art model creators","Stable Diffusion users","Open-source AI enthusiasts"}', '{"Non-technical users","Those wanting simple generation"}', 'CivitAI is the GitHub of AI art models. Essential for anyone working with Stable Diffusion or Flux, though navigating the vast library requires some AI art knowledge.', now()),

('Lexica', 'lexica', 'AI image search engine and generation platform', 'Lexica started as a search engine for Stable Diffusion images and prompts, and has evolved into a full image generation platform with its own Aperture model. Browse millions of AI-generated images, find effective prompts, and generate your own images with a clean, minimal interface.', 'https://lexica.art', 'freemium', '[{"plan":"Free","price":"$0","features":["Limited searches","Browse gallery"]},{"plan":"Starter","price":"$8/mo","features":["1000 fast generations","Commercial license"]},{"plan":"Pro","price":"$24/mo","features":["3000 fast generations","Private mode","Priority"]}]', 'beginner', false, '{web}', '{"Prompt search engine","Image generation","Aperture model","Outpainting","Variations","Image gallery","Prompt discovery","Commercial license"}', '{}', 'https://lexica.art', true, '{"AI art beginners learning prompts","Designers seeking inspiration","Content creators"}', '{"Production-scale image generation","API-first workflows"}', 'Lexica is the best place to learn AI prompting by example. The searchable gallery of millions of images with their prompts is invaluable for understanding what works.', now()),

('Artbreeder', 'artbreeder', 'Collaborative AI art through blending and breeding', 'Artbreeder lets you create images by blending multiple AI-generated images together, adjusting genes like color, shape, and style. Features include Splicer for blending images, Composer for creating scenes, and Collager for arranging elements. A unique creative approach to AI art with a vibrant community.', 'https://artbreeder.com', 'freemium', '[{"plan":"Free","price":"$0","features":["3 credits/mo","Public images","720p"]},{"plan":"Starter","price":"$8.99/mo","features":["100 credits/mo","HD downloads","Private mode"]},{"plan":"Advanced","price":"$18.99/mo","features":["275 credits/mo","Google Drive sync","Priority"]}]', 'beginner', false, '{web}', '{"Image blending","Gene editing","Splicer tool","Composer scenes","Collager layouts","Community sharing","Animation","High-res download"}', '{"Google Drive"}', 'https://artbreeder.com', true, '{"Character designers","World builders","Creative experimenters"}', '{"Precise commercial design","Photo-realistic production"}', 'Artbreeder offers a uniquely creative approach to AI art that feels more like play than work. The breeding and blending mechanics encourage exploration and happy accidents.', now()),

('StarryAI', 'starryai', 'AI art generator mobile app', 'StarryAI is a mobile-first AI art generator that creates artwork from text prompts. Offers multiple AI models, style presets, and gives users full ownership of generated images. Provides daily free credits and focuses on artistic styles including abstract, anime, and photographic.', 'https://starryai.com', 'freemium', '[{"plan":"Free","price":"$0","features":["5 daily credits","Basic models","Watermarked"]},{"plan":"Pro","price":"$11.99/mo","features":["100 credits/day","All models","No watermark","Upscaling"]},{"plan":"Unlimited","price":"$22.99/mo","features":["Unlimited credits","Priority generation","All features"]}]', 'beginner', false, '{mobile,web}', '{"Text-to-image","Multiple AI models","Style presets","Full ownership","Daily free credits","Upscaling","Canvas editing","Variations"}', '{}', 'https://starryai.com', true, '{"Mobile-first creators","Casual AI art enthusiasts","Social media content makers"}', '{"Professional designers","API developers"}', 'StarryAI is one of the best mobile AI art apps available. Quality has improved significantly and the daily free credits make it accessible for casual experimentation.', now()),

('DreamStudio', 'dreamstudio', 'Official Stable Diffusion web interface by Stability AI', 'DreamStudio is Stability AI''s official web interface for Stable Diffusion image generation. Offers the latest Stable Diffusion models with an intuitive interface, inpainting, outpainting, and image-to-image features. Credits-based pricing keeps costs predictable.', 'https://dreamstudio.ai', 'paid', '[{"plan":"Credits","price":"$10/1000 credits","features":["~5000 images","All models","Full features"]},{"plan":"API","price":"$0.002-0.006/image","features":["Programmatic access","All models","Commercial use"]}]', 'beginner', true, '{web,api}', '{"Stable Diffusion models","Inpainting","Outpainting","Image-to-image","Negative prompts","Aspect ratio control","Style presets","API access"}', '{"Stability AI API","ComfyUI","Photoshop (via plugin)"}', 'https://platform.stability.ai/docs', true, '{"Stable Diffusion newcomers","Designers wanting official SD experience","Developers prototyping"}', '{"Users wanting free generation","Those needing Midjourney-level quality"}', 'DreamStudio is the most straightforward way to use official Stable Diffusion models. Credit pricing is fair, though free alternatives like Tensor.art offer more models.', now()),

('Craiyon', 'craiyon', 'Free AI image generator for everyone', 'Craiyon (formerly DALL-E Mini) is a free AI image generator that creates images from text prompts. While not as high-quality as premium alternatives, it offers unlimited free generation with no sign-up required. Popular for quick, casual image creation and meme generation.', 'https://craiyon.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Unlimited images","No sign-up","Ads supported"]},{"plan":"Supporter","price":"$5/mo","features":["No ads","Faster generation","No watermark"]},{"plan":"Professional","price":"$20/mo","features":["API access","Priority","Private mode"]}]', 'beginner', true, '{web,api}', '{"Free unlimited generation","No sign-up required","Text-to-image","Negative prompts","Image variations","Upscaling","Search-based generation","API access"}', '{}', 'https://craiyon.com', true, '{"Casual users wanting free generation","Meme creators","Beginners exploring AI art"}', '{"Professional design work","High-quality production"}', 'Craiyon wins on accessibility: free, unlimited, no sign-up. Image quality is noticeably below premium tools, but for quick ideation and fun it remains a solid choice.', now()),

('Pixlr', 'pixlr', 'AI-powered online photo editor', 'Pixlr is a free online photo editor with AI-powered features including one-click background removal, AI image generation, object removal, and smart resize. Offers both a simplified editor (Pixlr X) and an advanced Photoshop-like editor (Pixlr E). Used by millions for quick photo editing tasks.', 'https://pixlr.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Basic editing","Limited AI tools","Ads"]},{"plan":"Plus","price":"$7.99/mo","features":["Full AI tools","No ads","Templates"]},{"plan":"Premium","price":"$12.99/mo","features":["Batch editing","Team features","Priority"]}]', 'beginner', false, '{web,mobile}', '{"AI background removal","AI image generation","Object removal","Smart resize","Layer editing","Filters and effects","Batch editing","Template library"}', '{"Google Drive","Dropbox","Facebook","Instagram"}', 'https://pixlr.com', true, '{"Quick photo edits","Social media managers","Non-designers needing image editing"}', '{"Professional photo retouching","Print-quality production"}', 'Pixlr is the best free Photoshop alternative for quick edits. The AI features are useful additions, though they lack the precision of dedicated AI photo tools.', now())

ON CONFLICT (slug) DO NOTHING;

-- ─── PRODUCTIVITY (MORE) ────────────────────────────────────

INSERT INTO tools (name, slug, tagline, description, website_url, pricing_type, pricing_details, skill_level, has_api, platforms, features, integrations, docs_url, is_published, best_for, not_for, editorial_verdict, last_verified_at) VALUES

('Mem', 'mem-ai', 'Self-organizing AI note-taking app', 'Mem uses AI to automatically organize your notes, surface relevant information, and connect related ideas without manual tagging or folder structures. Features include AI search, smart suggestions, meeting notes capture, and a chat interface that answers questions from your knowledge base.', 'https://mem.ai', 'freemium', '[{"plan":"Free","price":"$0","features":["Basic notes","Limited AI"]},{"plan":"Mem","price":"$14.99/mo","features":["Unlimited AI","Smart search","Meeting capture","Collections"]}]', 'beginner', false, '{web,mobile,desktop}', '{"Self-organizing notes","AI search across notes","Smart suggestions","Meeting capture","Knowledge base chat","Bi-directional linking","Timeline view","Email capture"}', '{"Google Calendar","Zoom","Slack","Zapier","Email"}', 'https://mem.ai/blog', true, '{"Knowledge workers managing information overload","Researchers","Executives"}', '{"Teams needing shared wikis","Those wanting rigid folder structures"}', 'Mem''s self-organizing approach is refreshing compared to traditional note apps. The AI actually surfaces relevant notes at the right time, though it requires consistent use to build a useful knowledge base.', now()),

('Taskade', 'taskade', 'AI-powered workspace for tasks, docs, and chat', 'Taskade is an all-in-one productivity workspace that uses AI agents to help with project management, document creation, and team collaboration. Features include AI-generated task lists, mind maps, flowcharts, and autonomous AI agents that can complete tasks on their behalf.', 'https://taskade.com', 'freemium', '[{"plan":"Free","price":"$0","features":["1 workspace","Limited AI"]},{"plan":"Pro","price":"$8/mo","features":["Unlimited workspaces","AI agents","Custom templates"]},{"plan":"Business","price":"$16/seat/mo","features":["Admin controls","Permissions","Priority support"]}]', 'beginner', false, '{web,mobile,desktop}', '{"AI task generation","AI agents","Mind maps","Flowcharts","Real-time collaboration","Custom templates","Video chat","Workflow automation"}', '{"Google Drive","Dropbox","Slack","Zapier","GitHub"}', 'https://taskade.com/blog', true, '{"Small teams wanting all-in-one workspace","Freelancers","Remote teams"}', '{"Enterprise with complex PM needs","Teams locked into existing ecosystems"}', 'Taskade tries to be Notion, Trello, and Zoom combined. The AI agents are a differentiator, but the broad scope means no single feature is best-in-class.', now()),

('Coda', 'coda', 'AI-powered doc that brings data and apps together', 'Coda combines documents, spreadsheets, and apps into one collaborative surface with AI built in. Coda AI can write content, summarize tables, generate formulas, and automate workflows. Used by teams at Uber, NYT, and Square to replace scattered tools with one unified doc.', 'https://coda.io', 'freemium', '[{"plan":"Free","price":"$0","features":["Unlimited docs","Basic features"]},{"plan":"Pro","price":"$10/editor/mo","features":["Unlimited automation","Coda AI","Cross-doc packs"]},{"plan":"Team","price":"$30/editor/mo","features":["Admin controls","Advanced packs","Priority support"]}]', 'intermediate', true, '{web,mobile,api}', '{"Doc-meets-spreadsheet","Coda AI assistant","Automation rules","Custom views","Cross-doc syncing","Packs (integrations)","Formula engine","Publishing"}', '{"Slack","Google Calendar","Jira","GitHub","Figma","Salesforce"}', 'https://coda.io/developers', true, '{"Teams replacing multiple tools","Ops teams","Product managers"}', '{"Simple note-takers","Those wanting traditional spreadsheets"}', 'Coda is what happens when docs and spreadsheets have a baby that is also an app platform. Powerful but has a real learning curve that limits adoption for simpler needs.', now()),

('ClickUp', 'clickup', 'All-in-one project management with AI', 'ClickUp is a comprehensive project management platform with built-in AI features. ClickUp Brain can generate tasks, summarize projects, write documents, and automate workflows using natural language. Supports multiple views including list, board, timeline, and custom dashboards.', 'https://clickup.com', 'freemium', '[{"plan":"Free","price":"$0","features":["100MB storage","Unlimited tasks","Basic features"]},{"plan":"Unlimited","price":"$7/member/mo","features":["Unlimited storage","Integrations","Dashboards"]},{"plan":"Business","price":"$12/member/mo","features":["ClickUp Brain AI","Advanced automation","Custom roles"]}]', 'beginner', true, '{web,mobile,desktop,api}', '{"ClickUp Brain AI","Multiple project views","Custom dashboards","Goal tracking","Time tracking","Whiteboards","Docs","Automation"}', '{"Slack","GitHub","Google Drive","Figma","Zoom","HubSpot","Salesforce"}', 'https://clickup.com/api', true, '{"Teams wanting one tool for everything","Startups","Agencies"}', '{"Minimalists wanting simple task lists","Solo users with basic needs"}', 'ClickUp packs an enormous feature set that can genuinely replace multiple tools. The AI features are useful but the platform''s complexity can be overwhelming for smaller teams.', now()),

('Monday.com', 'monday-com', 'Work management platform with AI automation', 'Monday.com is a work operating system that lets teams build custom workflows with AI-powered features. Monday AI can generate tasks, summarize updates, compose emails, and build formulas. Supports CRM, project management, development, and marketing use cases in one platform with 200+ templates.', 'https://monday.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Up to 2 seats","3 boards"]},{"plan":"Basic","price":"$9/seat/mo","features":["Unlimited boards","200+ templates"]},{"plan":"Standard","price":"$12/seat/mo","features":["Monday AI","Automations","Integrations"]},{"plan":"Pro","price":"$19/seat/mo","features":["Advanced analytics","Time tracking","Dependencies"]}]', 'beginner', true, '{web,mobile,api}', '{"Monday AI assistant","Custom workflows","200+ templates","Dashboards","Automations","Time tracking","Forms","CRM functionality"}', '{"Slack","Google Drive","Zoom","Jira","GitHub","Salesforce","HubSpot","Outlook"}', 'https://developer.monday.com', true, '{"Mid-size teams","Operations teams","Non-technical project managers"}', '{"Software development teams wanting dev-first tools","Solo freelancers"}', 'Monday.com is the most visually intuitive work management platform. The AI features are a natural addition, though the per-seat pricing adds up quickly for larger teams.', now()),

('Asana', 'asana', 'AI-enhanced work management for teams', 'Asana is a leading work management platform with Asana Intelligence AI features that help prioritize tasks, identify risks, summarize projects, and automate workflows. Supports portfolio management, goals, workload management, and multiple project views used by teams at Amazon, Google, and NASA.', 'https://asana.com', 'freemium', '[{"plan":"Personal","price":"$0","features":["Up to 10 users","Basic features"]},{"plan":"Starter","price":"$10.99/user/mo","features":["Timeline view","Workflow builder"]},{"plan":"Advanced","price":"$24.99/user/mo","features":["Asana Intelligence AI","Portfolios","Workload","Goals"]}]', 'beginner', true, '{web,mobile,api}', '{"Asana Intelligence AI","Portfolio management","Goal tracking","Workload management","Timeline view","Workflow builder","Custom fields","Reporting"}', '{"Slack","Google Workspace","Microsoft Teams","Salesforce","Jira","GitHub","Figma"}', 'https://developers.asana.com', true, '{"Enterprise teams","Marketing teams","Cross-functional projects"}', '{"Solo users","Development teams wanting code-centric tools"}', 'Asana remains one of the most polished project management tools available. AI features are catching up to competitors, but the core workflow management is still best-in-class.', now()),

('Slack', 'slack', 'Team messaging platform with AI features', 'Slack is the dominant team messaging platform now with AI features including Slack AI for channel summaries, thread recaps, search answers, and workflow automation. Slack AI processes conversations to help users catch up on missed discussions and find information buried in channels.', 'https://slack.com', 'freemium', '[{"plan":"Free","price":"$0","features":["90-day message history","10 integrations"]},{"plan":"Pro","price":"$7.25/user/mo","features":["Full history","Unlimited integrations","Huddles"]},{"plan":"Business+","price":"$12.50/user/mo","features":["Slack AI","SAML SSO","Data exports","Compliance"]}]', 'beginner', true, '{web,mobile,desktop,api}', '{"Slack AI summaries","Channel recaps","Search answers","Workflow Builder","Huddles (audio/video)","Canvas docs","App integrations","Thread management"}', '{"Google Workspace","Salesforce","Jira","GitHub","Notion","Figma","Zoom","Asana"}', 'https://api.slack.com', true, '{"Remote teams","Startups","Any team needing real-time communication"}', '{"Teams preferring email","Organizations needing message permanence on free plan"}', 'Slack redefined team communication and the AI features are a welcome evolution. Channel summaries genuinely help manage information overload, though AI is only available on expensive tiers.', now()),

('Microsoft Copilot', 'microsoft-copilot', 'AI assistant integrated across Microsoft 365', 'Microsoft Copilot brings AI assistance directly into Word, Excel, PowerPoint, Outlook, Teams, and other Microsoft 365 apps. Generate documents, analyze spreadsheets, create presentations, draft emails, and summarize meetings using natural language. Powered by GPT-4 with access to your organization''s data through Microsoft Graph.', 'https://copilot.microsoft.com', 'freemium', '[{"plan":"Free (Copilot)","price":"$0","features":["Web chat","Basic AI","Image generation"]},{"plan":"Copilot Pro","price":"$20/mo","features":["Priority GPT-4","Office integration","Designer"]},{"plan":"Copilot for M365","price":"$30/user/mo","features":["Full Office integration","Teams","Graph grounding"]}]', 'beginner', true, '{web,mobile,desktop,api}', '{"Word document generation","Excel data analysis","PowerPoint creation","Email drafting","Teams meeting summaries","Microsoft Graph integration","Image generation","Web search"}', '{"Microsoft 365","Teams","SharePoint","OneDrive","Outlook","Power Platform","Dynamics 365"}', 'https://learn.microsoft.com/copilot', true, '{"Microsoft 365 organizations","Enterprise teams","Office power users"}', '{"Non-Microsoft ecosystems","Budget-conscious individuals","Linux users"}', 'Microsoft Copilot is transformative for heavy Microsoft 365 users. The tight Office integration is its superpower, but the $30/user/mo enterprise price makes ROI calculation essential.', now()),

('Google Gemini', 'google-gemini', 'Google AI assistant across Workspace and Search', 'Google Gemini (formerly Bard) is Google''s AI assistant available as a standalone chat, within Google Workspace (Docs, Sheets, Gmail, Meet), and integrated into Google Search. Features include multimodal understanding, code generation, image creation, and deep integration with Google services.', 'https://gemini.google.com', 'freemium', '[{"plan":"Free","price":"$0","features":["Gemini chat","Basic features","Google integration"]},{"plan":"Gemini Advanced","price":"$19.99/mo","features":["Gemini 1.5 Pro","1M token context","Gems","2TB storage"]},{"plan":"Workspace Add-on","price":"$20/user/mo","features":["Gemini in Docs, Sheets, Gmail, Meet"]}]', 'beginner', true, '{web,mobile,api}', '{"Multimodal chat","Google Workspace integration","Code generation","Image generation","Long context window","Gems (custom bots)","Google Search grounding","Extensions"}', '{"Google Docs","Google Sheets","Gmail","Google Meet","Google Maps","YouTube","Google Flights"}', 'https://ai.google.dev', true, '{"Google Workspace users","Android users","Developers using Google Cloud"}', '{"Apple-only ecosystems","Privacy-focused users","Microsoft-heavy organizations"}', 'Google Gemini''s strongest advantage is deep Google ecosystem integration. The 1M token context window is genuinely useful for long documents, though overall quality still trails Claude and GPT-4 in many benchmarks.', now()),

('Craft', 'craft', 'Beautiful AI-powered documents for Apple users', 'Craft is a modern document editor designed for Apple platforms with AI-powered features including writing assistance, summarization, translation, and content generation. Known for its beautiful design, native performance on Mac and iOS, and powerful sharing and collaboration features.', 'https://craft.do', 'freemium', '[{"plan":"Free","price":"$0","features":["Unlimited docs","Basic AI","1GB storage"]},{"plan":"Pro","price":"$5/mo","features":["Unlimited AI assistant","Unlimited storage","Custom domains"]},{"plan":"Business","price":"$10/user/mo","features":["Team workspace","Admin controls","SSO"]}]', 'beginner', false, '{web,mobile,desktop}', '{"AI writing assistant","AI summarization","Beautiful document design","Native Apple performance","Markdown support","Block-based editing","Sharing and publishing","Offline access"}', '{"Apple ecosystem","iCloud","Zapier","Markdown export"}', 'https://craft.do/blog', true, '{"Apple ecosystem users","Writers wanting beautiful docs","Small teams on Mac"}', '{"Windows-primary teams","Heavy spreadsheet users","Enterprise collaboration"}', 'Craft is the most beautiful document editor on Apple platforms. The AI features are well integrated though not as powerful as Notion AI, and the Apple focus limits its cross-platform appeal.', now())

ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- LINK TOOLS → CATEGORIES
-- ============================================================

-- Voice & Speech tools
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'murf-ai' AND c.slug = 'voice-speech'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'play-ht' AND c.slug = 'voice-speech'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'resemble-ai' AND c.slug = 'voice-speech'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'wellsaid-labs' AND c.slug = 'voice-speech'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'speechify' AND c.slug = 'voice-speech'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'lovo-ai' AND c.slug = 'voice-speech'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'coqui' AND c.slug = 'voice-speech'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'podcastle' AND c.slug IN ('voice-speech', 'video-audio')
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'assemblyai' AND c.slug = 'voice-speech'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'deepgram' AND c.slug = 'voice-speech'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'rev' AND c.slug = 'voice-speech'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'sonix' AND c.slug = 'voice-speech'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'trint' AND c.slug = 'voice-speech'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'happy-scribe' AND c.slug = 'voice-speech'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'krisp' AND c.slug IN ('voice-speech', 'productivity')
ON CONFLICT DO NOTHING;

-- Video & Audio tools
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'pictory' AND c.slug = 'video-audio'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'fliki' AND c.slug = 'video-audio'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'colossyan' AND c.slug = 'video-audio'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'd-id' AND c.slug = 'video-audio'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'elai-io' AND c.slug = 'video-audio'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'hour-one' AND c.slug = 'video-audio'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'veed-io' AND c.slug = 'video-audio'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'kapwing' AND c.slug = 'video-audio'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'capcut' AND c.slug = 'video-audio'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'topaz-video-ai' AND c.slug = 'video-audio'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'riverside-fm' AND c.slug = 'video-audio'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'cleanvoice' AND c.slug = 'video-audio'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'adobe-podcast' AND c.slug = 'video-audio'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'soundraw' AND c.slug = 'video-audio'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'aiva' AND c.slug = 'video-audio'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'boomy' AND c.slug = 'video-audio'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'amper-music' AND c.slug = 'video-audio'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'moises' AND c.slug = 'video-audio'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'lalal-ai' AND c.slug = 'video-audio'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'udio' AND c.slug = 'video-audio'
ON CONFLICT DO NOTHING;

-- Image Generation tools
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'flux' AND c.slug = 'image-generation'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'krea-ai' AND c.slug = 'image-generation'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'tensor-art' AND c.slug = 'image-generation'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'civitai' AND c.slug = 'image-generation'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'lexica' AND c.slug = 'image-generation'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'artbreeder' AND c.slug = 'image-generation'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'starryai' AND c.slug = 'image-generation'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'dreamstudio' AND c.slug = 'image-generation'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'craiyon' AND c.slug = 'image-generation'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'pixlr' AND c.slug IN ('image-generation', 'design-ui')
ON CONFLICT DO NOTHING;

-- Productivity tools
INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'mem-ai' AND c.slug = 'productivity'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'taskade' AND c.slug = 'productivity'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'coda' AND c.slug = 'productivity'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'clickup' AND c.slug = 'productivity'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'monday-com' AND c.slug = 'productivity'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'asana' AND c.slug = 'productivity'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'slack' AND c.slug = 'productivity'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'microsoft-copilot' AND c.slug = 'productivity'
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'google-gemini' AND c.slug IN ('productivity', 'research-education')
ON CONFLICT DO NOTHING;

INSERT INTO tool_categories (tool_id, category_id)
SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = 'craft' AND c.slug IN ('productivity', 'writing-content')
ON CONFLICT DO NOTHING;

-- ============================================================
-- LINK TOOLS → TAGS
-- ============================================================

-- Voice & Speech tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'murf-ai' AND tg.slug IN ('voice-cloning', 'text-generation')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'play-ht' AND tg.slug IN ('voice-cloning', 'text-generation', 'api-tool')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'resemble-ai' AND tg.slug IN ('voice-cloning', 'api-tool')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'wellsaid-labs' AND tg.slug IN ('voice-cloning', 'api-tool')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'speechify' AND tg.slug IN ('text-generation', 'summarization')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'lovo-ai' AND tg.slug IN ('voice-cloning', 'video-editing')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'coqui' AND tg.slug IN ('voice-cloning', 'open-source', 'api-tool')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'podcastle' AND tg.slug IN ('transcription', 'voice-cloning')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'assemblyai' AND tg.slug IN ('transcription', 'api-tool', 'summarization')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'deepgram' AND tg.slug IN ('transcription', 'api-tool')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'rev' AND tg.slug IN ('transcription', 'api-tool')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'sonix' AND tg.slug IN ('transcription', 'translation')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'trint' AND tg.slug IN ('transcription', 'translation')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'happy-scribe' AND tg.slug IN ('transcription', 'translation')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'krisp' AND tg.slug IN ('meeting-assistant', 'transcription')
ON CONFLICT DO NOTHING;

-- Video & Audio tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'pictory' AND tg.slug IN ('video-editing', 'text-generation')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'fliki' AND tg.slug IN ('video-editing', 'voice-cloning')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'colossyan' AND tg.slug IN ('video-editing', 'presentation')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'd-id' AND tg.slug IN ('video-editing', 'api-tool')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'elai-io' AND tg.slug IN ('video-editing', 'translation')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'hour-one' AND tg.slug IN ('video-editing', 'api-tool')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'veed-io' AND tg.slug IN ('video-editing', 'transcription')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'kapwing' AND tg.slug IN ('video-editing', 'no-code')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'capcut' AND tg.slug IN ('video-editing', 'no-code')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'topaz-video-ai' AND tg.slug IN ('video-editing', 'photo-editing')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'riverside-fm' AND tg.slug IN ('video-editing', 'transcription')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'cleanvoice' AND tg.slug IN ('video-editing', 'automation')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'adobe-podcast' AND tg.slug IN ('video-editing', 'transcription')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'soundraw' AND tg.slug IN ('music-generation', 'api-tool')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'aiva' AND tg.slug IN ('music-generation')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'boomy' AND tg.slug IN ('music-generation')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'amper-music' AND tg.slug IN ('music-generation')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'moises' AND tg.slug IN ('music-generation')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'lalal-ai' AND tg.slug IN ('music-generation')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'udio' AND tg.slug IN ('music-generation')
ON CONFLICT DO NOTHING;

-- Image Generation tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'flux' AND tg.slug IN ('image-generation', 'open-source', 'api-tool')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'krea-ai' AND tg.slug IN ('image-generation', 'design')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'tensor-art' AND tg.slug IN ('image-generation', 'open-source')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'civitai' AND tg.slug IN ('image-generation', 'open-source')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'lexica' AND tg.slug IN ('image-generation')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'artbreeder' AND tg.slug IN ('image-generation', 'design')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'starryai' AND tg.slug IN ('image-generation')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'dreamstudio' AND tg.slug IN ('image-generation', 'api-tool')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'craiyon' AND tg.slug IN ('image-generation', 'no-code')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'pixlr' AND tg.slug IN ('photo-editing', 'image-generation')
ON CONFLICT DO NOTHING;

-- Productivity tags
INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'mem-ai' AND tg.slug IN ('writing-assistant', 'summarization')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'taskade' AND tg.slug IN ('workflow', 'automation', 'agent')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'coda' AND tg.slug IN ('workflow', 'automation', 'no-code')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'clickup' AND tg.slug IN ('workflow', 'automation')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'monday-com' AND tg.slug IN ('workflow', 'automation', 'no-code')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'asana' AND tg.slug IN ('workflow', 'automation')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'slack' AND tg.slug IN ('chatbot', 'meeting-assistant', 'automation')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'microsoft-copilot' AND tg.slug IN ('text-generation', 'summarization', 'writing-assistant', 'chatbot')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'google-gemini' AND tg.slug IN ('text-generation', 'chatbot', 'code-generation', 'image-generation')
ON CONFLICT DO NOTHING;

INSERT INTO tool_tags (tool_id, tag_id)
SELECT t.id, tg.id FROM tools t, tags tg WHERE t.slug = 'craft' AND tg.slug IN ('writing-assistant', 'summarization')
ON CONFLICT DO NOTHING;
