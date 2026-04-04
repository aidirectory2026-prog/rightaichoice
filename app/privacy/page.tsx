import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export const metadata = {
  title: 'Privacy Policy — RightAIChoice',
  description: 'Privacy Policy for RightAIChoice. Comprehensive disclosure of data collection, processing, retention, and your rights under GDPR and CCPA.',
}

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">

          <div className="mb-10">
            <h1 className="text-3xl font-bold text-white mb-3">Privacy Policy</h1>
            <p className="text-sm text-zinc-500">Effective date: April 1, 2026 &middot; Last revised: April 4, 2026</p>
          </div>

          <div className="prose prose-invert prose-zinc max-w-none space-y-10 text-zinc-400">

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">1. Introduction &amp; Scope</h2>
              <p className="leading-relaxed text-sm mb-3">
                RightAIChoice (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the website located at
                rightaichoice.com (the &ldquo;Platform&rdquo;). This Privacy Policy describes the categories of personal
                information we collect, the purposes for which we process it, the legal bases we rely upon, and
                the rights available to you under applicable data protection legislation, including the European
                Union General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA),
                and the California Privacy Rights Act (CPRA).
              </p>
              <p className="leading-relaxed text-sm">
                By accessing or using the Platform, you acknowledge that you have read and understood this
                Privacy Policy. If you do not agree with any provision herein, you must discontinue use of the
                Platform immediately.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">2. Data Controller</h2>
              <p className="leading-relaxed text-sm">
                For the purposes of applicable data protection law, RightAIChoice is the data controller
                responsible for the processing of your personal information. All inquiries regarding data
                processing may be directed to: <span className="text-zinc-300">privacy@rightaichoice.com</span>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">3. Categories of Personal Information Collected</h2>
              <p className="leading-relaxed text-sm mb-3">We collect the following categories of information:</p>

              <h3 className="text-sm font-semibold text-zinc-300 mb-2">3.1 Account &amp; Identity Data</h3>
              <p className="leading-relaxed text-sm mb-3">
                When you register an account, we collect your email address, display name, and, where applicable,
                profile photograph. If you authenticate via Google OAuth, we receive your Google profile name,
                email address, and profile image URL as authorized by your Google account permissions.
              </p>

              <h3 className="text-sm font-semibold text-zinc-300 mb-2">3.2 User-Generated Content</h3>
              <p className="leading-relaxed text-sm mb-3">
                Content you voluntarily submit, including reviews, ratings, questions, answers, discussion posts,
                and workflow contributions. This content is publicly visible and associated with your display name.
              </p>

              <h3 className="text-sm font-semibold text-zinc-300 mb-2">3.3 Behavioral &amp; Usage Data</h3>
              <p className="leading-relaxed text-sm mb-3">
                We collect anonymized and aggregated usage data including pages viewed, search queries entered,
                tools clicked, filters applied, time spent on pages, and navigation paths. This data is processed
                through PostHog, our self-hosted analytics platform, and is used exclusively to improve the
                Platform experience.
              </p>

              <h3 className="text-sm font-semibold text-zinc-300 mb-2">3.4 Technical &amp; Device Data</h3>
              <p className="leading-relaxed text-sm mb-3">
                We automatically collect your IP address, browser type and version, operating system, device
                identifiers, referring URLs, and access timestamps. This data is necessary for security,
                performance monitoring, and abuse prevention.
              </p>

              <h3 className="text-sm font-semibold text-zinc-300 mb-2">3.5 Error &amp; Diagnostic Data</h3>
              <p className="leading-relaxed text-sm">
                We use Sentry for application error monitoring. When errors occur, Sentry may capture stack traces,
                request metadata, and anonymized contextual information to facilitate debugging. No personally
                identifiable information is intentionally transmitted to Sentry.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">4. Purposes &amp; Legal Bases for Processing</h2>
              <ul className="space-y-2 list-disc list-inside text-sm leading-relaxed">
                <li><strong className="text-zinc-300">Contract performance</strong> — To create and maintain your account, authenticate sessions, and provide the services you requested.</li>
                <li><strong className="text-zinc-300">Legitimate interest</strong> — To improve Platform functionality, generate AI-powered recommendations, detect fraud, enforce community guidelines, and conduct aggregated analytics.</li>
                <li><strong className="text-zinc-300">Consent</strong> — Where required by law, for optional features such as personalized email digests or marketing communications. You may withdraw consent at any time.</li>
                <li><strong className="text-zinc-300">Legal obligation</strong> — To comply with applicable laws, regulations, or enforceable governmental requests.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">5. Third-Party Data Processors</h2>
              <p className="leading-relaxed text-sm mb-3">
                We engage the following third-party processors, each operating under contractual data processing
                agreements or equivalent safeguards:
              </p>
              <ul className="space-y-2 list-disc list-inside text-sm leading-relaxed">
                <li><strong className="text-zinc-300">Supabase, Inc.</strong> — Database hosting, authentication, and row-level access control. Data resides in AWS infrastructure (US regions).</li>
                <li><strong className="text-zinc-300">Vercel, Inc.</strong> — Application hosting, edge functions, and content delivery. Processes request-level data.</li>
                <li><strong className="text-zinc-300">Anthropic, PBC</strong> — AI model inference for tool recommendations, chat, and content generation. Queries are not retained for model training.</li>
                <li><strong className="text-zinc-300">PostHog, Inc.</strong> — Product analytics. Data is processed in accordance with PostHog&apos;s privacy standards.</li>
                <li><strong className="text-zinc-300">Functional Software (Sentry)</strong> — Application error monitoring and diagnostics.</li>
              </ul>
              <p className="leading-relaxed text-sm mt-3">
                We do not sell, rent, lease, or otherwise disclose personal information to third parties for
                their own marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">6. Cookies &amp; Similar Technologies</h2>
              <p className="leading-relaxed text-sm mb-3">
                We employ the following categories of cookies:
              </p>
              <ul className="space-y-2 list-disc list-inside text-sm leading-relaxed">
                <li><strong className="text-zinc-300">Strictly necessary</strong> — Authentication session cookies managed by Supabase Auth. These cannot be disabled without impairing core functionality.</li>
                <li><strong className="text-zinc-300">Analytics</strong> — PostHog tracking cookies used to measure engagement and improve the Platform. These may be declined where required by your jurisdiction.</li>
              </ul>
              <p className="leading-relaxed text-sm mt-3">
                We do not deploy advertising cookies, retargeting pixels, social media tracking widgets, or
                any third-party cookies beyond those enumerated above.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">7. International Data Transfers</h2>
              <p className="leading-relaxed text-sm">
                Your data may be transferred to, stored in, and processed in the United States and other
                jurisdictions where our processors maintain infrastructure. Where such transfers involve
                personal data originating from the European Economic Area (EEA), United Kingdom, or Switzerland,
                we ensure adequate safeguards through Standard Contractual Clauses (SCCs), adequacy decisions,
                or equivalent mechanisms recognized under applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">8. Data Retention</h2>
              <ul className="space-y-2 list-disc list-inside text-sm leading-relaxed">
                <li><strong className="text-zinc-300">Account data</strong> — Retained for the duration of your active account. Upon account deletion, personal data is purged within 30 calendar days.</li>
                <li><strong className="text-zinc-300">User-generated content</strong> — Public contributions (reviews, Q&amp;A, discussions) may be anonymized and retained to preserve the integrity of community knowledge, unless you specifically request full deletion.</li>
                <li><strong className="text-zinc-300">Usage &amp; analytics data</strong> — Aggregated data is retained indefinitely. Identifiable usage data is automatically purged after 90 days.</li>
                <li><strong className="text-zinc-300">Error logs</strong> — Retained for 30 days, then automatically deleted by Sentry.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">9. Your Rights</h2>
              <p className="leading-relaxed text-sm mb-3">
                Depending on your jurisdiction, you may have the following rights:
              </p>
              <ul className="space-y-2 list-disc list-inside text-sm leading-relaxed">
                <li><strong className="text-zinc-300">Right of access</strong> — Request confirmation of whether we process your personal data and obtain a copy thereof.</li>
                <li><strong className="text-zinc-300">Right to rectification</strong> — Request correction of inaccurate or incomplete personal data via your account dashboard.</li>
                <li><strong className="text-zinc-300">Right to erasure</strong> — Request deletion of your personal data, subject to applicable legal retention obligations.</li>
                <li><strong className="text-zinc-300">Right to data portability</strong> — Request a machine-readable export of your personal data.</li>
                <li><strong className="text-zinc-300">Right to restrict processing</strong> — Request temporary restriction of processing while a dispute or verification is pending.</li>
                <li><strong className="text-zinc-300">Right to object</strong> — Object to processing based on legitimate interest grounds.</li>
                <li><strong className="text-zinc-300">Right to withdraw consent</strong> — Where processing is based on consent, withdraw at any time without affecting the lawfulness of prior processing.</li>
                <li><strong className="text-zinc-300">Right to non-discrimination (CCPA/CPRA)</strong> — We will not discriminate against you for exercising any of your privacy rights.</li>
              </ul>
              <p className="leading-relaxed text-sm mt-3">
                To exercise any of these rights, contact us at <span className="text-zinc-300">privacy@rightaichoice.com</span>.
                We will respond within 30 days or as otherwise required by applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">10. Children&apos;s Privacy</h2>
              <p className="leading-relaxed text-sm">
                The Platform is not directed at individuals under the age of 13 (or 16 in the EEA). We do not
                knowingly collect personal information from children. If we become aware that a child has provided
                us with personal data, we will take steps to delete such information promptly. If you believe a
                child has submitted personal data to us, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">11. Security Measures</h2>
              <p className="leading-relaxed text-sm">
                We implement industry-standard technical and organizational measures to protect your data,
                including: TLS 1.3 encryption for all data in transit, row-level security (RLS) policies on all
                database tables, secure httpOnly session cookies, Content Security Policy (CSP) headers, and
                regular dependency audits. While we strive to protect your personal data, no method of electronic
                transmission or storage is completely secure. If you discover a security vulnerability, please
                report it responsibly to <span className="text-zinc-300">security@rightaichoice.com</span>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">12. Changes to This Policy</h2>
              <p className="leading-relaxed text-sm">
                We reserve the right to modify this Privacy Policy at any time. Material changes will be
                communicated through a prominent notice on the Platform or via email to registered users.
                Your continued use of the Platform following such notice constitutes acceptance of the
                revised policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">13. Contact &amp; Supervisory Authority</h2>
              <p className="leading-relaxed text-sm mb-3">
                For questions, requests, or complaints regarding this Privacy Policy or our data practices:
              </p>
              <ul className="space-y-1.5 list-disc list-inside text-sm leading-relaxed">
                <li>Email: <span className="text-zinc-300">privacy@rightaichoice.com</span></li>
                <li>Response time: Within 48 business hours</li>
              </ul>
              <p className="leading-relaxed text-sm mt-3">
                If you are located in the European Economic Area and believe our processing of your personal
                data violates applicable law, you have the right to lodge a complaint with your local
                data protection supervisory authority.
              </p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
