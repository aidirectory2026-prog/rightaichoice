'use client'

import { useState } from 'react'
import { HelpCircle, ChevronDown } from 'lucide-react'

type Faq = {
  id: string
  question: string
  answer: string
  source: string | null
}

export function FaqSection({ faqs, toolName }: { faqs: Faq[]; toolName: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (!faqs || faqs.length === 0) return null

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <HelpCircle className="h-5 w-5 text-blue-500" />
        Frequently Asked Questions
      </h2>

      <div className="space-y-2">
        {faqs.map((faq, i) => (
          <div
            key={faq.id}
            className="rounded-lg border border-border bg-card overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium text-sm pr-4">{faq.question}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                  openIndex === i ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === i && (
              <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
                {faq.answer}
                {faq.source && faq.source !== 'ai_generated' && (
                  <span className="block mt-2 text-xs text-muted-foreground/60">
                    Source: {faq.source}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Schema.org FAQPage structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
              },
            })),
          }),
        }}
      />
    </section>
  )
}
