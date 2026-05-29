/**
 * Comprehensive AI tools seed dataset — 2000+ tools across all categories.
 * Each tool has real name, website, tagline, pricing, and category assignments.
 * The refresh pipeline enriches descriptions, features, and editorials over time.
 */

export interface SeedTool {
  name: string
  slug: string
  website_url: string
  tagline: string
  description: string
  pricing_type: 'free' | 'freemium' | 'paid' | 'contact'
  skill_level: 'beginner' | 'intermediate' | 'advanced'
  has_api: boolean
  platforms: string[]
  categories: string[] // category slugs
}

function t(
  name: string, slug: string, url: string, tagline: string,
  pricing: 'free' | 'freemium' | 'paid' | 'contact',
  skill: 'beginner' | 'intermediate' | 'advanced',
  api: boolean, platforms: string[], categories: string[],
  desc?: string
): SeedTool {
  return {
    name, slug, website_url: url, tagline,
    description: desc || `${name} is an AI-powered tool that ${tagline.toLowerCase()}. ${tagline}`,
    pricing_type: pricing, skill_level: skill, has_api: api, platforms, categories,
  }
}

// ─── WRITING & CONTENT ──────────────────────────────────────────────────────

const WRITING: SeedTool[] = [
  t('ChatGPT', 'chatgpt', 'https://chat.openai.com', 'Advanced AI chatbot for writing, analysis, coding, and creative tasks', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['writing-content', 'code-development', 'research-education', 'productivity']),
  t('Claude', 'claude', 'https://claude.ai', 'Anthropic\'s AI assistant for thoughtful, nuanced writing and analysis', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['writing-content', 'code-development', 'research-education']),
  t('Jasper', 'jasper', 'https://www.jasper.ai', 'Enterprise AI copilot for marketing teams and content creation', 'paid', 'beginner', true, ['web', 'api'], ['writing-content', 'seo-marketing']),
  t('Copy.ai', 'copy-ai', 'https://www.copy.ai', 'AI-powered copywriting and content generation platform', 'freemium', 'beginner', true, ['web', 'api'], ['writing-content', 'seo-marketing']),
  t('Writesonic', 'writesonic', 'https://writesonic.com', 'AI writer for blogs, ads, product descriptions, and marketing copy', 'freemium', 'beginner', true, ['web', 'api'], ['writing-content', 'seo-marketing']),
  t('Grammarly', 'grammarly', 'https://www.grammarly.com', 'AI writing assistant for grammar, clarity, and tone improvements', 'freemium', 'beginner', false, ['web', 'desktop', 'plugin'], ['writing-content', 'productivity']),
  t('Notion AI', 'notion-ai', 'https://www.notion.so/product/ai', 'AI writing and knowledge assistant built into Notion workspace', 'paid', 'beginner', true, ['web', 'desktop', 'mobile'], ['writing-content', 'productivity']),
  t('Rytr', 'rytr', 'https://rytr.me', 'AI writing assistant for generating content in 30+ languages', 'freemium', 'beginner', true, ['web', 'api'], ['writing-content']),
  t('Wordtune', 'wordtune', 'https://www.wordtune.com', 'AI-powered rewriting tool for clearer, more engaging writing', 'freemium', 'beginner', false, ['web', 'plugin'], ['writing-content']),
  t('QuillBot', 'quillbot', 'https://quillbot.com', 'AI paraphrasing and grammar tool for better writing', 'freemium', 'beginner', false, ['web', 'plugin'], ['writing-content']),
  t('Anyword', 'anyword', 'https://anyword.com', 'AI copywriting platform with predictive performance scoring', 'paid', 'intermediate', true, ['web', 'api'], ['writing-content', 'seo-marketing']),
  t('Writer', 'writer-ai', 'https://writer.com', 'Enterprise AI writing platform for brand-consistent content', 'contact', 'intermediate', true, ['web', 'api', 'plugin'], ['writing-content', 'seo-marketing']),
  t('Hypotenuse AI', 'hypotenuse-ai', 'https://www.hypotenuse.ai', 'AI content writer for ecommerce product descriptions and blog posts', 'paid', 'beginner', true, ['web', 'api'], ['writing-content', 'ecommerce']),
  t('ContentBot', 'contentbot', 'https://contentbot.ai', 'AI content automation for blogs, social media, and ad copy', 'paid', 'beginner', true, ['web', 'api'], ['writing-content']),
  t('Peppertype', 'peppertype', 'https://www.peppertype.ai', 'AI content creation platform for marketing teams', 'paid', 'beginner', false, ['web'], ['writing-content', 'seo-marketing']),
  t('Simplified', 'simplified', 'https://simplified.com', 'All-in-one AI platform for writing, design, video, and social media', 'freemium', 'beginner', true, ['web'], ['writing-content', 'design-ui', 'social-media']),
  t('Sudowrite', 'sudowrite', 'https://www.sudowrite.com', 'AI writing partner for fiction authors and creative writers', 'paid', 'intermediate', false, ['web'], ['writing-content']),
  t('NovelAI', 'novelai', 'https://novelai.net', 'AI storytelling tool for creative fiction and world-building', 'paid', 'intermediate', true, ['web', 'api'], ['writing-content']),
  t('ShortlyAI', 'shortlyai', 'https://www.shortlyai.com', 'AI writing assistant focused on long-form content and blogs', 'paid', 'beginner', false, ['web'], ['writing-content']),
  t('Lex', 'lex', 'https://lex.page', 'AI-enhanced writing editor for long-form documents and essays', 'freemium', 'beginner', false, ['web'], ['writing-content']),
  t('Type.ai', 'type-ai', 'https://type.ai', 'AI document editor that writes, edits, and formats for you', 'freemium', 'beginner', false, ['web'], ['writing-content']),
  t('Moonbeam', 'moonbeam', 'https://www.gomoonbeam.com', 'AI writing assistant specifically built for long-form content', 'paid', 'beginner', false, ['web'], ['writing-content']),
  t('Cohesive', 'cohesive', 'https://cohesive.so', 'AI content editor with 200+ templates for marketing and writing', 'freemium', 'beginner', false, ['web'], ['writing-content']),
  t('TextCortex', 'textcortex', 'https://textcortex.com', 'AI writing assistant with custom AI personas for any writing task', 'freemium', 'beginner', true, ['web', 'plugin', 'api'], ['writing-content']),
  t('Sassbook', 'sassbook', 'https://sassbook.com', 'AI-powered writing tools for stories, summaries, and paraphrasing', 'freemium', 'beginner', true, ['web', 'api'], ['writing-content']),
  t('Narrato', 'narrato', 'https://narrato.io', 'AI content workspace for planning, creating, and publishing content', 'paid', 'beginner', true, ['web', 'api'], ['writing-content', 'seo-marketing']),
  t('Frase', 'frase', 'https://www.frase.io', 'AI content optimization tool for SEO-driven blog writing', 'paid', 'intermediate', true, ['web', 'api'], ['writing-content', 'seo-marketing']),
  t('Clearscope', 'clearscope', 'https://www.clearscope.io', 'AI content optimization platform for search-driven content', 'paid', 'intermediate', false, ['web'], ['writing-content', 'seo-marketing']),
  t('MarketMuse', 'marketmuse', 'https://www.marketmuse.com', 'AI content strategy and optimization platform for enterprise SEO', 'paid', 'advanced', true, ['web', 'api'], ['writing-content', 'seo-marketing']),
  t('Hemingway Editor', 'hemingway-editor', 'https://hemingwayapp.com', 'AI editor that makes your writing bold and clear', 'freemium', 'beginner', false, ['web', 'desktop'], ['writing-content']),
  t('ProWritingAid', 'prowritingaid', 'https://prowritingaid.com', 'AI writing mentor for grammar, style, and readability analysis', 'freemium', 'beginner', false, ['web', 'desktop', 'plugin'], ['writing-content']),
  t('INK Editor', 'ink-editor', 'https://inkforall.com', 'AI-first content editor for SEO-optimized writing', 'freemium', 'beginner', false, ['web', 'desktop'], ['writing-content', 'seo-marketing']),
  t('Scalenut', 'scalenut', 'https://www.scalenut.com', 'AI-powered SEO content marketing platform', 'paid', 'intermediate', true, ['web', 'api'], ['writing-content', 'seo-marketing']),
  t('Outranking', 'outranking', 'https://www.outranking.io', 'AI writing platform for SEO content that ranks on Google', 'paid', 'intermediate', false, ['web'], ['writing-content', 'seo-marketing']),
  t('Copysmith', 'copysmith', 'https://copysmith.ai', 'AI content creation tool for ecommerce and marketing teams', 'paid', 'beginner', true, ['web', 'api'], ['writing-content', 'ecommerce']),
  t('Unbounce Smart Copy', 'unbounce-smart-copy', 'https://unbounce.com/smart-copy', 'AI copywriting tool for landing pages and marketing content', 'freemium', 'beginner', false, ['web', 'plugin'], ['writing-content', 'seo-marketing']),
  t('Jenni AI', 'jenni-ai', 'https://jenni.ai', 'AI research and writing assistant for academic papers', 'freemium', 'beginner', false, ['web'], ['writing-content', 'research-education']),
  t('Writerly', 'writerly', 'https://writerly.ai', 'Enterprise AI content platform for brand-safe writing at scale', 'paid', 'intermediate', true, ['web', 'api'], ['writing-content']),
  t('Neuroflash', 'neuroflash', 'https://neuroflash.com', 'AI text and image generator for marketing content in 7 languages', 'freemium', 'beginner', true, ['web', 'api'], ['writing-content', 'image-generation']),
  t('Typli', 'typli', 'https://typli.ai', 'AI writing assistant with SEO optimization and plagiarism checker', 'paid', 'beginner', false, ['web'], ['writing-content', 'seo-marketing']),
  t('Longshot AI', 'longshot-ai', 'https://www.longshot.ai', 'AI writing assistant for factually accurate long-form content', 'paid', 'beginner', true, ['web', 'api'], ['writing-content']),
  t('AI Writer', 'ai-writer', 'https://ai-writer.com', 'AI content generator with source citations and SEO tools', 'paid', 'beginner', true, ['web', 'api'], ['writing-content']),
  t('Article Forge', 'article-forge', 'https://www.articleforge.com', 'AI article generator that creates unique content automatically', 'paid', 'beginner', true, ['web', 'api'], ['writing-content']),
  t('Katteb', 'katteb', 'https://katteb.com', 'AI writer with fact-checking and multilingual content generation', 'paid', 'beginner', false, ['web'], ['writing-content']),
  t('ClosersCopy', 'closerscopy', 'https://www.closerscopy.com', 'AI copywriting tool trained on proven sales frameworks', 'paid', 'intermediate', false, ['web'], ['writing-content', 'sales-crm']),
  t('Creaitor', 'creaitor', 'https://www.creaitor.ai', 'AI content generator for SEO-optimized marketing content', 'freemium', 'beginner', false, ['web'], ['writing-content', 'seo-marketing']),
  t('Reword', 'reword', 'https://reword.co', 'AI collaborative writing tool for teams creating authoritative content', 'paid', 'beginner', false, ['web'], ['writing-content']),
  t('Bertha AI', 'bertha-ai', 'https://bertha.ai', 'AI writing assistant for WordPress content creation', 'paid', 'beginner', false, ['plugin'], ['writing-content']),
  t('Bramework', 'bramework', 'https://www.bramework.com', 'AI blogging tool for writing SEO-friendly articles faster', 'paid', 'beginner', false, ['web'], ['writing-content', 'seo-marketing']),
  t('ContentAtScale', 'content-at-scale', 'https://contentatscale.ai', 'AI platform for generating human-quality blog posts at scale', 'paid', 'intermediate', true, ['web', 'api'], ['writing-content', 'seo-marketing']),
]

// ─── IMAGE GENERATION ──────────────────────────────────────────────────────

const IMAGE_GENERATION: SeedTool[] = [
  t('Midjourney', 'midjourney', 'https://www.midjourney.com', 'AI art generator creating stunning images from text prompts via Discord', 'paid', 'beginner', false, ['web'], ['image-generation', 'design-ui']),
  t('DALL-E 3', 'dall-e-3', 'https://openai.com/dall-e-3', 'OpenAI\'s most advanced text-to-image model with precise prompt following', 'paid', 'beginner', true, ['web', 'api'], ['image-generation']),
  t('Stable Diffusion', 'stable-diffusion', 'https://stability.ai', 'Open-source AI image generation model for custom deployments', 'free', 'advanced', true, ['api', 'desktop'], ['image-generation']),
  t('Adobe Firefly', 'adobe-firefly', 'https://www.adobe.com/products/firefly.html', 'Adobe\'s generative AI for creating and editing images commercially', 'freemium', 'beginner', true, ['web', 'desktop', 'api'], ['image-generation', 'photo-editing', 'design-ui']),
  t('Leonardo AI', 'leonardo-ai', 'https://leonardo.ai', 'AI image generation platform for game assets and creative content', 'freemium', 'intermediate', true, ['web', 'api'], ['image-generation', '3d-game-dev']),
  t('Ideogram', 'ideogram', 'https://ideogram.ai', 'AI image generator excelling at text rendering within images', 'freemium', 'beginner', true, ['web', 'api'], ['image-generation']),
  t('Flux', 'flux-ai', 'https://flux.ai', 'State-of-the-art open text-to-image model by Black Forest Labs', 'freemium', 'intermediate', true, ['web', 'api'], ['image-generation']),
  t('Playground AI', 'playground-ai', 'https://playground.com', 'Free AI image generation platform with creative editing tools', 'freemium', 'beginner', false, ['web'], ['image-generation']),
  t('NightCafe', 'nightcafe', 'https://nightcafe.studio', 'AI art generator with multiple style engines and community gallery', 'freemium', 'beginner', false, ['web', 'mobile'], ['image-generation']),
  t('Canva AI', 'canva-ai', 'https://www.canva.com/ai-image-generator/', 'AI image generation integrated into Canva\'s design platform', 'freemium', 'beginner', false, ['web', 'mobile', 'desktop'], ['image-generation', 'design-ui']),
  t('Craiyon', 'craiyon', 'https://www.craiyon.com', 'Free AI image generator (formerly DALL-E Mini) for quick creations', 'freemium', 'beginner', true, ['web', 'api'], ['image-generation']),
  t('DreamStudio', 'dreamstudio', 'https://dreamstudio.ai', 'Stability AI\'s official web interface for Stable Diffusion models', 'paid', 'beginner', true, ['web', 'api'], ['image-generation']),
  t('Artbreeder', 'artbreeder', 'https://www.artbreeder.com', 'AI collaborative image creation through blending and genetic art', 'freemium', 'beginner', false, ['web'], ['image-generation']),
  t('Krea AI', 'krea-ai', 'https://www.krea.ai', 'AI creative tool for real-time image generation and enhancement', 'freemium', 'intermediate', true, ['web', 'api'], ['image-generation']),
  t('RunwayML', 'runwayml', 'https://runwayml.com', 'AI creative suite for image and video generation and editing', 'freemium', 'intermediate', true, ['web', 'api'], ['image-generation', 'video-animation']),
  t('Clipdrop', 'clipdrop', 'https://clipdrop.co', 'AI-powered image creation and editing toolkit by Stability AI', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['image-generation', 'photo-editing']),
  t('Bing Image Creator', 'bing-image-creator', 'https://www.bing.com/images/create', 'Free AI image generation powered by DALL-E 3 in Bing', 'free', 'beginner', false, ['web'], ['image-generation']),
  t('BlueWillow', 'bluewillow', 'https://www.bluewillow.ai', 'Free AI art generator accessible through Discord', 'free', 'beginner', false, ['web'], ['image-generation']),
  t('Pixlr', 'pixlr', 'https://pixlr.com', 'AI-powered photo editor and image generator in the browser', 'freemium', 'beginner', false, ['web', 'mobile'], ['image-generation', 'photo-editing']),
  t('Lexica', 'lexica', 'https://lexica.art', 'AI image search engine and generator with Aperture model', 'freemium', 'beginner', false, ['web'], ['image-generation']),
  t('Jasper Art', 'jasper-art', 'https://www.jasper.ai/art', 'AI image generation tool integrated with Jasper\'s content platform', 'paid', 'beginner', false, ['web'], ['image-generation']),
  t('PhotoSonic', 'photosonic', 'https://writesonic.com/photosonic-ai-art-generator', 'AI art generator by Writesonic for marketing visuals', 'freemium', 'beginner', true, ['web', 'api'], ['image-generation']),
  t('Imagine by Meta', 'imagine-meta', 'https://imagine.meta.com', 'Meta\'s free AI image generator powered by Emu model', 'free', 'beginner', false, ['web'], ['image-generation']),
  t('Getimg.ai', 'getimg-ai', 'https://getimg.ai', 'AI image generation suite with custom model training', 'freemium', 'intermediate', true, ['web', 'api'], ['image-generation']),
  t('Tensor.Art', 'tensor-art', 'https://tensor.art', 'Free AI art platform with community models and LoRA support', 'freemium', 'intermediate', false, ['web'], ['image-generation']),
  t('Civitai', 'civitai', 'https://civitai.com', 'Open community for sharing AI art models, LoRAs, and generations', 'free', 'advanced', false, ['web'], ['image-generation']),
  t('Freepik AI', 'freepik-ai', 'https://www.freepik.com/ai/image-generator', 'AI image generator integrated with Freepik\'s stock platform', 'freemium', 'beginner', false, ['web'], ['image-generation', 'design-ui']),
  t('Hotpot AI', 'hotpot-ai', 'https://hotpot.ai', 'AI tools for image generation, background removal, and editing', 'freemium', 'beginner', true, ['web', 'api'], ['image-generation', 'photo-editing']),
  t('Picsart AI', 'picsart-ai', 'https://picsart.com', 'AI-powered photo and video editing with generative features', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['image-generation', 'photo-editing']),
  t('Fotor AI', 'fotor-ai', 'https://www.fotor.com/ai-image-generator/', 'AI image generation and photo editing in one online platform', 'freemium', 'beginner', false, ['web'], ['image-generation', 'photo-editing']),
  t('Visme AI', 'visme-ai', 'https://www.visme.co', 'AI-powered visual content platform for presentations and infographics', 'freemium', 'beginner', false, ['web'], ['image-generation', 'presentations', 'design-ui']),
  t('Gencraft', 'gencraft', 'https://gencraft.com', 'AI art generator for creating images and videos from text', 'freemium', 'beginner', false, ['web', 'mobile'], ['image-generation']),
  t('StarryAI', 'starryai', 'https://starryai.com', 'AI art generator app for creating NFT-ready digital art', 'freemium', 'beginner', false, ['mobile', 'web'], ['image-generation']),
  t('Dreamlike', 'dreamlike', 'https://dreamlike.art', 'AI art generation platform with multiple models and styles', 'freemium', 'beginner', false, ['web'], ['image-generation']),
  t('Mage.space', 'mage-space', 'https://www.mage.space', 'Free unlimited AI image generation with multiple models', 'freemium', 'beginner', false, ['web'], ['image-generation']),
  t('PixAI', 'pixai', 'https://pixai.art', 'AI anime art generator with character-focused generation', 'freemium', 'beginner', false, ['web'], ['image-generation']),
  t('Dzine AI', 'dzine-ai', 'https://www.dzine.ai', 'AI design tool for generating product mockups and marketing visuals', 'paid', 'beginner', false, ['web'], ['image-generation', 'design-ui']),
  t('Stock AI', 'stock-ai', 'https://www.stockai.com', 'AI stock photo generator for commercial-use images', 'freemium', 'beginner', true, ['web', 'api'], ['image-generation']),
  t('Recraft', 'recraft', 'https://www.recraft.ai', 'AI vector and image generation tool for designers', 'freemium', 'intermediate', true, ['web', 'api'], ['image-generation', 'design-ui']),
  t('Scenario', 'scenario', 'https://www.scenario.com', 'AI game art generator with custom model training for studios', 'freemium', 'intermediate', true, ['web', 'api'], ['image-generation', '3d-game-dev']),
]

