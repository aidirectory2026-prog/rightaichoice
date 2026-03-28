import type { Metadata } from 'next'
import { Sparkles } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { WorkflowGenerator } from '@/components/workflows/workflow-generator'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Workflow Generator — RightAIChoice',
  description:
    'Describe your goal and get an AI-generated multi-step workflow with the best tools for each step.',
}

export default async function WorkflowGeneratePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-zinc-950 px-4 py-16">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-800/50 bg-emerald-950/30 px-4 py-1.5 text-xs font-medium text-emerald-400">
              <Sparkles className="h-3 w-3" />
              AI Workflow Generator
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Build your AI tool stack
            </h1>
            <p className="mt-3 text-zinc-400 max-w-lg mx-auto">
              Describe what you want to accomplish. Get a step-by-step workflow
              with the right AI tool for each stage.
            </p>
          </div>

          <WorkflowGenerator isAuthenticated={!!user} />
        </div>
      </main>
    </>
  )
}
