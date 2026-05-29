/**
 * Additional tools to bring total past 2000.
 * Organized by category with real tools, real URLs, real pricing.
 */

import type { SeedTool } from './tools-data'

function t(
  name: string, slug: string, url: string, tagline: string,
  pricing: 'free' | 'freemium' | 'paid' | 'contact',
  skill: 'beginner' | 'intermediate' | 'advanced',
  api: boolean, platforms: string[], categories: string[]
): SeedTool {
  return {
    name, slug, website_url: url, tagline,
    description: `${name} is an AI-powered tool that ${tagline.toLowerCase()}. ${tagline}`,
    pricing_type: pricing, skill_level: skill, has_api: api, platforms, categories,
  }
}

// ─── WRITING EXPANSION ──────────────────────────────────────────────────────

const WRITING_EXTRA: SeedTool[] = [
  t('Speedwrite', 'speedwrite', 'https://speedwrite.com', 'AI writing tool that generates unique text from any source', 'paid', 'beginner', false, ['web'], ['writing-content']),
  t('Inferkit', 'inferkit', 'https://inferkit.com', 'AI text generation tool for creative and professional writing', 'freemium', 'beginner', true, ['web', 'api'], ['writing-content']),
  t('Smodin', 'smodin', 'https://smodin.io', 'AI writer, rewriter, and plagiarism checker for students', 'freemium', 'beginner', true, ['web', 'api'], ['writing-content', 'research-education']),
  t('Wordplay', 'wordplay', 'https://wordplay.ai', 'AI long-form content writer for blogs and articles', 'paid', 'beginner', false, ['web'], ['writing-content']),
  t('HIX.AI', 'hix-ai', 'https://hix.ai', 'All-in-one AI writing copilot with 120+ tools', 'freemium', 'beginner', true, ['web', 'plugin', 'api'], ['writing-content']),
  t('Writecream', 'writecream', 'https://www.writecream.com', 'AI content generator for blogs, ads, and cold emails', 'freemium', 'beginner', true, ['web', 'api'], ['writing-content', 'email-marketing']),
  t('CopyPress', 'copypress', 'https://www.copypress.com', 'AI content creation platform for enterprise marketing', 'contact', 'intermediate', true, ['web', 'api'], ['writing-content', 'seo-marketing']),
  t('Kafkai', 'kafkai', 'https://kafkai.com', 'AI article writer trained on specific niches for SEO', 'paid', 'beginner', true, ['web', 'api'], ['writing-content', 'seo-marketing']),
  t('Texta', 'texta', 'https://texta.ai', 'AI blog writer with SEO optimization and fact-checking', 'freemium', 'beginner', false, ['web'], ['writing-content']),
  t('ByWord', 'byword', 'https://byword.ai', 'AI article generator for programmatic SEO at scale', 'paid', 'intermediate', true, ['web', 'api'], ['writing-content', 'seo-marketing']),
  t('Junia AI', 'junia-ai', 'https://www.junia.ai', 'AI writing tool for SEO blog posts with auto-publishing', 'freemium', 'beginner', false, ['web'], ['writing-content', 'seo-marketing']),
  t('WriterZen', 'writerzen', 'https://writerzen.net', 'AI content workflow tool for SEO from keyword to article', 'paid', 'intermediate', false, ['web'], ['writing-content', 'seo-marketing']),
  t('SEO.ai', 'seo-ai', 'https://seo.ai', 'AI SEO writing tool that creates optimized content', 'paid', 'intermediate', false, ['web'], ['writing-content', 'seo-marketing']),
  t('GrowthBar', 'growthbar', 'https://www.growthbarseo.com', 'AI SEO tool with content writing and keyword research', 'paid', 'beginner', false, ['web', 'plugin'], ['writing-content', 'seo-marketing']),
  t('Pencil', 'pencil-ai', 'https://www.trypencil.com', 'AI ad creative generator for performance marketing', 'paid', 'intermediate', true, ['web', 'api'], ['writing-content', 'seo-marketing']),
  t('Adcreative.ai', 'adcreative-ai', 'https://www.adcreative.ai', 'AI advertising creative generator for social and display ads', 'paid', 'beginner', true, ['web', 'api'], ['writing-content', 'social-media', 'design-ui']),
  t('Copymatic', 'copymatic', 'https://copymatic.ai', 'AI content and copy generator for marketing teams', 'freemium', 'beginner', true, ['web', 'api'], ['writing-content']),
  t('RightBlogger', 'rightblogger', 'https://rightblogger.com', 'AI blogging toolkit with 80+ tools for content creators', 'paid', 'beginner', false, ['web'], ['writing-content']),
  t('Tugan.ai', 'tugan-ai', 'https://www.tugan.ai', 'AI that turns URLs into email newsletters and social posts', 'paid', 'beginner', false, ['web'], ['writing-content', 'email-marketing']),
  t('Detect GPT', 'detect-gpt', 'https://detectgpt.com', 'AI content detection tool to check if text is AI-written', 'freemium', 'beginner', false, ['web'], ['writing-content']),
  t('Originality AI', 'originality-ai', 'https://originality.ai', 'AI content detection and plagiarism checking tool', 'paid', 'intermediate', true, ['web', 'api'], ['writing-content']),
  t('Winston AI', 'winston-ai', 'https://gowinston.ai', 'AI content detection tool for publishers and educators', 'freemium', 'beginner', true, ['web', 'api'], ['writing-content', 'research-education']),
  t('Undetectable AI', 'undetectable-ai', 'https://undetectable.ai', 'AI content humanizer that bypasses AI detection', 'paid', 'beginner', true, ['web', 'api'], ['writing-content']),
  t('ZeroGPT', 'zerogpt', 'https://www.zerogpt.com', 'Free AI content detector for text analysis', 'freemium', 'beginner', true, ['web', 'api'], ['writing-content']),
  t('Sapling', 'sapling', 'https://sapling.ai', 'AI writing assistant for customer-facing teams', 'freemium', 'beginner', true, ['web', 'plugin', 'api'], ['writing-content', 'customer-support']),
  t('Wordai', 'wordai', 'https://wordai.com', 'AI article rewriter that creates unique content', 'paid', 'beginner', true, ['web', 'api'], ['writing-content']),
  t('Paraphraser.io', 'paraphraser-io', 'https://www.paraphraser.io', 'Free AI paraphrasing tool with multiple modes', 'freemium', 'beginner', false, ['web'], ['writing-content']),
  t('Spin Rewriter', 'spin-rewriter', 'https://www.spinrewriter.com', 'AI article spinner with natural language processing', 'paid', 'beginner', true, ['web', 'api'], ['writing-content']),
  t('Chibi AI', 'chibi-ai', 'https://chibi.ai', 'AI writing assistant for fiction and non-fiction writers', 'paid', 'beginner', false, ['web'], ['writing-content']),
  t('Friday AI', 'friday-ai', 'https://www.friday-ai.com', 'AI writing tool with templates for business content', 'freemium', 'beginner', false, ['web'], ['writing-content']),
]

// ─── IMAGE GENERATION EXPANSION ─────────────────────────────────────────────

