import { getAnthropicClient } from '@/lib/ai/anthropic'
import { SYSTEM_PROMPT, TOOL_DEFINITIONS } from '@/lib/ai/system-prompt'
import { searchToolsForAI, type AISearchParams, type AIToolResult } from '@/lib/data/ai-search'
import type Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

const MAX_TOOL_ROUNDS = 3
const MODEL = 'claude-sonnet-4-6'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { messages } = body as { messages: ChatMessage[] }

    if (!messages || messages.length === 0) {
      return Response.json({ error: 'Messages are required' }, { status: 400 })
    }

    const anthropic = getAnthropicClient()

    // Convert chat messages to Anthropic format
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    // Collect all tools found during the conversation
    const foundTools: AIToolResult[] = []

    // Tool-use loop: Claude may call search_tools one or more times
    let currentMessages = [...anthropicMessages]
    let rounds = 0

    while (rounds < MAX_TOOL_ROUNDS) {
      rounds++

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOL_DEFINITIONS,
        messages: currentMessages,
      })

      // Check if response contains tool use
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      )

      if (toolUseBlocks.length === 0) {
        // No tool use — extract text and return with tool data
        const textContent = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('')

        // Deduplicate tools by slug
        const uniqueTools = new Map<string, AIToolResult>()
        for (const tool of foundTools) {
          uniqueTools.set(tool.slug, tool)
        }

        return Response.json({
          role: 'assistant',
          content: textContent,
          tools: Array.from(uniqueTools.values()).map((t) => ({
            slug: t.slug,
            name: t.name,
            tagline: t.tagline,
            pricing: t.pricing_type,
            rating: t.avg_rating,
            reviewCount: t.review_count,
          })),
        })
      }

      // Execute tool calls and add results
      const assistantContent = response.content
      currentMessages = [
        ...currentMessages,
        { role: 'assistant' as const, content: assistantContent },
      ]

      for (const toolBlock of toolUseBlocks) {
        const input = toolBlock.input as AISearchParams
        const results = await searchToolsForAI(input)
        foundTools.push(...results)

        currentMessages.push({
          role: 'user' as const,
          content: [
            {
              type: 'tool_result' as const,
              tool_use_id: toolBlock.id,
              content: JSON.stringify({
                tools_found: results.length,
                tools: results.map((t) => ({
                  name: t.name,
                  slug: t.slug,
                  tagline: t.tagline,
                  description: t.description.slice(0, 200),
                  pricing: t.pricing_type,
                  skill_level: t.skill_level,
                  rating: t.avg_rating,
                  reviews: t.review_count,
                  has_api: t.has_api,
                  platforms: t.platforms,
                  categories: t.categories,
                  tags: t.tags,
                })),
              }),
            },
          ],
        })
      }
    }

    return Response.json({
      role: 'assistant',
      content: "I found some tools but couldn't fully process the results. Please try rephrasing your question.",
      tools: [],
    })
  } catch (error) {
    console.error('Chat API error:', error)
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred'
    return Response.json({ error: message }, { status: 500 })
  }
}