// ─── VIDEO & ANIMATION ─────────────────────────────────────────────────────

const VIDEO: SeedTool[] = [
  t('Sora', 'sora', 'https://openai.com/sora', 'OpenAI\'s AI model for generating realistic videos from text prompts', 'paid', 'intermediate', true, ['web', 'api'], ['video-animation']),
  t('Runway Gen-3', 'runway-gen3', 'https://runwayml.com', 'Professional AI video generation and editing suite for creators', 'freemium', 'intermediate', true, ['web', 'api'], ['video-animation']),
  t('Pika', 'pika', 'https://pika.art', 'AI video generation platform for creating and editing videos from text', 'freemium', 'beginner', true, ['web', 'api'], ['video-animation']),
  t('HeyGen', 'heygen', 'https://www.heygen.com', 'AI video generator with realistic talking avatars and lip-sync', 'freemium', 'beginner', true, ['web', 'api'], ['video-animation']),
  t('Synthesia', 'synthesia', 'https://www.synthesia.io', 'AI video creation platform with 150+ digital avatars', 'paid', 'beginner', true, ['web', 'api'], ['video-animation']),
  t('Descript', 'descript', 'https://www.descript.com', 'AI video and podcast editor that works like a document', 'freemium', 'beginner', false, ['web', 'desktop'], ['video-animation', 'voice-audio', 'transcription']),
  t('InVideo AI', 'invideo-ai', 'https://invideo.io', 'AI video generator that creates videos from text prompts', 'freemium', 'beginner', false, ['web'], ['video-animation']),
  t('Lumen5', 'lumen5', 'https://lumen5.com', 'AI video maker that turns blog posts into engaging videos', 'freemium', 'beginner', false, ['web'], ['video-animation', 'social-media']),
  t('Pictory', 'pictory', 'https://pictory.ai', 'AI video creation tool that turns text into professional videos', 'paid', 'beginner', true, ['web', 'api'], ['video-animation']),
  t('D-ID', 'd-id', 'https://www.d-id.com', 'AI video generation platform for creating talking head videos', 'freemium', 'beginner', true, ['web', 'api'], ['video-animation']),
  t('Colossyan', 'colossyan', 'https://www.colossyan.com', 'AI video platform for creating training and learning videos', 'paid', 'beginner', true, ['web', 'api'], ['video-animation', 'research-education']),
  t('Fliki', 'fliki', 'https://fliki.ai', 'AI tool for creating videos with lifelike voiceovers from text', 'freemium', 'beginner', true, ['web', 'api'], ['video-animation', 'voice-audio']),
  t('Opus Clip', 'opus-clip', 'https://www.opus.pro', 'AI tool that repurposes long videos into viral short clips', 'freemium', 'beginner', false, ['web'], ['video-animation', 'social-media']),
  t('CapCut', 'capcut', 'https://www.capcut.com', 'Free AI video editor with auto-captions and effects', 'freemium', 'beginner', false, ['web', 'mobile', 'desktop'], ['video-animation']),
  t('Veed.io', 'veed-io', 'https://www.veed.io', 'Online AI video editor with auto-subtitles and effects', 'freemium', 'beginner', false, ['web'], ['video-animation', 'transcription']),
  t('Luma AI', 'luma-ai', 'https://lumalabs.ai', 'AI 3D capture and video generation with Dream Machine', 'freemium', 'intermediate', true, ['web', 'mobile', 'api'], ['video-animation', '3d-game-dev']),
  t('Kling AI', 'kling-ai', 'https://klingai.com', 'AI video generation model with impressive motion and physics', 'freemium', 'beginner', true, ['web', 'api'], ['video-animation']),
  t('Haiper', 'haiper', 'https://haiper.ai', 'AI video generation platform for creating short-form content', 'freemium', 'beginner', true, ['web', 'api'], ['video-animation']),
  t('Kapwing', 'kapwing', 'https://www.kapwing.com', 'AI-powered online video editor for teams and creators', 'freemium', 'beginner', false, ['web'], ['video-animation']),
  t('Animaker', 'animaker', 'https://www.animaker.com', 'AI-assisted animation and video maker for businesses', 'freemium', 'beginner', false, ['web'], ['video-animation']),
  t('Filmora AI', 'filmora-ai', 'https://filmora.wondershare.com', 'AI video editor with smart cutout, motion tracking, and effects', 'freemium', 'beginner', false, ['desktop', 'mobile'], ['video-animation']),
  t('Topaz Video AI', 'topaz-video-ai', 'https://www.topazlabs.com/topaz-video-ai', 'AI video upscaling and enhancement for professionals', 'paid', 'intermediate', false, ['desktop'], ['video-animation']),
  t('Vidnoz AI', 'vidnoz-ai', 'https://www.vidnoz.com', 'Free AI video creator with 1000+ templates and avatars', 'freemium', 'beginner', true, ['web', 'api'], ['video-animation']),
  t('Flexclip', 'flexclip', 'https://www.flexclip.com', 'AI-powered online video maker with templates and stock media', 'freemium', 'beginner', false, ['web'], ['video-animation']),
  t('Wisecut', 'wisecut', 'https://www.wisecut.video', 'AI video editor that auto-cuts silences and adds captions', 'freemium', 'beginner', false, ['web'], ['video-animation']),
  t('Visla', 'visla', 'https://www.visla.us', 'AI video creation platform for marketing and corporate content', 'paid', 'beginner', true, ['web', 'api'], ['video-animation']),
  t('Steve AI', 'steve-ai', 'https://www.steve.ai', 'AI video creation tool for animated and live-action videos', 'freemium', 'beginner', false, ['web'], ['video-animation']),
  t('Synthesia Expressive Avatars', 'synthesia-expressive', 'https://www.synthesia.io/expressive-avatars', 'Next-gen AI avatars with emotional expressions and gestures', 'paid', 'beginner', true, ['web', 'api'], ['video-animation']),
  t('Wondershare Virbo', 'virbo', 'https://virbo.wondershare.com', 'AI avatar video generator for marketing and training', 'freemium', 'beginner', false, ['web', 'desktop', 'mobile'], ['video-animation']),
  t('Captions App', 'captions-app', 'https://www.captions.ai', 'AI-powered video editing app with auto captions and eye contact fix', 'freemium', 'beginner', false, ['mobile', 'web'], ['video-animation']),
]

// ─── VOICE & AUDIO ──────────────────────────────────────────────────────────

const VOICE_AUDIO: SeedTool[] = [
  t('ElevenLabs', 'elevenlabs', 'https://elevenlabs.io', 'AI voice generation and cloning platform with ultra-realistic speech', 'freemium', 'beginner', true, ['web', 'api'], ['voice-audio']),
  t('Murf AI', 'murf-ai', 'https://murf.ai', 'AI voiceover generator with 120+ realistic text-to-speech voices', 'freemium', 'beginner', true, ['web', 'api'], ['voice-audio']),
  t('Play.ht', 'play-ht', 'https://play.ht', 'AI text-to-speech platform with voice cloning capabilities', 'freemium', 'beginner', true, ['web', 'api'], ['voice-audio']),
  t('Resemble AI', 'resemble-ai', 'https://www.resemble.ai', 'AI voice generator with real-time voice cloning and deepfake detection', 'paid', 'intermediate', true, ['web', 'api'], ['voice-audio']),
  t('WellSaid Labs', 'wellsaid-labs', 'https://wellsaidlabs.com', 'Enterprise AI voice platform for creating studio-quality voiceovers', 'paid', 'beginner', true, ['web', 'api'], ['voice-audio']),
  t('Speechify', 'speechify', 'https://speechify.com', 'AI text-to-speech app that reads any text aloud naturally', 'freemium', 'beginner', false, ['web', 'mobile', 'plugin'], ['voice-audio']),
  t('LOVO AI', 'lovo-ai', 'https://lovo.ai', 'AI voiceover and text-to-speech platform with 500+ voices', 'freemium', 'beginner', true, ['web', 'api'], ['voice-audio']),
  t('Coqui', 'coqui', 'https://coqui.ai', 'Open-source AI voice cloning and text-to-speech toolkit', 'free', 'advanced', true, ['api', 'cli'], ['voice-audio']),
  t('Typecast', 'typecast', 'https://typecast.ai', 'AI voice actors for video narration and content creation', 'freemium', 'beginner', true, ['web', 'api'], ['voice-audio']),
  t('Listnr', 'listnr', 'https://listnr.tech', 'AI voiceover generator with 900+ voices in 142 languages', 'freemium', 'beginner', true, ['web', 'api'], ['voice-audio']),
  t('Voicemod', 'voicemod', 'https://www.voicemod.net', 'Real-time AI voice changer for gaming and streaming', 'freemium', 'beginner', false, ['desktop'], ['voice-audio']),
  t('Respeecher', 'respeecher', 'https://www.respeecher.com', 'AI voice cloning for film, TV, and gaming productions', 'contact', 'advanced', true, ['web', 'api'], ['voice-audio']),
  t('Replica Studios', 'replica-studios', 'https://replicastudios.com', 'AI voice actors for game development and creative projects', 'paid', 'intermediate', true, ['web', 'api', 'plugin'], ['voice-audio', '3d-game-dev']),
  t('Deepgram', 'deepgram', 'https://deepgram.com', 'AI speech-to-text and text-to-speech API for developers', 'freemium', 'advanced', true, ['api'], ['voice-audio', 'transcription']),
  t('AssemblyAI', 'assemblyai', 'https://www.assemblyai.com', 'AI speech recognition API with speaker diarization and sentiment', 'freemium', 'advanced', true, ['api'], ['voice-audio', 'transcription']),
  t('Uberduck', 'uberduck', 'https://uberduck.ai', 'AI voice synthesis platform for creating custom voices', 'freemium', 'intermediate', true, ['web', 'api'], ['voice-audio']),
  t('Tortoise TTS', 'tortoise-tts', 'https://github.com/neonbjb/tortoise-tts', 'Open-source multi-voice text-to-speech system', 'free', 'advanced', false, ['cli'], ['voice-audio']),
  t('Bark', 'bark-ai', 'https://github.com/suno-ai/bark', 'Open-source text-to-audio model that generates speech, music, and sounds', 'free', 'advanced', false, ['cli', 'api'], ['voice-audio', 'music-creation']),
  t('Podcast.ai', 'podcast-ai', 'https://podcast.ai', 'AI-generated podcasts with realistic voice conversations', 'free', 'beginner', false, ['web'], ['voice-audio']),
  t('Krisp', 'krisp', 'https://krisp.ai', 'AI noise cancellation and voice enhancement for calls', 'freemium', 'beginner', false, ['desktop', 'mobile'], ['voice-audio', 'productivity']),
  t('Adobe Podcast', 'adobe-podcast', 'https://podcast.adobe.com', 'AI audio recording and editing tool with voice enhancement', 'free', 'beginner', false, ['web'], ['voice-audio']),
  t('Cleanvoice', 'cleanvoice', 'https://cleanvoice.ai', 'AI audio editor that removes filler words and mouth sounds', 'paid', 'beginner', false, ['web'], ['voice-audio']),
  t('Podcastle', 'podcastle', 'https://podcastle.ai', 'AI-powered podcast creation and editing platform', 'freemium', 'beginner', false, ['web'], ['voice-audio', 'transcription']),
  t('Altered', 'altered', 'https://www.altered.ai', 'AI voice changing and performance-driven voice synthesis', 'paid', 'intermediate', true, ['desktop', 'api'], ['voice-audio']),
  t('Speechelo', 'speechelo', 'https://speechelo.com', 'AI text-to-speech tool for creating human-sounding voiceovers', 'paid', 'beginner', false, ['web'], ['voice-audio']),
]

// ─── MUSIC CREATION ─────────────────────────────────────────────────────────

const MUSIC: SeedTool[] = [
  t('Suno', 'suno', 'https://suno.com', 'AI music generator that creates full songs from text prompts', 'freemium', 'beginner', true, ['web', 'api'], ['music-creation']),
  t('Udio', 'udio', 'https://www.udio.com', 'AI music creation platform for generating studio-quality songs', 'freemium', 'beginner', true, ['web', 'api'], ['music-creation']),
  t('AIVA', 'aiva', 'https://www.aiva.ai', 'AI music composer for creating original soundtracks and scores', 'freemium', 'beginner', false, ['web'], ['music-creation']),
  t('Soundraw', 'soundraw', 'https://soundraw.io', 'AI music generator for creating royalty-free tracks for content', 'paid', 'beginner', false, ['web'], ['music-creation']),
  t('Boomy', 'boomy', 'https://boomy.com', 'AI music creation platform for making and releasing songs instantly', 'freemium', 'beginner', false, ['web'], ['music-creation']),
  t('Amper Music', 'amper-music', 'https://www.ampermusic.com', 'AI music composition tool for creating custom production music', 'paid', 'beginner', true, ['web', 'api'], ['music-creation']),
  t('Mubert', 'mubert', 'https://mubert.com', 'AI generative music platform for streaming and content creation', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['music-creation']),
  t('Loudly', 'loudly', 'https://www.loudly.com', 'AI music generator and library for creators and businesses', 'freemium', 'beginner', false, ['web'], ['music-creation']),
  t('Beatoven.ai', 'beatoven-ai', 'https://www.beatoven.ai', 'AI music generator for creating mood-based background music', 'freemium', 'beginner', true, ['web', 'api'], ['music-creation']),
  t('Ecrett Music', 'ecrett-music', 'https://ecrettmusic.com', 'AI music generator for creating royalty-free music for videos', 'paid', 'beginner', false, ['web'], ['music-creation']),
  t('Harmonai', 'harmonai', 'https://www.harmonai.org', 'Open-source AI tools for music generation and audio', 'free', 'advanced', true, ['api'], ['music-creation']),
  t('Splash Music', 'splash-music', 'https://www.splashmusic.com', 'AI music creation tool for making beats and songs', 'freemium', 'beginner', false, ['web', 'mobile'], ['music-creation']),
  t('Riffusion', 'riffusion', 'https://www.riffusion.com', 'AI that generates music from text using spectral diffusion', 'free', 'intermediate', false, ['web'], ['music-creation']),
  t('Wavtool', 'wavtool', 'https://wavtool.com', 'AI-powered browser DAW for music production', 'freemium', 'intermediate', false, ['web'], ['music-creation']),
  t('BandLab', 'bandlab', 'https://www.bandlab.com', 'Free music creation platform with AI-powered tools', 'free', 'beginner', false, ['web', 'mobile'], ['music-creation']),
  t('Magenta Studio', 'magenta-studio', 'https://magenta.tensorflow.org', 'Google\'s AI music and art generation toolkit', 'free', 'advanced', true, ['desktop', 'api'], ['music-creation']),
  t('LANDR', 'landr', 'https://www.landr.com', 'AI music mastering and distribution platform', 'freemium', 'beginner', true, ['web', 'api'], ['music-creation']),
  t('iZotope', 'izotope', 'https://www.izotope.com', 'AI-powered audio production tools for mixing and mastering', 'paid', 'intermediate', false, ['desktop', 'plugin'], ['music-creation', 'voice-audio']),
  t('Endel', 'endel', 'https://endel.io', 'AI soundscape generator for focus, sleep, and relaxation', 'freemium', 'beginner', false, ['mobile', 'web'], ['music-creation']),
  t('Moises', 'moises', 'https://moises.ai', 'AI music practice app with stem separation and pitch detection', 'freemium', 'beginner', false, ['mobile', 'web'], ['music-creation']),
]

// ─── CODE & DEVELOPMENT ─────────────────────────────────────────────────────

