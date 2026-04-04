import { SupabaseClient } from '@supabase/supabase-js'
import { getAnthropicClient } from '@/lib/ai/anthropic'
import { fetchPageText } from './scrape'
import { z } from 'zod'

const refreshSchema = z.object({
  description: z.string().max(2000),
  pricing_type: z.enum(['free', 'freemium', 'paid', 'contact']),
  features: z.array(z.string()).max(15),
  integrations: z.array(z.string()).max(15),
  best_for: z.array(z.string()).max(5),
  not_for: z.array(z.string()).max(5),
  editorial_verdict: z.string().max(500),
})

interface RefreshResult {
  runId: string
  processed: number
  refreshed: number
  failed: number
}

export async function runRefresh(supabase: SupabaseClient): Promise<RefreshResult> {
  const runId = crypto.randomUUID()
  const result: RefreshResult = { runId, processed: 0, refreshed: 0, failed: 0 }

  // Select 15 tools with oldest last_verified_at
  const { data: tools, error } = await supabase
    .from('tools')
    .select('id, slug, name, website_url, github_url')
    .eq('is_published', true)
    .order('last_verified_at', { ascending: true, nullsFirst: true })
    .limit(15)

  if (error || !tools) {
    console.error('Failed to fetch tools for refresh:', error)
    return result
  }

  const client = getAnthropicClient()

  for (const tool of tools) {
    const start = Date.now()
    result.processed++

    try {
      let pageText = ''
      try {
        pageText = await fetchPageText(tool.website_url)
      } catch {
        // Continue with just the name
      }

      // Fetch GitHub stars if applicable
      let githubStars: number | null = null
      if (tool.github_url) {
        try {
          const repoPath = new URL(tool.github_url).pathname.slice(1)
          const ghRes = await fetch(`https://api.github.com/repos/${repoPath}`, {
            headers: { 'Accept': 'application/vnd.github.v3+json' },
          })
          if (ghRes.ok) {
            const ghData = await ghRes.json()
            githubStars = ghData.stargazers_count
          }
        } catch {
          // Skip GitHub stars update
        }
      }

      const prompt = `Analyze this AI tool and provide updated metadata.

Tool: ${tool.name}
Website: ${tool.website_url}
Website content (first 8000 chars): ${pageText}

Return JSON with:
- description: 2-4 paragraph detailed description (max 2000 chars)
- pricing_type: "free" | "freemium" | "paid" | "contact"
- features: Array of key features (max 15)
- integrations: Array of integrations (max 15)
- best_for: Ideal use cases (max 5)
- not_for: When NOT to use this (max 5)
- editorial_verdict: Opinionated 2-3 sentence take

Only output valid JSON.`

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const parsed = refreshSchema.parse(JSON.parse(text))

      const fieldsUpdated: string[] = ['description', 'pricing_type', 'features', 'integrations', 'best_for', 'not_for', 'editorial_verdict']

      const updateData: Record<string, unknown> = {
        ...parsed,
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (githubStars !== null) {
        updateData.github_stars = githubStars
        updateData.last_github_sync = new Date().toISOString()
        fieldsUpdated.push('github_stars')
      }

      const { error: updateError } = await supabase
        .from('tools')
        .update(updateData)
        .eq('id', tool.id)

      const duration = Date.now() - start

      if (updateError) throw updateError

      result.refreshed++
      await supabase.from('refresh_logs').insert({
        run_id: runId,
        tool_id: tool.id,
        tool_slug: tool.slug,
        status: 'refreshed',
        fields_updated: fieldsUpdated,
        duration_ms: duration,
      })
    } catch (e) {
      result.failed++
      await supabase.from('refresh_logs').insert({
        run_id: runId,
        tool_id: tool.id,
        tool_slug: tool.slug,
        status: 'failed',
        error_message: e instanceof Error ? e.message : 'Unknown error',
        duration_ms: Date.now() - start,
      })
    }
  }

  console.log(`[refresh:${runId}] Done: ${result.refreshed} refreshed, ${result.failed} failed`)
  return result
}
