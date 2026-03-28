import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/navbar'
import { ChatInterface } from '@/components/ai/chat-interface'

export const metadata: Metadata = {
  title: 'AI Tool Finder — Chat',
  description:
    'Tell us what you want to do and our AI will recommend the best tools from our database. Natural language search powered by Claude.',
}

export default function AIChatPage() {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <ChatInterface />
    </div>
  )
}
