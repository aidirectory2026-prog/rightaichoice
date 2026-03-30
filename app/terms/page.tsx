import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export const metadata = {
  title: 'Terms of Service — RightAIChoice',
  description: 'Terms of Service for RightAIChoice. Rules, responsibilities, and expectations for using the platform.',
}

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">

          <div className="mb-10">
            <h1 className="text-3xl font-bold text-white mb-3">Terms of Service</h1>
            <p className="text-sm text-zinc-500">Last updated: March 2025</p>
          </div>

          <div className="space-y-10 text-zinc-400">

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">1. Acceptance</h2>
              <p className="leading-relaxed text-sm">
                By using RightAIChoice (&quot;the platform&quot;), you agree to these Terms of Service.
                If you don&apos;t agree, don&apos;t use the platform. We may update these terms —
                continued use after changes means you accept the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">2. What RightAIChoice Is</h2>
              <p className="leading-relaxed text-sm">
                RightAIChoice is a platform for discovering, evaluating, and comparing AI tools.
                We provide structured discovery, community reviews and Q&amp;A, and AI-powered recommendations.
                We do not endorse, build, or maintain any of the third-party tools listed.
                All tool information is provided for informational purposes only.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">3. Your Account</h2>
              <ul className="space-y-2 list-disc list-inside text-sm leading-relaxed">
                <li>You must be 13 years or older to create an account.</li>
                <li>You are responsible for maintaining the security of your account credentials.</li>
                <li>You must not create multiple accounts to game reputation or voting systems.</li>
                <li>You must not share your account with others.</li>
                <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">4. Community Content Rules</h2>
              <p className="leading-relaxed text-sm mb-3">
                Reviews, Q&amp;A, and discussions must reflect genuine experience and honest opinion. You must not:
              </p>
              <ul className="space-y-2 list-disc list-inside text-sm leading-relaxed">
                <li>Post fake reviews or reviews for tools you&apos;ve never used.</li>
                <li>Post spam, advertising, or promotional content in community spaces.</li>
                <li>Post abusive, harassing, or discriminatory content.</li>
                <li>Post content that violates any law or third-party rights.</li>
                <li>Manipulate voting systems (vote brigading, bot accounts, etc.).</li>
                <li>Post content that reveals private or confidential information about others.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">5. Content Ownership</h2>
              <p className="leading-relaxed text-sm">
                You retain ownership of content you create (reviews, Q&amp;A, etc.). By posting it,
                you grant RightAIChoice a non-exclusive, royalty-free license to display and distribute
                that content on the platform. We may use anonymized content to improve AI features.
                We will not sell your content to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">6. API Access</h2>
              <p className="leading-relaxed text-sm">
                API keys are issued for legitimate developer use. You must not use the API to scrape
                data at scale, build competing directory products, or resell access to others.
                We reserve the right to revoke API keys that violate these terms without notice.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">7. Disclaimers</h2>
              <p className="leading-relaxed text-sm mb-3">
                RightAIChoice is provided &quot;as is&quot; without warranties of any kind. We do not guarantee:
              </p>
              <ul className="space-y-2 list-disc list-inside text-sm leading-relaxed">
                <li>The accuracy or completeness of any tool information listed.</li>
                <li>That AI recommendations will be correct for your specific use case.</li>
                <li>Uninterrupted or error-free availability of the platform.</li>
              </ul>
              <p className="leading-relaxed text-sm mt-3">
                Always verify tool capabilities independently before making purchasing decisions.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">8. Limitation of Liability</h2>
              <p className="leading-relaxed text-sm">
                To the fullest extent permitted by law, RightAIChoice is not liable for any indirect,
                incidental, or consequential damages arising from your use of the platform or
                third-party tools discovered through it.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">9. Governing Law</h2>
              <p className="leading-relaxed text-sm">
                These terms are governed by the laws of the jurisdiction in which RightAIChoice operates.
                Any disputes shall be resolved through binding arbitration before resorting to litigation.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">10. Contact</h2>
              <p className="leading-relaxed text-sm">
                Questions about these terms? Reach us at{' '}
                <span className="text-zinc-300">legal@rightaichoice.com</span>.
              </p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