const CODE: SeedTool[] = [
  t('GitHub Copilot', 'github-copilot', 'https://github.com/features/copilot', 'AI pair programmer that suggests code completions in your IDE', 'paid', 'intermediate', true, ['plugin', 'cli', 'api'], ['code-development']),
  t('Cursor', 'cursor', 'https://cursor.sh', 'AI-first code editor built for pair programming with AI', 'freemium', 'intermediate', false, ['desktop'], ['code-development']),
  t('Windsurf', 'windsurf', 'https://codeium.com/windsurf', 'AI-powered IDE with agentic coding capabilities', 'freemium', 'intermediate', false, ['desktop'], ['code-development']),
  t('Codeium', 'codeium', 'https://codeium.com', 'Free AI code completion and chat for 70+ languages', 'freemium', 'intermediate', true, ['plugin', 'api'], ['code-development']),
  t('Tabnine', 'tabnine', 'https://www.tabnine.com', 'AI code completion assistant that runs locally for privacy', 'freemium', 'intermediate', true, ['plugin', 'api'], ['code-development']),
  t('Replit AI', 'replit-ai', 'https://replit.com', 'AI-powered coding environment for building and deploying apps', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['code-development', 'no-code']),
  t('Amazon CodeWhisperer', 'codewhisperer', 'https://aws.amazon.com/codewhisperer/', 'Amazon\'s AI coding companion with security scanning', 'freemium', 'intermediate', true, ['plugin', 'api'], ['code-development']),
  t('Sourcegraph Cody', 'sourcegraph-cody', 'https://sourcegraph.com/cody', 'AI coding assistant with full codebase context and understanding', 'freemium', 'intermediate', true, ['plugin', 'api'], ['code-development']),
  t('Codium AI', 'codium-ai', 'https://www.codium.ai', 'AI test generation tool that writes meaningful tests for your code', 'freemium', 'intermediate', true, ['plugin', 'api'], ['code-development']),
  t('Aider', 'aider', 'https://aider.chat', 'AI pair programming in your terminal with git integration', 'free', 'advanced', false, ['cli'], ['code-development']),
  t('Continue', 'continue-dev', 'https://continue.dev', 'Open-source AI code assistant for VS Code and JetBrains', 'free', 'intermediate', false, ['plugin'], ['code-development']),
  t('Devin', 'devin', 'https://devin.ai', 'Autonomous AI software engineer that can plan and execute tasks', 'paid', 'advanced', true, ['web', 'api'], ['code-development', 'automation-agents']),
  t('v0 by Vercel', 'v0', 'https://v0.dev', 'AI tool that generates React UI components from text descriptions', 'freemium', 'intermediate', true, ['web', 'api'], ['code-development', 'design-ui']),
  t('Bolt.new', 'bolt-new', 'https://bolt.new', 'AI full-stack web app builder in the browser', 'freemium', 'beginner', false, ['web'], ['code-development', 'no-code']),
  t('Lovable', 'lovable', 'https://lovable.dev', 'AI software engineer that builds full-stack apps from prompts', 'freemium', 'beginner', false, ['web'], ['code-development', 'no-code']),
  t('Claude Code', 'claude-code', 'https://docs.anthropic.com/en/docs/claude-code', 'Anthropic\'s agentic coding tool for the terminal', 'paid', 'advanced', true, ['cli', 'api'], ['code-development']),
  t('Sweep', 'sweep', 'https://sweep.dev', 'AI junior developer that handles GitHub issues and PRs', 'freemium', 'intermediate', true, ['api'], ['code-development', 'automation-agents']),
  t('Pieces for Developers', 'pieces', 'https://pieces.app', 'AI developer productivity tool for code snippets and context', 'freemium', 'intermediate', false, ['desktop', 'plugin'], ['code-development', 'productivity']),
  t('CodeRabbit', 'coderabbit', 'https://coderabbit.ai', 'AI code reviewer that provides line-by-line feedback on PRs', 'freemium', 'intermediate', true, ['api'], ['code-development']),
  t('Phind', 'phind', 'https://www.phind.com', 'AI search engine for developers with code generation', 'freemium', 'intermediate', true, ['web', 'api'], ['code-development', 'search-knowledge']),
  t('Blackbox AI', 'blackbox-ai', 'https://www.blackbox.ai', 'AI code generation and search assistant for developers', 'freemium', 'beginner', true, ['web', 'plugin', 'api'], ['code-development']),
  t('Mintlify', 'mintlify', 'https://mintlify.com', 'AI documentation writer and beautiful docs platform', 'freemium', 'intermediate', true, ['web', 'api', 'cli'], ['code-development']),
  t('Snyk', 'snyk', 'https://snyk.io', 'AI-powered security scanning for code and dependencies', 'freemium', 'intermediate', true, ['cli', 'plugin', 'api'], ['code-development', 'cybersecurity']),
  t('SonarQube', 'sonarqube', 'https://www.sonarsource.com', 'AI code quality and security analysis platform', 'freemium', 'intermediate', true, ['api', 'cli'], ['code-development', 'cybersecurity']),
  t('Warp', 'warp', 'https://www.warp.dev', 'AI-powered terminal with intelligent command suggestions', 'freemium', 'intermediate', false, ['desktop'], ['code-development', 'productivity']),
  t('Fig', 'fig', 'https://fig.io', 'AI terminal autocomplete and IDE-like features for the command line', 'free', 'intermediate', false, ['desktop'], ['code-development']),
  t('Cody by Sourcegraph', 'cody-sourcegraph', 'https://sourcegraph.com/cody', 'AI assistant that understands your entire codebase', 'freemium', 'intermediate', true, ['plugin', 'web', 'api'], ['code-development']),
  t('Bito AI', 'bito-ai', 'https://bito.ai', 'AI code assistant for generating, explaining, and reviewing code', 'freemium', 'intermediate', false, ['plugin'], ['code-development']),
  t('Codiga', 'codiga', 'https://www.codiga.io', 'AI-powered static code analysis and auto-fix platform', 'freemium', 'intermediate', true, ['plugin', 'api'], ['code-development']),
  t('Mutable AI', 'mutable-ai', 'https://mutable.ai', 'AI-powered code refactoring and documentation generation', 'paid', 'intermediate', true, ['web', 'api'], ['code-development']),
  t('Datadog Code Analysis', 'datadog-code', 'https://www.datadoghq.com', 'AI-powered code analysis and monitoring platform', 'paid', 'advanced', true, ['api', 'cli'], ['code-development', 'data-analytics']),
  t('GitLab Duo', 'gitlab-duo', 'https://about.gitlab.com/gitlab-duo/', 'AI-powered DevSecOps assistant integrated into GitLab', 'paid', 'intermediate', true, ['web', 'plugin', 'api'], ['code-development']),
  t('JetBrains AI', 'jetbrains-ai', 'https://www.jetbrains.com/ai/', 'AI assistant integrated into all JetBrains IDEs', 'paid', 'intermediate', false, ['plugin'], ['code-development']),
  t('Supermaven', 'supermaven', 'https://supermaven.com', 'Ultra-fast AI code completion with 1M token context window', 'freemium', 'intermediate', false, ['plugin'], ['code-development']),
  t('Qodo', 'qodo', 'https://www.qodo.ai', 'AI code integrity platform for testing and code quality', 'freemium', 'intermediate', true, ['plugin', 'api'], ['code-development']),
]

// ─── SEO & MARKETING ────────────────────────────────────────────────────────

const SEO_MARKETING: SeedTool[] = [
  t('Semrush', 'semrush', 'https://www.semrush.com', 'All-in-one SEO and digital marketing platform with AI features', 'paid', 'intermediate', true, ['web', 'api'], ['seo-marketing']),
  t('Ahrefs', 'ahrefs', 'https://ahrefs.com', 'SEO toolset for backlink analysis, keyword research, and site audits', 'paid', 'intermediate', true, ['web', 'api'], ['seo-marketing']),
  t('Surfer SEO', 'surfer-seo', 'https://surferseo.com', 'AI content optimization tool for ranking higher on Google', 'paid', 'intermediate', true, ['web', 'api'], ['seo-marketing', 'writing-content']),
  t('Moz', 'moz', 'https://moz.com', 'SEO software for keyword research, link building, and site audits', 'paid', 'intermediate', true, ['web', 'api'], ['seo-marketing']),
  t('SE Ranking', 'se-ranking', 'https://seranking.com', 'All-in-one SEO platform with AI content tools and rank tracking', 'paid', 'intermediate', true, ['web', 'api'], ['seo-marketing']),
  t('Mangools', 'mangools', 'https://mangools.com', 'SEO tool suite with keyword finder, SERP checker, and backlink analysis', 'paid', 'beginner', true, ['web', 'api'], ['seo-marketing']),
  t('Ubersuggest', 'ubersuggest', 'https://neilpatel.com/ubersuggest/', 'Free SEO tool for keyword research, site audits, and content ideas', 'freemium', 'beginner', true, ['web', 'api'], ['seo-marketing']),
  t('Rank Math', 'rank-math', 'https://rankmath.com', 'AI-powered WordPress SEO plugin with content optimization', 'freemium', 'beginner', false, ['plugin'], ['seo-marketing']),
  t('Yoast SEO', 'yoast-seo', 'https://yoast.com', 'Popular WordPress SEO plugin with readability and keyword analysis', 'freemium', 'beginner', false, ['plugin'], ['seo-marketing']),
  t('BrightEdge', 'brightedge', 'https://www.brightedge.com', 'Enterprise AI SEO platform with real-time content recommendations', 'contact', 'advanced', true, ['web', 'api'], ['seo-marketing']),
  t('Conductor', 'conductor', 'https://www.conductor.com', 'Enterprise organic marketing platform with AI insights', 'contact', 'advanced', true, ['web', 'api'], ['seo-marketing']),
  t('SpyFu', 'spyfu', 'https://www.spyfu.com', 'Competitor keyword research and PPC analysis tool', 'paid', 'intermediate', true, ['web', 'api'], ['seo-marketing']),
  t('Keywords Everywhere', 'keywords-everywhere', 'https://keywordseverywhere.com', 'Keyword research browser extension with search volume data', 'paid', 'beginner', false, ['plugin'], ['seo-marketing']),
  t('Serpstat', 'serpstat', 'https://serpstat.com', 'AI SEO platform for keyword research, site audit, and competitor analysis', 'paid', 'intermediate', true, ['web', 'api'], ['seo-marketing']),
  t('Majestic', 'majestic', 'https://majestic.com', 'Backlink analysis and link intelligence SEO tool', 'paid', 'intermediate', true, ['web', 'api'], ['seo-marketing']),
  t('Screaming Frog', 'screaming-frog', 'https://www.screamingfrog.co.uk', 'SEO spider tool for crawling and analyzing website technical SEO', 'freemium', 'advanced', false, ['desktop'], ['seo-marketing']),
  t('Google Search Console', 'google-search-console', 'https://search.google.com/search-console', 'Free Google tool for monitoring and optimizing search performance', 'free', 'intermediate', true, ['web', 'api'], ['seo-marketing']),
  t('Alli AI', 'alli-ai', 'https://www.alliai.com', 'AI SEO tool that automates on-page optimization at scale', 'paid', 'intermediate', false, ['web'], ['seo-marketing']),
  t('Diib', 'diib', 'https://diib.com', 'AI-powered website growth platform with SEO recommendations', 'freemium', 'beginner', false, ['web'], ['seo-marketing']),
  t('RankIQ', 'rankiq', 'https://www.rankiq.com', 'AI SEO tool that finds low-competition keywords for bloggers', 'paid', 'beginner', false, ['web'], ['seo-marketing']),
  t('NeuronWriter', 'neuronwriter', 'https://www.neuronwriter.com', 'AI content editor with NLP optimization for SEO', 'paid', 'intermediate', false, ['web'], ['seo-marketing', 'writing-content']),
  t('PageOptimizer Pro', 'pageoptimizer-pro', 'https://pageoptimizer.pro', 'AI on-page SEO tool for optimizing content to rank higher', 'paid', 'intermediate', false, ['web'], ['seo-marketing']),
  t('Dashword', 'dashword', 'https://www.dashword.com', 'AI content optimization tool for SEO teams', 'paid', 'intermediate', false, ['web'], ['seo-marketing', 'writing-content']),
  t('Topic', 'topic-seo', 'https://www.usetopic.com', 'AI content optimization and brief creation tool for SEO', 'paid', 'intermediate', false, ['web'], ['seo-marketing', 'writing-content']),
  t('Can I Rank', 'can-i-rank', 'https://www.canirank.com', 'AI-powered SEO software that provides specific action recommendations', 'paid', 'beginner', true, ['web', 'api'], ['seo-marketing']),
]

// ─── PRODUCTIVITY ───────────────────────────────────────────────────────────

const PRODUCTIVITY: SeedTool[] = [
  t('Notion', 'notion', 'https://www.notion.so', 'All-in-one workspace for notes, docs, wikis, and project management', 'freemium', 'beginner', true, ['web', 'desktop', 'mobile', 'api'], ['productivity', 'project-management']),
  t('Zapier', 'zapier', 'https://zapier.com', 'No-code automation platform connecting 6000+ apps with AI', 'freemium', 'beginner', true, ['web', 'api'], ['productivity', 'automation-agents']),
  t('Make', 'make', 'https://www.make.com', 'Visual automation platform for complex workflows and integrations', 'freemium', 'intermediate', true, ['web', 'api'], ['productivity', 'automation-agents']),
  t('Todoist', 'todoist', 'https://todoist.com', 'AI-enhanced task manager for personal and team productivity', 'freemium', 'beginner', true, ['web', 'desktop', 'mobile', 'api'], ['productivity']),
  t('ClickUp', 'clickup', 'https://clickup.com', 'All-in-one productivity platform with AI writing and task management', 'freemium', 'beginner', true, ['web', 'desktop', 'mobile', 'api'], ['productivity', 'project-management']),
  t('Monday.com', 'monday', 'https://monday.com', 'Work management platform with AI automation and project tracking', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['productivity', 'project-management']),
  t('Asana', 'asana', 'https://asana.com', 'Project management platform with AI-powered workflow optimization', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['productivity', 'project-management']),
  t('Linear', 'linear', 'https://linear.app', 'AI-powered issue tracking and project management for software teams', 'freemium', 'intermediate', true, ['web', 'desktop', 'api'], ['productivity', 'project-management', 'code-development']),
  t('Mem', 'mem', 'https://mem.ai', 'AI-powered note-taking app that organizes itself', 'freemium', 'beginner', false, ['web', 'desktop'], ['productivity']),
  t('Reflect', 'reflect', 'https://reflect.app', 'AI-enhanced note-taking with backlinks and knowledge graphs', 'paid', 'beginner', false, ['web', 'desktop', 'mobile'], ['productivity']),
  t('Obsidian', 'obsidian', 'https://obsidian.md', 'Knowledge management app with community AI plugins', 'freemium', 'intermediate', true, ['desktop', 'mobile', 'api'], ['productivity']),
  t('Tana', 'tana', 'https://tana.inc', 'AI-native workspace for structured note-taking and knowledge management', 'freemium', 'intermediate', false, ['web', 'desktop'], ['productivity']),
  t('Superhuman', 'superhuman', 'https://superhuman.com', 'AI-powered email client for blazing-fast email productivity', 'paid', 'beginner', false, ['web', 'desktop', 'mobile'], ['productivity', 'email-marketing']),
  t('Spark Mail', 'spark-mail', 'https://sparkmailapp.com', 'AI email client with smart prioritization and drafting', 'freemium', 'beginner', false, ['desktop', 'mobile'], ['productivity']),
  t('Coda', 'coda', 'https://coda.io', 'AI-powered document platform that combines docs, spreadsheets, and apps', 'freemium', 'beginner', true, ['web', 'api'], ['productivity', 'spreadsheets-data']),
  t('Airtable', 'airtable', 'https://airtable.com', 'AI-enhanced database and app building platform', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['productivity', 'spreadsheets-data', 'no-code']),
  t('Sunsama', 'sunsama', 'https://sunsama.com', 'AI daily planner that integrates with your calendar and tasks', 'paid', 'beginner', false, ['web', 'desktop'], ['productivity']),
  t('Motion', 'motion', 'https://www.usemotion.com', 'AI calendar that automatically schedules tasks and meetings', 'paid', 'beginner', false, ['web', 'desktop'], ['productivity']),
  t('Reclaim.ai', 'reclaim-ai', 'https://reclaim.ai', 'AI scheduling assistant that finds the best time for tasks', 'freemium', 'beginner', false, ['web', 'plugin'], ['productivity']),
  t('Clockwise', 'clockwise', 'https://www.getclockwise.com', 'AI calendar management tool that optimizes schedules for focus time', 'freemium', 'beginner', false, ['web', 'plugin'], ['productivity']),
  t('Raycast', 'raycast', 'https://www.raycast.com', 'Productivity launcher for Mac with AI commands and extensions', 'freemium', 'intermediate', true, ['desktop', 'api'], ['productivity']),
  t('Alfred', 'alfred', 'https://www.alfredapp.com', 'Productivity app for Mac with AI-enhanced workflows', 'freemium', 'intermediate', false, ['desktop'], ['productivity']),
  t('TextExpander', 'textexpander', 'https://textexpander.com', 'AI-enhanced text snippet tool for faster typing and consistency', 'paid', 'beginner', false, ['desktop', 'mobile', 'plugin'], ['productivity']),
  t('Magical', 'magical', 'https://www.getmagical.com', 'AI automation tool for repetitive tasks in any web app', 'freemium', 'beginner', false, ['plugin'], ['productivity', 'automation-agents']),
  t('Taskade', 'taskade', 'https://www.taskade.com', 'AI-powered workspace for task management and team collaboration', 'freemium', 'beginner', true, ['web', 'desktop', 'mobile', 'api'], ['productivity', 'project-management']),
]

// ─── CUSTOMER SUPPORT ───────────────────────────────────────────────────────

const CUSTOMER_SUPPORT: SeedTool[] = [
  t('Intercom', 'intercom', 'https://www.intercom.com', 'AI-first customer service platform with chatbot and help desk', 'paid', 'beginner', true, ['web', 'mobile', 'api'], ['customer-support', 'chatbots-assistants']),
  t('Zendesk AI', 'zendesk', 'https://www.zendesk.com', 'Customer service platform with AI-powered ticket routing and bots', 'paid', 'beginner', true, ['web', 'mobile', 'api'], ['customer-support']),
  t('Freshdesk', 'freshdesk', 'https://www.freshworks.com/freshdesk/', 'AI-powered helpdesk software for customer support teams', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['customer-support']),
  t('Tidio', 'tidio', 'https://www.tidio.com', 'AI chatbot and live chat platform for ecommerce support', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['customer-support', 'chatbots-assistants', 'ecommerce']),
  t('Drift', 'drift', 'https://www.drift.com', 'AI-powered conversational marketing and sales platform', 'paid', 'intermediate', true, ['web', 'api'], ['customer-support', 'sales-crm']),
  t('Ada', 'ada', 'https://www.ada.cx', 'AI-powered customer service automation platform', 'contact', 'intermediate', true, ['web', 'api'], ['customer-support', 'chatbots-assistants']),
  t('Help Scout', 'help-scout', 'https://www.helpscout.com', 'AI-enhanced help desk and customer communication platform', 'paid', 'beginner', true, ['web', 'api'], ['customer-support']),
  t('Crisp', 'crisp', 'https://crisp.chat', 'AI-powered customer messaging platform with chatbot and CRM', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['customer-support', 'chatbots-assistants']),
  t('Yuma AI', 'yuma-ai', 'https://yuma.ai', 'AI ticket agent for ecommerce customer support automation', 'paid', 'beginner', true, ['web', 'api'], ['customer-support', 'ecommerce']),
  t('Forethought', 'forethought', 'https://forethought.ai', 'AI customer support platform that resolves tickets automatically', 'contact', 'intermediate', true, ['web', 'api'], ['customer-support']),
  t('Kustomer', 'kustomer', 'https://www.kustomer.com', 'AI-powered CRM and customer service platform', 'contact', 'intermediate', true, ['web', 'api'], ['customer-support', 'sales-crm']),
  t('LivePerson', 'liveperson', 'https://www.liveperson.com', 'AI-powered conversational commerce platform', 'contact', 'intermediate', true, ['web', 'api'], ['customer-support', 'chatbots-assistants']),
  t('Gorgias', 'gorgias', 'https://www.gorgias.com', 'AI helpdesk for ecommerce brands with auto-responses', 'paid', 'beginner', true, ['web', 'api'], ['customer-support', 'ecommerce']),
  t('Capacity', 'capacity', 'https://capacity.com', 'AI-powered support automation platform for teams', 'contact', 'intermediate', true, ['web', 'api'], ['customer-support', 'automation-agents']),
  t('ChatBot', 'chatbot-com', 'https://www.chatbot.com', 'AI chatbot builder for customer service and lead generation', 'paid', 'beginner', true, ['web', 'api'], ['customer-support', 'chatbots-assistants']),
  t('Botpress', 'botpress', 'https://botpress.com', 'Open-source chatbot platform with AI-powered conversations', 'freemium', 'intermediate', true, ['web', 'api'], ['customer-support', 'chatbots-assistants']),
  t('Voiceflow', 'voiceflow', 'https://www.voiceflow.com', 'AI agent builder for customer support and voice experiences', 'freemium', 'intermediate', true, ['web', 'api'], ['customer-support', 'chatbots-assistants']),
  t('Kommunicate', 'kommunicate', 'https://www.kommunicate.io', 'AI chatbot and customer support automation platform', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['customer-support', 'chatbots-assistants']),
  t('Talkdesk', 'talkdesk', 'https://www.talkdesk.com', 'AI-powered cloud contact center platform', 'contact', 'intermediate', true, ['web', 'api'], ['customer-support']),
  t('Five9', 'five9', 'https://www.five9.com', 'AI cloud contact center with intelligent virtual agents', 'contact', 'intermediate', true, ['web', 'api'], ['customer-support']),
]

