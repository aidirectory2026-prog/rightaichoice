import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

let adminClient: ReturnType<typeof createClient> | null = null

export function getAdminClient() {
  if (!adminClient) {
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
    }
    adminClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return adminClient
}
