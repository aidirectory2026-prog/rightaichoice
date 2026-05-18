import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  // Used by web-runtime supabase clients (proxy.ts, lib/supabase/{client,middleware,server}.ts)
  // and auth server actions. Optional here so backend scripts that run in
  // GH Actions (where these client-only vars aren't shipped) don't fail
  // validation at module load. Consumers dereference via `process.env.X!`
  // and would throw at their own call-site if the var were ever truly missing.
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
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
  // Phase 7A — Google Search Console keyword mining (OAuth 2.0 path).
  // Service-account keys are blocked by Google's default org policy
  // (iam.disableServiceAccountKeyCreation), so we use OAuth 2.0 user
  // credentials instead. See docs/marketing/10-gsc-keyword-mining.md.
  //
  // GSC_OAUTH_CLIENT_PATH — absolute path to the client_secret_*.json
  // downloaded from GCP Console → Credentials → OAuth 2.0 Client IDs
  // (Desktop application type).
  GSC_OAUTH_CLIENT_PATH: z.string().optional(),
  // GSC_OAUTH_TOKEN_PATH — absolute path where the bootstrap script
  // saves the long-lived refresh_token after the one-time browser flow.
  GSC_OAUTH_TOKEN_PATH: z.string().optional(),
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