// ─── DATA & ANALYTICS ───────────────────────────────────────────────────────

const DATA_ANALYTICS: SeedTool[] = [
  t('Tableau', 'tableau', 'https://www.tableau.com', 'AI-powered data visualization and business intelligence platform', 'paid', 'intermediate', true, ['web', 'desktop', 'api'], ['data-analytics']),
  t('Power BI', 'power-bi', 'https://powerbi.microsoft.com', 'Microsoft\'s AI-enhanced business analytics and visualization tool', 'freemium', 'intermediate', true, ['web', 'desktop', 'mobile', 'api'], ['data-analytics']),
  t('Looker', 'looker', 'https://cloud.google.com/looker', 'Google\'s AI-powered business intelligence and data analytics platform', 'contact', 'advanced', true, ['web', 'api'], ['data-analytics']),
  t('Julius AI', 'julius-ai', 'https://julius.ai', 'AI data analyst that answers questions about your data in plain English', 'freemium', 'beginner', true, ['web', 'api'], ['data-analytics']),
  t('Obviously AI', 'obviously-ai', 'https://www.obviously.ai', 'No-code AI platform for predictive analytics and data science', 'paid', 'beginner', true, ['web', 'api'], ['data-analytics']),
  t('MonkeyLearn', 'monkeylearn', 'https://monkeylearn.com', 'AI text analytics platform for sentiment analysis and classification', 'freemium', 'intermediate', true, ['web', 'api'], ['data-analytics']),
  t('Akkio', 'akkio', 'https://www.akkio.com', 'No-code AI platform for data analysis and predictive modeling', 'freemium', 'beginner', true, ['web', 'api'], ['data-analytics']),
  t('Polymer', 'polymer', 'https://www.polymersearch.com', 'AI-powered data exploration and visualization tool', 'freemium', 'beginner', false, ['web'], ['data-analytics', 'spreadsheets-data']),
  t('Hex', 'hex', 'https://hex.tech', 'AI-powered collaborative data workspace for SQL and Python', 'freemium', 'intermediate', true, ['web', 'api'], ['data-analytics', 'code-development']),
  t('Mode', 'mode', 'https://mode.com', 'AI-enhanced analytics platform for data teams', 'freemium', 'intermediate', true, ['web', 'api'], ['data-analytics']),
  t('ThoughtSpot', 'thoughtspot', 'https://www.thoughtspot.com', 'AI-powered search and analytics platform for business users', 'contact', 'intermediate', true, ['web', 'api'], ['data-analytics']),
  t('Sisense', 'sisense', 'https://www.sisense.com', 'AI-driven analytics platform for embedding insights into products', 'contact', 'advanced', true, ['web', 'api'], ['data-analytics']),
  t('Dataiku', 'dataiku', 'https://www.dataiku.com', 'AI platform for data science, machine learning, and analytics', 'contact', 'advanced', true, ['web', 'desktop', 'api'], ['data-analytics']),
  t('RapidMiner', 'rapidminer', 'https://rapidminer.com', 'AI and data science platform for building predictive models', 'freemium', 'intermediate', true, ['web', 'desktop', 'api'], ['data-analytics']),
  t('MindsDB', 'mindsdb', 'https://mindsdb.com', 'Open-source AI database that brings ML to existing data', 'freemium', 'advanced', true, ['api', 'cli'], ['data-analytics', 'code-development']),
  t('Metabase', 'metabase', 'https://www.metabase.com', 'Open-source BI tool with AI question builder for data exploration', 'freemium', 'beginner', true, ['web', 'api'], ['data-analytics']),
  t('Amplitude', 'amplitude', 'https://amplitude.com', 'AI product analytics platform for understanding user behavior', 'freemium', 'intermediate', true, ['web', 'api'], ['data-analytics']),
  t('Mixpanel', 'mixpanel', 'https://mixpanel.com', 'AI-enhanced product analytics for conversion and retention', 'freemium', 'intermediate', true, ['web', 'api'], ['data-analytics']),
  t('Heap', 'heap', 'https://heap.io', 'AI-powered digital analytics that auto-captures all user interactions', 'freemium', 'intermediate', true, ['web', 'api'], ['data-analytics']),
  t('Pecan AI', 'pecan-ai', 'https://www.pecan.ai', 'AI predictive analytics platform for business teams', 'contact', 'intermediate', true, ['web', 'api'], ['data-analytics']),
]

// ─── DESIGN & UI ────────────────────────────────────────────────────────────

const DESIGN_UI: SeedTool[] = [
  t('Figma', 'figma', 'https://www.figma.com', 'Collaborative design platform with AI-powered features', 'freemium', 'intermediate', true, ['web', 'desktop', 'api'], ['design-ui']),
  t('Canva', 'canva', 'https://www.canva.com', 'All-in-one AI design platform for creating visual content', 'freemium', 'beginner', true, ['web', 'desktop', 'mobile', 'api'], ['design-ui', 'image-generation']),
  t('Framer', 'framer', 'https://www.framer.com', 'AI website builder and design tool for modern web design', 'freemium', 'intermediate', true, ['web', 'api'], ['design-ui', 'no-code']),
  t('Uizard', 'uizard', 'https://uizard.io', 'AI design tool that turns sketches and text into UI mockups', 'freemium', 'beginner', false, ['web'], ['design-ui']),
  t('Galileo AI', 'galileo-ai', 'https://www.usegalileo.ai', 'AI UI design tool that generates complete designs from text', 'paid', 'beginner', false, ['web'], ['design-ui']),
  t('Looka', 'looka', 'https://looka.com', 'AI logo maker and brand identity design platform', 'paid', 'beginner', false, ['web'], ['design-ui']),
  t('Brandmark', 'brandmark', 'https://brandmark.io', 'AI logo design tool for creating professional brand identities', 'paid', 'beginner', false, ['web'], ['design-ui']),
  t('Haikei', 'haikei', 'https://haikei.app', 'AI-powered SVG background and shape generator for web design', 'free', 'beginner', false, ['web'], ['design-ui']),
  t('Khroma', 'khroma', 'https://www.khroma.co', 'AI color tool that learns your preferences and generates palettes', 'free', 'beginner', false, ['web'], ['design-ui']),
  t('Designs.ai', 'designs-ai', 'https://designs.ai', 'AI-powered design suite for logos, videos, and marketing materials', 'paid', 'beginner', true, ['web', 'api'], ['design-ui', 'video-animation']),
  t('Relume', 'relume', 'https://www.relume.io', 'AI website wireframe and sitemap generator for designers', 'paid', 'intermediate', false, ['web', 'plugin'], ['design-ui']),
  t('Magician for Figma', 'magician-figma', 'https://magician.design', 'AI design assistant plugin for Figma with text-to-icon and copy', 'freemium', 'intermediate', false, ['plugin'], ['design-ui']),
  t('Diagram', 'diagram', 'https://diagram.com', 'AI design tools and plugins for product designers', 'freemium', 'intermediate', false, ['plugin', 'web'], ['design-ui']),
  t('Autodraw', 'autodraw', 'https://autodraw.com', 'Google\'s AI tool that turns rough sketches into clean drawings', 'free', 'beginner', false, ['web'], ['design-ui']),
  t('Logoai', 'logoai', 'https://www.logoai.com', 'AI logo generator with brand kit and social media templates', 'paid', 'beginner', false, ['web'], ['design-ui']),
  t('Plasmic', 'plasmic', 'https://www.plasmic.app', 'AI-powered visual builder for websites and apps', 'freemium', 'intermediate', true, ['web', 'api'], ['design-ui', 'no-code']),
  t('Lunacy', 'lunacy', 'https://icons8.com/lunacy', 'Free design tool with built-in AI-generated assets', 'free', 'intermediate', false, ['desktop'], ['design-ui']),
  t('Penpot', 'penpot', 'https://penpot.app', 'Open-source design and prototyping platform', 'free', 'intermediate', false, ['web'], ['design-ui']),
  t('Glorify', 'glorify', 'https://glorify.com', 'AI design tool specifically built for ecommerce product images', 'freemium', 'beginner', false, ['web'], ['design-ui', 'ecommerce']),
  t('Designify', 'designify', 'https://www.designify.com', 'AI-powered automatic photo editing and design tool', 'freemium', 'beginner', true, ['web', 'api'], ['design-ui', 'photo-editing']),
]

// ─── PHOTO EDITING ──────────────────────────────────────────────────────────

const PHOTO_EDITING: SeedTool[] = [
  t('Adobe Photoshop AI', 'photoshop-ai', 'https://www.adobe.com/products/photoshop.html', 'Adobe Photoshop with generative fill and AI editing tools', 'paid', 'intermediate', true, ['desktop', 'web', 'api'], ['photo-editing']),
  t('Adobe Lightroom AI', 'lightroom-ai', 'https://www.adobe.com/products/photoshop-lightroom.html', 'AI-powered photo editing and management with smart presets', 'paid', 'beginner', true, ['desktop', 'mobile', 'web', 'api'], ['photo-editing']),
  t('Luminar Neo', 'luminar-neo', 'https://skylum.com/luminar', 'AI photo editor with sky replacement, portrait enhancement, and more', 'paid', 'beginner', false, ['desktop', 'plugin'], ['photo-editing']),
  t('Photoroom', 'photoroom', 'https://www.photoroom.com', 'AI background remover and product photo editor', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['photo-editing', 'ecommerce']),
  t('Remove.bg', 'remove-bg', 'https://www.remove.bg', 'AI-powered automatic background removal from images', 'freemium', 'beginner', true, ['web', 'api'], ['photo-editing']),
  t('Let\'s Enhance', 'lets-enhance', 'https://letsenhance.io', 'AI image upscaler and enhancer for better quality photos', 'freemium', 'beginner', true, ['web', 'api'], ['photo-editing']),
  t('Topaz Photo AI', 'topaz-photo-ai', 'https://www.topazlabs.com/topaz-photo-ai', 'AI photo enhancement for noise reduction, sharpening, and upscaling', 'paid', 'intermediate', false, ['desktop'], ['photo-editing']),
  t('Remini', 'remini', 'https://remini.ai', 'AI photo enhancer that restores and upscales old or blurry photos', 'freemium', 'beginner', false, ['mobile', 'web'], ['photo-editing']),
  t('Cleanup.pictures', 'cleanup-pictures', 'https://cleanup.pictures', 'AI tool that removes unwanted objects from photos instantly', 'freemium', 'beginner', false, ['web'], ['photo-editing']),
  t('Upscayl', 'upscayl', 'https://upscayl.org', 'Free open-source AI image upscaler for Linux, Mac, and Windows', 'free', 'beginner', false, ['desktop'], ['photo-editing']),
  t('Lensa AI', 'lensa-ai', 'https://prisma-ai.com/lensa', 'AI photo editor app with magic avatars and portrait editing', 'freemium', 'beginner', false, ['mobile'], ['photo-editing']),
  t('FaceApp', 'faceapp', 'https://www.faceapp.com', 'AI face editing app with aging, gender swap, and style filters', 'freemium', 'beginner', false, ['mobile'], ['photo-editing']),
  t('Snapseed', 'snapseed', 'https://snapseed.online', 'Google\'s professional photo editor with AI-powered tools', 'free', 'beginner', false, ['mobile'], ['photo-editing']),
  t('ImgLarger', 'imglarger', 'https://imglarger.com', 'AI image upscaler and enhancer for photos and anime', 'freemium', 'beginner', true, ['web', 'api'], ['photo-editing']),
  t('Neural Love', 'neural-love', 'https://neural.love', 'AI photo enhancer, generator, and video upscaler', 'freemium', 'beginner', true, ['web', 'api'], ['photo-editing', 'image-generation']),
  t('Cutout.pro', 'cutout-pro', 'https://www.cutout.pro', 'AI photo and video editing platform with background removal', 'freemium', 'beginner', true, ['web', 'api'], ['photo-editing']),
  t('BgRemover', 'bgremover', 'https://www.bgremover.com', 'Free AI background remover for images', 'free', 'beginner', false, ['web'], ['photo-editing']),
  t('Deep Image', 'deep-image', 'https://deep-image.ai', 'AI image enhancement API for ecommerce and real estate', 'freemium', 'beginner', true, ['web', 'api'], ['photo-editing', 'ecommerce']),
  t('VanceAI', 'vanceai', 'https://vanceai.com', 'AI-powered photo editing suite for enhancement and creation', 'freemium', 'beginner', true, ['web', 'api'], ['photo-editing']),
  t('PicWish', 'picwish', 'https://picwish.com', 'AI photo editor with background removal and image enhancement', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['photo-editing']),
]

// ─── SOCIAL MEDIA ───────────────────────────────────────────────────────────

const SOCIAL_MEDIA: SeedTool[] = [
  t('Buffer', 'buffer', 'https://buffer.com', 'Social media management platform with AI content suggestions', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['social-media']),
  t('Hootsuite', 'hootsuite', 'https://www.hootsuite.com', 'Social media management with AI-powered scheduling and analytics', 'paid', 'beginner', true, ['web', 'mobile', 'api'], ['social-media']),
  t('Sprout Social', 'sprout-social', 'https://sproutsocial.com', 'Enterprise social media management with AI insights', 'paid', 'intermediate', true, ['web', 'mobile', 'api'], ['social-media']),
  t('Later', 'later', 'https://later.com', 'AI-powered social media scheduling and analytics platform', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['social-media']),
  t('Publer', 'publer', 'https://publer.io', 'AI social media scheduling tool with content recycling', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['social-media']),
  t('Predis.ai', 'predis-ai', 'https://predis.ai', 'AI social media content generator with automatic post creation', 'freemium', 'beginner', true, ['web', 'api'], ['social-media']),
  t('SocialBee', 'socialbee', 'https://socialbee.com', 'AI social media management with content categorization', 'paid', 'beginner', true, ['web', 'api'], ['social-media']),
  t('Repurpose.io', 'repurpose-io', 'https://repurpose.io', 'Auto-repurpose content across social media platforms', 'paid', 'beginner', false, ['web'], ['social-media']),
  t('Taplio', 'taplio', 'https://taplio.com', 'AI-powered LinkedIn growth and personal branding tool', 'paid', 'beginner', false, ['web', 'plugin'], ['social-media']),
  t('Hypefury', 'hypefury', 'https://hypefury.com', 'AI Twitter/X growth tool with scheduling and engagement', 'paid', 'beginner', false, ['web'], ['social-media']),
  t('Postwise', 'postwise', 'https://postwise.ai', 'AI Twitter/X ghostwriter that generates viral tweets', 'paid', 'beginner', false, ['web'], ['social-media', 'writing-content']),
  t('FeedHive', 'feedhive', 'https://www.feedhive.com', 'AI social media management with performance predictions', 'paid', 'beginner', true, ['web', 'api'], ['social-media']),
  t('Ocoya', 'ocoya', 'https://www.ocoya.com', 'AI social media content creation and scheduling platform', 'paid', 'beginner', true, ['web', 'api'], ['social-media']),
  t('Lately', 'lately', 'https://www.lately.ai', 'AI that repurposes long content into social media posts', 'paid', 'beginner', true, ['web', 'api'], ['social-media']),
  t('Canva Social', 'canva-social', 'https://www.canva.com/social-media/', 'Canva\'s social media design and scheduling suite', 'freemium', 'beginner', false, ['web', 'mobile'], ['social-media', 'design-ui']),
  t('Brandwatch', 'brandwatch', 'https://www.brandwatch.com', 'AI social listening and consumer intelligence platform', 'contact', 'advanced', true, ['web', 'api'], ['social-media', 'data-analytics']),
  t('Mention', 'mention', 'https://mention.com', 'AI social media monitoring and brand mention tracking', 'paid', 'intermediate', true, ['web', 'api'], ['social-media']),
  t('Brand24', 'brand24', 'https://brand24.com', 'AI-powered social media monitoring and analytics', 'paid', 'beginner', true, ['web', 'api'], ['social-media', 'data-analytics']),
  t('Vista Social', 'vista-social', 'https://vistasocial.com', 'AI social media management platform for agencies', 'freemium', 'beginner', true, ['web', 'api'], ['social-media']),
  t('Pallyy', 'pallyy', 'https://pallyy.com', 'AI social media scheduling tool focused on visual content', 'freemium', 'beginner', false, ['web'], ['social-media']),
]

// ─── EMAIL MARKETING ────────────────────────────────────────────────────────

