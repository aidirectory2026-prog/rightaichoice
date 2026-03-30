import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export const metadata = {
  title: 'Privacy Policy — RightAIChoice',
  description: 'Privacy Policy for RightAIChoice — how we collect, use, and protect your data.',
}

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">

          <div className="mb-10">
            <h1 className="text-3xl font-bold text-white mb-3">Privacy Policy</h1>
            <p className="text-sm text-zinc-500">Last updated: March 2025</p>
          </div>

          <div className="prose prose-invert prose-zinc max-w-none space-y-10 text-zinc-400">

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">1. What We Collect</h2>
              <p className="leading-relaxed mb-3">
                We collect only what we need to run the platform:
              </p>
              <ul className="space-y-1.5 list-disc list-inside text-sm leading-relaxed">
                <li><strong className="text-zinc-300">Account data</strong> — email address, username, and optional profile information you provide.</li>
                <li><strong className="text-zinc-300">Usage data</strong> — pages visited, tools viewed, searches made, and clicks on external links.</li>
                <li><strong className="text-zinc-300">User content</strong> — reviews, questions, answers, and discussions you post on the platform.</li>
                <li><strong className="text-zinc-300">Technical data</strong> — IP address, browser type, and device info collected automatically via standard web infrastructure.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">2. How We Use Your Data</h2>
              <ul className="space-y-1.5 list-disc list-inside text-sm leading-relaxed">
                <li>To run your account and authenticate you securely.</li>
                <li>To power personalized recommendations and saved tools.</li>
                <li>To improve search results, rankings, and AI recommendations using aggregated signals.</li>
                <li>To detect abuse, spam, and violations of our Terms.</li>
                <li>To send transactional emails (account confirmation, password reset). We do not send marketing emails without explicit consent.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">3. Data Sharing</h2>
              <p className="leading-relaxed mb-3">
                We do not sell your personal data. We share data only in these situations:
              </p>
              <ul className="space-y-1.5 list-disc list-inside text-sm leading-relaxed">
                <li><strong className="text-zinc-300">Service providers</strong> — Supabase (database/auth), Vercel (hosting), Anthropic (AI features). Each operates under their own privacy agreements.</li>
                <li><strong className="text-zinc-300">Legal requirements</strong> — if required by law or court order.</li>
                <li><strong className="text-zinc-300">Public content</strong> — reviews, Q&amp;A, and discussions you post are visible to other users by design.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">4. Cookies &amp; Tracking</h2>
              <p className="leading-relaxed text-sm">
                We use essential cookies for authentication sessions. We use analytics (PostHog) to understand
                how users interact with the platform — this data is anonymized and aggregated.
                We do not use advertising cookies or third-party tracking pixels.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">5. Your Rights</h2>
              <ul className="space-y-1.5 list-disc list-inside text-sm leading-relaxed">
                <li><strong className="text-zinc-300">Access</strong> — you can view all data associated with your account from your dashboard.</li>
                <li><strong className="text-zinc-300">Deletion</strong> — you can delete your account at any time. Contact us and we will remove your data within 30 days.</li>
                <li><strong className="text-zinc-300">Correction</strong> — you can edit your profile information at any time from the dashboard.</li>
                <li><strong className="text-zinc-300">Export</strong> — request a copy of your data by contacting us.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">6. Data Retention</h2>
              <p className="leading-relaxed text-sm">
                We retain your data for as long as your account is active. If you delete your account,
                we remove personal data within 30 days. Public content (reviews, Q&amp;A) may be
                anonymized and retained to preserve community value.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">7. Security</h2>
              <p className="leading-relaxed text-sm">
                We use industry-standard security practices: encrypted connections (HTTPS),
                Supabase&apos;s row-level security for database access, and secure session management.
                No system is 100% secure — report any vulnerability to us directly and we will address it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">8. Contact</h2>
              <p className="leading-relaxed text-sm">
                Questions about this policy? Reach us at{' '}
                <span className="text-zinc-300">privacy@rightaichoice.com</span>.
                We aim to respond within 48 hours.
              </p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
