'use client'

import { Bot, User } from 'lucide-react'
import { ToolCardInline } from './tool-card-inline'

type ToolMention = {
  slug: string
  name: string
  tagline: string
  pricing: string
  rating: number
  reviewCount: number
}

type Props = {
  role: 'user' | 'assistant'
  content: string
  toolMentions?: ToolMention[]
}

export function ChatMessage({ role, content, toolMentions }: Props) {
  const isUser = role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-950 border border-emerald-800/50">
          <Bot className="h-4 w-4 text-emerald-400" />
        </div>
      )}

      <div className={`max-w-[85%] space-y-3 ${isUser ? 'order-first' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-emerald-600 text-white rounded-br-md'
              : 'bg-zinc-800/80 text-zinc-200 rounded-bl-md'
          }`}
        >
          <MarkdownContent content={content} />
        </div>

        {/* Tool cards rendered below the message */}
        {toolMentions && toolMentions.length > 0 && (
          <div className="space-y-2">
            {toolMentions.map((tool) => (
              <ToolCardInline
                key={tool.slug}
                slug={tool.slug}
                name={tool.name}
                tagline={tool.tagline}
                pricing={tool.pricing}
                rating={tool.rating}
                reviewCount={tool.reviewCount}
              />
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700">
          <User className="h-4 w-4 text-zinc-400" />
        </div>
      )}
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown rendering — bold, bullets, links
  const lines = content.split('\n')

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />

        // Remove [[tool:slug]] markers (they're rendered as cards)
        const cleaned = line.replace(/\[\[tool:[^\]]+\]\]/g, '').trim()
        if (!cleaned) return null

        // Bullet points
        if (cleaned.startsWith('- ') || cleaned.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-emerald-400 mt-0.5">&#8226;</span>
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(cleaned.slice(2)) }} />
            </div>
          )
        }

        // Headers
        if (cleaned.startsWith('## ')) {
          return (
            <p key={i} className="font-semibold text-white mt-3 mb-1">
              {cleaned.slice(3)}
            </p>
          )
        }
        if (cleaned.startsWith('# ')) {
          return (
            <p key={i} className="font-bold text-white text-base mt-3 mb-1">
              {cleaned.slice(2)}
            </p>
          )
        }

        // Numbered list
        const numberedMatch = cleaned.match(/^(\d+)\.\s(.+)/)
        if (numberedMatch) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-emerald-400 min-w-[1.2em]">{numberedMatch[1]}.</span>
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(numberedMatch[2]) }} />
            </div>
          )
        }

        return <p key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(cleaned) }} />
      })}
    </div>
  )
}

function inlineFormat(text: string): string {
  // Bold
  let result = text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
  // Italic
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // Inline code
  result = result.replace(/`(.+?)`/g, '<code class="rounded bg-zinc-700 px-1 py-0.5 text-xs text-emerald-300">$1</code>')
  return result
}