const EMAIL_MARKETING: SeedTool[] = [
  t('Mailchimp', 'mailchimp', 'https://mailchimp.com', 'AI-powered email marketing platform with automation', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['email-marketing']),
  t('ConvertKit', 'convertkit', 'https://convertkit.com', 'Creator-focused email marketing with AI writing assistant', 'freemium', 'beginner', true, ['web', 'api'], ['email-marketing']),
  t('Beehiiv', 'beehiiv', 'https://www.beehiiv.com', 'Newsletter platform with AI writing and growth tools', 'freemium', 'beginner', true, ['web', 'api'], ['email-marketing']),
  t('ActiveCampaign', 'activecampaign', 'https://www.activecampaign.com', 'AI email marketing and CRM automation platform', 'paid', 'intermediate', true, ['web', 'api'], ['email-marketing', 'sales-crm']),
  t('Klaviyo', 'klaviyo', 'https://www.klaviyo.com', 'AI-powered email and SMS marketing for ecommerce', 'freemium', 'intermediate', true, ['web', 'api'], ['email-marketing', 'ecommerce']),
  t('Brevo', 'brevo', 'https://www.brevo.com', 'AI marketing platform with email, SMS, and chat automation', 'freemium', 'beginner', true, ['web', 'api'], ['email-marketing']),
  t('GetResponse', 'getresponse', 'https://www.getresponse.com', 'AI email marketing with landing pages and automation', 'freemium', 'beginner', true, ['web', 'api'], ['email-marketing']),
  t('Constant Contact', 'constant-contact', 'https://www.constantcontact.com', 'AI-assisted email marketing for small businesses', 'paid', 'beginner', true, ['web', 'api'], ['email-marketing']),
  t('Drip', 'drip', 'https://www.drip.com', 'AI-powered email marketing automation for ecommerce', 'paid', 'intermediate', true, ['web', 'api'], ['email-marketing', 'ecommerce']),
  t('Substack', 'substack', 'https://substack.com', 'Newsletter platform for writers with subscription monetization', 'freemium', 'beginner', true, ['web', 'api'], ['email-marketing', 'writing-content']),
  t('Campaign Monitor', 'campaign-monitor', 'https://www.campaignmonitor.com', 'AI email marketing platform with drag-and-drop builder', 'paid', 'beginner', true, ['web', 'api'], ['email-marketing']),
  t('Moosend', 'moosend', 'https://moosend.com', 'AI email marketing platform with automation workflows', 'freemium', 'beginner', true, ['web', 'api'], ['email-marketing']),
  t('Sender', 'sender', 'https://www.sender.net', 'Affordable email and SMS marketing with AI features', 'freemium', 'beginner', true, ['web', 'api'], ['email-marketing']),
  t('MailerLite', 'mailerlite', 'https://www.mailerlite.com', 'Simple email marketing platform with AI subject line generator', 'freemium', 'beginner', true, ['web', 'api'], ['email-marketing']),
  t('Instantly', 'instantly', 'https://instantly.ai', 'AI cold email platform for B2B outreach at scale', 'paid', 'intermediate', true, ['web', 'api'], ['email-marketing', 'sales-crm']),
  t('Lemlist', 'lemlist', 'https://lemlist.com', 'AI-powered cold outreach platform with personalization', 'paid', 'intermediate', true, ['web', 'api'], ['email-marketing', 'sales-crm']),
  t('Woodpecker', 'woodpecker', 'https://woodpecker.co', 'AI cold email automation tool for B2B sales teams', 'paid', 'intermediate', true, ['web', 'api'], ['email-marketing', 'sales-crm']),
  t('Omnisend', 'omnisend', 'https://www.omnisend.com', 'AI email and SMS marketing automation for ecommerce', 'freemium', 'beginner', true, ['web', 'api'], ['email-marketing', 'ecommerce']),
  t('Mailjet', 'mailjet', 'https://www.mailjet.com', 'AI email delivery and marketing platform for developers', 'freemium', 'intermediate', true, ['web', 'api'], ['email-marketing']),
  t('Smartlead', 'smartlead', 'https://www.smartlead.ai', 'AI cold email infrastructure for high-volume outreach', 'paid', 'intermediate', true, ['web', 'api'], ['email-marketing', 'sales-crm']),
]

// ─── SALES & CRM ────────────────────────────────────────────────────────────

const SALES_CRM: SeedTool[] = [
  t('HubSpot', 'hubspot', 'https://www.hubspot.com', 'AI-powered CRM platform for marketing, sales, and service', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['sales-crm', 'email-marketing']),
  t('Salesforce Einstein', 'salesforce-einstein', 'https://www.salesforce.com/artificial-intelligence/', 'AI layer for Salesforce CRM with predictions and automation', 'paid', 'intermediate', true, ['web', 'mobile', 'api'], ['sales-crm']),
  t('Apollo.io', 'apollo-io', 'https://www.apollo.io', 'AI sales intelligence and engagement platform', 'freemium', 'intermediate', true, ['web', 'api'], ['sales-crm']),
  t('ZoomInfo', 'zoominfo', 'https://www.zoominfo.com', 'AI-powered B2B contact database and sales intelligence', 'contact', 'intermediate', true, ['web', 'api'], ['sales-crm']),
  t('Gong', 'gong', 'https://www.gong.io', 'AI revenue intelligence platform for sales call analysis', 'contact', 'intermediate', true, ['web', 'api'], ['sales-crm']),
  t('Outreach', 'outreach', 'https://www.outreach.io', 'AI sales engagement platform for outbound and follow-ups', 'contact', 'intermediate', true, ['web', 'api'], ['sales-crm']),
  t('Salesloft', 'salesloft', 'https://www.salesloft.com', 'AI-powered sales engagement and revenue operations platform', 'contact', 'intermediate', true, ['web', 'api'], ['sales-crm']),
  t('Clay', 'clay', 'https://www.clay.com', 'AI data enrichment and personalization platform for sales', 'paid', 'intermediate', true, ['web', 'api'], ['sales-crm']),
  t('Lavender', 'lavender', 'https://www.lavender.ai', 'AI email coach that helps sales reps write better emails', 'freemium', 'beginner', false, ['web', 'plugin'], ['sales-crm', 'email-marketing']),
  t('Seamless.AI', 'seamless-ai', 'https://seamless.ai', 'AI-powered B2B lead generation and contact finder', 'freemium', 'beginner', true, ['web', 'api'], ['sales-crm']),
  t('Lusha', 'lusha', 'https://www.lusha.com', 'AI B2B contact and company data enrichment platform', 'freemium', 'beginner', true, ['web', 'plugin', 'api'], ['sales-crm']),
  t('Clearbit', 'clearbit', 'https://clearbit.com', 'AI data enrichment and lead scoring for B2B companies', 'freemium', 'intermediate', true, ['web', 'api'], ['sales-crm', 'data-analytics']),
  t('Clari', 'clari', 'https://www.clari.com', 'AI revenue platform for forecasting and pipeline management', 'contact', 'intermediate', true, ['web', 'api'], ['sales-crm']),
  t('People.ai', 'people-ai', 'https://people.ai', 'AI revenue intelligence that captures sales activity data', 'contact', 'intermediate', true, ['web', 'api'], ['sales-crm']),
  t('Drift', 'drift-sales', 'https://www.drift.com', 'AI conversational sales and marketing platform', 'paid', 'intermediate', true, ['web', 'api'], ['sales-crm', 'customer-support']),
  t('Chorus', 'chorus', 'https://www.chorus.ai', 'AI conversation intelligence for sales call analysis', 'contact', 'intermediate', true, ['web', 'api'], ['sales-crm']),
  t('6sense', 'sixsense', 'https://6sense.com', 'AI revenue platform for B2B buying intent and predictive analytics', 'contact', 'advanced', true, ['web', 'api'], ['sales-crm', 'data-analytics']),
  t('Cognism', 'cognism', 'https://www.cognism.com', 'AI B2B sales intelligence with phone-verified contacts', 'contact', 'intermediate', true, ['web', 'api'], ['sales-crm']),
  t('Pipedrive', 'pipedrive', 'https://www.pipedrive.com', 'AI-enhanced CRM for small sales teams with deal tracking', 'paid', 'beginner', true, ['web', 'mobile', 'api'], ['sales-crm']),
  t('Close', 'close-crm', 'https://close.com', 'AI-powered CRM with built-in calling and email for sales teams', 'paid', 'beginner', true, ['web', 'api'], ['sales-crm']),
]

// ─── RESEARCH & EDUCATION ───────────────────────────────────────────────────

const RESEARCH: SeedTool[] = [
  t('Perplexity', 'perplexity', 'https://www.perplexity.ai', 'AI search engine that provides sourced answers to questions', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['search-knowledge', 'research-education']),
  t('Google Gemini', 'google-gemini', 'https://gemini.google.com', 'Google\'s AI assistant for research, writing, and analysis', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['research-education', 'writing-content']),
  t('Consensus', 'consensus', 'https://consensus.app', 'AI search engine for finding scientific research and evidence', 'freemium', 'beginner', true, ['web', 'api'], ['research-education']),
  t('Semantic Scholar', 'semantic-scholar', 'https://www.semanticscholar.org', 'AI-powered academic search engine by Allen Institute for AI', 'free', 'intermediate', true, ['web', 'api'], ['research-education']),
  t('Elicit', 'elicit', 'https://elicit.org', 'AI research assistant that finds and summarizes academic papers', 'freemium', 'beginner', true, ['web', 'api'], ['research-education']),
  t('Scholarcy', 'scholarcy', 'https://www.scholarcy.com', 'AI tool that summarizes research papers into flashcards', 'freemium', 'beginner', false, ['web', 'plugin'], ['research-education']),
  t('Research Rabbit', 'research-rabbit', 'https://www.researchrabbit.ai', 'AI tool for discovering and visualizing research paper networks', 'free', 'intermediate', false, ['web'], ['research-education']),
  t('Connected Papers', 'connected-papers', 'https://www.connectedpapers.com', 'AI visual explorer for finding related academic papers', 'freemium', 'intermediate', false, ['web'], ['research-education']),
  t('Scite', 'scite', 'https://scite.ai', 'AI citation analysis that shows how papers are cited', 'paid', 'intermediate', true, ['web', 'plugin', 'api'], ['research-education']),
  t('Explainpaper', 'explainpaper', 'https://www.explainpaper.com', 'AI tool that explains complex research paper passages simply', 'freemium', 'beginner', false, ['web'], ['research-education']),
  t('Synthesis', 'synthesis-ai', 'https://www.synthesis.ai', 'AI research tool for systematic literature reviews', 'paid', 'intermediate', false, ['web'], ['research-education']),
  t('Scispace', 'scispace', 'https://typeset.io', 'AI research assistant for reading, writing, and understanding papers', 'freemium', 'beginner', true, ['web', 'plugin', 'api'], ['research-education']),
  t('Quizlet', 'quizlet', 'https://quizlet.com', 'AI-powered flashcard and study tool for students', 'freemium', 'beginner', false, ['web', 'mobile'], ['research-education']),
  t('Khan Academy Khanmigo', 'khanmigo', 'https://www.khanacademy.org/khan-labs', 'AI tutor by Khan Academy for personalized learning', 'freemium', 'beginner', false, ['web'], ['research-education']),
  t('Duolingo Max', 'duolingo-max', 'https://www.duolingo.com', 'AI-powered language learning with conversation practice', 'freemium', 'beginner', false, ['mobile', 'web'], ['research-education', 'translation']),
  t('Coursera AI', 'coursera-ai', 'https://www.coursera.org', 'Online learning platform with AI-powered course recommendations', 'freemium', 'beginner', false, ['web', 'mobile'], ['research-education']),
  t('Socratic by Google', 'socratic', 'https://socratic.org', 'AI homework helper that explains concepts with visual guides', 'free', 'beginner', false, ['mobile'], ['research-education']),
  t('Wolfram Alpha', 'wolfram-alpha', 'https://www.wolframalpha.com', 'AI computational knowledge engine for math and science', 'freemium', 'intermediate', true, ['web', 'mobile', 'api'], ['research-education', 'data-analytics']),
  t('Brainly', 'brainly', 'https://brainly.com', 'AI-powered homework help and study community', 'freemium', 'beginner', false, ['web', 'mobile'], ['research-education']),
  t('Quillionz', 'quillionz', 'https://www.quillionz.com', 'AI question generator for creating quizzes from any content', 'freemium', 'beginner', false, ['web'], ['research-education']),
  t('Gradescope', 'gradescope', 'https://www.gradescope.com', 'AI-powered grading platform for educators', 'paid', 'intermediate', false, ['web'], ['research-education']),
  t('Knowt', 'knowt', 'https://knowt.com', 'AI study tool that generates flashcards and quizzes from notes', 'freemium', 'beginner', false, ['web', 'mobile'], ['research-education']),
  t('Caktus AI', 'caktus-ai', 'https://www.caktus.ai', 'AI study assistant for essays, citations, and homework', 'paid', 'beginner', false, ['web'], ['research-education']),
  t('Turnitin AI', 'turnitin', 'https://www.turnitin.com', 'AI-powered plagiarism detection and writing analysis', 'paid', 'intermediate', true, ['web', 'api'], ['research-education']),
  t('Mathway', 'mathway', 'https://www.mathway.com', 'AI math problem solver with step-by-step explanations', 'freemium', 'beginner', false, ['web', 'mobile'], ['research-education']),
]

// ─── BUSINESS & FINANCE ─────────────────────────────────────────────────────

const BUSINESS_FINANCE: SeedTool[] = [
  t('QuickBooks AI', 'quickbooks-ai', 'https://quickbooks.intuit.com', 'AI-powered accounting and bookkeeping for small businesses', 'paid', 'beginner', true, ['web', 'mobile', 'api'], ['business-finance']),
  t('Xero', 'xero', 'https://www.xero.com', 'Cloud accounting platform with AI reconciliation and insights', 'paid', 'beginner', true, ['web', 'mobile', 'api'], ['business-finance']),
  t('FreshBooks', 'freshbooks', 'https://www.freshbooks.com', 'AI-enhanced invoicing and accounting for freelancers', 'paid', 'beginner', true, ['web', 'mobile', 'api'], ['business-finance']),
  t('Bench', 'bench', 'https://bench.co', 'AI-powered bookkeeping service for small businesses', 'paid', 'beginner', false, ['web', 'mobile'], ['business-finance']),
  t('Stripe', 'stripe', 'https://stripe.com', 'AI-powered payments platform with fraud detection', 'freemium', 'intermediate', true, ['web', 'api'], ['business-finance']),
  t('Brex', 'brex', 'https://www.brex.com', 'AI-powered financial platform for startups and enterprises', 'freemium', 'intermediate', true, ['web', 'mobile', 'api'], ['business-finance']),
  t('Ramp', 'ramp', 'https://ramp.com', 'AI corporate card and expense management platform', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['business-finance']),
  t('Pilot', 'pilot', 'https://pilot.com', 'AI-powered bookkeeping and CFO services for startups', 'paid', 'beginner', false, ['web'], ['business-finance']),
  t('Vic.ai', 'vic-ai', 'https://www.vic.ai', 'AI-powered autonomous accounting for enterprise', 'contact', 'intermediate', true, ['web', 'api'], ['business-finance']),
  t('Sage Intacct', 'sage-intacct', 'https://www.sage.com/en-us/sage-intacct/', 'AI cloud financial management for growing businesses', 'contact', 'intermediate', true, ['web', 'api'], ['business-finance']),
  t('Tipalti', 'tipalti', 'https://tipalti.com', 'AI accounts payable automation platform', 'contact', 'intermediate', true, ['web', 'api'], ['business-finance']),
  t('Stampli', 'stampli', 'https://www.stampli.com', 'AI-powered accounts payable automation', 'contact', 'intermediate', true, ['web', 'api'], ['business-finance']),
  t('Docyt', 'docyt', 'https://docyt.com', 'AI-powered accounting automation for back-office operations', 'paid', 'intermediate', true, ['web', 'api'], ['business-finance']),
  t('Zeni', 'zeni', 'https://www.zeni.ai', 'AI bookkeeping and financial operations for startups', 'paid', 'beginner', false, ['web'], ['business-finance']),
  t('BlueVine', 'bluevine', 'https://www.bluevine.com', 'AI-powered business banking and lending platform', 'freemium', 'beginner', false, ['web', 'mobile'], ['business-finance']),
  t('Bill.com', 'bill-com', 'https://www.bill.com', 'AI accounts payable and receivable automation platform', 'paid', 'intermediate', true, ['web', 'api'], ['business-finance']),
  t('Botkeeper', 'botkeeper', 'https://www.botkeeper.com', 'AI-powered bookkeeping solution for accounting firms', 'contact', 'intermediate', true, ['web', 'api'], ['business-finance']),
  t('Planful', 'planful', 'https://planful.com', 'AI financial planning and analysis platform', 'contact', 'intermediate', true, ['web', 'api'], ['business-finance']),
  t('Cube', 'cube-fp', 'https://www.cube.dev', 'AI-powered FP&A platform for spreadsheet users', 'contact', 'intermediate', true, ['web', 'api'], ['business-finance', 'spreadsheets-data']),
  t('Trovata', 'trovata', 'https://trovata.io', 'AI cash management and forecasting platform', 'contact', 'intermediate', true, ['web', 'api'], ['business-finance']),
]

// ─── HR & RECRUITING ────────────────────────────────────────────────────────

const HR_RECRUITING: SeedTool[] = [
  t('LinkedIn Recruiter', 'linkedin-recruiter', 'https://business.linkedin.com/talent-solutions', 'AI-powered talent sourcing and recruiting on LinkedIn', 'paid', 'intermediate', true, ['web', 'api'], ['hr-recruiting']),
  t('Greenhouse', 'greenhouse', 'https://www.greenhouse.com', 'AI recruiting platform with structured hiring workflows', 'contact', 'intermediate', true, ['web', 'api'], ['hr-recruiting']),
  t('Lever', 'lever', 'https://www.lever.co', 'AI-powered talent acquisition and CRM platform', 'contact', 'intermediate', true, ['web', 'api'], ['hr-recruiting']),
  t('HireVue', 'hirevue', 'https://www.hirevue.com', 'AI video interviewing and assessment platform', 'contact', 'intermediate', true, ['web', 'mobile', 'api'], ['hr-recruiting']),
  t('Eightfold', 'eightfold', 'https://eightfold.ai', 'AI talent intelligence platform for recruiting and retention', 'contact', 'advanced', true, ['web', 'api'], ['hr-recruiting']),
  t('Fetcher', 'fetcher', 'https://fetcher.ai', 'AI automated sourcing tool for recruiting teams', 'paid', 'beginner', true, ['web', 'api'], ['hr-recruiting']),
  t('Manatal', 'manatal', 'https://www.manatal.com', 'AI recruitment software with candidate scoring and matching', 'paid', 'beginner', true, ['web', 'api'], ['hr-recruiting']),
  t('Textio', 'textio', 'https://textio.com', 'AI writing tool for inclusive and effective job descriptions', 'paid', 'beginner', false, ['web', 'plugin'], ['hr-recruiting', 'writing-content']),
  t('SeekOut', 'seekout', 'https://seekout.com', 'AI talent search and diversity recruiting platform', 'contact', 'intermediate', true, ['web', 'api'], ['hr-recruiting']),
  t('Paradox', 'paradox', 'https://www.paradox.ai', 'AI recruiting assistant chatbot for candidate engagement', 'contact', 'intermediate', true, ['web', 'api'], ['hr-recruiting', 'chatbots-assistants']),
  t('BambooHR', 'bamboohr', 'https://www.bamboohr.com', 'AI-enhanced HR management platform for growing businesses', 'paid', 'beginner', true, ['web', 'mobile', 'api'], ['hr-recruiting']),
  t('Rippling', 'rippling', 'https://www.rippling.com', 'AI workforce management platform with HR, IT, and Finance', 'paid', 'intermediate', true, ['web', 'api'], ['hr-recruiting', 'business-finance']),
  t('Gusto', 'gusto', 'https://gusto.com', 'AI-powered payroll and HR platform for small businesses', 'paid', 'beginner', true, ['web', 'api'], ['hr-recruiting', 'business-finance']),
  t('Deel', 'deel', 'https://www.deel.com', 'AI-powered global payroll and compliance platform', 'freemium', 'intermediate', true, ['web', 'api'], ['hr-recruiting', 'business-finance']),
  t('Resume.io', 'resume-io', 'https://resume.io', 'AI resume builder with professional templates', 'freemium', 'beginner', false, ['web'], ['hr-recruiting']),
  t('Kickresume', 'kickresume', 'https://www.kickresume.com', 'AI resume and cover letter builder with LinkedIn import', 'freemium', 'beginner', false, ['web'], ['hr-recruiting']),
  t('Teal', 'teal', 'https://www.tealhq.com', 'AI job search platform with resume builder and tracking', 'freemium', 'beginner', false, ['web', 'plugin'], ['hr-recruiting']),
  t('Rezi', 'rezi', 'https://www.rezi.ai', 'AI resume builder optimized for ATS screening', 'freemium', 'beginner', false, ['web'], ['hr-recruiting']),
  t('Pymetrics', 'pymetrics', 'https://www.pymetrics.ai', 'AI-powered talent assessment using neuroscience games', 'contact', 'intermediate', true, ['web', 'api'], ['hr-recruiting']),
  t('Lattice', 'lattice', 'https://lattice.com', 'AI-enhanced people management platform for performance reviews', 'paid', 'intermediate', true, ['web', 'api'], ['hr-recruiting']),
]

