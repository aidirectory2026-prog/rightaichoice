import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Sparkles, User, CalendarDays } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { WorkflowStepDisplay } from '@/components/workflows/workflow-step-display'
import { WorkflowVoteButton } from '@/components/workflows/workflow-vote-button'
import { getWorkflowById, hasVotedOnWorkflow } from '@/lib/data/workflows'
import { createClient } from '@/lib/supabase/server'
import { timeAgo } from '@/lib/utils'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const workflow = await getWorkflowById(id)
  if (!workflow) return { title: 'Workflow Not Found' }

  return {
    title: `${workflow.title} — RightAIChoice`,
    description: workflow.description,
  }
}

export default async function WorkflowDetailPage({ params }: Props) {
  const { id } = await params
  const workflow = await getWorkflowById(id)
  if (!workflow) notFound()

  // Get current user to check vote status
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const voted = user ? await hasVotedOnWorkflow(id, user.id) : false

  // Tool set used in this workflow
  const toolSet = [...new Map(workflow.steps.map((s) => [s.tool_slug, s])).values()]

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-zinc-950">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
          {/* Back nav */}
          <Link
            href="/workflows"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All Workflows
          </Link>

          {/* Header */}
          <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {workflow.is_ai_generated && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-800/50 bg-emerald-950/30 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  <Sparkles className="h-3 w-3" />
                  AI Generated
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-zinc-600">
                <CalendarDays className="h-3 w-3" />
                {timeAgo(workflow.created_at)}
              </span>
              {workflow.profile?.username && (
                <Link
                  href={`/u/${workflow.profile.username}`}
                  className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <User className="h-3 w-3" />
                  {workflow.profile.username}
                </Link>
              )}
            </div>

            <h1 className="text-2xl font-bold text-white">{workflow.title}</h1>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{workflow.description}</p>

            {/* Goal */}
            <div className="mt-4 rounded-lg bg-zinc-800/50 px-3 py-2">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Goal</span>
              <p className="mt-0.5 text-sm text-zinc-300">{workflow.goal}</p>
            </div>
          </div>

          {/* Steps */}
          <div className="mb-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              {workflow.steps.length} Steps
            </h2>
            <WorkflowStepDisplay steps={workflow.steps} />
          </div>

          {/* Tools used */}
          {toolSet.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Tools Used
              </h2>
              <div className="flex flex-wrap gap-2">
                {toolSet.map((step) => (
                  <Link
                    key={step.tool_slug}
                    href={`/tools/${step.tool_slug}`}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
                  >
                    {step.tool_name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Vote */}
          <div className="flex items-center gap-4 pt-4 border-t border-zinc-800">
            <WorkflowVoteButton
              workflowId={workflow.id}
              initialUpvotes={workflow.upvotes}
              initialVoted={voted}
            />
            <Link
              href="/workflows/generate"
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Generate your own →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
