// Phase 10.4.1 — Resources / learning guide placeholder. The real
// auto-generated event dictionary + learning guide ships in Phase 8.
import { BookOpen } from 'lucide-react'

export const metadata = { title: 'Learning guide — Admin' }

export default function ResourcesPage() {
  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-white">Learning guide</h1>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-10 text-center">
        <BookOpen className="mx-auto h-8 w-8 text-zinc-600" aria-hidden />
        <p className="mt-4 text-sm font-medium text-zinc-300">Coming in Phase 8</p>
        <p className="mx-auto mt-2 max-w-md text-xs text-zinc-500">
          The learning guide — an auto-generated event dictionary (plain-English +
          technical descriptions from the schema registry) plus how-to docs for every
          admin surface — lands in Phase 8 of the analytics redesign.
        </p>
      </div>
    </div>
  )
}