const IMAGE_EXTRA: SeedTool[] = [
  t('Imagine Art', 'imagine-art', 'https://www.imagine.art', 'AI art generator with multiple style options', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['image-generation']),
  t('Openart', 'openart', 'https://openart.ai', 'AI art platform with model training and generation', 'freemium', 'intermediate', true, ['web', 'api'], ['image-generation']),
  t('SeaArt', 'seaart', 'https://www.seaart.ai', 'Free AI image generator with community models', 'freemium', 'beginner', false, ['web'], ['image-generation']),
  t('Nightcafe Creator', 'nightcafe-creator', 'https://creator.nightcafe.studio', 'AI art creation studio with multiple algorithms', 'freemium', 'beginner', false, ['web'], ['image-generation']),
  t('Promptbase', 'promptbase', 'https://promptbase.com', 'Marketplace for AI image prompts and templates', 'freemium', 'beginner', false, ['web'], ['image-generation']),
  t('Bing Copilot Designer', 'copilot-designer', 'https://www.bing.com/images/create', 'Free AI image creation with Microsoft Copilot', 'free', 'beginner', false, ['web'], ['image-generation']),
  t('Maze Guru', 'maze-guru', 'https://maze.guru', 'AI art generator with multiple model support', 'freemium', 'beginner', false, ['web'], ['image-generation']),
  t('Pixverse', 'pixverse', 'https://pixverse.ai', 'AI creative platform for image and video generation', 'freemium', 'beginner', true, ['web', 'api'], ['image-generation', 'video-animation']),
  t('Segmind', 'segmind', 'https://www.segmind.com', 'Cloud GPU platform for running AI image models', 'freemium', 'advanced', true, ['web', 'api'], ['image-generation']),
  t('Wombo Dream', 'wombo-dream', 'https://dream.ai', 'AI art generator app with simple text-to-image creation', 'freemium', 'beginner', false, ['mobile', 'web'], ['image-generation']),
  t('PromeAI', 'promeai', 'https://www.promeai.pro', 'AI design tool for architecture and product rendering', 'freemium', 'intermediate', true, ['web', 'api'], ['image-generation', 'architecture-interior']),
  t('InstantArt', 'instantart', 'https://instantart.io', 'Free AI art generator with unlimited stable diffusion', 'free', 'beginner', false, ['web'], ['image-generation']),
  t('PicFinder', 'picfinder', 'https://picfinder.ai', 'AI image generation and search engine for free stock photos', 'freemium', 'beginner', false, ['web'], ['image-generation']),
  t('Yodayo', 'yodayo', 'https://yodayo.com', 'AI anime image generator for creative communities', 'freemium', 'beginner', false, ['web'], ['image-generation']),
  t('Wepik AI', 'wepik-ai', 'https://wepik.com/ai', 'AI image generation within Wepik design platform', 'freemium', 'beginner', false, ['web'], ['image-generation', 'design-ui']),
]

// ─── VIDEO EXPANSION ────────────────────────────────────────────────────────

const VIDEO_EXTRA: SeedTool[] = [
  t('Topview AI', 'topview-ai', 'https://www.topview.ai', 'AI video generation from product URLs for ads', 'freemium', 'beginner', true, ['web', 'api'], ['video-animation', 'ecommerce']),
  t('Elai', 'elai', 'https://elai.io', 'AI video generator with digital presenters from text', 'freemium', 'beginner', true, ['web', 'api'], ['video-animation']),
  t('DeepBrain AI', 'deepbrain-ai', 'https://www.deepbrain.io', 'AI avatar video platform for enterprise training', 'paid', 'beginner', true, ['web', 'api'], ['video-animation']),
  t('Vidyo.ai', 'vidyo-ai', 'https://vidyo.ai', 'AI tool for creating short clips from long videos', 'freemium', 'beginner', false, ['web'], ['video-animation', 'social-media']),
  t('Submagic', 'submagic', 'https://www.submagic.co', 'AI auto-caption tool with animated subtitles for shorts', 'freemium', 'beginner', false, ['web'], ['video-animation', 'social-media']),
  t('Klap', 'klap', 'https://klap.app', 'AI tool that turns YouTube videos into TikTok clips', 'freemium', 'beginner', false, ['web'], ['video-animation', 'social-media']),
  t('Dubverse', 'dubverse', 'https://dubverse.ai', 'AI video dubbing platform for multilingual content', 'freemium', 'beginner', true, ['web', 'api'], ['video-animation', 'translation']),
  t('Rask AI', 'rask-ai', 'https://www.rask.ai', 'AI video localization and dubbing in 130+ languages', 'freemium', 'beginner', true, ['web', 'api'], ['video-animation', 'translation']),
  t('Shuffll', 'shuffll', 'https://www.shuffll.com', 'AI video production platform for B2B marketing', 'paid', 'beginner', false, ['web'], ['video-animation']),
  t('Peech', 'peech', 'https://www.peech-ai.com', 'AI video content management for marketing teams', 'paid', 'intermediate', true, ['web', 'api'], ['video-animation', 'seo-marketing']),
  t('Tavus', 'tavus', 'https://www.tavus.io', 'AI personalized video generation at scale', 'paid', 'intermediate', true, ['web', 'api'], ['video-animation', 'sales-crm']),
  t('Waymark', 'waymark', 'https://waymark.com', 'AI video creation for local business advertising', 'paid', 'beginner', false, ['web'], ['video-animation']),
  t('Latte Social', 'latte-social', 'https://www.latte.social', 'AI tool to repurpose long videos into social media clips', 'freemium', 'beginner', false, ['web'], ['video-animation', 'social-media']),
  t('Fliz', 'fliz', 'https://fliz.ai', 'AI product video generator from URLs for ecommerce', 'freemium', 'beginner', true, ['web', 'api'], ['video-animation', 'ecommerce']),
  t('Neural Frames', 'neural-frames', 'https://www.neuralframes.com', 'AI animation and music video generator', 'paid', 'beginner', false, ['web'], ['video-animation', 'music-creation']),
]

// ─── CODE EXPANSION ─────────────────────────────────────────────────────────

