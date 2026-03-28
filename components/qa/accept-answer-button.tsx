'use client'

import { useTransition } from 'react'
import { Check } from 'lucide-react'
import { acceptAnswer } from '@/actions/questions'

export function AcceptAnswerButton({
  answerId,
  questionId,
}: {
  answerId: string
  questionId: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleAccept() {
    startTransition(async () => {
      await acceptAnswer(answerId, questionId)
    })
  }

  return (
    <button
      onClick={handleAccept}
      disabled={isPending}
      className="p-1 rounded text-zinc-700 hover:text-emerald-400 transition-colors"
      title="Accept this answer"
    >
      <Check className="h-4 w-4" />
    </button>
  )
}
