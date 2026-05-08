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

      {/*
       * Phase 4.5 audit fix (2026-05-09): the FAQPage JSON-LD that used to
       * live here was duplicating the one already emitted from the page
       * handler at app/tools/[slug]/page.tsx (inside the [SoftwareApplication,
       * BreadcrumbList, FAQPage] array). 1,041 of 1,178 catalog pages had
       * two FAQPage scripts in their HTML. Single source of truth is now the
       * page-level emitter via lib/seo/json-ld.ts:faqPageJsonLd().
       *
       * toolName param kept on the public API for now; some callers may rely
       * on the prop shape and removing it is a separate refactor.
       */}
    </section>
  )
}