const CODE_EXTRA: SeedTool[] = [
  t('Vercel AI SDK', 'vercel-ai-sdk', 'https://sdk.vercel.ai', 'Open-source library for building AI apps in JavaScript', 'free', 'intermediate', true, ['api'], ['code-development']),
  t('Anthropic API', 'anthropic-api', 'https://www.anthropic.com/api', 'Claude AI API for building intelligent applications', 'freemium', 'intermediate', true, ['api'], ['code-development']),
  t('OpenAI API', 'openai-api', 'https://platform.openai.com', 'GPT-4 and DALL-E APIs for building AI-powered apps', 'freemium', 'intermediate', true, ['api'], ['code-development']),
  t('Hugging Face', 'hugging-face', 'https://huggingface.co', 'Open-source AI model hub and deployment platform', 'freemium', 'intermediate', true, ['web', 'api'], ['code-development', 'research-education']),
  t('Replicate', 'replicate', 'https://replicate.com', 'Cloud API for running open-source AI models', 'freemium', 'intermediate', true, ['api'], ['code-development']),
  t('Together AI', 'together-ai', 'https://www.together.ai', 'Cloud platform for running and fine-tuning open AI models', 'freemium', 'intermediate', true, ['api'], ['code-development']),
  t('Groq', 'groq', 'https://groq.com', 'Ultra-fast AI inference engine with LPU chips', 'freemium', 'intermediate', true, ['api'], ['code-development']),
  t('Fireworks AI', 'fireworks-ai', 'https://fireworks.ai', 'Fast AI inference platform for deploying models', 'freemium', 'intermediate', true, ['api'], ['code-development']),
  t('Modal', 'modal', 'https://modal.com', 'Cloud platform for running AI workloads and serverless functions', 'freemium', 'advanced', true, ['api', 'cli'], ['code-development']),
  t('Weights & Biases', 'wandb', 'https://wandb.ai', 'ML experiment tracking and model registry platform', 'freemium', 'advanced', true, ['api', 'cli'], ['code-development', 'data-analytics']),
  t('MLflow', 'mlflow', 'https://mlflow.org', 'Open-source ML lifecycle management platform', 'free', 'advanced', true, ['api', 'cli'], ['code-development', 'data-analytics']),
  t('Label Studio', 'label-studio', 'https://labelstud.io', 'Open-source data labeling and annotation platform', 'freemium', 'intermediate', true, ['web', 'api'], ['code-development', 'data-analytics']),
  t('Roboflow', 'roboflow', 'https://roboflow.com', 'Computer vision AI platform for building and deploying models', 'freemium', 'intermediate', true, ['web', 'api'], ['code-development']),
  t('Paperspace', 'paperspace', 'https://www.paperspace.com', 'Cloud GPU platform for AI development and deployment', 'freemium', 'intermediate', true, ['web', 'api', 'cli'], ['code-development']),
  t('Lightning AI', 'lightning-ai', 'https://lightning.ai', 'AI development platform with free GPUs and PyTorch', 'freemium', 'advanced', true, ['web', 'api', 'cli'], ['code-development']),
  t('Colab', 'google-colab', 'https://colab.research.google.com', 'Google\'s free cloud notebook with GPU for AI development', 'freemium', 'intermediate', false, ['web'], ['code-development', 'research-education']),
  t('Kaggle', 'kaggle', 'https://www.kaggle.com', 'Data science competition platform with free GPU notebooks', 'free', 'intermediate', true, ['web', 'api'], ['code-development', 'data-analytics', 'research-education']),
  t('Gradio', 'gradio', 'https://gradio.app', 'Open-source tool for building AI demos and web interfaces', 'free', 'intermediate', true, ['api'], ['code-development']),
  t('Streamlit', 'streamlit', 'https://streamlit.io', 'Open-source framework for building AI data apps in Python', 'free', 'intermediate', true, ['web', 'api'], ['code-development', 'data-analytics']),
  t('BentoML', 'bentoml', 'https://www.bentoml.com', 'Open-source platform for serving and deploying AI models', 'freemium', 'advanced', true, ['api', 'cli'], ['code-development']),
  t('Ollama', 'ollama', 'https://ollama.ai', 'Run large language models locally on your machine', 'free', 'intermediate', false, ['cli', 'api'], ['code-development']),
  t('LM Studio', 'lm-studio', 'https://lmstudio.ai', 'Desktop app for running local LLMs with chat interface', 'free', 'intermediate', false, ['desktop'], ['code-development']),
  t('Jan', 'jan-ai', 'https://jan.ai', 'Open-source desktop app for running AI models locally', 'free', 'intermediate', false, ['desktop'], ['code-development']),
  t('Perplexity API', 'perplexity-api', 'https://docs.perplexity.ai', 'AI search API for building applications with web search', 'freemium', 'intermediate', true, ['api'], ['code-development', 'search-knowledge']),
  t('Cohere', 'cohere', 'https://cohere.com', 'Enterprise AI platform for text generation and embeddings', 'freemium', 'intermediate', true, ['api'], ['code-development']),
  t('AI21 Labs', 'ai21-labs', 'https://www.ai21.com', 'AI language model APIs for enterprise text generation', 'freemium', 'intermediate', true, ['api'], ['code-development']),
  t('Mistral AI', 'mistral-ai', 'https://mistral.ai', 'Open and efficient AI models for developers and enterprises', 'freemium', 'intermediate', true, ['api'], ['code-development']),
  t('Cerebras', 'cerebras', 'https://cerebras.ai', 'Ultra-fast AI inference with the fastest LLM API', 'freemium', 'intermediate', true, ['api'], ['code-development']),
  t('SambaNova', 'sambanova', 'https://sambanova.ai', 'Enterprise AI inference and training platform', 'contact', 'advanced', true, ['api'], ['code-development']),
  t('Anyscale', 'anyscale', 'https://www.anyscale.com', 'Platform for scaling AI applications with Ray', 'freemium', 'advanced', true, ['api'], ['code-development']),
]

// ─── PRODUCTIVITY EXPANSION ─────────────────────────────────────────────────

const PRODUCTIVITY_EXTRA: SeedTool[] = [
  t('Otter Meeting', 'otter-meeting', 'https://otter.ai/meeting', 'AI meeting assistant that joins calls and takes notes', 'freemium', 'beginner', true, ['web', 'api'], ['productivity', 'transcription']),
  t('Fathom', 'fathom', 'https://fathom.video', 'Free AI meeting recorder that highlights key moments', 'freemium', 'beginner', false, ['web', 'plugin'], ['productivity', 'transcription']),
  t('Vowel', 'vowel', 'https://www.vowel.com', 'AI video conferencing with automated summaries and action items', 'freemium', 'beginner', false, ['web', 'desktop'], ['productivity']),
  t('Fellow', 'fellow', 'https://fellow.app', 'AI meeting management platform with agenda and note-taking', 'freemium', 'beginner', true, ['web', 'api'], ['productivity', 'project-management']),
  t('Krisp Meeting', 'krisp-meeting', 'https://krisp.ai/meeting-assistant', 'AI meeting assistant with noise cancellation and notes', 'freemium', 'beginner', false, ['desktop'], ['productivity']),
  t('Read AI', 'read-ai', 'https://www.read.ai', 'AI meeting analytics with engagement scoring and summaries', 'freemium', 'beginner', false, ['web', 'plugin'], ['productivity']),
  t('Avoma', 'avoma', 'https://www.avoma.com', 'AI meeting intelligence for revenue teams', 'paid', 'intermediate', true, ['web', 'api'], ['productivity', 'sales-crm']),
  t('Sembly', 'sembly', 'https://www.sembly.ai', 'AI meeting assistant that records and summarizes meetings', 'freemium', 'beginner', true, ['web', 'api'], ['productivity', 'transcription']),
  t('Magical AI', 'magical-ai', 'https://www.getmagical.com', 'AI automation for repetitive tasks in any web app', 'freemium', 'beginner', false, ['plugin'], ['productivity', 'automation-agents']),
  t('Tactiq Pro', 'tactiq-pro', 'https://tactiq.io', 'AI real-time transcription for Google Meet and Zoom', 'freemium', 'beginner', false, ['plugin'], ['productivity', 'transcription']),
  t('Saga', 'saga', 'https://saga.so', 'AI-powered connected workspace for notes and tasks', 'freemium', 'beginner', false, ['web', 'desktop'], ['productivity']),
  t('Capacity', 'capacity-ai', 'https://capacity.com', 'AI support automation platform for teams', 'contact', 'intermediate', true, ['web', 'api'], ['productivity', 'customer-support']),
  t('Walling', 'walling', 'https://walling.app', 'AI visual workspace for organizing ideas and projects', 'freemium', 'beginner', false, ['web'], ['productivity']),
  t('Nifty', 'nifty', 'https://niftypm.com', 'AI project management with built-in docs and chat', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['productivity', 'project-management']),
  t('Craft', 'craft', 'https://www.craft.do', 'AI document editor with beautiful formatting and sharing', 'freemium', 'beginner', false, ['desktop', 'mobile', 'web'], ['productivity']),
]

// ─── SOCIAL MEDIA EXPANSION ─────────────────────────────────────────────────