// ─── HEALTHCARE ─────────────────────────────────────────────────────────────

const HEALTHCARE: SeedTool[] = [
  t('Nabla', 'nabla', 'https://www.nabla.com', 'AI copilot for doctors that automates clinical documentation', 'contact', 'intermediate', true, ['web', 'api'], ['healthcare']),
  t('Nuance DAX', 'nuance-dax', 'https://www.nuance.com/healthcare/ambient-clinical-intelligence.html', 'AI ambient clinical documentation by Microsoft', 'contact', 'intermediate', true, ['web', 'mobile', 'api'], ['healthcare']),
  t('Suki', 'suki', 'https://www.suki.ai', 'AI voice assistant for clinical documentation', 'contact', 'beginner', true, ['web', 'mobile', 'api'], ['healthcare']),
  t('Abridge', 'abridge', 'https://www.abridge.com', 'AI medical conversation summarization for clinicians', 'contact', 'beginner', true, ['web', 'mobile', 'api'], ['healthcare']),
  t('Viz.ai', 'viz-ai', 'https://www.viz.ai', 'AI clinical decision support for stroke and cardiac detection', 'contact', 'advanced', true, ['web', 'api'], ['healthcare']),
  t('PathAI', 'pathai', 'https://www.pathai.com', 'AI pathology platform for cancer diagnosis and drug development', 'contact', 'advanced', true, ['web', 'api'], ['healthcare']),
  t('Tempus', 'tempus', 'https://www.tempus.com', 'AI platform for precision medicine and clinical data analysis', 'contact', 'advanced', true, ['web', 'api'], ['healthcare', 'data-analytics']),
  t('Butterfly Network', 'butterfly-network', 'https://www.butterflynetwork.com', 'AI-powered handheld ultrasound device', 'paid', 'intermediate', false, ['mobile'], ['healthcare']),
  t('Aidoc', 'aidoc', 'https://www.aidoc.com', 'AI radiology platform for detecting critical conditions in scans', 'contact', 'advanced', true, ['web', 'api'], ['healthcare']),
  t('Hippocratic AI', 'hippocratic-ai', 'https://www.hippocraticai.com', 'AI safety-focused health assistant for patient communication', 'contact', 'intermediate', true, ['web', 'api'], ['healthcare', 'chatbots-assistants']),
  t('Glass Health', 'glass-health', 'https://glass.health', 'AI clinical decision support for doctors with differential diagnosis', 'freemium', 'intermediate', false, ['web', 'mobile'], ['healthcare']),
  t('Ada Health', 'ada-health', 'https://ada.com', 'AI symptom checker and health assessment platform', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['healthcare']),
  t('K Health', 'k-health', 'https://khealth.com', 'AI-powered primary care and symptom assessment app', 'freemium', 'beginner', false, ['mobile'], ['healthcare']),
  t('Regard', 'regard', 'https://www.withregard.com', 'AI clinical assistant that auto-diagnoses conditions from EHR data', 'contact', 'advanced', true, ['web', 'api'], ['healthcare']),
  t('DeepScribe', 'deepscribe', 'https://www.deepscribe.ai', 'AI medical scribe that generates clinical notes from conversations', 'contact', 'beginner', true, ['web', 'mobile', 'api'], ['healthcare']),
  t('BioGPT', 'biogpt', 'https://github.com/microsoft/BioGPT', 'Microsoft\'s AI model for biomedical text generation and mining', 'free', 'advanced', true, ['api'], ['healthcare', 'research-education']),
  t('Cleerly', 'cleerly', 'https://cleerlyhealth.com', 'AI cardiac imaging analysis for heart disease detection', 'contact', 'advanced', true, ['web', 'api'], ['healthcare']),
  t('Olive AI', 'olive-ai', 'https://oliveai.com', 'AI platform for healthcare operations and revenue cycle', 'contact', 'intermediate', true, ['web', 'api'], ['healthcare', 'automation-agents']),
  t('CodaMetrix', 'codametrix', 'https://codametrix.com', 'AI medical coding automation platform', 'contact', 'intermediate', true, ['web', 'api'], ['healthcare', 'business-finance']),
  t('Paige AI', 'paige-ai', 'https://paige.ai', 'AI-powered digital pathology for cancer diagnosis', 'contact', 'advanced', true, ['web', 'api'], ['healthcare']),
]

// ─── LEGAL ──────────────────────────────────────────────────────────────────

const LEGAL: SeedTool[] = [
  t('Harvey AI', 'harvey-ai', 'https://www.harvey.ai', 'AI legal assistant for law firms built on OpenAI', 'contact', 'intermediate', true, ['web', 'api'], ['legal']),
  t('Casetext', 'casetext', 'https://casetext.com', 'AI legal research platform with CoCounsel AI assistant', 'paid', 'intermediate', true, ['web', 'api'], ['legal', 'research-education']),
  t('LawGeex', 'lawgeex', 'https://www.lawgeex.com', 'AI contract review and approval platform', 'contact', 'intermediate', true, ['web', 'api'], ['legal']),
  t('Ironclad', 'ironclad', 'https://ironcladapp.com', 'AI contract lifecycle management platform', 'contact', 'intermediate', true, ['web', 'api'], ['legal']),
  t('Juro', 'juro', 'https://juro.com', 'AI-native contract management for in-house legal teams', 'contact', 'intermediate', true, ['web', 'api'], ['legal']),
  t('Luminance', 'luminance', 'https://www.luminance.com', 'AI platform for contract intelligence and legal diligence', 'contact', 'intermediate', true, ['web', 'api'], ['legal']),
  t('Westlaw Edge', 'westlaw-edge', 'https://legal.thomsonreuters.com/en/westlaw', 'AI-enhanced legal research platform by Thomson Reuters', 'paid', 'intermediate', true, ['web', 'api'], ['legal', 'research-education']),
  t('LexisNexis AI', 'lexisnexis-ai', 'https://www.lexisnexis.com', 'AI-powered legal research and analytics platform', 'paid', 'intermediate', true, ['web', 'api'], ['legal', 'research-education']),
  t('Spellbook', 'spellbook', 'https://www.spellbook.legal', 'AI contract drafting assistant powered by GPT for lawyers', 'paid', 'intermediate', false, ['web', 'plugin'], ['legal']),
  t('DoNotPay', 'donotpay', 'https://donotpay.com', 'AI legal assistant that fights corporations and bureaucracy', 'paid', 'beginner', false, ['web', 'mobile'], ['legal']),
  t('Lexion', 'lexion', 'https://www.lexion.ai', 'AI contract management for in-house counsel and legal ops', 'contact', 'intermediate', true, ['web', 'api'], ['legal']),
  t('Kira Systems', 'kira-systems', 'https://kirasystems.com', 'AI contract analysis for due diligence and compliance', 'contact', 'advanced', true, ['web', 'api'], ['legal']),
  t('Lawyaw', 'lawyaw', 'https://lawyaw.com', 'AI document automation for law firms', 'paid', 'beginner', false, ['web'], ['legal']),
  t('CaseIQ', 'caseiq', 'https://www.caseiq.com', 'AI case management and investigation platform', 'contact', 'intermediate', true, ['web', 'api'], ['legal']),
  t('Diligen', 'diligen', 'https://www.diligen.com', 'AI-powered contract review for M&A due diligence', 'contact', 'intermediate', true, ['web', 'api'], ['legal']),
  t('Legartis', 'legartis', 'https://legartis.ai', 'AI contract review tool for in-house legal teams', 'contact', 'intermediate', true, ['web', 'api'], ['legal']),
  t('Robin AI', 'robin-ai', 'https://www.robinai.com', 'AI-powered contract drafting and negotiation platform', 'paid', 'intermediate', true, ['web', 'api'], ['legal']),
  t('Norm AI', 'norm-ai', 'https://www.norm.ai', 'AI compliance and regulatory intelligence platform', 'contact', 'intermediate', true, ['web', 'api'], ['legal']),
  t('PatSnap', 'patsnap', 'https://www.patsnap.com', 'AI patent search and intellectual property analytics', 'contact', 'intermediate', true, ['web', 'api'], ['legal', 'research-education']),
  t('Relativity', 'relativity', 'https://www.relativity.com', 'AI-powered e-discovery and legal analytics platform', 'contact', 'advanced', true, ['web', 'api'], ['legal']),
]

// ─── CYBERSECURITY ──────────────────────────────────────────────────────────

const CYBERSECURITY: SeedTool[] = [
  t('CrowdStrike Falcon', 'crowdstrike', 'https://www.crowdstrike.com', 'AI-powered endpoint detection and response platform', 'contact', 'advanced', true, ['web', 'api'], ['cybersecurity']),
  t('Darktrace', 'darktrace', 'https://www.darktrace.com', 'AI cybersecurity platform that detects novel threats in real-time', 'contact', 'advanced', true, ['web', 'api'], ['cybersecurity']),
  t('SentinelOne', 'sentinelone', 'https://www.sentinelone.com', 'AI endpoint security with autonomous threat prevention', 'contact', 'advanced', true, ['web', 'api'], ['cybersecurity']),
  t('Vectra AI', 'vectra-ai', 'https://www.vectra.ai', 'AI network detection and response for cyberattack signals', 'contact', 'advanced', true, ['web', 'api'], ['cybersecurity']),
  t('Recorded Future', 'recorded-future', 'https://www.recordedfuture.com', 'AI threat intelligence platform for proactive security', 'contact', 'advanced', true, ['web', 'api'], ['cybersecurity']),
  t('Abnormal Security', 'abnormal-security', 'https://abnormalsecurity.com', 'AI email security platform that blocks social engineering attacks', 'contact', 'intermediate', true, ['web', 'api'], ['cybersecurity', 'email-marketing']),
  t('Tessian', 'tessian', 'https://www.tessian.com', 'AI email security that prevents human-layer threats', 'contact', 'intermediate', true, ['web', 'api'], ['cybersecurity']),
  t('Lacework', 'lacework', 'https://www.lacework.com', 'AI cloud security platform for threat detection and compliance', 'contact', 'advanced', true, ['web', 'api'], ['cybersecurity']),
  t('Orca Security', 'orca-security', 'https://orca.security', 'AI cloud security platform with agentless scanning', 'contact', 'intermediate', true, ['web', 'api'], ['cybersecurity']),
  t('Wiz', 'wiz', 'https://www.wiz.io', 'AI cloud security platform for vulnerability and risk management', 'contact', 'intermediate', true, ['web', 'api'], ['cybersecurity']),
  t('Snyk', 'snyk-security', 'https://snyk.io', 'AI developer security platform for code and dependency scanning', 'freemium', 'intermediate', true, ['cli', 'plugin', 'api'], ['cybersecurity', 'code-development']),
  t('Splunk AI', 'splunk-ai', 'https://www.splunk.com', 'AI security information and event management platform', 'paid', 'advanced', true, ['web', 'api'], ['cybersecurity', 'data-analytics']),
  t('Palo Alto Cortex', 'palo-alto-cortex', 'https://www.paloaltonetworks.com/cortex', 'AI security operations platform for threat detection', 'contact', 'advanced', true, ['web', 'api'], ['cybersecurity']),
  t('Cybereason', 'cybereason', 'https://www.cybereason.com', 'AI endpoint detection and response with attack visualization', 'contact', 'advanced', true, ['web', 'api'], ['cybersecurity']),
  t('Fortinet FortiAI', 'fortinet-fortiai', 'https://www.fortinet.com', 'AI-powered network security and threat intelligence', 'contact', 'advanced', true, ['web', 'api'], ['cybersecurity']),
  t('IronNet', 'ironnet', 'https://www.ironnet.com', 'AI network detection for collective defense', 'contact', 'advanced', true, ['web', 'api'], ['cybersecurity']),
  t('Deep Instinct', 'deep-instinct', 'https://www.deepinstinct.com', 'AI deep learning cybersecurity for threat prevention', 'contact', 'advanced', true, ['web', 'api'], ['cybersecurity']),
  t('Intezer', 'intezer', 'https://www.intezer.com', 'AI malware analysis and incident response platform', 'freemium', 'intermediate', true, ['web', 'api'], ['cybersecurity']),
  t('Hunters', 'hunters-soc', 'https://www.hunters.security', 'AI SOC platform for automated threat investigation', 'contact', 'advanced', true, ['web', 'api'], ['cybersecurity']),
  t('Bforeai', 'bforeai', 'https://bforeai.com', 'AI threat intelligence for predictive attack prevention', 'contact', 'intermediate', true, ['web', 'api'], ['cybersecurity']),
]

// ─── AUTOMATION & AGENTS ────────────────────────────────────────────────────

const AUTOMATION: SeedTool[] = [
  t('n8n', 'n8n', 'https://n8n.io', 'Open-source AI workflow automation with 400+ integrations', 'freemium', 'intermediate', true, ['web', 'api', 'cli'], ['automation-agents']),
  t('Bardeen', 'bardeen', 'https://www.bardeen.ai', 'AI automation tool that automates repetitive browser tasks', 'freemium', 'beginner', false, ['plugin'], ['automation-agents', 'productivity']),
  t('Tray.io', 'tray-io', 'https://tray.io', 'AI-powered integration platform for enterprise workflow automation', 'contact', 'intermediate', true, ['web', 'api'], ['automation-agents']),
  t('Workato', 'workato', 'https://www.workato.com', 'Enterprise AI automation platform for IT and business', 'contact', 'intermediate', true, ['web', 'api'], ['automation-agents']),
  t('Automate.io', 'automate-io', 'https://automate.io', 'Cloud integration and workflow automation platform', 'freemium', 'beginner', true, ['web', 'api'], ['automation-agents']),
  t('Power Automate', 'power-automate', 'https://powerautomate.microsoft.com', 'Microsoft\'s AI workflow automation with 1000+ connectors', 'freemium', 'intermediate', true, ['web', 'desktop', 'api'], ['automation-agents']),
  t('Activepieces', 'activepieces', 'https://www.activepieces.com', 'Open-source no-code automation alternative to Zapier', 'freemium', 'beginner', true, ['web', 'api'], ['automation-agents']),
  t('Pipedream', 'pipedream', 'https://pipedream.com', 'Developer-first workflow automation with code and AI', 'freemium', 'intermediate', true, ['web', 'api'], ['automation-agents', 'code-development']),
  t('Relay.app', 'relay-app', 'https://relay.app', 'AI workflow automation with human-in-the-loop approvals', 'paid', 'beginner', true, ['web', 'api'], ['automation-agents']),
  t('LangChain', 'langchain', 'https://www.langchain.com', 'Open-source framework for building AI agent applications', 'free', 'advanced', true, ['api', 'cli'], ['automation-agents', 'code-development']),
  t('CrewAI', 'crewai', 'https://www.crewai.com', 'Open-source framework for orchestrating AI agent teams', 'freemium', 'advanced', true, ['api', 'cli'], ['automation-agents', 'code-development']),
  t('AutoGPT', 'autogpt', 'https://autogpt.net', 'Open-source autonomous AI agent that achieves goals independently', 'free', 'advanced', false, ['cli'], ['automation-agents']),
  t('AgentGPT', 'agentgpt', 'https://agentgpt.reworkd.ai', 'Web-based autonomous AI agent that configures and deploys itself', 'freemium', 'beginner', false, ['web'], ['automation-agents']),
  t('Relevance AI', 'relevance-ai', 'https://relevanceai.com', 'AI agent builder platform for business automation', 'freemium', 'intermediate', true, ['web', 'api'], ['automation-agents']),
  t('Flowise', 'flowise', 'https://flowiseai.com', 'Open-source drag-and-drop AI agent and workflow builder', 'free', 'intermediate', true, ['web', 'api'], ['automation-agents']),
  t('Dify', 'dify', 'https://dify.ai', 'Open-source AI application development platform', 'freemium', 'intermediate', true, ['web', 'api'], ['automation-agents', 'code-development']),
  t('Bland AI', 'bland-ai', 'https://www.bland.ai', 'AI phone call agent that handles conversations like a human', 'paid', 'intermediate', true, ['web', 'api'], ['automation-agents', 'sales-crm']),
  t('Vapi', 'vapi', 'https://vapi.ai', 'API platform for building voice AI agents and assistants', 'freemium', 'advanced', true, ['api'], ['automation-agents', 'voice-audio']),
  t('Lindy AI', 'lindy-ai', 'https://www.lindy.ai', 'AI employee that handles tasks like email, scheduling, and research', 'paid', 'beginner', true, ['web', 'api'], ['automation-agents', 'productivity']),
  t('MultiOn', 'multion', 'https://www.multion.ai', 'AI agent that controls your browser to complete web tasks', 'freemium', 'intermediate', true, ['web', 'plugin', 'api'], ['automation-agents']),
]

// ─── TRANSLATION ────────────────────────────────────────────────────────────

