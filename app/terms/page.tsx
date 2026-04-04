import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export const metadata = {
  title: 'Terms of Service — RightAIChoice',
  description: 'Terms of Service governing your use of RightAIChoice. Comprehensive legal terms including eligibility, conduct, intellectual property, liability, and dispute resolution.',
}

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">

          <div className="mb-10">
            <h1 className="text-3xl font-bold text-white mb-3">Terms of Service</h1>
            <p className="text-sm text-zinc-500">Effective date: April 1, 2026 &middot; Last revised: April 4, 2026</p>
          </div>

          <div className="space-y-10 text-zinc-400">

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">1. Acceptance of Terms</h2>
              <p className="leading-relaxed text-sm mb-3">
                These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you
                (&ldquo;User,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) and RightAIChoice (&ldquo;we,&rdquo;
                &ldquo;us,&rdquo; or &ldquo;our&rdquo;) governing your access to and use of the website located at
                rightaichoice.com, including all associated services, features, content, and APIs (collectively,
                the &ldquo;Platform&rdquo;).
              </p>
              <p className="leading-relaxed text-sm">
                By accessing or using the Platform, you represent and warrant that you have read, understood, and
                agree to be bound by these Terms and our Privacy Policy. If you do not agree to any provision of
                these Terms, you must immediately cease all use of the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">2. Platform Description</h2>
              <p className="leading-relaxed text-sm mb-3">
                RightAIChoice is an AI tool discovery, evaluation, and comparison platform that provides:
              </p>
              <ul className="space-y-1.5 list-disc list-inside text-sm leading-relaxed">
                <li>A curated directory of AI tools with structured metadata, pricing information, and editorial analysis.</li>
                <li>Community-contributed reviews, questions, answers, and discussions.</li>
                <li>AI-powered recommendations, workflow generation, and natural language search.</li>
                <li>Comparative analysis tools and personalized suggestions.</li>
              </ul>
              <p className="leading-relaxed text-sm mt-3">
                We do not develop, endorse, warrant, or maintain any third-party tool listed on the Platform.
                All tool information is provided for informational and comparative purposes only, and should not
                be construed as a recommendation, endorsement, or professional advice.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">3. Eligibility</h2>
              <p className="leading-relaxed text-sm">
                You must be at least 13 years of age (or 16 years of age if you reside in the European Economic Area)
                to create an account or use the Platform. If you are under the age of majority in your jurisdiction,
                you represent that you have obtained verifiable parental or guardian consent. By creating an account,
                you represent and warrant that all registration information you submit is truthful and accurate, and
                that you will maintain the accuracy of such information.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">4. Account Responsibilities</h2>
              <ul className="space-y-2 list-disc list-inside text-sm leading-relaxed">
                <li>You are solely responsible for safeguarding your account credentials and for all activities that occur under your account.</li>
                <li>You must not create multiple accounts for the purpose of circumventing bans, manipulating reputation scores, or gaming voting mechanisms.</li>
                <li>You must not share, transfer, or assign your account credentials to any third party.</li>
                <li>You must promptly notify us of any unauthorized access to or use of your account.</li>
                <li>We reserve the right to suspend or permanently terminate accounts that violate these Terms, without prior notice where the violation poses an immediate risk to Platform integrity.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">5. User-Generated Content</h2>

              <h3 className="text-sm font-semibold text-zinc-300 mb-2">5.1 Content Standards</h3>
              <p className="leading-relaxed text-sm mb-3">
                All user-generated content, including reviews, questions, answers, discussions, and workflow
                contributions, must reflect genuine experience, honest opinion, and factual accuracy. You must not:
              </p>
              <ul className="space-y-1.5 list-disc list-inside text-sm leading-relaxed mb-4">
                <li>Submit fraudulent, fabricated, or misleading reviews for tools you have not used.</li>
                <li>Post unsolicited commercial content, spam, or promotional material in community spaces.</li>
                <li>Engage in vote manipulation, astroturfing, or coordinated inauthentic behavior.</li>
                <li>Submit content that is defamatory, harassing, threatening, discriminatory, or otherwise unlawful.</li>
                <li>Disclose personal, confidential, or proprietary information of any third party without authorization.</li>
                <li>Submit content that infringes upon any intellectual property right of any third party.</li>
              </ul>

              <h3 className="text-sm font-semibold text-zinc-300 mb-2">5.2 License Grant</h3>
              <p className="leading-relaxed text-sm mb-3">
                You retain ownership of all content you submit to the Platform. By posting content, you grant
                RightAIChoice a worldwide, non-exclusive, royalty-free, sublicensable, and transferable license to
                use, reproduce, distribute, prepare derivative works of, display, and perform such content in
                connection with operating and improving the Platform. This license includes the right to use
                anonymized and aggregated content to train and improve our AI features.
              </p>

              <h3 className="text-sm font-semibold text-zinc-300 mb-2">5.3 Content Moderation</h3>
              <p className="leading-relaxed text-sm">
                We reserve the right, but have no obligation, to monitor, edit, or remove any content that
                violates these Terms or is otherwise objectionable, at our sole discretion and without prior notice.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">6. AI-Generated Content Disclaimer</h2>
              <p className="leading-relaxed text-sm">
                The Platform employs artificial intelligence models (powered by Anthropic Claude) to generate
                recommendations, editorial content, workflow suggestions, FAQ answers, and comparative analyses.
                AI-generated content is provided for informational purposes only and may contain inaccuracies,
                outdated information, or errors. You should independently verify all AI-generated recommendations
                before making purchasing, implementation, or business decisions. We disclaim all liability for
                actions taken in reliance on AI-generated content.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">7. Affiliate Disclosure</h2>
              <p className="leading-relaxed text-sm">
                Certain outbound links on the Platform may contain affiliate tracking parameters. When you click
                such links and subsequently make a purchase, we may receive a commission at no additional cost to
                you. Affiliate relationships do not influence our editorial verdicts, tool rankings, or AI
                recommendations. All sponsored placements are clearly and conspicuously labeled with a
                &ldquo;Sponsored&rdquo; badge.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">8. API Access</h2>
              <p className="leading-relaxed text-sm">
                API access is provided subject to rate limits and usage restrictions. API keys are issued for
                legitimate development purposes only. You must not use the API to: systematically scrape or
                harvest Platform data; build a competing directory, aggregation, or recommendation service;
                resell, sublicense, or redistribute API access; or circumvent rate limits through any technical
                means. We reserve the right to revoke API credentials immediately upon detection of misuse.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">9. Intellectual Property</h2>
              <p className="leading-relaxed text-sm">
                All Platform content, design, source code, trademarks, logos, and proprietary materials
                (excluding user-generated content) are the exclusive property of RightAIChoice or its licensors
                and are protected by applicable intellectual property laws. No license or right is granted to you
                by implication, estoppel, or otherwise under any intellectual property right of RightAIChoice,
                except as expressly set forth in these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">10. Prohibited Conduct</h2>
              <p className="leading-relaxed text-sm mb-3">In addition to the content standards above, you must not:</p>
              <ul className="space-y-1.5 list-disc list-inside text-sm leading-relaxed">
                <li>Attempt to gain unauthorized access to any portion of the Platform, other accounts, or connected systems.</li>
                <li>Introduce malware, viruses, or any destructive code.</li>
                <li>Engage in denial-of-service attacks, scraping, or automated access beyond authorized API use.</li>
                <li>Reverse-engineer, decompile, or disassemble any portion of the Platform.</li>
                <li>Impersonate any person or entity, or falsely represent your affiliation with any person or entity.</li>
                <li>Use the Platform for any purpose that is unlawful or prohibited by these Terms.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">11. Disclaimers</h2>
              <p className="leading-relaxed text-sm">
                THE PLATFORM IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF
                ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO IMPLIED
                WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE
                DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT ANY
                INFORMATION PROVIDED, INCLUDING TOOL LISTINGS, PRICING DATA, REVIEWS, AND AI RECOMMENDATIONS,
                WILL BE ACCURATE, COMPLETE, OR CURRENT.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">12. Limitation of Liability</h2>
              <p className="leading-relaxed text-sm">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL RIGHTAICHOICE, ITS OFFICERS,
                DIRECTORS, EMPLOYEES, AGENTS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL, ARISING
                OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE PLATFORM, ANY THIRD-PARTY TOOLS
                DISCOVERED THROUGH THE PLATFORM, OR ANY RELIANCE ON AI-GENERATED CONTENT, WHETHER BASED ON WARRANTY,
                CONTRACT, TORT (INCLUDING NEGLIGENCE), STATUTE, OR ANY OTHER LEGAL THEORY, EVEN IF WE HAVE BEEN
                ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">13. Indemnification</h2>
              <p className="leading-relaxed text-sm">
                You agree to indemnify, defend, and hold harmless RightAIChoice and its officers, directors,
                employees, and agents from and against all claims, liabilities, damages, losses, costs, and
                expenses (including reasonable attorneys&apos; fees) arising out of or related to: (a) your use
                of the Platform; (b) your violation of these Terms; (c) your violation of any rights of a third
                party; or (d) any content you submit to the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">14. Termination</h2>
              <p className="leading-relaxed text-sm">
                We may terminate or suspend your access to the Platform at any time, with or without cause, and
                with or without notice. Upon termination, your right to use the Platform ceases immediately. All
                provisions of these Terms that by their nature should survive termination shall survive,
                including but not limited to ownership provisions, warranty disclaimers, indemnity, and limitations
                of liability.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">15. Governing Law &amp; Dispute Resolution</h2>
              <p className="leading-relaxed text-sm mb-3">
                These Terms shall be governed by and construed in accordance with the laws of the State of
                Delaware, United States, without regard to its conflict of law principles.
              </p>
              <p className="leading-relaxed text-sm">
                Any dispute, controversy, or claim arising out of or relating to these Terms or the breach,
                termination, or validity thereof shall first be submitted to good-faith mediation. If mediation
                is unsuccessful within 30 days, the dispute shall be resolved by binding arbitration administered
                in accordance with the rules of the American Arbitration Association (AAA). The arbitration shall
                be conducted in English, and the arbitrator&apos;s decision shall be final and enforceable in any
                court of competent jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">16. Modifications</h2>
              <p className="leading-relaxed text-sm">
                We reserve the right to modify these Terms at any time. Material modifications will be communicated
                through a prominent notice on the Platform at least 14 days prior to taking effect. Your continued
                use of the Platform after the effective date of any modification constitutes your acceptance of the
                revised Terms. If you do not agree to the modified Terms, you must discontinue use of the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">17. Severability</h2>
              <p className="leading-relaxed text-sm">
                If any provision of these Terms is held to be invalid, illegal, or unenforceable by a court of
                competent jurisdiction, such provision shall be modified to the minimum extent necessary to make it
                enforceable, and the remaining provisions shall continue in full force and effect.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">18. Entire Agreement</h2>
              <p className="leading-relaxed text-sm">
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and
                RightAIChoice with respect to the subject matter hereof and supersede all prior or contemporaneous
                communications, agreements, and understandings, whether written or oral.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white mb-3">19. Contact</h2>
              <p className="leading-relaxed text-sm">
                For questions, concerns, or legal inquiries regarding these Terms of Service, contact us at{' '}
                <span className="text-zinc-300">legal@rightaichoice.com</span>. We endeavor to respond to all
                inquiries within 48 business hours.
              </p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