const SOCIAL_EXTRA: SeedTool[] = [
  t('Hootsuite AI Writer', 'hootsuite-ai-writer', 'https://www.hootsuite.com/platform/owly-writer-ai', 'AI social media content writer built into Hootsuite', 'paid', 'beginner', false, ['web'], ['social-media', 'writing-content']),
  t('ContentStudio', 'contentstudio', 'https://contentstudio.io', 'AI social media management and content discovery', 'paid', 'beginner', true, ['web', 'api'], ['social-media']),
  t('MeetEdgar', 'meetedgar', 'https://meetedgar.com', 'AI social media scheduler with auto-recycling content', 'paid', 'beginner', false, ['web'], ['social-media']),
  t('Tailwind', 'tailwind', 'https://www.tailwindapp.com', 'AI marketing tool for Pinterest and Instagram scheduling', 'freemium', 'beginner', false, ['web', 'plugin'], ['social-media']),
  t('Agorapulse', 'agorapulse', 'https://www.agorapulse.com', 'Social media management with AI content recommendations', 'paid', 'intermediate', true, ['web', 'api'], ['social-media']),
  t('Iconosquare', 'iconosquare', 'https://www.iconosquare.com', 'Social media analytics and management platform', 'paid', 'intermediate', true, ['web', 'api'], ['social-media', 'data-analytics']),
  t('Sendible', 'sendible', 'https://www.sendible.com', 'AI social media management tool for agencies', 'paid', 'intermediate', true, ['web', 'api'], ['social-media']),
  t('Missinglettr', 'missinglettr', 'https://missinglettr.com', 'AI tool that turns blog posts into social media campaigns', 'paid', 'beginner', true, ['web', 'api'], ['social-media']),
  t('Planable', 'planable', 'https://planable.io', 'Social media collaboration and approval workflow platform', 'freemium', 'beginner', true, ['web', 'api'], ['social-media']),
  t('Crowdfire', 'crowdfire', 'https://www.crowdfireapp.com', 'AI social media management and content curation', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['social-media']),
  t('Loomly', 'loomly', 'https://www.loomly.com', 'AI social media calendar and management platform', 'paid', 'beginner', true, ['web', 'api'], ['social-media']),
  t('Kontentino', 'kontentino', 'https://www.kontentino.com', 'Social media management for agencies with AI assistance', 'paid', 'beginner', true, ['web', 'api'], ['social-media']),
  t('Flick', 'flick', 'https://www.flick.social', 'AI social media content planning and hashtag analytics', 'paid', 'beginner', false, ['web', 'mobile'], ['social-media']),
  t('Tribescaler', 'tribescaler', 'https://tribescaler.com', 'AI hook generator for viral X/Twitter threads', 'paid', 'beginner', false, ['web'], ['social-media', 'writing-content']),
  t('Tweet Hunter', 'tweet-hunter', 'https://tweethunter.io', 'AI Twitter/X growth tool with content inspiration', 'paid', 'beginner', false, ['web'], ['social-media']),
]

// ─── SALES & CRM EXPANSION ─────────────────────────────────────────────────

const SALES_EXTRA: SeedTool[] = [
  t('Warmly', 'warmly', 'https://www.warmly.ai', 'AI website visitor intelligence for B2B sales', 'freemium', 'intermediate', true, ['web', 'api'], ['sales-crm']),
  t('Regie AI', 'regie-ai', 'https://www.regie.ai', 'AI sales content and sequence generation platform', 'paid', 'intermediate', true, ['web', 'api'], ['sales-crm', 'email-marketing']),
  t('Amplemarket', 'amplemarket', 'https://amplemarket.com', 'AI-powered sales intelligence and outreach platform', 'contact', 'intermediate', true, ['web', 'api'], ['sales-crm']),
  t('Nooks', 'nooks', 'https://www.nooks.ai', 'AI parallel dialer and virtual sales floor', 'paid', 'intermediate', true, ['web', 'api'], ['sales-crm']),
  t('Sendspark', 'sendspark', 'https://www.sendspark.com', 'AI personalized video messaging for sales outreach', 'paid', 'beginner', true, ['web', 'api'], ['sales-crm', 'video-animation']),
  t('Reply.io', 'reply-io', 'https://reply.io', 'AI sales engagement platform for multichannel outreach', 'paid', 'intermediate', true, ['web', 'api'], ['sales-crm', 'email-marketing']),
  t('Overloop', 'overloop', 'https://overloop.com', 'AI sales automation for cold email and LinkedIn outreach', 'paid', 'intermediate', true, ['web', 'api'], ['sales-crm']),
  t('Octane AI', 'octane-ai', 'https://www.octaneai.com', 'AI quiz and personalization platform for Shopify', 'paid', 'beginner', true, ['web', 'api'], ['sales-crm', 'ecommerce']),
  t('Exceed.ai', 'exceed-ai', 'https://exceed.ai', 'AI sales assistant that qualifies and nurtures leads', 'contact', 'intermediate', true, ['web', 'api'], ['sales-crm']),
  t('Lyne AI', 'lyne-ai', 'https://lyne.ai', 'AI that generates personalized cold email first lines', 'paid', 'beginner', true, ['web', 'api'], ['sales-crm', 'email-marketing']),
  t('Crystal', 'crystal', 'https://www.crystalknows.com', 'AI personality assessment for better sales communication', 'freemium', 'beginner', false, ['web', 'plugin'], ['sales-crm']),
  t('Humantic AI', 'humantic-ai', 'https://humantic.ai', 'AI buyer intelligence for personalized sales engagement', 'paid', 'intermediate', true, ['web', 'api'], ['sales-crm']),
  t('Sybill AI', 'sybill-ai', 'https://www.sybill.ai', 'AI sales call assistant with behavior analysis and notes', 'paid', 'intermediate', true, ['web', 'api'], ['sales-crm']),
  t('Drift Email', 'drift-email', 'https://www.drift.com/platform/email/', 'AI email bot that responds to and books meetings from emails', 'paid', 'intermediate', true, ['web', 'api'], ['sales-crm', 'email-marketing']),
  t('Troops', 'troops', 'https://www.troops.ai', 'AI revenue communication platform with Slack and CRM sync', 'contact', 'intermediate', true, ['web', 'api'], ['sales-crm']),
]

// ─── ECOMMERCE EXPANSION ────────────────────────────────────────────────────

const ECOMMERCE_EXTRA: SeedTool[] = [
  t('Jasper for Ecommerce', 'jasper-ecommerce', 'https://www.jasper.ai/solutions/ecommerce', 'AI content generation for ecommerce product pages', 'paid', 'beginner', true, ['web', 'api'], ['ecommerce', 'writing-content']),
  t('Pixelcut', 'pixelcut', 'https://www.pixelcut.ai', 'AI product photo editor for ecommerce listings', 'freemium', 'beginner', false, ['web', 'mobile'], ['ecommerce', 'photo-editing']),
  t('CreatorKit', 'creatorkit', 'https://creatorkit.com', 'AI product photo and video generator for ecommerce', 'freemium', 'beginner', true, ['web', 'api'], ['ecommerce', 'photo-editing']),
  t('Lily AI', 'lily-ai', 'https://www.lily.ai', 'AI product attribute enrichment for fashion and retail', 'contact', 'intermediate', true, ['web', 'api'], ['ecommerce']),
  t('Klevu', 'klevu', 'https://www.klevu.com', 'AI search and product discovery for ecommerce stores', 'contact', 'intermediate', true, ['web', 'api'], ['ecommerce', 'search-knowledge']),
  t('Syte', 'syte', 'https://www.syte.ai', 'AI visual search and product discovery for retail', 'contact', 'intermediate', true, ['web', 'api'], ['ecommerce']),
  t('Refabric', 'refabric', 'https://refabric.com', 'AI fashion design and virtual try-on platform', 'freemium', 'intermediate', true, ['web', 'api'], ['ecommerce', 'design-ui']),
  t('RetailRocket', 'retailrocket', 'https://retailrocket.net', 'AI product recommendations and personalization for ecommerce', 'contact', 'intermediate', true, ['web', 'api'], ['ecommerce']),
  t('Salsify', 'salsify', 'https://www.salsify.com', 'AI product experience management for ecommerce brands', 'contact', 'intermediate', true, ['web', 'api'], ['ecommerce']),
  t('Competera', 'competera', 'https://competera.net', 'AI pricing optimization platform for retailers', 'contact', 'advanced', true, ['web', 'api'], ['ecommerce', 'business-finance']),
  t('Recombee', 'recombee', 'https://www.recombee.com', 'AI recommendation engine API for ecommerce and media', 'freemium', 'intermediate', true, ['api'], ['ecommerce']),
  t('Segmentify', 'segmentify', 'https://www.segmentify.com', 'AI personalization and recommendation engine for ecommerce', 'contact', 'intermediate', true, ['web', 'api'], ['ecommerce']),
  t('Zowie', 'zowie', 'https://www.getzowie.com', 'AI customer service automation for ecommerce', 'contact', 'intermediate', true, ['web', 'api'], ['ecommerce', 'customer-support']),
  t('Rep AI', 'rep-ai', 'https://www.hellorep.ai', 'AI shopping assistant chatbot for ecommerce stores', 'paid', 'beginner', true, ['web', 'api'], ['ecommerce', 'chatbots-assistants']),
  t('CartStack', 'cartstack', 'https://www.cartstack.com', 'AI cart abandonment recovery for ecommerce', 'paid', 'beginner', true, ['web', 'api'], ['ecommerce', 'email-marketing']),
]

