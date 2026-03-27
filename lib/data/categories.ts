import { createClient } from '@/lib/supabase/server'

export async function getCategories() {
  const supabase = await createClient()

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
