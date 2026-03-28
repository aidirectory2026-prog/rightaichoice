'use server'

import { searchTools, logSearch } from '@/lib/data/tools'
import { createClient } from '@/lib/supabase/server'

export async function autocompleteSearch(query: string) {
  const term = query.trim()
  if (term.length < 2) return { tools: [], categories: [], tags: [] }
  return searchTools(term)
}

export async function recordSearch(query: string, resultCount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await logSearch(query, resultCount, user?.id)
}
