import { SupabaseClient } from '@supabase/supabase-js'
import { getAnthropicClient } from '@/lib/ai/anthropic'
import { gatherFaqSources } from './faq-sources'
import { z } from 'zod'

const faqSchema = z.array(
  z.object({
    question: z.string(),
    answer: z.string(),
    source: z.string(),
  })
)

export async function runFaqRefresh(supabase: SupabaseClient) {
  const runId = crypto.randomUUID()

  // Get 20 tools — prioritize those with no FAQs, then oldest updated
  const { data: tools } = await supabase
    .from('tools')
    .select('id, name, slug')
    .eq('is_published', true)
    .order('updated_at', { ascending: true })
    .limit(20)

  if (!tools) return { runId, processed: 0 }

  const client = getAnthropicClient()
  let processed = 0

  for (const tool of tools) {
    try {
      // Gather pain points from multiple sources
      const sources = await gatherFaqSources(tool.name)
      const sourceText = sources.map(s => `[${s.source}]: ${s.content}`).join('\n\n')

      const prompt = `Based on the following user discussions and reviews about "${tool.name}", generate 5-8 FAQs that address real user pain points and common questions.

Source data:
${sourceText || `No external data found. Generate FAQs based on your knowledge of ${tool.name}.`}

Return a JSON array of objects with:
- question: A specific, actionable question users actually ask
- answer: A helpful, accurate 2-4 sentence answer
- source: The primary source ("reddit", "g2", "producthunt", or "ai_generated")

Focus on: pricing confusion, feature limitations, comparison with alternatives, setup issues, integrations, and common use cases.
Only output valid JSON array.`

      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const faqs = faqSchema.parse(JSON.parse(text))

      // Delete existing FAQs and insert fresh ones
      await supabase.from('tool_faqs').delete().eq('tool_id', tool.id)

      const faqRows = faqs.map((faq, i) => ({
        tool_id: tool.id,
        question: faq.question,
        answer: faq.answer,
        source: faq.source,
        sort_order: i,
        updated_at: new Date().toISOString(),
      }))

      await supabase.from('tool_faqs').insert(faqRows)
      processed++
    } catch (e) {
      console.error(`[faqs:${runId}] Failed for ${tool.slug}:`, e)
    }
  }

  console.log(`[faqs:${runId}] Updated FAQs for ${processed}/${tools.length} tools`)
  return { runId, processed, total: tools.length }
}
