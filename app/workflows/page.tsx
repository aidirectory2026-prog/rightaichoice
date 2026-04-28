import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles, Plus } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { WorkflowCard } from '@/components/workflows/workflow-card'
import { getWorkflows } from '@/lib/data/workflows'

export const metadata: Metadata = {
  title: 'AI Workflows',
  description:
    'Browse community AI tool workflows — step-by-step pipelines for content creation, coding, design, and more.',
}

export default async function WorkflowsPage() {
  const workflows = await getWorkflows(24)

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">AI Workflows</h1>
              <p className="mt-1 text-zinc-400 text-sm">
                Step-by-step tool stacks for real-world goals. Generate yours or browse community workflows.
              </p>
            </div>
            <Link
              href="/workflows/generate"
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors shrink-0"
            >
              <Plus className="h-4 w-4" />
              Generate Workflow
            </Link>
          </div>

          {workflows.length === 0 ? (
            /* Empty state */
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-16 text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800">
                <Sparkles className="h-6 w-6 text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">No workflows yet</h2>
              <p className="mt-2 text-zinc-500 text-sm max-w-xs mx-auto">
                Be the first to generate and save an AI workflow for the community.
              </p>
              <Link
                href="/workflows/generate"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Generate the First Workflow
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
