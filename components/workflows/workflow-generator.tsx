'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Sparkles, Loader2, RotateCcw, BookmarkPlus, Check, AlertCircle } from 'lucide-react'
import { WorkflowStepDisplay } from '@/components/workflows/workflow-step-display'
import { saveWorkflowAction } from '@/actions/workflows'
import { analytics } from '@/lib/analytics'
import type { WorkflowStep } from '@/types'

type GeneratedWorkflow = {
  title: string
  description: string
  goal: string
  steps: WorkflowStep[]
}

const EXAMPLE_GOALS = [
  'Create a YouTube video from scratch',
  'Launch a product landing page',
  'Write and publish a blog post',
  'Build a mobile app with no code',
  'Create a podcast episode',
  'Design a marketing campaign',
]

export function WorkflowGenerator({ isAuthenticated = true }: { isAuthenticated?: boolean }) {
  const [goal, setGoal] = useState('')
  const [workflow, setWorkflow] = useState<GeneratedWorkflow | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleGenerate(goalText?: string) {
    const target = goalText ?? goal.trim()
    if (!target || loading) return

    setLoading(true)
    setError('')
    setWorkflow(null)
    setSavedId(null)
    setSaveError('')

    try {
      const res = await fetch('/api/workflows/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: target }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error ?? 'Generation failed. Please try again.')
        return
      }

      const generated = data as GeneratedWorkflow
      setWorkflow(generated)
      analytics.workflowGenerated(target, generated.steps.length)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleSave() {
    if (!workflow) return
    startTransition(async () => {
      setSaveError('')
      const result = await saveWorkflowAction({
        title: workflow.title,
        description: workflow.description,
        goal: workflow.goal,
        steps: workflow.steps,
      })

      if ('error' in result) {
        setSaveError(result.error)
      } else {
        setSavedId(result.id)
        analytics.workflowSaved(result.id)
      }
    })
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-10 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-950 border border-emerald-800">
          <Sparkles className="h-6 w-6 text-emerald-400" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Sign in to use the Workflow Generator</h2>
        <p className="text-sm text-zinc-400 mb-6 max-w-sm mx-auto">
          Create AI-powered multi-step tool workflows. Free with a RightAIChoice account.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white transition-colors"
          >
            Create free account
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-zinc-700 hover:border-zinc-600 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Input area */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Describe what you want to accomplish…"
            rows={3}
            className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none transition-colors"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleGenerate()
              }
            }}
          />
          <span className="absolute bottom-3 right-3 text-[10px] text-zinc-600">⌘↵ to generate</span>
        </div>

        <button
          onClick={() => handleGenerate()}
          disabled={!goal.trim() || loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating workflow…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Workflow
            </>
          )}
        </button>

        {/* Example goals */}
        {!workflow && !loading && (
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-600 uppercase tracking-wider">Try an example</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_GOALS.map((eg) => (
                <button
                  key={eg}
                  onClick={() => {
                    setGoal(eg)
                    handleGenerate(eg)
                  }}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
                >
                  {eg}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/20 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="mb-6 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3 animate-pulse">
            <div className="h-5 w-2/3 rounded bg-zinc-800" />
            <div className="h-4 w-full rounded bg-zinc-800" />
            <div className="h-4 w-4/5 rounded bg-zinc-800" />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-zinc-800" />
              <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-2 animate-pulse">
                <div className="h-4 w-1/3 rounded bg-zinc-800" />
                <div className="h-3 w-full rounded bg-zinc-800" />
                <div className="h-3 w-3/4 rounded bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generated workflow */}
      {workflow && !loading && (
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-5">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              AI Generated Workflow
            </div>
            <h2 className="text-xl font-bold text-white">{workflow.title}</h2>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{workflow.description}</p>
          </div>

          {/* Steps */}
          <WorkflowStepDisplay steps={workflow.steps} />

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {savedId ? (
              <Link
                href={`/workflows/${savedId}`}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                <Check className="h-4 w-4" />
                Saved — View Workflow
              </Link>
            ) : (
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-600 hover:text-white disabled:opacity-50 transition-colors"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BookmarkPlus className="h-4 w-4" />
                )}
                Save Workflow
              </button>
            )}
            <button
              onClick={() => handleGenerate()}
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Regenerate
            </button>
          </div>

          {saveError && (
            <p className="text-sm text-red-400">{saveError}</p>
          )}
        </div>
      )}
    </div>
  )
}
