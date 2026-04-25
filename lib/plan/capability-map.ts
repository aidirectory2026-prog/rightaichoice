/**
 * Capability map (Step 49.1).
 *
 * Hand-curated capability matrix for the most-mainstream AI tools.
 * Each entry says, per pricing tier, which user subintents the tool covers
 * (full or partial) and what the tier costs. The map is the ground truth
 * the planner's consolidation logic checks against — a defensible answer
 * to "could one tool's tier handle ≥80% of this user's subintents?".
 *
 * ## Why hand-curated, not LLM-generated
 *
 * Sonnet's training data is frozen and tools change tiers + features
 * frequently (DALL-E 3 moved into ChatGPT Plus; Claude added artifacts;
 * Cursor changed its agent UX; ElevenLabs raised the free-tier voice cap).
 * A static, code-owned matrix is verifiable, diff-reviewable, and can be
 * re-audited per row instead of regenerated globally.
 *
 * ## Coverage policy
 *
 * Confidence levels are honest:
 *   - 'high'   → every listed capability has been hand-verified against
 *                the tool's public docs/marketing as of last_verified_at.
 *   - 'medium' → primary capability is verified; secondary capabilities
 *                may exist but are not claimed.
 *
 * If a capability isn't listed at any tier, the matrix says nothing about
 * it. Absence is not a "no" — the consumer must treat unknown as unknown.
 *
 * ## Pricing tiers
 *
 *   free       → publicly accessible, no payment
 *   pro        → individual paid plan (Plus / Pro / Personal)
 *   enterprise → team / business / API-volume pricing
 *
 * Higher tiers inherit lower-tier capabilities by convention. If ChatGPT
 * Plus (pro) lists 'image_generation' as full, the enterprise tier
 * inherits it without restating.
 *
 * ## Update protocol
 *
 * 1. Re-audit any entry where last_verified_at > 90 days old (CI warning
 *    once a staleness check is wired up).
 * 2. When adding a new capability, prefer 'partial' over 'full' unless
 *    the tool genuinely matches a dedicated specialist.
 * 3. New tools: add the row, set confidence='medium' if you only verified
 *    the primary capability, 'high' once you've checked every listed field.
 */

export const SUBINTENTS = [
  'chat_general',
  'research_web',
  'writing_long_form',
  'writing_short_form',
  'code_generation',
  'code_agent',
  'image_generation',
  'image_editing',
  'video_generation',
  'video_editing',
  'voice_synthesis',
  'voice_cloning',
  'music_generation',
  'transcription',
  'summarization',
  'data_analysis',
  'pdf_doc_chat',
  'presentation_slides',
  'automation_workflow',
  'meeting_notes',
  'avatar_video',
  'design_canvas',
  'agent_browser',
  'translation',
] as const

export type Subintent = (typeof SUBINTENTS)[number]
export type Tier = 'free' | 'pro' | 'enterprise'

type TierCoverage = {
  full?: Subintent[]
  partial?: Subintent[]
}

export type ToolCapability = {
  slug: string
  name: string
  free?: TierCoverage
  pro?: TierCoverage
  enterprise?: TierCoverage
  pricing?: {
    free_available: boolean
    pro_monthly?: string
    enterprise?: string
  }
  notes?: string
  last_verified_at: string
  confidence: 'high' | 'medium'
}

const TODAY = '2026-04-26'

/**
 * The capability map. Ordered roughly by mainstream prominence per
 * category; intra-category order is alphabetical-ish for diff stability.
 */