// ─── CUSTOMER SUPPORT EXPANSION ─────────────────────────────────────────────

const SUPPORT_EXTRA: SeedTool[] = [
  t('Fin by Intercom', 'fin-intercom', 'https://www.intercom.com/fin', 'AI chatbot that resolves support queries from your knowledge base', 'paid', 'beginner', true, ['web', 'api'], ['customer-support', 'chatbots-assistants']),
  t('SupportGPT', 'supportgpt', 'https://forethought.ai/supportgpt', 'AI agent that automates customer support ticket resolution', 'contact', 'intermediate', true, ['web', 'api'], ['customer-support']),
  t('Freshchat', 'freshchat', 'https://www.freshworks.com/live-chat-software/', 'AI messaging platform for customer engagement', 'freemium', 'beginner', true, ['web', 'mobile', 'api'], ['customer-support', 'chatbots-assistants']),
  t('Zendesk Answer Bot', 'zendesk-answer-bot', 'https://www.zendesk.com/service/answer-bot/', 'AI-powered self-service for Zendesk customer support', 'paid', 'beginner', true, ['web', 'api'], ['customer-support']),
  t('Help Center AI', 'help-center-ai', 'https://www.helpcenter.ai', 'AI knowledge base that answers customer questions', 'paid', 'beginner', true, ['web', 'api'], ['customer-support']),
  t('DevRev', 'devrev', 'https://devrev.ai', 'AI platform connecting customer support with product development', 'freemium', 'intermediate', true, ['web', 'api'], ['customer-support', 'code-development']),
  t('Observe AI', 'observe-ai', 'https://www.observe.ai', 'AI conversation analytics for contact centers', 'contact', 'intermediate', true, ['web', 'api'], ['customer-support', 'data-analytics']),
  t('Gladly', 'gladly', 'https://www.gladly.com', 'AI-powered customer service platform with hero AI', 'contact', 'intermediate', true, ['web', 'api'], ['customer-support']),
  t('Hiver', 'hiver', 'https://hiverhq.com', 'AI email-based customer support for Gmail', 'paid', 'beginner', true, ['web', 'plugin', 'api'], ['customer-support']),
  t('Front', 'front', 'https://front.com', 'AI-powered customer operations platform for team inboxes', 'paid', 'intermediate', true, ['web', 'api'], ['customer-support']),
  t('Kayako', 'kayako', 'https://kayako.com', 'AI customer service platform with unified conversations', 'paid', 'intermediate', true, ['web', 'api'], ['customer-support']),
  t('Dixa', 'dixa', 'https://www.dixa.com', 'AI-powered conversational customer service platform', 'contact', 'intermediate', true, ['web', 'api'], ['customer-support']),
  t('Acquire', 'acquire', 'https://acquire.io', 'AI customer engagement platform with co-browsing and chat', 'contact', 'intermediate', true, ['web', 'api'], ['customer-support']),
  t('Richpanel', 'richpanel', 'https://www.richpanel.com', 'AI customer service platform for ecommerce brands', 'paid', 'beginner', true, ['web', 'api'], ['customer-support', 'ecommerce']),
  t('Certainly', 'certainly', 'https://certainly.io', 'AI chatbot platform for ecommerce customer support', 'paid', 'intermediate', true, ['web', 'api'], ['customer-support', 'chatbots-assistants']),
]

// ─── DATA & ANALYTICS EXPANSION ────────────────────────────────────────────

const DATA_EXTRA: SeedTool[] = [
  t('Deepnote', 'deepnote', 'https://deepnote.com', 'AI-powered collaborative data notebook for data teams', 'freemium', 'intermediate', true, ['web', 'api'], ['data-analytics', 'code-development']),
  t('Count', 'count', 'https://count.co', 'AI-powered data canvas for collaborative analytics', 'freemium', 'intermediate', false, ['web'], ['data-analytics']),
  t('Databricks', 'databricks', 'https://www.databricks.com', 'AI-powered data and analytics platform for enterprises', 'contact', 'advanced', true, ['web', 'api'], ['data-analytics', 'code-development']),
  t('Snowflake Cortex', 'snowflake-cortex', 'https://www.snowflake.com/en/data-cloud/cortex/', 'AI analytics and LLM integration in Snowflake data cloud', 'contact', 'advanced', true, ['web', 'api'], ['data-analytics']),
  t('Domo', 'domo', 'https://www.domo.com', 'AI-powered business intelligence cloud platform', 'contact', 'intermediate', true, ['web', 'mobile', 'api'], ['data-analytics']),
  t('Qlik Sense', 'qlik-sense', 'https://www.qlik.com/us/products/qlik-sense', 'AI analytics platform with associative data exploration', 'paid', 'intermediate', true, ['web', 'api'], ['data-analytics']),
  t('GoodData', 'gooddata', 'https://www.gooddata.com', 'AI analytics platform for embedded business intelligence', 'contact', 'intermediate', true, ['web', 'api'], ['data-analytics']),
  t('Sigma Computing', 'sigma-computing', 'https://www.sigmacomputing.com', 'AI cloud analytics with spreadsheet-like interface', 'contact', 'intermediate', true, ['web', 'api'], ['data-analytics', 'spreadsheets-data']),
  t('Census', 'census', 'https://www.getcensus.com', 'AI reverse ETL for syncing data warehouse to business tools', 'freemium', 'intermediate', true, ['web', 'api'], ['data-analytics']),
  t('Monte Carlo', 'monte-carlo', 'https://www.montecarlodata.com', 'AI data observability platform for data quality monitoring', 'contact', 'intermediate', true, ['web', 'api'], ['data-analytics']),
  t('Atlan', 'atlan', 'https://atlan.com', 'AI-powered data catalog and governance platform', 'contact', 'intermediate', true, ['web', 'api'], ['data-analytics']),
  t('Fivetran', 'fivetran', 'https://www.fivetran.com', 'AI-powered automated data integration and ETL', 'paid', 'intermediate', true, ['web', 'api'], ['data-analytics']),
  t('Airbyte', 'airbyte', 'https://airbyte.com', 'Open-source AI data integration platform', 'freemium', 'intermediate', true, ['web', 'api', 'cli'], ['data-analytics', 'code-development']),
  t('DBeaver', 'dbeaver', 'https://dbeaver.io', 'Universal database tool with AI SQL assistance', 'freemium', 'intermediate', false, ['desktop'], ['data-analytics']),
  t('Narrato Analytics', 'narrato-analytics', 'https://narrato.io/analytics', 'AI content analytics for performance tracking', 'paid', 'intermediate', true, ['web', 'api'], ['data-analytics', 'seo-marketing']),
]