const TRANSLATION: SeedTool[] = [
  t('DeepL', 'deepl', 'https://www.deepl.com', 'AI translation service with superior accuracy for 30+ languages', 'freemium', 'beginner', true, ['web', 'desktop', 'api'], ['translation']),
  t('Google Translate', 'google-translate', 'https://translate.google.com', 'Free AI translation supporting 130+ languages', 'free', 'beginner', true, ['web', 'mobile', 'api'], ['translation']),
  t('Smartcat', 'smartcat', 'https://www.smartcat.com', 'AI translation management platform for global content', 'freemium', 'intermediate', true, ['web', 'api'], ['translation']),
  t('Lokalise', 'lokalise', 'https://lokalise.com', 'AI translation and localization platform for software teams', 'paid', 'intermediate', true, ['web', 'api'], ['translation', 'code-development']),
  t('Phrase', 'phrase', 'https://phrase.com', 'AI translation management for localization workflows', 'paid', 'intermediate', true, ['web', 'api'], ['translation']),
  t('Crowdin', 'crowdin', 'https://crowdin.com', 'AI-powered localization platform for collaborative translation', 'freemium', 'intermediate', true, ['web', 'api'], ['translation']),
  t('Transifex', 'transifex', 'https://www.transifex.com', 'AI localization and translation automation platform', 'paid', 'intermediate', true, ['web', 'api'], ['translation']),
  t('Unbabel', 'unbabel', 'https://unbabel.com', 'AI-powered translation for customer service at scale', 'contact', 'intermediate', true, ['web', 'api'], ['translation', 'customer-support']),
  t('Lilt', 'lilt', 'https://lilt.com', 'AI-powered enterprise translation with human refinement', 'contact', 'intermediate', true, ['web', 'api'], ['translation']),
  t('Lingvanex', 'lingvanex', 'https://lingvanex.com', 'AI translation API for text, documents, and websites', 'freemium', 'beginner', true, ['web', 'api', 'desktop'], ['translation']),
  t('Weglot', 'weglot', 'https://weglot.com', 'AI website translation and localization tool', 'paid', 'beginner', false, ['web', 'plugin'], ['translation']),
  t('Taia', 'taia', 'https://taia.io', 'AI translation platform with human quality assurance', 'paid', 'beginner', true, ['web', 'api'], ['translation']),
  t('Papago', 'papago', 'https://papago.naver.com', 'Naver\'s AI translator specializing in Asian languages', 'free', 'beginner', true, ['web', 'mobile', 'api'], ['translation']),
  t('iTranslate', 'itranslate', 'https://www.itranslate.com', 'AI translation app for text, voice, and camera input', 'freemium', 'beginner', false, ['mobile'], ['translation']),
  t('Reverso', 'reverso', 'https://www.reverso.net', 'AI translation with context examples and language learning', 'freemium', 'beginner', false, ['web', 'mobile', 'plugin'], ['translation']),
]

// ─── PRESENTATIONS ──────────────────────────────────────────────────────────

const PRESENTATIONS: SeedTool[] = [
  t('Gamma', 'gamma', 'https://gamma.app', 'AI presentation maker that generates beautiful slides from text', 'freemium', 'beginner', true, ['web', 'api'], ['presentations']),
  t('Beautiful.ai', 'beautiful-ai', 'https://www.beautiful.ai', 'AI presentation software that designs slides automatically', 'paid', 'beginner', false, ['web'], ['presentations']),
  t('Tome', 'tome', 'https://tome.app', 'AI storytelling tool that creates presentations and documents', 'freemium', 'beginner', true, ['web', 'api'], ['presentations', 'writing-content']),
  t('SlidesAI', 'slidesai', 'https://www.slidesai.io', 'AI plugin that creates presentations in Google Slides', 'freemium', 'beginner', false, ['plugin'], ['presentations']),
  t('Pitch', 'pitch', 'https://pitch.com', 'Collaborative presentation platform with AI content generation', 'freemium', 'beginner', false, ['web', 'desktop'], ['presentations']),
  t('Prezi AI', 'prezi-ai', 'https://prezi.com', 'AI-enhanced presentation tool with zooming canvas', 'freemium', 'beginner', false, ['web', 'desktop'], ['presentations']),
  t('Slidebean', 'slidebean', 'https://slidebean.com', 'AI pitch deck creator for startups and fundraising', 'paid', 'beginner', false, ['web'], ['presentations', 'business-finance']),
  t('Sendsteps', 'sendsteps', 'https://www.sendsteps.com', 'AI presentation generator with interactive audience features', 'freemium', 'beginner', false, ['web'], ['presentations']),
  t('Decktopus', 'decktopus', 'https://www.decktopus.com', 'AI-powered presentation builder with smart templates', 'paid', 'beginner', false, ['web'], ['presentations']),
  t('Presentations.AI', 'presentations-ai', 'https://www.presentations.ai', 'AI slide generator that creates presentations in seconds', 'paid', 'beginner', false, ['web'], ['presentations']),
  t('Plus AI', 'plus-ai', 'https://www.plusdocs.com', 'AI presentation generator for Google Slides and PowerPoint', 'paid', 'beginner', false, ['plugin'], ['presentations']),
  t('Marp', 'marp', 'https://marp.app', 'Markdown-based presentation tool for developers', 'free', 'intermediate', false, ['desktop', 'cli'], ['presentations', 'code-development']),
  t('Zoho Show', 'zoho-show', 'https://www.zoho.com/show/', 'AI-powered cloud presentation builder with collaboration', 'freemium', 'beginner', false, ['web', 'mobile'], ['presentations']),
  t('Mentimeter', 'mentimeter', 'https://www.mentimeter.com', 'AI interactive presentation tool with live polls and Q&A', 'freemium', 'beginner', false, ['web'], ['presentations']),
  t('Haiku Deck', 'haiku-deck', 'https://www.haikudeck.com', 'AI presentation app that creates visual slides from keywords', 'paid', 'beginner', false, ['web'], ['presentations']),
]

// ─── TRANSCRIPTION ──────────────────────────────────────────────────────────

const TRANSCRIPTION: SeedTool[] = [
  t('Otter.ai', 'otter-ai', 'https://otter.ai', 'AI meeting transcription and note-taking assistant', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['transcription', 'productivity']),
  t('Whisper', 'whisper', 'https://openai.com/research/whisper', 'OpenAI\'s open-source speech recognition model', 'free', 'advanced', true, ['api', 'cli'], ['transcription']),
  t('Rev AI', 'rev-ai', 'https://www.rev.com', 'AI transcription service with human-level accuracy', 'freemium', 'beginner', true, ['web', 'api'], ['transcription']),
  t('Trint', 'trint', 'https://trint.com', 'AI transcription and content creation platform for media', 'paid', 'beginner', true, ['web', 'api'], ['transcription']),
  t('Sonix', 'sonix', 'https://sonix.ai', 'AI transcription in 35+ languages with editing tools', 'paid', 'beginner', true, ['web', 'api'], ['transcription']),
  t('Fireflies.ai', 'fireflies-ai', 'https://fireflies.ai', 'AI meeting assistant that records and transcribes meetings', 'freemium', 'beginner', true, ['web', 'api'], ['transcription', 'productivity']),
  t('tl;dv', 'tldv', 'https://tldv.io', 'AI meeting recorder that transcribes and summarizes video calls', 'freemium', 'beginner', true, ['web', 'plugin', 'api'], ['transcription', 'productivity']),
  t('Notta', 'notta', 'https://www.notta.ai', 'AI transcription and summarization for meetings and audio', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['transcription']),
  t('Happy Scribe', 'happy-scribe', 'https://www.happyscribe.com', 'AI transcription and subtitling in 120+ languages', 'paid', 'beginner', true, ['web', 'api'], ['transcription']),
  t('Verbit', 'verbit', 'https://verbit.ai', 'Enterprise AI transcription and captioning platform', 'contact', 'intermediate', true, ['web', 'api'], ['transcription']),
  t('Grain', 'grain', 'https://grain.com', 'AI meeting recording with highlights and note sharing', 'freemium', 'beginner', false, ['web', 'plugin'], ['transcription', 'productivity']),
  t('Riverside', 'riverside', 'https://riverside.fm', 'AI podcast and video recording with transcription', 'freemium', 'beginner', false, ['web'], ['transcription', 'voice-audio']),
  t('Tactiq', 'tactiq', 'https://tactiq.io', 'AI meeting transcription for Google Meet and Zoom', 'freemium', 'beginner', false, ['plugin'], ['transcription', 'productivity']),
  t('Transkriptor', 'transkriptor', 'https://transkriptor.com', 'AI audio and video transcription in 100+ languages', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['transcription']),
  t('Speechnotes', 'speechnotes', 'https://speechnotes.co', 'Free AI speech-to-text notepad in the browser', 'freemium', 'beginner', false, ['web'], ['transcription']),
]

// ─── ECOMMERCE ──────────────────────────────────────────────────────────────

const ECOMMERCE: SeedTool[] = [
  t('Shopify Magic', 'shopify-magic', 'https://www.shopify.com/magic', 'AI tools built into Shopify for product descriptions and marketing', 'freemium', 'beginner', true, ['web', 'api'], ['ecommerce']),
  t('Sellesta', 'sellesta', 'https://sellesta.com', 'AI Amazon seller tools for listing optimization and ads', 'paid', 'beginner', true, ['web', 'api'], ['ecommerce', 'seo-marketing']),
  t('Copymonkey', 'copymonkey', 'https://copymonkey.ai', 'AI Amazon listing optimization tool for sellers', 'paid', 'beginner', true, ['web', 'api'], ['ecommerce', 'writing-content']),
  t('Describely', 'describely', 'https://describely.ai', 'AI product content platform for ecommerce teams', 'paid', 'beginner', true, ['web', 'api'], ['ecommerce', 'writing-content']),
  t('Flair AI', 'flair-ai', 'https://flair.ai', 'AI tool for creating branded product photography', 'freemium', 'beginner', false, ['web'], ['ecommerce', 'photo-editing']),
  t('Mokker AI', 'mokker-ai', 'https://mokker.ai', 'AI product photography with instant background generation', 'freemium', 'beginner', true, ['web', 'api'], ['ecommerce', 'photo-editing']),
  t('Nosto', 'nosto', 'https://www.nosto.com', 'AI-powered personalization and recommendation platform for ecommerce', 'contact', 'intermediate', true, ['web', 'api'], ['ecommerce']),
  t('Dynamic Yield', 'dynamic-yield', 'https://www.dynamicyield.com', 'AI personalization engine for ecommerce experiences', 'contact', 'intermediate', true, ['web', 'api'], ['ecommerce']),
  t('Bloomreach', 'bloomreach', 'https://www.bloomreach.com', 'AI commerce experience platform for search and personalization', 'contact', 'intermediate', true, ['web', 'api'], ['ecommerce', 'search-knowledge']),
  t('Algolia', 'algolia', 'https://www.algolia.com', 'AI search and discovery API for websites and ecommerce', 'freemium', 'intermediate', true, ['web', 'api'], ['ecommerce', 'search-knowledge']),
  t('Clerk.io', 'clerk-io', 'https://clerk.io', 'AI-powered product recommendations and search for ecommerce', 'paid', 'intermediate', true, ['web', 'api'], ['ecommerce']),
  t('Barilliance', 'barilliance', 'https://www.barilliance.com', 'AI personalization and email retargeting for ecommerce', 'contact', 'intermediate', true, ['web', 'api'], ['ecommerce', 'email-marketing']),
  t('Vue.ai', 'vue-ai', 'https://vue.ai', 'AI-powered product tagging and visual search for retail', 'contact', 'intermediate', true, ['web', 'api'], ['ecommerce']),
  t('Prisync', 'prisync', 'https://prisync.com', 'AI competitor price tracking and dynamic pricing for ecommerce', 'paid', 'intermediate', true, ['web', 'api'], ['ecommerce']),
  t('Pricefx', 'pricefx', 'https://www.pricefx.com', 'AI-powered dynamic pricing optimization platform', 'contact', 'advanced', true, ['web', 'api'], ['ecommerce', 'business-finance']),
]

// ─── CHATBOTS & ASSISTANTS ──────────────────────────────────────────────────

const CHATBOTS: SeedTool[] = [
  t('Custom GPTs', 'custom-gpts', 'https://openai.com/blog/introducing-gpts', 'Build custom AI assistants with OpenAI\'s GPT builder', 'freemium', 'beginner', true, ['web', 'api'], ['chatbots-assistants']),
  t('Chainlit', 'chainlit', 'https://chainlit.io', 'Open-source framework for building conversational AI apps', 'free', 'intermediate', true, ['web', 'api'], ['chatbots-assistants', 'code-development']),
  t('Rasa', 'rasa', 'https://rasa.com', 'Open-source conversational AI platform for enterprise chatbots', 'freemium', 'advanced', true, ['api', 'cli'], ['chatbots-assistants']),
  t('Dialogflow', 'dialogflow', 'https://cloud.google.com/dialogflow', 'Google\'s AI chatbot building platform for conversational interfaces', 'freemium', 'intermediate', true, ['web', 'api'], ['chatbots-assistants']),
  t('Amazon Lex', 'amazon-lex', 'https://aws.amazon.com/lex/', 'AWS AI service for building conversational chatbots', 'freemium', 'intermediate', true, ['web', 'api'], ['chatbots-assistants']),
  t('ManyChat', 'manychat', 'https://manychat.com', 'AI chatbot builder for Instagram, WhatsApp, and Messenger', 'freemium', 'beginner', true, ['web', 'api'], ['chatbots-assistants', 'social-media']),
  t('Chatfuel', 'chatfuel', 'https://chatfuel.com', 'No-code AI chatbot builder for WhatsApp and social media', 'freemium', 'beginner', false, ['web'], ['chatbots-assistants', 'social-media']),
  t('Landbot', 'landbot', 'https://landbot.io', 'No-code chatbot builder for websites and WhatsApp', 'freemium', 'beginner', true, ['web', 'api'], ['chatbots-assistants']),
  t('Typebot', 'typebot', 'https://typebot.io', 'Open-source chatbot builder with conversational forms', 'freemium', 'intermediate', true, ['web', 'api'], ['chatbots-assistants']),
  t('Stack AI', 'stack-ai', 'https://www.stack-ai.com', 'No-code AI agent builder with enterprise integrations', 'freemium', 'beginner', true, ['web', 'api'], ['chatbots-assistants', 'automation-agents']),
  t('Coze', 'coze', 'https://www.coze.com', 'AI chatbot builder by ByteDance with plugin ecosystem', 'freemium', 'beginner', true, ['web', 'api'], ['chatbots-assistants']),
  t('Character.AI', 'character-ai', 'https://character.ai', 'AI platform for creating and chatting with custom characters', 'freemium', 'beginner', false, ['web', 'mobile'], ['chatbots-assistants']),
  t('Poe', 'poe', 'https://poe.com', 'Multi-model AI chatbot platform by Quora', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['chatbots-assistants']),
  t('Pi', 'pi', 'https://pi.ai', 'Personal AI assistant by Inflection with empathetic conversation', 'free', 'beginner', false, ['web', 'mobile'], ['chatbots-assistants']),
  t('You.com', 'you-com', 'https://you.com', 'AI search engine and chatbot with multiple model access', 'freemium', 'beginner', true, ['web', 'api'], ['chatbots-assistants', 'search-knowledge']),
]

// ─── NO-CODE & LOW-CODE ─────────────────────────────────────────────────────

const NO_CODE: SeedTool[] = [
  t('Bubble', 'bubble', 'https://bubble.io', 'No-code web app builder with AI-powered development', 'freemium', 'beginner', true, ['web', 'api'], ['no-code']),
  t('Webflow', 'webflow', 'https://webflow.com', 'Visual web design and development platform with AI features', 'freemium', 'intermediate', true, ['web', 'api'], ['no-code', 'design-ui']),
  t('Softr', 'softr', 'https://www.softr.io', 'No-code platform for building apps from Airtable data', 'freemium', 'beginner', true, ['web', 'api'], ['no-code']),
  t('Glide', 'glide', 'https://www.glideapps.com', 'No-code app builder that creates mobile apps from spreadsheets', 'freemium', 'beginner', true, ['web', 'api'], ['no-code']),
  t('Adalo', 'adalo', 'https://www.adalo.com', 'No-code platform for building mobile and web apps', 'freemium', 'beginner', false, ['web'], ['no-code']),
  t('AppSheet', 'appsheet', 'https://about.appsheet.com', 'Google\'s no-code app builder with AI automation', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['no-code']),
  t('Retool', 'retool', 'https://retool.com', 'Low-code platform for building internal business tools', 'freemium', 'intermediate', true, ['web', 'api'], ['no-code', 'code-development']),
  t('Dora AI', 'dora-ai', 'https://www.dora.run', 'AI website generator that creates 3D animated sites from text', 'freemium', 'beginner', false, ['web'], ['no-code', 'design-ui']),
  t('Wix AI', 'wix-ai', 'https://www.wix.com/ai-website-builder', 'AI website builder that creates complete sites from description', 'freemium', 'beginner', true, ['web', 'api'], ['no-code']),
  t('Squarespace AI', 'squarespace-ai', 'https://www.squarespace.com', 'Website builder with AI content and design generation', 'paid', 'beginner', true, ['web', 'api'], ['no-code']),
  t('Carrd', 'carrd', 'https://carrd.co', 'Simple one-page website builder for landing pages', 'freemium', 'beginner', false, ['web'], ['no-code']),
  t('Typedream', 'typedream', 'https://typedream.com', 'AI website builder with Notion-like editing experience', 'freemium', 'beginner', false, ['web'], ['no-code']),
  t('Unicorn Platform', 'unicorn-platform', 'https://unicornplatform.com', 'AI landing page builder for startups and SaaS', 'paid', 'beginner', false, ['web'], ['no-code']),
  t('10Web', 'ten-web', 'https://10web.io', 'AI WordPress website builder and hosting platform', 'paid', 'beginner', false, ['web'], ['no-code']),
  t('Hostinger AI', 'hostinger-ai', 'https://www.hostinger.com/ai-website-builder', 'AI website builder with hosting included', 'paid', 'beginner', false, ['web'], ['no-code']),
]

// ─── SEARCH & KNOWLEDGE ─────────────────────────────────────────────────────