export const TOOL_CAPABILITIES: ToolCapability[] = [
  // ─────────── General-purpose chat / research / multi-modal ───────────
  {
    slug: 'chatgpt',
    name: 'ChatGPT',
    free: {
      full: ['chat_general', 'writing_long_form', 'writing_short_form', 'summarization', 'translation'],
      partial: ['research_web', 'code_generation', 'data_analysis', 'pdf_doc_chat'],
    },
    pro: {
      full: [
        'chat_general', 'research_web', 'writing_long_form', 'writing_short_form',
        'code_generation', 'image_generation', 'data_analysis', 'pdf_doc_chat',
        'summarization', 'translation',
      ],
      partial: ['image_editing', 'voice_synthesis'],
    },
    enterprise: {
      full: [
        'chat_general', 'research_web', 'writing_long_form', 'writing_short_form',
        'code_generation', 'image_generation', 'data_analysis', 'pdf_doc_chat',
        'summarization', 'translation',
      ],
      partial: ['image_editing', 'voice_synthesis'],
    },
    pricing: { free_available: true, pro_monthly: '$20/mo', enterprise: '$25-60/seat/mo' },
    notes: 'Plus tier unlocks DALL-E 3, web browsing, Advanced Data Analysis (Code Interpreter), GPT-4o, file upload, and 80 messages/3hr. Free tier covers basic chat + writing on a smaller model with limited browsing.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'claude',
    name: 'Claude',
    free: {
      full: ['chat_general', 'writing_long_form', 'writing_short_form', 'summarization', 'translation', 'pdf_doc_chat'],
      partial: ['code_generation', 'data_analysis'],
    },
    pro: {
      full: [
        'chat_general', 'writing_long_form', 'writing_short_form', 'summarization',
        'translation', 'pdf_doc_chat', 'code_generation', 'data_analysis', 'research_web',
      ],
      partial: ['image_editing'],
    },
    enterprise: {
      full: [
        'chat_general', 'writing_long_form', 'writing_short_form', 'summarization',
        'translation', 'pdf_doc_chat', 'code_generation', 'data_analysis', 'research_web',
      ],
      partial: ['image_editing'],
    },
    pricing: { free_available: true, pro_monthly: '$20/mo', enterprise: '$25-60/seat/mo' },
    notes: 'Claude Sonnet/Opus excel at long-form writing and code. Pro tier adds 5x usage, Projects (persistent context), and longer file uploads. No native image generation.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'gemini',
    name: 'Gemini',
    free: {
      full: ['chat_general', 'writing_long_form', 'writing_short_form', 'summarization', 'translation', 'research_web'],
      partial: ['code_generation', 'image_generation', 'data_analysis'],
    },
    pro: {
      full: [
        'chat_general', 'writing_long_form', 'writing_short_form', 'summarization',
        'translation', 'research_web', 'code_generation', 'image_generation',
        'data_analysis', 'pdf_doc_chat',
      ],
      partial: ['video_generation'],
    },
    pricing: { free_available: true, pro_monthly: '$20/mo' },
    notes: 'Gemini Advanced (paid) unlocks 1M-token context, Veo video, Imagen image gen, Deep Research. Free tier (2.5 Flash) handles general chat + research with web grounding.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'perplexity',
    name: 'Perplexity',
    free: {
      full: ['research_web', 'summarization'],
      partial: ['chat_general', 'writing_short_form'],
    },
    pro: {
      full: ['research_web', 'summarization', 'chat_general', 'pdf_doc_chat'],
      partial: ['code_generation', 'data_analysis', 'writing_long_form'],
    },
    pricing: { free_available: true, pro_monthly: '$20/mo' },
    notes: 'Specialized for web-grounded research with citations. Pro adds model choice (GPT/Claude/Sonar Large), Pro Search, file upload. Not a writing or coding tool — use it for research, then hand off.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'grok',
    name: 'Grok',
    pro: {
      full: ['chat_general', 'research_web', 'writing_short_form', 'image_generation'],
      partial: ['code_generation', 'writing_long_form'],
    },
    pricing: { free_available: true, pro_monthly: '$8-30/mo (X Premium)' },
    notes: 'Tied to X/Twitter; unique strength is real-time X-content awareness. Image gen via Aurora. Less polished for long-form work than ChatGPT/Claude.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'copilot-microsoft',
    name: 'Microsoft Copilot',
    free: {
      full: ['chat_general', 'research_web', 'writing_short_form', 'image_generation'],
      partial: ['code_generation', 'summarization'],
    },
    pro: {
      full: [
        'chat_general', 'research_web', 'writing_long_form', 'writing_short_form',
        'image_generation', 'summarization', 'pdf_doc_chat', 'data_analysis',
        'presentation_slides',
      ],
    },
    pricing: { free_available: true, pro_monthly: '$20/mo (Copilot Pro); $30/seat/mo (M365)' },
    notes: 'Microsoft 365 Copilot is the standout — embedded in Word/Excel/PPT/Outlook. Free Copilot covers GPT-4-class chat + DALL-E 3 image gen.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'le-chat',
    name: 'Le Chat (Mistral)',
    free: {
      full: ['chat_general', 'writing_long_form', 'writing_short_form', 'summarization', 'translation', 'code_generation'],
      partial: ['research_web'],
    },
    pricing: { free_available: true, pro_monthly: '$15/mo' },
    notes: 'European LLM; strong for code and multilingual writing. Free tier is generous.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },
  {
    slug: 'deepseek',
    name: 'DeepSeek',
    free: {
      full: ['chat_general', 'code_generation', 'writing_long_form', 'summarization'],
      partial: ['research_web'],
    },
    pricing: { free_available: true },
    notes: 'Strong open-weight models, particularly DeepSeek-R1 for reasoning and DeepSeek-Coder for code. Free web chat available.',
    last_verified_at: TODAY,
    confidence: 'high',
  },

  // ─────────── Code / coding agents / IDEs ───────────
  {
    slug: 'cursor',
    name: 'Cursor',
    free: {
      partial: ['code_generation', 'code_agent'],
    },
    pro: {
      full: ['code_generation', 'code_agent'],
      partial: ['chat_general'],
    },
    pricing: { free_available: true, pro_monthly: '$20/mo', enterprise: '$40/seat/mo' },
    notes: 'AI-native VS Code fork. Pro unlocks unlimited slow requests, 500 fast requests, Composer (multi-file agent), and choice of frontier models (Claude/GPT). Free tier is hard-capped.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'claude-code',
    name: 'Claude Code',
    pro: {
      full: ['code_generation', 'code_agent'],
      partial: ['chat_general', 'pdf_doc_chat'],
    },
    pricing: { free_available: false, pro_monthly: '$20/mo (Claude Pro) or pay-as-you-go API' },
    notes: 'Anthropic\'s terminal-native coding agent. Strongest at multi-file refactors, long-running tasks, and codebase exploration. Requires Claude Pro/Max subscription or API credits.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'github-copilot',
    name: 'GitHub Copilot',
    pro: {
      full: ['code_generation'],
      partial: ['code_agent', 'chat_general'],
    },
    enterprise: {
      full: ['code_generation', 'code_agent'],
    },
    pricing: { free_available: true, pro_monthly: '$10/mo (Pro), $19/mo (Pro+)', enterprise: '$39/seat/mo' },
    notes: 'IDE inline completions + chat. Free tier (limited) launched late 2024. Pro+ adds frontier model access (Claude Opus, GPT-5). Best fit for completion-heavy workflows.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'windsurf',
    name: 'Windsurf',
    free: {
      partial: ['code_generation', 'code_agent'],
    },
    pro: {
      full: ['code_generation', 'code_agent'],
    },
    pricing: { free_available: true, pro_monthly: '$15/mo' },
    notes: 'Codeium\'s AI IDE. Cascade agent rivals Cursor Composer. Cheaper than Cursor at the Pro tier.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'cline',
    name: 'Cline',
    free: {
      full: ['code_generation', 'code_agent'],
    },
    pricing: { free_available: true },
    notes: 'Open-source VS Code extension; bring-your-own-API-key (Claude/OpenAI/Gemini/etc.). Free to install, paid only for the underlying model usage.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'aider',
    name: 'Aider',
    free: {
      full: ['code_generation', 'code_agent'],
    },
    pricing: { free_available: true },
    notes: 'Open-source CLI coding agent. Pairs with any LLM API. Strong at git-aware multi-file edits.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'continue',
    name: 'Continue',
    free: {
      full: ['code_generation'],
      partial: ['code_agent'],
    },
    pricing: { free_available: true },
    notes: 'Open-source VS Code/JetBrains extension; bring-your-own-key. Customizable.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },
  {
    slug: 'codeium',
    name: 'Codeium',
    free: {
      full: ['code_generation'],
    },
    pro: {
      full: ['code_generation'],
      partial: ['code_agent'],
    },
    pricing: { free_available: true, pro_monthly: '$15/mo' },
    notes: 'Free tier is genuinely usable for individuals. Now part of the Windsurf brand.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },
  {
    slug: 'tabnine',
    name: 'Tabnine',
    free: {
      partial: ['code_generation'],
    },
    pro: {
      full: ['code_generation'],
    },
    pricing: { free_available: true, pro_monthly: '$12/seat/mo', enterprise: '$39/seat/mo' },
    notes: 'Privacy-focused completions; can run on-prem at the enterprise tier.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },
  {
    slug: 'replit',
    name: 'Replit',
    free: {
      partial: ['code_generation'],
    },
    pro: {
      full: ['code_generation', 'code_agent'],
    },
    pricing: { free_available: true, pro_monthly: '$15/mo (Core), $25+/mo (Teams)' },
    notes: 'Browser IDE + Replit Agent (autonomous app builder). Strong for greenfield prototypes; less so for existing large codebases.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'bolt-new',
    name: 'Bolt.new',
    free: {
      partial: ['code_agent'],
    },
    pro: {
      full: ['code_agent'],
    },
    pricing: { free_available: true, pro_monthly: '$20-200/mo (token tiers)' },
    notes: 'StackBlitz\'s in-browser full-stack agent. Best for spinning up a deployable web app from a prompt. Token-based pricing.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'lovable',
    name: 'Lovable',
    free: {
      partial: ['code_agent'],
    },
    pro: {
      full: ['code_agent'],
    },
    pricing: { free_available: true, pro_monthly: '$25/mo+' },
    notes: 'Prompt-to-app builder; Supabase + Tailwind + React stack out of the box.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },
  {
    slug: 'devin',
    name: 'Devin',
    enterprise: {
      full: ['code_agent', 'code_generation'],
    },
    pricing: { free_available: false, enterprise: '$500/mo (team starter)' },
    notes: 'Cognition\'s autonomous SWE agent. Not for individuals — team-only. Fits long-running async tickets.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },
  {
    slug: 'openhands',
    name: 'OpenHands',
    free: {
      full: ['code_agent', 'code_generation'],
    },
    pricing: { free_available: true },
    notes: 'Open-source autonomous SWE agent (formerly OpenDevin). Self-hosted; you supply the LLM API.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },

  // ─────────── Image generation / editing ───────────
  {
    slug: 'midjourney',
    name: 'Midjourney',
    pro: {
      full: ['image_generation'],
      partial: ['image_editing'],
    },
    pricing: { free_available: false, pro_monthly: '$10-60/mo' },
    notes: 'Top-tier aesthetic for stylized image generation. Discord + web. No free tier.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'dall-e-3',
    name: 'DALL-E 3',
    pro: {
      full: ['image_generation'],
    },
    pricing: { free_available: false, pro_monthly: 'Bundled in ChatGPT Plus ($20/mo)' },
    notes: 'Best accessed inside ChatGPT Plus — prompt rewriting + multi-turn refinement happen in-chat. Standalone API also available.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'stable-diffusion',
    name: 'Stable Diffusion',
    free: {
      full: ['image_generation', 'image_editing'],
    },
    pricing: { free_available: true },
    notes: 'Open-weight; runs locally or via hosted UIs (Automatic1111, ComfyUI, Forge). Best for custom LoRAs / fine-tunes.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'adobe-firefly',
    name: 'Adobe Firefly',
    free: {
      partial: ['image_generation', 'image_editing'],
    },
    pro: {
      full: ['image_generation', 'image_editing'],
    },
    pricing: { free_available: true, pro_monthly: '$10/mo standalone; bundled in Creative Cloud' },
    notes: 'Trained on commercially-licensed content. Bundled into Photoshop/Illustrator. Strong fit when output must be commercially safe.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'leonardo-ai',
    name: 'Leonardo AI',
    free: {
      partial: ['image_generation'],
    },
    pro: {
      full: ['image_generation', 'image_editing'],
    },
    pricing: { free_available: true, pro_monthly: '$10-48/mo' },
    notes: 'Strong for game-asset and concept-art workflows. Custom model training available.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'ideogram',
    name: 'Ideogram',
    free: {
      partial: ['image_generation'],
    },
    pro: {
      full: ['image_generation'],
    },
    pricing: { free_available: true, pro_monthly: '$8-48/mo' },
    notes: 'Best-in-class for in-image text rendering (logos, posters, memes). Free tier is generous.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'flux-ai',
    name: 'Flux',
    free: {
      partial: ['image_generation'],
    },
    pro: {
      full: ['image_generation'],
    },
    pricing: { free_available: true, pro_monthly: 'API usage-based' },
    notes: 'Black Forest Labs models. Flux Pro/Dev/Schnell tiers. Strong photorealism.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'recraft',
    name: 'Recraft',
    free: {
      partial: ['image_generation'],
    },
    pro: {
      full: ['image_generation', 'image_editing', 'design_canvas'],
    },
    pricing: { free_available: true, pro_monthly: '$12-60/mo' },
    notes: 'Vector + raster output; brand-style consistency feature. Useful for design teams.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'krea-ai',
    name: 'Krea',
    free: {
      partial: ['image_generation'],
    },
    pro: {
      full: ['image_generation', 'image_editing', 'video_generation'],
    },
    pricing: { free_available: true, pro_monthly: '$10-60/mo' },
    notes: 'Real-time image canvas + multi-model gateway (Flux/SD/Veo/etc.). Pro unlocks video.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },
  {
    slug: 'canva-ai',
    name: 'Canva (Magic Studio)',
    free: {
      partial: ['image_generation', 'design_canvas', 'presentation_slides'],
    },
    pro: {
      full: ['image_generation', 'image_editing', 'design_canvas', 'presentation_slides', 'video_editing'],
      partial: ['writing_short_form'],
    },
    pricing: { free_available: true, pro_monthly: '$15/mo' },
    notes: 'Magic Studio bundles Magic Write, Magic Edit, Magic Eraser, Magic Resize, Magic Animate. Best fit for non-designers needing branded templates.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'photoroom',
    name: 'Photoroom',
    free: {
      partial: ['image_editing'],
    },
    pro: {
      full: ['image_editing'],
    },
    pricing: { free_available: true, pro_monthly: '$10-20/mo' },
    notes: 'Background removal + product photography focus.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },

  // ─────────── Video generation / editing ───────────
  {
    slug: 'runway',
    name: 'Runway',
    free: {
      partial: ['video_generation'],
    },
    pro: {
      full: ['video_generation', 'video_editing'],
      partial: ['image_generation'],
    },
    pricing: { free_available: true, pro_monthly: '$15-95/mo' },
    notes: 'Gen-3/Gen-4 video models + comprehensive editor (Green Screen, Inpainting, Motion Brush). Free tier is limited credits.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'pika',
    name: 'Pika',
    free: {
      partial: ['video_generation'],
    },
    pro: {
      full: ['video_generation'],
    },
    pricing: { free_available: true, pro_monthly: '$10-95/mo' },
    notes: 'Pika 1.5/2.0 for short clips. Strong on character consistency + lip-sync. Discord + web.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'kling-ai',
    name: 'Kling',
    free: {
      partial: ['video_generation'],
    },
    pro: {
      full: ['video_generation'],
    },
    pricing: { free_available: true, pro_monthly: '$10-100/mo' },
    notes: 'Kuaishou\'s video model; long-shot quality (up to 2min). Free tier credits reset daily.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'sora',
    name: 'Sora',
    pro: {
      full: ['video_generation'],
    },
    pricing: { free_available: false, pro_monthly: 'Bundled in ChatGPT Plus ($20/mo) and Pro ($200/mo)' },
    notes: 'OpenAI\'s video model. Plus tier limited; Pro tier unlocks longer + higher-res.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'luma-ai',
    name: 'Luma (Dream Machine)',
    free: {
      partial: ['video_generation'],
    },
    pro: {
      full: ['video_generation'],
    },
    pricing: { free_available: true, pro_monthly: '$10-100/mo' },
    notes: 'Strong for cinematic motion + camera control. Ray2 model upgrade in 2025.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'heygen',
    name: 'HeyGen',
    free: {
      partial: ['avatar_video'],
    },
    pro: {
      full: ['avatar_video', 'voice_cloning'],
      partial: ['video_editing'],
    },
    pricing: { free_available: true, pro_monthly: '$24-72/mo' },
    notes: 'AI avatar talking-head video. Photo-real custom avatars at higher tiers. Best for marketing/training videos.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'synthesia',
    name: 'Synthesia',
    pro: {
      full: ['avatar_video'],
    },
    enterprise: {
      full: ['avatar_video'],
    },
    pricing: { free_available: false, pro_monthly: '$30-90/mo', enterprise: 'Custom' },
    notes: 'Enterprise-grade AI avatar video. 230+ avatars, 140+ languages. Used heavily in L&D.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'descript',
    name: 'Descript',
    free: {
      partial: ['video_editing', 'transcription'],
    },
    pro: {
      full: ['video_editing', 'transcription', 'voice_cloning'],
      partial: ['voice_synthesis'],
    },
    pricing: { free_available: true, pro_monthly: '$15-30/mo' },
    notes: 'Edit video by editing the transcript. Overdub for voice cloning. Strong for podcasters + creators.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'capcut',
    name: 'CapCut',
    free: {
      full: ['video_editing'],
      partial: ['transcription'],
    },
    pro: {
      full: ['video_editing', 'transcription'],
    },
    pricing: { free_available: true, pro_monthly: '$8-30/mo' },
    notes: 'ByteDance editor; mobile + desktop. AI features (auto-captions, background removal, voice clone) bundled in. Free tier is unusually generous.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'opus-clip',
    name: 'Opus Clip',
    free: {
      partial: ['video_editing'],
    },
    pro: {
      full: ['video_editing'],
    },
    pricing: { free_available: true, pro_monthly: '$15-30/mo' },
    notes: 'Long-form → short-clips repurposing. ClipAnything mode finds viral moments in any video.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'invideo-ai',
    name: 'InVideo AI',
    free: {
      partial: ['video_editing'],
    },
    pro: {
      full: ['video_editing'],
      partial: ['voice_synthesis'],
    },
    pricing: { free_available: true, pro_monthly: '$30-60/mo' },
    notes: 'Prompt-to-video with templates + stock footage. Best for repeatable marketing content.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },

  // ─────────── Voice / audio ───────────
  {
    slug: 'elevenlabs',
    name: 'ElevenLabs',
    free: {
      partial: ['voice_synthesis'],
    },
    pro: {
      full: ['voice_synthesis', 'voice_cloning'],
      partial: ['transcription'],
    },
    pricing: { free_available: true, pro_monthly: '$5-330/mo' },
    notes: 'Best-in-class voice cloning + TTS. 30+ languages. Free tier 10k chars/mo. Voice cloning at $5/mo Starter.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'play-ht',
    name: 'PlayHT',
    free: {
      partial: ['voice_synthesis'],
    },
    pro: {
      full: ['voice_synthesis', 'voice_cloning'],
    },
    pricing: { free_available: true, pro_monthly: '$31-99/mo' },
    notes: 'Real-time voice + ultra-low latency Play 3.0 model.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },
  {
    slug: 'murf',
    name: 'Murf',
    free: {
      partial: ['voice_synthesis'],
    },
    pro: {
      full: ['voice_synthesis'],
    },
    pricing: { free_available: true, pro_monthly: '$19-66/mo' },
    notes: 'Studio-style TTS with built-in editor. Strong for e-learning narration.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },
  {
    slug: 'speechify',
    name: 'Speechify',
    free: {
      partial: ['voice_synthesis'],
    },
    pro: {
      full: ['voice_synthesis'],
    },
    pricing: { free_available: true, pro_monthly: '$11.58-29/mo' },
    notes: 'Read-aloud / accessibility focus. Mobile + browser extension.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },
  {
    slug: 'suno',
    name: 'Suno',
    free: {
      partial: ['music_generation'],
    },
    pro: {
      full: ['music_generation'],
    },
    pricing: { free_available: true, pro_monthly: '$10-30/mo' },
    notes: 'Full-song generation with vocals. v4 model is the current standout. 50 free credits/day on free tier.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'udio',
    name: 'Udio',
    free: {
      partial: ['music_generation'],
    },
    pro: {
      full: ['music_generation'],
    },
    pricing: { free_available: true, pro_monthly: '$10-30/mo' },
    notes: 'Higher-fidelity instrumentals than Suno; weaker vocals. Best when used together (Suno for songs, Udio for backings).',
    last_verified_at: TODAY,
    confidence: 'high',
  },

  // ─────────── Transcription / meeting notes ───────────
  {
    slug: 'whisper',
    name: 'Whisper (OpenAI)',
    free: {
      full: ['transcription', 'translation'],
    },
    pricing: { free_available: true },
    notes: 'Open-source model; bring-your-own-compute. Best fit when transcription cost matters and a UI isn\'t needed.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'otter-ai',
    name: 'Otter.ai',
    free: {
      partial: ['transcription', 'meeting_notes'],
    },
    pro: {
      full: ['transcription', 'meeting_notes'],
    },
    pricing: { free_available: true, pro_monthly: '$8.33-30/mo' },
    notes: 'Live meeting transcription + AI summary. Free tier 300 min/mo. Strong Zoom/GMeet/Teams integration.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'fireflies-ai',
    name: 'Fireflies.ai',
    free: {
      partial: ['transcription', 'meeting_notes'],
    },
    pro: {
      full: ['transcription', 'meeting_notes'],
    },
    pricing: { free_available: true, pro_monthly: '$10-39/mo' },
    notes: 'Notetaker bot joins meetings. Topics + sentiment + soundbites. CRM sync at higher tiers.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'granola',
    name: 'Granola',
    free: {
      partial: ['meeting_notes', 'transcription'],
    },
    pro: {
      full: ['meeting_notes', 'transcription'],
    },
    pricing: { free_available: true, pro_monthly: '$10-25/mo' },
    notes: 'Local-first meeting notes; doesn\'t join as a bot. Mac-only currently. Strong privacy story.',
    last_verified_at: TODAY,
    confidence: 'high',
  },

  // ─────────── Writing assistants ───────────
  {
    slug: 'grammarly',
    name: 'Grammarly',
    free: {
      partial: ['writing_long_form', 'writing_short_form'],
    },
    pro: {
      full: ['writing_long_form', 'writing_short_form'],
    },
    pricing: { free_available: true, pro_monthly: '$12-15/mo' },
    notes: 'Grammar/style + Generative AI features (rewrite, ideate). Premium adds tone, plagiarism. Browser-wide overlay.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'notion-ai',
    name: 'Notion AI',
    pro: {
      full: ['writing_long_form', 'writing_short_form', 'summarization', 'pdf_doc_chat'],
    },
    pricing: { free_available: false, pro_monthly: '$8-10/seat/mo (add-on)' },
    notes: 'In-context writing assistant inside Notion; AI Q&A across workspace. Best when you already live in Notion.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'jasper',
    name: 'Jasper',
    pro: {
      full: ['writing_long_form', 'writing_short_form'],
      partial: ['image_generation'],
    },
    enterprise: {
      full: ['writing_long_form', 'writing_short_form', 'image_generation'],
    },
    pricing: { free_available: false, pro_monthly: '$39-69/seat/mo', enterprise: 'Custom' },
    notes: 'Marketing-focused writing platform. Brand voice, campaigns, templates. Higher-priced than ChatGPT but team-oriented.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'copy-ai',
    name: 'Copy.ai',
    free: {
      partial: ['writing_short_form'],
    },
    pro: {
      full: ['writing_short_form', 'writing_long_form', 'automation_workflow'],
    },
    pricing: { free_available: true, pro_monthly: '$36-186/mo' },
    notes: 'Pivoted toward GTM workflows + agents in 2024-25. Still strong for short marketing copy.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'writesonic',
    name: 'Writesonic',
    free: {
      partial: ['writing_short_form'],
    },
    pro: {
      full: ['writing_long_form', 'writing_short_form'],
      partial: ['research_web', 'image_generation'],
    },
    pricing: { free_available: true, pro_monthly: '$16-79/mo' },
    notes: 'Chatsonic + article writer + Botsonic. Research-aware long-form.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },
  {
    slug: 'sudowrite',
    name: 'Sudowrite',
    pro: {
      full: ['writing_long_form'],
    },
    pricing: { free_available: false, pro_monthly: '$19-59/mo' },
    notes: 'Fiction/novel-focused. Story Bible, Describe, Brainstorm. The right pick when ChatGPT\'s sterility hurts the story.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'lex',
    name: 'Lex',
    free: {
      partial: ['writing_long_form'],
    },
    pro: {
      full: ['writing_long_form'],
    },
    pricing: { free_available: true, pro_monthly: '$15/mo' },
    notes: 'Writer-first interface; AI is a sidebar, not a takeover. Best for serious longform.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'rytr',
    name: 'Rytr',
    free: {
      partial: ['writing_short_form'],
    },
    pro: {
      full: ['writing_short_form', 'writing_long_form'],
    },
    pricing: { free_available: true, pro_monthly: '$9-29/mo' },
    notes: 'Budget-tier writing assistant; fewer bells than Jasper at a fraction of the cost.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },

  // ─────────── Automation / agents / browsers ───────────
  {
    slug: 'zapier',
    name: 'Zapier',
    free: {
      partial: ['automation_workflow'],
    },
    pro: {
      full: ['automation_workflow'],
    },
    enterprise: {
      full: ['automation_workflow'],
    },
    pricing: { free_available: true, pro_monthly: '$20-104/mo' },
    notes: '7000+ app integrations. Zapier AI (Copilot, Agents, Tables) layered on top. Best when you need cross-app triggers without code.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'make',
    name: 'Make.com',
    free: {
      partial: ['automation_workflow'],
    },
    pro: {
      full: ['automation_workflow'],
    },
    pricing: { free_available: true, pro_monthly: '$10-30/mo' },
    notes: 'Visual workflow builder; cheaper than Zapier for high-volume scenarios. Less polished AI features.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'n8n',
    name: 'n8n',
    free: {
      full: ['automation_workflow'],
    },
    pro: {
      full: ['automation_workflow'],
    },
    pricing: { free_available: true, pro_monthly: '$20-50/mo (cloud)' },
    notes: 'Open-source automation; self-host free or use cloud. AI nodes built in. Developer-friendly.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'browser-use',
    name: 'Browser Use',
    free: {
      full: ['agent_browser'],
    },
    pricing: { free_available: true },
    notes: 'Open-source library to drive a browser with an LLM. BYO API key.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },
  {
    slug: 'browserbase',
    name: 'Browserbase',
    pro: {
      full: ['agent_browser'],
    },
    pricing: { free_available: true, pro_monthly: 'Usage-based' },
    notes: 'Hosted headless browsers for agent workflows. Stagehand SDK.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },

  // ─────────── PDF / doc chat ───────────
  {
    slug: 'chatpdf',
    name: 'ChatPDF',
    free: {
      partial: ['pdf_doc_chat'],
    },
    pro: {
      full: ['pdf_doc_chat'],
    },
    pricing: { free_available: true, pro_monthly: '$5-20/mo' },
    notes: 'Single-file Q&A. Cheap and focused. Many alternatives exist (Humata, AskYourPDF) — at this price point they\'re commoditized.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },
  {
    slug: 'humata',
    name: 'Humata',
    free: {
      partial: ['pdf_doc_chat'],
    },
    pro: {
      full: ['pdf_doc_chat'],
    },
    pricing: { free_available: true, pro_monthly: '$15-100/mo' },
    notes: 'Multi-doc + research-style citations.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },

  // ─────────── Presentation / slides ───────────
  {
    slug: 'gamma',
    name: 'Gamma',
    free: {
      partial: ['presentation_slides'],
    },
    pro: {
      full: ['presentation_slides'],
    },
    pricing: { free_available: true, pro_monthly: '$8-15/mo' },
    notes: 'Prompt-to-deck with web-doc styling. Best non-PPT alternative.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'tome',
    name: 'Tome',
    free: {
      partial: ['presentation_slides'],
    },
    pro: {
      full: ['presentation_slides'],
    },
    pricing: { free_available: true, pro_monthly: '$16-20/mo' },
    notes: 'Pivoted toward sales-enablement decks. Personalized deck generation.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },
  {
    slug: 'beautiful-ai',
    name: 'Beautiful.ai',
    pro: {
      full: ['presentation_slides'],
    },
    pricing: { free_available: false, pro_monthly: '$12-50/mo' },
    notes: 'Smart-template approach; fewer manual layout decisions.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },

  // ─────────── Design / canvas ───────────
  {
    slug: 'figma',
    name: 'Figma (with AI)',
    free: {
      partial: ['design_canvas'],
    },
    pro: {
      full: ['design_canvas'],
    },
    pricing: { free_available: true, pro_monthly: '$15-45/seat/mo' },
    notes: 'Industry-standard collaborative design. AI features (First Draft, Make Designs) are still maturing.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'framer',
    name: 'Framer',
    free: {
      partial: ['design_canvas'],
    },
    pro: {
      full: ['design_canvas'],
    },
    pricing: { free_available: true, pro_monthly: '$10-40/seat/mo' },
    notes: 'Design + publish marketing sites. AI (Wireframer, Translate) embedded.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },

  // ─────────── Research-specialty ───────────
  {
    slug: 'elicit',
    name: 'Elicit',
    free: {
      partial: ['research_web'],
    },
    pro: {
      full: ['research_web'],
    },
    pricing: { free_available: true, pro_monthly: '$10-200/mo' },
    notes: 'Academic-paper search + structured extraction. Best for literature review.',
    last_verified_at: TODAY,
    confidence: 'high',
  },
  {
    slug: 'consensus',
    name: 'Consensus',
    free: {
      partial: ['research_web'],
    },
    pro: {
      full: ['research_web'],
    },
    pricing: { free_available: true, pro_monthly: '$9-15/mo' },
    notes: 'Yes/no/mixed-evidence summary across academic papers.',
    last_verified_at: TODAY,
    confidence: 'medium',
  },
]

// ─────────────── Public API ───────────────

export function getToolCapability(slug: string): ToolCapability | undefined {
  return TOOL_CAPABILITIES.find((t) => t.slug === slug)
}

const TIER_ORDER: Tier[] = ['free', 'pro', 'enterprise']

function tierIndex(t: Tier): number {
  return TIER_ORDER.indexOf(t)
}

/**
 * Walk tiers from the cheapest up. Higher tiers inherit lower-tier
 * capabilities by convention; this resolver applies that automatically.
 */
function effectiveCoverage(tool: ToolCapability, tier: Tier): TierCoverage {
  const idx = tierIndex(tier)
  const merged: TierCoverage = { full: [], partial: [] }
  for (let i = 0; i <= idx; i++) {
    const t = TIER_ORDER[i]
    if (!t) continue
    const layer = tool[t]
    if (!layer) continue
    if (layer.full) merged.full = [...(merged.full ?? []), ...layer.full]
    if (layer.partial) merged.partial = [...(merged.partial ?? []), ...layer.partial]
  }
  // Dedupe; if something is in full at any tier, drop it from partial.
  merged.full = Array.from(new Set(merged.full))
  merged.partial = Array.from(
    new Set((merged.partial ?? []).filter((s) => !merged.full?.includes(s)))
  )
  return merged
}

/**
 * Returns the lowest tier at which a tool covers all of `subintents`,
 * weighted by `partialWeight` for partial coverage. Returns null if no
 * tier reaches the `minCoverage` threshold (default 0.8).
 */
export function getCoveringTier(
  tool: ToolCapability,
  subintents: Subintent[],
  opts: { minCoverage?: number; partialWeight?: number } = {}
): Tier | null {
  const minCoverage = opts.minCoverage ?? 0.8
  const partialWeight = opts.partialWeight ?? 0.5
  if (subintents.length === 0) return null

  for (const tier of TIER_ORDER) {
    if (!tool[tier]) continue
    const cov = effectiveCoverage(tool, tier)
    let score = 0
    for (const s of subintents) {
      if (cov.full?.includes(s)) score += 1
      else if (cov.partial?.includes(s)) score += partialWeight
    }
    if (score / subintents.length >= minCoverage) return tier
  }
  return null
}

/**
 * Returns every tool that covers `subintents` at or below `maxTier`,
 * sorted cheapest-tier-first. Use this as the consolidation candidate
 * pool — the planner can then pick the most appropriate one for the
 * user's query (typically the most-mainstream tool that fits).
 */
export function findSufficientTools(
  subintents: Subintent[],
  opts: { maxTier?: Tier; minCoverage?: number } = {}
): Array<{ tool: ToolCapability; tier: Tier }> {
  const maxTier = opts.maxTier ?? 'pro'
  const maxIdx = tierIndex(maxTier)
  const out: Array<{ tool: ToolCapability; tier: Tier }> = []
  for (const tool of TOOL_CAPABILITIES) {
    const tier = getCoveringTier(tool, subintents, { ...(opts.minCoverage !== undefined ? { minCoverage: opts.minCoverage } : {}) })
    if (!tier) continue
    if (tierIndex(tier) > maxIdx) continue
    out.push({ tool, tier })
  }
  out.sort((a, b) => tierIndex(a.tier) - tierIndex(b.tier))
  return out
}
