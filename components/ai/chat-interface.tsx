'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, RotateCcw } from 'lucide-react'
import { ChatMessage } from './chat-message'

type ToolMention = {
  slug: string
  name: string
  tagline: string
  pricing: string
  rating: number
  reviewCount: number
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolMentions?: ToolMention[]
}

const SUGGESTIONS = [
  'I need a free AI tool for writing blog posts',
  'What are the best AI tools for video editing?',
  'Find me an AI coding assistant with API access',
  'I want to automate my social media posts',
]

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(text?: string) {
    const message = text ?? input.trim()
    if (!message || isLoading) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Build conversation history for context
      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to get response')
      }

      const data = await res.json()

      // Merge tool data from API with [[tool:slug]] markers in content
      const apiTools: ToolMention[] = data.tools ?? []
      const mentionedSlugs = extractToolSlugs(data.content)

      // Use API-provided tool data, enriching any mentioned slugs
      const toolMap = new Map(apiTools.map((t: ToolMention) => [t.slug, t]))
      const toolMentions = mentionedSlugs
        .map((slug) => toolMap.get(slug))
        .filter((t): t is ToolMention => !!t)

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content,
        toolMentions: toolMentions.length > 0 ? toolMentions : apiTools.slice(0, 5),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          error instanceof Error
            ? `Sorry, I encountered an error: ${error.message}`
            : 'Sorry, something went wrong. Please try again.',
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleReset() {
    setMessages([])
    setInput('')
    inputRef.current?.focus()
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6">
        <div className="mx-auto max-w-3xl py-8">
          {isEmpty ? (
            <EmptyState onSuggestionClick={(s) => handleSubmit(s)} />
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  toolMentions={msg.toolMentions}
                />
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-950 border border-emerald-800/50">
                    <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
                  </div>
                  <div className="rounded-2xl rounded-bl-md bg-zinc-800/80 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <span>Searching tools</span>
                      <span className="flex gap-0.5">
                        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-4 sm:px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-3">
            {messages.length > 0 && (
              <button
                onClick={handleReset}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition-colors"
                title="New conversation"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}

            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What do you want to do with AI?"
                rows={1}
                className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 pr-12 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700/50 transition-colors"
                style={{ minHeight: '44px', maxHeight: '120px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`
                }}
              />
              <button
                onClick={() => handleSubmit()}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <p className="mt-2 text-center text-[11px] text-zinc-600">
            AI recommendations based on our database. Always verify before committing.
          </p>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onSuggestionClick }: { onSuggestionClick: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-950 border border-emerald-800/50 mb-6">
        <Sparkles className="h-8 w-8 text-emerald-400" />
      </div>

      <h2 className="text-xl font-semibold text-white mb-2">AI Tool Finder</h2>
      <p className="text-sm text-zinc-500 max-w-md text-center mb-8">
        Tell me what you&apos;re trying to do and I&apos;ll recommend the best AI tools
        from our database. I can filter by pricing, skill level, platform, and more.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-left text-sm text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-200 transition-all duration-200"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}

function extractToolSlugs(content: string): string[] {
  const regex = /\[\[tool:([^\]]+)\]\]/g
  const slugs: string[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    const slug = match[1].trim()
    if (!slugs.includes(slug)) slugs.push(slug)
  }
  return slugs
}
