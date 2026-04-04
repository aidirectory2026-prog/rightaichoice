import { SupabaseClient } from '@supabase/supabase-js'
import { getAnthropicClient } from '@/lib/ai/anthropic'
import { fetchPageText } from './scrape'

export async function runEditorialGeneration(supabase: SupabaseClient) {
  const runId = crypto.randomUUID()

  // Get tools missing our_views
  const { data: tools } = await supabase
    .from('tools')
    .select('id, name, slug, website_url, tagline, description, pricing_type, features, best_for, not_for')
    .eq('is_published', true)
    .is('our_views', null)
    .limit(20)

  if (!tools || tools.length === 0) {
    // All tools have views — refresh oldest
    const { data: stale } = await supabase
      .from('tools')
      .select('id, name, slug, website_url, tagline, description, pricing_type, features, best_for, not_for')
      .eq('is_published', true)
      .order('our_views_generated_at', { ascending: true, nullsFirst: true })
      .limit(20)
    if (!stale) return { runId, processed: 0 }
    return processEditorials(supabase, stale, runId)
  }

  return processEditorials(supabase, tools, runId)
}

async function processEditorials(
  supabase: SupabaseClient,
  tools: {
    id: string; name: string; slug: string; website_url: string;
    tagline: string; description: string; pricing_type: string;
    features: string[]; best_for: string[]; not_for: string[]
  }[],
  runId: string
) {
  const client = getAnthropicClient()
  let processed = 0

  for (const tool of tools) {
    try {
      let pageText = ''
      try {
        pageText = await fetchPageText(tool.website_url)
      } catch { /* continue without */ }

      const prompt = `Write a 200-400 word editorial "Our Views" section for the AI tool "${tool.name}".

Tool info:
- Tagline: ${tool.tagline}
- Description: ${tool.description?.slice(0, 500)}
- Pricing: ${tool.pricing_type}
- Features: ${tool.features?.join(', ') || 'N/A'}
- Best for: ${tool.best_for?.join(', ') || 'N/A'}
- Not for: ${tool.not_for?.join(', ') || 'N/A'}
- Website content: ${pageText.slice(0, 3000)}

Write in a professional, opinionated editorial voice. Cover:
1. What makes this tool stand out (or not)
2. Who benefits most from it
3. Honest assessment of limitations
4. How it compares to the broader AI tools landscape
5. Our recommendation

Be specific, not generic. Reference actual features. Use short paragraphs.
Return ONLY the editorial text, no JSON, no headers.`

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      })

      const editorial = response.content[0].type === 'text' ? response.content[0].text : ''

      if (editorial.length > 100) {
        await supabase
          .from('tools')
          .update({
            our_views: editorial,
            our_views_generated_at: new Date().toISOString(),
          })
          .eq('id', tool.id)
        processed++
      }
    } catch (e) {
      console.error(`[editorial:${runId}] Failed for ${tool.slug}:`, e)
    }
  }

  console.log(`[editorial:${runId}] Generated ${processed}/${tools.length} editorials`)
  return { runId, processed, total: tools.length }
}
