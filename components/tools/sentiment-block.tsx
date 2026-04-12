import { SentimentBlockClient } from './sentiment-block-client'
import { SentimentBlockRender, type SentimentRenderData } from './sentiment-block-render'
import { createClient } from '@/lib/supabase/server'

type SentimentRow = SentimentRenderData & {
  tool_id: string
  status: 'ready' | 'generating' | 'failed' | string
  expires_at: string
}

type Props = {
  toolId: string
  toolSlug: string
  toolName: string
  viewCount: number
}

const MIN_VIEWS_FOR_AUTO_GEN = 10

export async function SentimentBlock({ toolId, toolSlug, toolName, viewCount }: Props) {
  const supabase = await createClient()

  const { data: cached } = await supabase
    .from('tool_sentiment_cache')
    .select('tool_id, status, expires_at, ai_verdict, pros, cons, sentiment_score, sentiment_breakdown, themes, learning_curve, pricing_analysis, mention_count, sources_scraped')
    .eq('tool_id', toolId)
    .maybeSingle() as { data: SentimentRow | null }

  const isFresh = cached && cached.status === 'ready' && new Date(cached.expires_at) > new Date()

  // No fresh data — hand off to client component for generate/poll flow
  if (!cached || !isFresh) {
    return (
      <SentimentBlockClient
        slug={toolSlug}
        toolName={toolName}
        autoGenerate={viewCount >= MIN_VIEWS_FOR_AUTO_GEN}
        initialStatus={cached?.status === 'generating' ? 'generating' : 'idle'}
      />
    )
  }

  return <SentimentBlockRender data={cached} slug={toolSlug} toolName={toolName} />
}
