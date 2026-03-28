'use server'

import { createClient } from '@/lib/supabase/server'
import { saveComparison } from '@/lib/data/comparisons'

export async function saveComparisonAction(
  toolSlugs: string[],
  toolIds: string[]
): Promise<{ slug: string | null; error: string | null }> {
  if (toolSlugs.length < 2 || toolSlugs.length > 3) {
    return { slug: null, error: 'Select 2 or 3 tools to compare' }
  }

  const comparisonSlug = toolSlugs.sort().join('-vs-')

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const slug = await saveComparison(toolIds, comparisonSlug, user?.id)
    return { slug, error: null }
  } catch {
    return { slug: null, error: 'Failed to save comparison' }
  }
}
