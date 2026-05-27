/**
 * Phase 9 Tier-1 (2026-05-27): per-page <title> override lookup.
 *
 * Called from generateMetadata in /tools, /compare, /blog. If an active
 * override exists (no reverted_at), it replaces the generated title via
 * the Metadata `title.absolute` field — which bypasses the layout's
 * `template: '%s | RightAIChoice'` suffix, since our DeepSeek prompt
 * already includes that suffix in suggestions.
 *
 * Designed to be a cheap, one-row query. Failure is treated as "no
 * override" — never block a page render on this lookup.
 *
 * See: supabase/migrations/111_title_overrides.sql.
 */
import { createClient } from '@/lib/supabase/server'

export async function getTitleOverride(pagePath: string): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('title_overrides')
      .select('override_title')
      .eq('page_path', pagePath)
      .is('reverted_at', null)
      .maybeSingle()
    return (data as { override_title: string } | null)?.override_title ?? null
  } catch {
    // Network/auth/table-missing — degrade silently. Page keeps its
    // generated title; the override system is non-critical.
    return null
  }
}
