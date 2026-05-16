import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { UnsubscribeForm } from '@/components/newsletter/unsubscribe-form'

export const metadata: Metadata = {
  title: 'Unsubscribe — RightAIChoice',
  description: 'Unsubscribe from the RightAIChoice newsletter.',
  alternates: { canonical: '/unsubscribe' },
  robots: { index: false, follow: false },
}

type PageProps = {
  searchParams: Promise<{ email?: string }>
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const sp = await searchParams
  const prefill = sp.email ?? ''

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-2xl font-bold text-white mb-2">Unsubscribe</h1>
          <p className="text-sm text-zinc-400 mb-8">
            Enter your email to stop receiving the RightAIChoice newsletter. You can
            re-subscribe any time from the footer.
          </p>
          <UnsubscribeForm prefillEmail={prefill} />
        </div>
      </main>
      <Footer />
    </>
  )
}
