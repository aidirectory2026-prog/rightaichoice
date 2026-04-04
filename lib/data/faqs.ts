import { createClient } from '@/lib/supabase/server'

export interface ToolFaq {
  id: string
  question: string
  answer: string
  source: string | null
  sort_order: number
}

export async function getFaqsForTool(toolId: string): Promise<ToolFaq[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tool_faqs')
    .select('id, question, answer, source, sort_order')
    .eq('tool_id', toolId)
    .order('sort_order', { ascending: true })

  return data ?? []
}