// ─── AUTOMATION EXPANSION ───────────────────────────────────────────────────

const AUTOMATION_EXTRA: SeedTool[] = [
  t('Tines', 'tines', 'https://www.tines.com', 'AI-powered workflow automation for security and IT teams', 'freemium', 'intermediate', true, ['web', 'api'], ['automation-agents', 'cybersecurity']),
  t('Parabola', 'parabola', 'https://parabola.io', 'AI visual data automation without code', 'freemium', 'beginner', true, ['web', 'api'], ['automation-agents', 'data-analytics']),
  t('Levity', 'levity', 'https://levity.ai', 'No-code AI workflow automation for documents and emails', 'paid', 'beginner', true, ['web', 'api'], ['automation-agents']),
  t('Axiom', 'axiom-ai', 'https://axiom.ai', 'AI browser automation bot that scrapes and automates the web', 'freemium', 'beginner', false, ['plugin'], ['automation-agents']),
  t('Browse AI', 'browse-ai', 'https://browse.ai', 'AI web scraping and monitoring robot', 'freemium', 'beginner', true, ['web', 'api'], ['automation-agents']),
  t('PhantomBuster', 'phantombuster', 'https://phantombuster.com', 'AI lead generation and social media automation', 'paid', 'intermediate', true, ['web', 'api'], ['automation-agents', 'sales-crm']),
  t('Apify', 'apify', 'https://apify.com', 'Cloud web scraping and automation platform', 'freemium', 'intermediate', true, ['web', 'api'], ['automation-agents', 'code-development']),
  t('Robocorp', 'robocorp', 'https://robocorp.com', 'Open-source Python-based RPA and automation framework', 'freemium', 'intermediate', true, ['api', 'cli'], ['automation-agents', 'code-development']),
  t('UiPath', 'uipath', 'https://www.uipath.com', 'Enterprise AI-powered robotic process automation platform', 'freemium', 'intermediate', true, ['web', 'desktop', 'api'], ['automation-agents']),
  t('Automation Anywhere', 'automation-anywhere', 'https://www.automationanywhere.com', 'Enterprise AI automation platform with RPA and process mining', 'contact', 'intermediate', true, ['web', 'api'], ['automation-agents']),
  t('Airparser', 'airparser', 'https://airparser.com', 'AI document parser that extracts data from emails and PDFs', 'freemium', 'beginner', true, ['web', 'api'], ['automation-agents']),
  t('Parsio', 'parsio', 'https://parsio.io', 'AI email and document parser for automated data extraction', 'freemium', 'beginner', true, ['web', 'api'], ['automation-agents']),
  t('Cassidy', 'cassidy', 'https://cassidy.ai', 'AI automation platform that builds custom workflows for teams', 'paid', 'beginner', true, ['web', 'api'], ['automation-agents', 'productivity']),
  t('Respell', 'respell', 'https://www.respell.ai', 'AI automation builder for creating workflows with LLMs', 'freemium', 'beginner', true, ['web', 'api'], ['automation-agents']),
  t('Leap AI', 'leap-ai', 'https://www.tryleap.ai', 'AI workflow and image generation API for developers', 'freemium', 'intermediate', true, ['api'], ['automation-agents', 'code-development']),
]

// ─── HEALTHCARE EXPANSION ───────────────────────────────────────────────────

const HEALTHCARE_EXTRA: SeedTool[] = [
  t('Woebot', 'woebot', 'https://woebothealth.com', 'AI mental health chatbot using CBT techniques', 'freemium', 'beginner', false, ['mobile'], ['healthcare', 'chatbots-assistants']),
  t('Wysa', 'wysa', 'https://www.wysa.com', 'AI mental health and wellbeing chat companion', 'freemium', 'beginner', false, ['mobile'], ['healthcare']),
  t('Babylon Health', 'babylon-health', 'https://www.babylonhealth.com', 'AI health assessment and telehealth platform', 'freemium', 'beginner', false, ['mobile', 'web'], ['healthcare']),
  t('Flatiron Health', 'flatiron-health', 'https://flatiron.com', 'AI oncology data platform for cancer research', 'contact', 'advanced', true, ['web', 'api'], ['healthcare', 'research-education']),
  t('Recursion', 'recursion', 'https://www.recursion.com', 'AI-powered drug discovery and development platform', 'contact', 'advanced', true, ['web', 'api'], ['healthcare', 'research-education']),
  t('Zebra Medical', 'zebra-medical', 'https://www.zebra-med.com', 'AI medical imaging analysis for radiology', 'contact', 'advanced', true, ['web', 'api'], ['healthcare']),
  t('Insilico Medicine', 'insilico-medicine', 'https://insilico.com', 'AI drug discovery with generative biology models', 'contact', 'advanced', true, ['web', 'api'], ['healthcare', 'research-education']),
  t('Caption Health', 'caption-health', 'https://captionhealth.com', 'AI-guided medical imaging with ultrasound', 'contact', 'intermediate', false, ['desktop'], ['healthcare']),
  t('MedPalm', 'medpalm', 'https://research.google/pubs/towards-expert-level-medical-question-answering-with-large-language-models/', 'Google\'s AI medical question answering model', 'contact', 'advanced', true, ['api'], ['healthcare', 'research-education']),
  t('BioNTech AI', 'biontech-ai', 'https://www.biontech.com', 'AI-driven individualized cancer immunotherapy development', 'contact', 'advanced', true, ['api'], ['healthcare', 'research-education']),
]

// ─── LEGAL EXPANSION ────────────────────────────────────────────────────────

const LEGAL_EXTRA: SeedTool[] = [
  t('EvenUp', 'evenup', 'https://www.evenuplaw.com', 'AI demand letter generator for personal injury lawyers', 'contact', 'intermediate', true, ['web', 'api'], ['legal']),
  t('Legal Robot', 'legal-robot', 'https://legalrobot.com', 'AI legal language analysis and simplification tool', 'paid', 'beginner', true, ['web', 'api'], ['legal']),
  t('Clearlaw', 'clearlaw', 'https://clearlaw.ai', 'AI contract review assistant for small businesses', 'freemium', 'beginner', false, ['web'], ['legal']),
  t('Casemine', 'casemine', 'https://www.casemine.com', 'AI legal research platform with case law analysis', 'freemium', 'intermediate', true, ['web', 'api'], ['legal', 'research-education']),
  t('vLex', 'vlex', 'https://vlex.com', 'AI-powered legal research with intelligent search', 'paid', 'intermediate', true, ['web', 'api'], ['legal', 'research-education']),
  t('Latch', 'latch', 'https://latch.legal', 'AI contract management platform for startups', 'freemium', 'beginner', true, ['web', 'api'], ['legal']),
  t('Rally', 'rally-legal', 'https://www.rallynow.com', 'AI legal document assembly and automation', 'paid', 'beginner', false, ['web'], ['legal']),
  t('Genie AI', 'genie-ai', 'https://www.genieai.co', 'AI legal assistant for contract drafting and review', 'freemium', 'beginner', false, ['web', 'plugin'], ['legal']),
  t('ContractPodAi', 'contractpodai', 'https://contractpodai.com', 'AI contract lifecycle management for enterprises', 'contact', 'intermediate', true, ['web', 'api'], ['legal']),
  t('Trellis', 'trellis-legal', 'https://trellis.law', 'AI litigation analytics for state court intelligence', 'paid', 'intermediate', true, ['web', 'api'], ['legal', 'data-analytics']),
]