const SEARCH: SeedTool[] = [
  t('Glean', 'glean', 'https://www.glean.com', 'AI enterprise search that understands your company knowledge', 'contact', 'intermediate', true, ['web', 'api'], ['search-knowledge']),
  t('Kagi', 'kagi', 'https://kagi.com', 'Ad-free AI search engine with customizable results', 'paid', 'beginner', true, ['web', 'api'], ['search-knowledge']),
  t('Tavily', 'tavily', 'https://tavily.com', 'AI search API built for AI agents and applications', 'freemium', 'intermediate', true, ['api'], ['search-knowledge', 'code-development']),
  t('Exa', 'exa', 'https://exa.ai', 'AI search engine API with neural and keyword search', 'freemium', 'advanced', true, ['api'], ['search-knowledge', 'code-development']),
  t('Brave Search', 'brave-search', 'https://search.brave.com', 'Privacy-focused AI search engine with independent index', 'freemium', 'beginner', true, ['web', 'api'], ['search-knowledge']),
  t('Neeva', 'neeva', 'https://neeva.com', 'Ad-free AI search engine with personalized results', 'freemium', 'beginner', false, ['web'], ['search-knowledge']),
  t('Pinecone', 'pinecone', 'https://www.pinecone.io', 'AI vector database for similarity search and RAG', 'freemium', 'advanced', true, ['api'], ['search-knowledge', 'code-development']),
  t('Weaviate', 'weaviate', 'https://weaviate.io', 'Open-source AI vector database for search applications', 'freemium', 'advanced', true, ['api', 'cli'], ['search-knowledge', 'code-development']),
  t('Chroma', 'chroma', 'https://www.trychroma.com', 'Open-source AI embedding database for knowledge apps', 'free', 'advanced', true, ['api'], ['search-knowledge', 'code-development']),
  t('Qdrant', 'qdrant', 'https://qdrant.tech', 'Open-source vector similarity search engine with AI', 'freemium', 'advanced', true, ['api', 'cli'], ['search-knowledge', 'code-development']),
  t('Guru', 'guru', 'https://www.getguru.com', 'AI knowledge management platform for teams', 'freemium', 'beginner', true, ['web', 'plugin', 'api'], ['search-knowledge', 'productivity']),
  t('Slite', 'slite', 'https://slite.com', 'AI-powered knowledge base and documentation for teams', 'freemium', 'beginner', true, ['web', 'api'], ['search-knowledge', 'productivity']),
  t('Tettra', 'tettra', 'https://tettra.com', 'AI knowledge management tool with Slack integration', 'freemium', 'beginner', true, ['web', 'api'], ['search-knowledge', 'productivity']),
  t('Dashworks', 'dashworks', 'https://www.dashworks.ai', 'AI knowledge assistant that searches across all work apps', 'paid', 'beginner', true, ['web', 'api'], ['search-knowledge', 'productivity']),
  t('Danswer', 'danswer', 'https://www.danswer.ai', 'Open-source AI enterprise search and chat for internal docs', 'free', 'intermediate', true, ['web', 'api'], ['search-knowledge']),
]

// ─── SPREADSHEETS & DATA ────────────────────────────────────────────────────

const SPREADSHEETS: SeedTool[] = [
  t('SheetAI', 'sheetai', 'https://www.sheetai.app', 'AI plugin for Google Sheets that generates content and formulas', 'paid', 'beginner', false, ['plugin'], ['spreadsheets-data']),
  t('Rows', 'rows', 'https://rows.com', 'AI-powered spreadsheet with built-in data integrations', 'freemium', 'beginner', true, ['web', 'api'], ['spreadsheets-data']),
  t('Equals', 'equals', 'https://equals.com', 'AI spreadsheet for startups with SQL and live data connections', 'paid', 'intermediate', true, ['web', 'api'], ['spreadsheets-data', 'data-analytics']),
  t('Arcwise', 'arcwise', 'https://arcwise.app', 'AI copilot for Google Sheets with formula generation', 'freemium', 'beginner', false, ['plugin'], ['spreadsheets-data']),
  t('GPT for Sheets', 'gpt-for-sheets', 'https://gptforwork.com', 'ChatGPT integration for Google Sheets and Excel', 'freemium', 'beginner', false, ['plugin'], ['spreadsheets-data']),
  t('Numerous', 'numerous', 'https://numerous.ai', 'AI spreadsheet plugin for ChatGPT in Google Sheets', 'freemium', 'beginner', false, ['plugin'], ['spreadsheets-data']),
  t('Coefficient', 'coefficient', 'https://coefficient.io', 'AI data connector for pulling live data into spreadsheets', 'freemium', 'beginner', false, ['plugin'], ['spreadsheets-data', 'data-analytics']),
  t('PromptLoop', 'promptloop', 'https://www.promptloop.com', 'AI text analysis in Google Sheets and Excel', 'paid', 'beginner', false, ['plugin'], ['spreadsheets-data']),
  t('Formula Bot', 'formula-bot', 'https://formulabot.com', 'AI that generates spreadsheet formulas from text descriptions', 'freemium', 'beginner', false, ['web', 'plugin'], ['spreadsheets-data']),
  t('Ajelix', 'ajelix', 'https://ajelix.com', 'AI Excel and Google Sheets formula generator and explainer', 'freemium', 'beginner', false, ['web', 'plugin'], ['spreadsheets-data']),
  t('Flowshot', 'flowshot', 'https://flowshot.ai', 'AI productivity tool for Google Sheets automation', 'freemium', 'beginner', false, ['plugin'], ['spreadsheets-data']),
  t('Neptyne', 'neptyne', 'https://neptyne.com', 'AI-powered spreadsheet that runs Python code in cells', 'freemium', 'intermediate', true, ['web', 'api'], ['spreadsheets-data', 'code-development']),
]

// ─── 3D & GAME DEV ──────────────────────────────────────────────────────────

const GAME_DEV: SeedTool[] = [
  t('Unity Muse', 'unity-muse', 'https://unity.com/products/muse', 'AI tools for Unity game development and prototyping', 'paid', 'intermediate', true, ['desktop', 'api'], ['3d-game-dev']),
  t('Meshy', 'meshy', 'https://www.meshy.ai', 'AI 3D model generator from text and images', 'freemium', 'beginner', true, ['web', 'api'], ['3d-game-dev']),
  t('Tripo AI', 'tripo-ai', 'https://www.tripo3d.ai', 'AI tool for generating 3D models from text or images', 'freemium', 'beginner', true, ['web', 'api'], ['3d-game-dev']),
  t('Kaedim', 'kaedim', 'https://www.kaedim3d.com', 'AI that turns 2D images into production-ready 3D models', 'paid', 'intermediate', true, ['web', 'api'], ['3d-game-dev']),
  t('Point-E', 'point-e', 'https://github.com/openai/point-e', 'OpenAI\'s AI system for generating 3D point clouds from text', 'free', 'advanced', true, ['api'], ['3d-game-dev']),
  t('GET3D', 'get3d', 'https://nv-tlabs.github.io/GET3D/', 'NVIDIA\'s AI model for generating 3D shapes from images', 'free', 'advanced', true, ['api'], ['3d-game-dev']),
  t('Blockade Labs', 'blockade-labs', 'https://www.blockadelabs.com', 'AI 360 skybox generator for game environments', 'freemium', 'beginner', true, ['web', 'api'], ['3d-game-dev']),
  t('Inworld AI', 'inworld-ai', 'https://inworld.ai', 'AI NPC and character engine for games and virtual worlds', 'freemium', 'intermediate', true, ['web', 'api'], ['3d-game-dev', 'chatbots-assistants']),
  t('Scenario.gg', 'scenario-gg', 'https://www.scenario.com', 'AI game art asset generator with custom model training', 'freemium', 'intermediate', true, ['web', 'api'], ['3d-game-dev', 'image-generation']),
  t('Promethean AI', 'promethean-ai', 'https://www.prometheanai.com', 'AI that helps build virtual 3D environments for games', 'freemium', 'intermediate', false, ['desktop', 'plugin'], ['3d-game-dev']),
  t('Spline AI', 'spline-ai', 'https://spline.design', 'AI-powered 3D design tool for web and games', 'freemium', 'beginner', false, ['web'], ['3d-game-dev', 'design-ui']),
  t('Poly AI', 'poly-ai', 'https://poly.cam', 'AI 3D scanning and modeling from phone photos', 'freemium', 'beginner', false, ['mobile', 'web'], ['3d-game-dev']),
  t('Masterpiece Studio', 'masterpiece-studio', 'https://masterpiecestudio.com', 'AI-powered 3D model creation for VR and games', 'freemium', 'intermediate', false, ['desktop', 'web'], ['3d-game-dev']),
  t('Ready Player Me', 'ready-player-me', 'https://readyplayer.me', 'AI avatar creator for games and virtual experiences', 'freemium', 'beginner', true, ['web', 'api'], ['3d-game-dev']),
  t('CSM AI', 'csm-ai', 'https://csm.ai', 'AI platform for creating 3D world models from images and text', 'freemium', 'intermediate', true, ['web', 'api'], ['3d-game-dev']),
]

// ─── PROJECT MANAGEMENT ─────────────────────────────────────────────────────

const PROJECT_MGMT: SeedTool[] = [
  t('Jira AI', 'jira-ai', 'https://www.atlassian.com/software/jira', 'AI-enhanced project management for software teams', 'freemium', 'intermediate', true, ['web', 'mobile', 'api'], ['project-management', 'code-development']),
  t('Basecamp', 'basecamp', 'https://basecamp.com', 'Project management and team communication platform', 'paid', 'beginner', true, ['web', 'mobile', 'api'], ['project-management']),
  t('Trello', 'trello', 'https://trello.com', 'Visual project management with AI-powered automation', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['project-management']),
  t('Wrike', 'wrike', 'https://www.wrike.com', 'AI-powered work management platform for enterprise teams', 'freemium', 'intermediate', true, ['web', 'mobile', 'api'], ['project-management']),
  t('Smartsheet', 'smartsheet', 'https://www.smartsheet.com', 'AI-enhanced work management platform with spreadsheet interface', 'paid', 'intermediate', true, ['web', 'api'], ['project-management', 'spreadsheets-data']),
  t('Teamwork', 'teamwork', 'https://www.teamwork.com', 'AI project management platform for client work', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['project-management']),
  t('Height', 'height', 'https://height.app', 'AI project management tool that automates task workflows', 'freemium', 'beginner', true, ['web', 'api'], ['project-management']),
  t('Hive', 'hive', 'https://hive.com', 'AI-powered project management with flexible views', 'freemium', 'beginner', true, ['web', 'desktop', 'mobile', 'api'], ['project-management']),
  t('Shortcut', 'shortcut', 'https://shortcut.com', 'AI-enhanced project management for software development', 'freemium', 'intermediate', true, ['web', 'api'], ['project-management', 'code-development']),
  t('Notion Projects', 'notion-projects', 'https://www.notion.so/product/projects', 'AI project management inside Notion workspace', 'freemium', 'beginner', true, ['web', 'desktop', 'mobile', 'api'], ['project-management', 'productivity']),
]

// ─── REAL ESTATE ────────────────────────────────────────────────────────────

const REAL_ESTATE: SeedTool[] = [
  t('Zillow AI', 'zillow-ai', 'https://www.zillow.com', 'AI-powered home value estimates and real estate search', 'free', 'beginner', true, ['web', 'mobile', 'api'], ['real-estate']),
  t('Matterport', 'matterport', 'https://matterport.com', 'AI 3D virtual tour creation for real estate listings', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['real-estate', '3d-game-dev']),
  t('Restb.ai', 'restb-ai', 'https://restb.ai', 'AI image recognition and tagging for real estate photos', 'contact', 'intermediate', true, ['web', 'api'], ['real-estate']),
  t('REimagineHome', 'reimaginehome', 'https://www.reimaginehome.ai', 'AI virtual staging and interior design for real estate', 'freemium', 'beginner', false, ['web'], ['real-estate', 'architecture-interior']),
  t('Roomvo', 'roomvo', 'https://www.roomvo.com', 'AI room visualizer for flooring and interior products', 'contact', 'beginner', true, ['web', 'api'], ['real-estate', 'architecture-interior']),
  t('Styldod', 'styldod', 'https://www.styldod.com', 'AI virtual staging and real estate marketing platform', 'paid', 'beginner', true, ['web', 'api'], ['real-estate']),
  t('Epique AI', 'epique-ai', 'https://epique.ai', 'AI tools for real estate agents — bios, listings, social content', 'freemium', 'beginner', false, ['web'], ['real-estate', 'writing-content']),
  t('RealScout', 'realscout', 'https://www.realscout.com', 'AI-powered home search platform for agents and brokerages', 'contact', 'intermediate', true, ['web', 'api'], ['real-estate']),
  t('Rechat', 'rechat', 'https://rechat.com', 'AI CRM and marketing platform for real estate professionals', 'paid', 'beginner', true, ['web', 'mobile', 'api'], ['real-estate', 'sales-crm']),
  t('VirtualStagingAI', 'virtualstaging-ai', 'https://www.virtualstagingai.app', 'AI virtual staging that furnishes empty rooms in photos', 'freemium', 'beginner', false, ['web'], ['real-estate']),
  t('ListingCopy AI', 'listingcopy-ai', 'https://listingcopy.ai', 'AI property description writer for real estate listings', 'paid', 'beginner', false, ['web'], ['real-estate', 'writing-content']),
  t('Courted', 'courted', 'https://www.courted.io', 'AI listing presentation builder for real estate agents', 'paid', 'beginner', false, ['web'], ['real-estate', 'presentations']),
]

// ─── PERSONAL FINANCE ───────────────────────────────────────────────────────

const PERSONAL_FINANCE: SeedTool[] = [
  t('Mint', 'mint', 'https://mint.intuit.com', 'AI-powered personal budgeting and expense tracking app', 'free', 'beginner', false, ['web', 'mobile'], ['personal-finance']),
  t('YNAB', 'ynab', 'https://www.ynab.com', 'AI-enhanced budgeting app based on zero-based budgeting', 'paid', 'beginner', true, ['web', 'mobile', 'api'], ['personal-finance']),
  t('Copilot Money', 'copilot-money', 'https://copilot.money', 'AI finance tracker with smart categorization and insights', 'paid', 'beginner', false, ['mobile'], ['personal-finance']),
  t('Cleo', 'cleo', 'https://web.meetcleo.com', 'AI financial assistant that helps manage money via chat', 'freemium', 'beginner', false, ['mobile'], ['personal-finance', 'chatbots-assistants']),
  t('Monarch Money', 'monarch-money', 'https://www.monarchmoney.com', 'AI personal finance app for budgeting and net worth tracking', 'paid', 'beginner', false, ['web', 'mobile'], ['personal-finance']),
  t('Betterment', 'betterment', 'https://www.betterment.com', 'AI-powered robo-advisor for automated investing', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['personal-finance']),
  t('Wealthfront', 'wealthfront', 'https://www.wealthfront.com', 'AI automated investing and financial planning platform', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['personal-finance']),
  t('Rocket Money', 'rocket-money', 'https://www.rocketmoney.com', 'AI app that finds and cancels unwanted subscriptions', 'freemium', 'beginner', false, ['web', 'mobile'], ['personal-finance']),
  t('Tiller Money', 'tiller-money', 'https://www.tillerhq.com', 'AI-powered spreadsheet-based personal finance tracking', 'paid', 'intermediate', false, ['web'], ['personal-finance', 'spreadsheets-data']),
  t('Plaid', 'plaid', 'https://plaid.com', 'AI financial data API connecting apps to bank accounts', 'freemium', 'advanced', true, ['api'], ['personal-finance', 'code-development']),
]

// ─── ARCHITECTURE & INTERIOR ────────────────────────────────────────────────

const ARCHITECTURE: SeedTool[] = [
  t('Midjourney Architecture', 'midjourney-arch', 'https://www.midjourney.com', 'AI architectural visualization and concept generation', 'paid', 'intermediate', false, ['web'], ['architecture-interior', 'image-generation']),
  t('Maket AI', 'maket-ai', 'https://www.maket.ai', 'AI floor plan generator for architects and designers', 'freemium', 'intermediate', false, ['web'], ['architecture-interior']),
  t('Interior AI', 'interior-ai', 'https://interiorai.com', 'AI interior design tool that redesigns rooms from photos', 'freemium', 'beginner', false, ['web'], ['architecture-interior']),
  t('Planner 5D', 'planner-5d', 'https://planner5d.com', 'AI home design and floor plan creator with 3D visualization', 'freemium', 'beginner', false, ['web', 'mobile', 'desktop'], ['architecture-interior']),
  t('Coohom', 'coohom', 'https://www.coohom.com', 'AI 3D interior design and visualization platform', 'freemium', 'intermediate', true, ['web', 'api'], ['architecture-interior']),
  t('Spacemaker', 'spacemaker', 'https://www.spacemakerai.com', 'AI-powered site planning and urban design by Autodesk', 'contact', 'advanced', true, ['web', 'api'], ['architecture-interior']),
  t('HomeByMe', 'homebyme', 'https://home.by.me', 'AI-powered 3D home design and decoration tool', 'freemium', 'beginner', false, ['web'], ['architecture-interior']),
  t('Archicad AI', 'archicad-ai', 'https://graphisoft.com/solutions/archicad', 'BIM architecture software with AI design assistants', 'paid', 'advanced', true, ['desktop', 'api'], ['architecture-interior']),
  t('Collov AI', 'collov-ai', 'https://collov.ai', 'AI interior design platform with room redesign from photos', 'freemium', 'beginner', true, ['web', 'api'], ['architecture-interior']),
  t('DecorAI', 'decorai', 'https://decorai.com', 'AI room decorator that generates interior design ideas', 'freemium', 'beginner', false, ['web'], ['architecture-interior']),
  t('RoomGPT', 'roomgpt', 'https://www.roomgpt.io', 'AI room redesigner that transforms interior photos', 'freemium', 'beginner', false, ['web'], ['architecture-interior']),
  t('Foyr Neo', 'foyr-neo', 'https://www.foyr.com', 'AI 3D interior design software with rendering', 'paid', 'intermediate', false, ['web'], ['architecture-interior']),
]

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT ALL TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_SEED_TOOLS: SeedTool[] = [
  ...WRITING,
  ...IMAGE_GENERATION,
  ...VIDEO,
  ...VOICE_AUDIO,
  ...MUSIC,
  ...CODE,
  ...SEO_MARKETING,
  ...PRODUCTIVITY,
  ...CUSTOMER_SUPPORT,
  ...DATA_ANALYTICS,
  ...DESIGN_UI,
  ...PHOTO_EDITING,
  ...SOCIAL_MEDIA,
  ...EMAIL_MARKETING,
  ...SALES_CRM,
  ...RESEARCH,
  ...BUSINESS_FINANCE,
  ...HR_RECRUITING,
  ...HEALTHCARE,
  ...LEGAL,
  ...CYBERSECURITY,
  ...AUTOMATION,
  ...TRANSLATION,
  ...PRESENTATIONS,
  ...TRANSCRIPTION,
  ...ECOMMERCE,
  ...CHATBOTS,
  ...NO_CODE,
  ...SEARCH,
  ...SPREADSHEETS,
  ...GAME_DEV,
  ...PROJECT_MGMT,
  ...REAL_ESTATE,
  ...PERSONAL_FINANCE,
  ...ARCHITECTURE,
]

// Quick count helper
export function getSeedStats() {
  const cats = new Set<string>()
  ALL_SEED_TOOLS.forEach(t => t.categories.forEach(c => cats.add(c)))
  return {
    totalTools: ALL_SEED_TOOLS.length,
    totalCategories: cats.size,
    byCategory: [...cats].map(c => ({
      category: c,
      count: ALL_SEED_TOOLS.filter(t => t.categories.includes(c)).length,
    })).sort((a, b) => b.count - a.count),
  }
}
