import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import type { WorkflowStep } from '@/types'

type Props = {
  steps: WorkflowStep[]
}

const STEP_COLORS = [
  'border-emerald-800/60 bg-emerald-950/20',
  'border-blue-800/60 bg-blue-950/20',
  'border-purple-800/60 bg-purple-950/20',
  'border-amber-800/60 bg-amber-950/20',
  'border-rose-800/60 bg-rose-950/20',
  'border-cyan-800/60 bg-cyan-950/20',
]

const STEP_BADGE_COLORS = [
  'bg-emerald-700 text-emerald-100',
  'bg-blue-700 text-blue-100',
  'bg-purple-700 text-purple-100',
  'bg-amber-700 text-amber-100',
  'bg-rose-700 text-rose-100',
  'bg-cyan-700 text-cyan-100',
]

export function WorkflowStepDisplay({ steps }: Props) {
  return (
    <ol className="space-y-4">
      {steps.map((step, i) => {
        const color = STEP_COLORS[i % STEP_COLORS.length]
        const badge = STEP_BADGE_COLORS[i % STEP_BADGE_COLORS.length]
        return (
          <li key={step.step} className="flex gap-4">
            {/* Connector line */}
            <div className="flex flex-col items-center">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badge}`}>
                {step.step}
              </span>
              {i < steps.length - 1 && (
                <div className="mt-1 flex-1 w-px bg-zinc-700" />
              )}
            </div>

            {/* Content */}
            <div className={`mb-4 flex-1 rounded-xl border p-4 ${color}`}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-white text-sm">{step.name}</h3>
                <Link
                  href={`/tools/${step.tool_slug}`}
                  className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors flex items-center gap-1"
                >
                  {step.tool_name}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <p className="mt-1.5 text-sm text-zinc-400">{step.description}</p>
              {step.why && (
                <div className="mt-2.5 flex items-start gap-1.5">
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-zinc-500" />
                  <p className="text-xs text-zinc-500 italic">{step.why}</p>
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