// ─── CYBERSECURITY EXPANSION ────────────────────────────────────────────────

const CYBER_EXTRA: SeedTool[] = [
  t('Elastic Security', 'elastic-security', 'https://www.elastic.co/security', 'AI SIEM and endpoint security with machine learning', 'freemium', 'advanced', true, ['web', 'api'], ['cybersecurity']),
  t('Sumo Logic', 'sumo-logic', 'https://www.sumologic.com', 'AI cloud SIEM and observability platform', 'freemium', 'intermediate', true, ['web', 'api'], ['cybersecurity', 'data-analytics']),
  t('Rapid7', 'rapid7', 'https://www.rapid7.com', 'AI security analytics and vulnerability management', 'paid', 'intermediate', true, ['web', 'api'], ['cybersecurity']),
  t('Trend Micro', 'trend-micro', 'https://www.trendmicro.com', 'AI-powered cybersecurity platform for enterprise', 'paid', 'intermediate', true, ['web', 'api'], ['cybersecurity']),
  t('Proofpoint', 'proofpoint', 'https://www.proofpoint.com', 'AI email security and threat protection platform', 'contact', 'intermediate', true, ['web', 'api'], ['cybersecurity']),
  t('Mimecast', 'mimecast', 'https://www.mimecast.com', 'AI email security and cyber resilience platform', 'contact', 'intermediate', true, ['web', 'api'], ['cybersecurity']),
  t('Exabeam', 'exabeam', 'https://www.exabeam.com', 'AI security operations platform with behavioral analytics', 'contact', 'advanced', true, ['web', 'api'], ['cybersecurity']),
  t('LogRhythm', 'logrhythm', 'https://logrhythm.com', 'AI SIEM platform for threat detection and response', 'contact', 'advanced', true, ['web', 'api'], ['cybersecurity']),
  t('Secureworks', 'secureworks', 'https://www.secureworks.com', 'AI-powered managed security and threat intelligence', 'contact', 'intermediate', true, ['web', 'api'], ['cybersecurity']),
  t('Cynet', 'cynet', 'https://www.cynet.com', 'AI autonomous breach protection platform', 'contact', 'intermediate', true, ['web', 'api'], ['cybersecurity']),
]

// ─── MISC EXPANSION (HR, Real Estate, Finance, etc.) ────────────────────────

const HR_EXTRA: SeedTool[] = [
  t('Workday AI', 'workday-ai', 'https://www.workday.com', 'AI-powered HR and financial management platform', 'contact', 'intermediate', true, ['web', 'mobile', 'api'], ['hr-recruiting', 'business-finance']),
  t('Culture Amp', 'culture-amp', 'https://www.cultureamp.com', 'AI employee experience and engagement platform', 'contact', 'intermediate', true, ['web', 'api'], ['hr-recruiting']),
  t('15Five', 'fifteen-five', 'https://www.15five.com', 'AI performance management with continuous feedback', 'paid', 'beginner', true, ['web', 'api'], ['hr-recruiting']),
  t('Visier', 'visier', 'https://www.visier.com', 'AI people analytics and workforce planning platform', 'contact', 'intermediate', true, ['web', 'api'], ['hr-recruiting', 'data-analytics']),
  t('Phenom', 'phenom', 'https://www.phenom.com', 'AI talent experience platform for hiring and HR', 'contact', 'intermediate', true, ['web', 'api'], ['hr-recruiting']),
  t('Beamery', 'beamery', 'https://beamery.com', 'AI talent lifecycle management platform', 'contact', 'intermediate', true, ['web', 'api'], ['hr-recruiting']),
  t('Leena AI', 'leena-ai', 'https://leena.ai', 'AI employee experience platform with HR chatbot', 'contact', 'intermediate', true, ['web', 'api'], ['hr-recruiting', 'chatbots-assistants']),
  t('HireEZ', 'hireez', 'https://hireez.com', 'AI outbound recruiting platform for talent sourcing', 'paid', 'intermediate', true, ['web', 'api'], ['hr-recruiting']),
  t('Canditech', 'canditech', 'https://www.canditech.io', 'AI skills assessment platform for hiring', 'paid', 'beginner', true, ['web', 'api'], ['hr-recruiting']),
  t('Harver', 'harver', 'https://harver.com', 'AI volume hiring and talent assessment platform', 'contact', 'intermediate', true, ['web', 'api'], ['hr-recruiting']),
]

const REAL_ESTATE_EXTRA: SeedTool[] = [
  t('Roof AI', 'roof-ai', 'https://www.roof.ai', 'AI chatbot for real estate lead capture and qualification', 'paid', 'beginner', true, ['web', 'api'], ['real-estate', 'chatbots-assistants']),
  t('Curbio', 'curbio', 'https://curbio.com', 'AI-powered home improvement for pre-sale renovations', 'contact', 'beginner', false, ['web'], ['real-estate']),
  t('Buildout', 'buildout', 'https://buildout.com', 'AI commercial real estate marketing platform', 'paid', 'intermediate', true, ['web', 'api'], ['real-estate']),
  t('RealPage', 'realpage', 'https://www.realpage.com', 'AI property management and analytics platform', 'contact', 'intermediate', true, ['web', 'api'], ['real-estate', 'data-analytics']),
  t('CoStar', 'costar', 'https://www.costar.com', 'AI commercial real estate intelligence and analytics', 'contact', 'intermediate', true, ['web', 'api'], ['real-estate', 'data-analytics']),
  t('Reonomy', 'reonomy', 'https://www.reonomy.com', 'AI commercial real estate data and analytics platform', 'paid', 'intermediate', true, ['web', 'api'], ['real-estate', 'data-analytics']),
  t('Compass', 'compass-re', 'https://www.compass.com', 'AI-powered real estate technology platform for agents', 'free', 'beginner', false, ['web', 'mobile'], ['real-estate']),
  t('BoxBrownie', 'boxbrownie', 'https://www.boxbrownie.com', 'AI real estate photo editing and virtual staging', 'paid', 'beginner', false, ['web'], ['real-estate', 'photo-editing']),
]

const PERSONAL_FINANCE_EXTRA: SeedTool[] = [
  t('Kubera', 'kubera', 'https://www.kubera.com', 'AI portfolio tracker for crypto, stocks, and real estate', 'paid', 'intermediate', false, ['web'], ['personal-finance']),
  t('Simplifi', 'simplifi', 'https://www.quicken.com/simplifi', 'AI personal finance app by Quicken for budgeting', 'paid', 'beginner', false, ['web', 'mobile'], ['personal-finance']),
  t('Empower', 'empower', 'https://www.empower.com', 'AI personal wealth management and retirement planning', 'freemium', 'beginner', false, ['web', 'mobile'], ['personal-finance']),
  t('Acorns', 'acorns', 'https://www.acorns.com', 'AI micro-investing app that rounds up spare change', 'paid', 'beginner', false, ['mobile'], ['personal-finance']),
  t('SoFi', 'sofi', 'https://www.sofi.com', 'AI-powered personal finance and investing platform', 'freemium', 'beginner', false, ['web', 'mobile'], ['personal-finance']),
  t('Koinly', 'koinly', 'https://koinly.io', 'AI crypto tax calculator and portfolio tracker', 'freemium', 'beginner', true, ['web', 'api'], ['personal-finance']),
  t('TurboTax AI', 'turbotax-ai', 'https://turbotax.intuit.com', 'AI-powered tax preparation and filing software', 'paid', 'beginner', false, ['web', 'mobile'], ['personal-finance']),
  t('H&R Block AI', 'hr-block-ai', 'https://www.hrblock.com', 'AI tax preparation with expert assistance', 'paid', 'beginner', false, ['web', 'mobile'], ['personal-finance']),
]

