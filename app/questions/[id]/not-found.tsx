import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default function QuestionNotFound() {
  return (
    <>
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-24">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            Question not found
          </h1>
          <p className="text-sm text-zinc-500 mb-6">
            This question may have been removed or doesn&apos;t exist.
          </p>
          <Link
            href="/questions"
            className="inline-flex rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
          >
            Browse Questions
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
