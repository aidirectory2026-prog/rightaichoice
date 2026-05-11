import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  ANTHROPIC_API_KEY: z.string().optional(),
  // DeepSeek V3 — used for all data-layer synthesis (Phase 4 SOP +
  // Phase 7 generation). OpenAI-compatible endpoint at api.deepseek.com.
  // ~10x cheaper than Sonnet for comparable quality on structured tasks.
  DEEPSEEK_API_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  NEXT_PUBLIC_MIXPANEL_TOKEN: z.string().optional(),
  NEXT_PUBLIC_MIXPANEL_API_HOST: z.string().url().optional(),
  NEXT_PUBLIC_MIXPANEL_PROXY_PATH: z.string().optional(),
  MIXPANEL_PROJECT_ID: z.string().optional(),
  MIXPANEL_REGION: z.enum(['us', 'eu']).optional(),
  MIXPANEL_API_HOST: z.string().url().optional(),
  MIXPANEL_DATA_API_HOST: z.string().url().optional(),
  MIXPANEL_SERVICE_ACCOUNT_USERNAME: z.string().optional(),
  MIXPANEL_SERVICE_ACCOUNT_SECRET: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  // Phase 7A — Google Search Console keyword mining. Path is the
  // absolute file path to a service-account JSON key with
  // webmasters.readonly scope. See docs/marketing/10-gsc-keyword-mining.md.
  GSC_SERVICE_ACCOUNT_KEY_PATH: z.string().optional(),
  // GSC site identifier — `sc-domain:rightaichoice.com` for a domain
  // property (recommended) or `https://rightaichoice.com/` for a
  // URL-prefix property. Default is the domain form.
  GSC_SITE_URL: z.string().optional(),
})

function validateEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const errors = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    throw new Error(`❌ Missing or invalid environment variables:\n${errors.join('\n')}`)
  }
  return result.data
}

export const env = validateEnv()
