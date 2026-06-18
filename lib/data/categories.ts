import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'

export async function getCategories() {
  // Cowork QA: public data — use the cookie-free admin client so callers (the
  // homepage especially) can be statically cached. createClient() reads cookies,
  // which forces the whole route to render dynamically. Cast to the typed server
  // client so query results keep their schema types (getAdminClient is untyped).
  const supabase = getAdminClient() as Awaited<ReturnType<typeof createClient>>

  const { data } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  return data ?? []
}

export async function getCategoryBySlug(slug: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single()

  return data
}