const ARCHITECTURE_EXTRA: SeedTool[] = [
  t('Midjourney Arch Pro', 'midjourney-arch-pro', 'https://www.midjourney.com', 'Advanced AI architectural concept and visualization', 'paid', 'intermediate', false, ['web'], ['architecture-interior']),
  t('LookX AI', 'lookx-ai', 'https://www.lookx.ai', 'AI architectural design and rendering platform', 'freemium', 'intermediate', true, ['web', 'api'], ['architecture-interior']),
  t('AI Room Planner', 'ai-room-planner', 'https://www.airoomplanner.com', 'AI interior design tool for room layout planning', 'freemium', 'beginner', false, ['web'], ['architecture-interior']),
  t('Finch 3D', 'finch-3d', 'https://www.finch3d.com', 'AI building design optimization for architects', 'paid', 'advanced', true, ['web', 'api'], ['architecture-interior']),
  t('TestFit', 'testfit', 'https://testfit.io', 'AI building configurator for real estate feasibility', 'contact', 'advanced', true, ['web', 'api'], ['architecture-interior', 'real-estate']),
  t('AirDNA', 'airdna', 'https://www.airdna.co', 'AI short-term rental analytics and market data', 'paid', 'intermediate', true, ['web', 'api'], ['architecture-interior', 'real-estate']),
  t('DesignFiles', 'designfiles', 'https://www.designfiles.co', 'AI interior design project management platform', 'paid', 'beginner', false, ['web'], ['architecture-interior']),
  t('Havenly', 'havenly', 'https://www.havenly.com', 'AI-assisted online interior design service', 'paid', 'beginner', false, ['web'], ['architecture-interior']),
]

const TRANSLATION_EXTRA: SeedTool[] = [
  t('Trados', 'trados', 'https://www.trados.com', 'AI-powered translation management by RWS', 'paid', 'intermediate', true, ['desktop', 'web', 'api'], ['translation']),
  t('memoQ', 'memoq', 'https://www.memoq.com', 'AI translation management system for enterprises', 'paid', 'intermediate', true, ['desktop', 'web', 'api'], ['translation']),
  t('MateCat', 'matecat', 'https://www.matecat.com', 'Free AI-powered online CAT tool for translators', 'free', 'intermediate', false, ['web'], ['translation']),
  t('Wordfast', 'wordfast', 'https://www.wordfast.com', 'AI-assisted translation memory tool', 'paid', 'intermediate', false, ['desktop', 'web'], ['translation']),
  t('Memsource', 'memsource', 'https://www.memsource.com', 'AI translation management platform now part of Phrase', 'paid', 'intermediate', true, ['web', 'api'], ['translation']),
]

const SEARCH_EXTRA: SeedTool[] = [
  t('Algolia AI', 'algolia-search', 'https://www.algolia.com/products/ai-search/', 'AI search API with natural language understanding', 'freemium', 'intermediate', true, ['api'], ['search-knowledge']),
  t('Milvus', 'milvus', 'https://milvus.io', 'Open-source vector database for AI similarity search', 'free', 'advanced', true, ['api', 'cli'], ['search-knowledge', 'code-development']),
  t('Elastic', 'elastic', 'https://www.elastic.co', 'AI search and observability platform with vector search', 'freemium', 'advanced', true, ['api', 'cli'], ['search-knowledge', 'code-development']),
  t('Typesense', 'typesense', 'https://typesense.org', 'Open-source AI search engine with typo tolerance', 'free', 'intermediate', true, ['api'], ['search-knowledge', 'code-development']),
  t('Meilisearch', 'meilisearch', 'https://www.meilisearch.com', 'Open-source instant search engine with AI features', 'free', 'intermediate', true, ['api', 'cli'], ['search-knowledge', 'code-development']),
]

const GAME_DEV_EXTRA: SeedTool[] = [
  t('Convai', 'convai', 'https://convai.com', 'AI NPC dialogue and character behavior for games', 'freemium', 'intermediate', true, ['web', 'api', 'plugin'], ['3d-game-dev', 'chatbots-assistants']),
  t('Genie by Luma', 'genie-luma', 'https://lumalabs.ai/genie', 'AI 3D model generation from text for game assets', 'freemium', 'beginner', true, ['web', 'api'], ['3d-game-dev']),
  t('3D AI Studio', '3d-ai-studio', 'https://3daistudio.com', 'AI tool for generating 3D models from text prompts', 'freemium', 'beginner', true, ['web', 'api'], ['3d-game-dev']),
  t('Rokoko', 'rokoko', 'https://www.rokoko.com', 'AI motion capture for game animation', 'freemium', 'intermediate', true, ['web', 'desktop', 'api'], ['3d-game-dev']),
  t('Move AI', 'move-ai', 'https://www.move.ai', 'AI markerless motion capture from video', 'freemium', 'intermediate', true, ['web', 'api'], ['3d-game-dev', 'video-animation']),
]

const PROJECT_EXTRA: SeedTool[] = [
  t('Fibery', 'fibery', 'https://fibery.io', 'AI work management platform connecting strategy to execution', 'freemium', 'intermediate', true, ['web', 'api'], ['project-management']),
  t('Miro AI', 'miro-ai', 'https://miro.com/ai/', 'AI-powered visual collaboration and whiteboarding', 'freemium', 'beginner', true, ['web', 'api'], ['project-management', 'productivity']),
  t('Nuclino', 'nuclino', 'https://www.nuclino.com', 'AI knowledge base and project wiki for teams', 'freemium', 'beginner', true, ['web', 'api'], ['project-management', 'productivity']),
  t('Leantime', 'leantime', 'https://leantime.io', 'Open-source project management for non-project-managers', 'freemium', 'beginner', true, ['web', 'api'], ['project-management']),
  t('Forecast', 'forecast', 'https://www.forecast.app', 'AI project management with resource and budget planning', 'paid', 'intermediate', true, ['web', 'api'], ['project-management']),
]

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT ALL EXTRA TOOLS
// ═══════════════════════════════════════════════════════════════════════════════

export const EXTRA_SEED_TOOLS: SeedTool[] = [
  ...WRITING_EXTRA,
  ...IMAGE_EXTRA,
  ...VIDEO_EXTRA,
  ...CODE_EXTRA,
  ...PRODUCTIVITY_EXTRA,
  ...SOCIAL_EXTRA,
  ...SALES_EXTRA,
  ...ECOMMERCE_EXTRA,
  ...SUPPORT_EXTRA,
  ...DATA_EXTRA,
  ...AUTOMATION_EXTRA,
  ...HEALTHCARE_EXTRA,
  ...LEGAL_EXTRA,
  ...CYBER_EXTRA,
  ...HR_EXTRA,
  ...REAL_ESTATE_EXTRA,
  ...PERSONAL_FINANCE_EXTRA,
  ...ARCHITECTURE_EXTRA,
  ...TRANSLATION_EXTRA,
  ...SEARCH_EXTRA,
  ...GAME_DEV_EXTRA,
  ...PROJECT_EXTRA,
]
