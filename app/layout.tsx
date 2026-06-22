import type { Metadata, Viewport } from "next";
import { Inter, Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { CompareProvider } from "@/components/providers/compare-provider";
import { WizardProvider } from "@/components/providers/wizard-provider";
import { MixpanelProvider } from "@/components/providers/mixpanel-provider";
import { ClarityProvider } from "@/components/providers/clarity-provider";
import { GlobalInteractionTracker } from "@/components/analytics/global-interaction-tracker";
import { FormAnalyticsTracker } from "@/components/analytics/form-analytics-tracker";
import { WebVitalsTracker } from "@/components/analytics/web-vitals-tracker";
import { CompareTray } from "@/components/compare/compare-tray";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MobileNewsletterSticky } from "@/components/newsletter/mobile-newsletter-sticky";
import { PlanCTASticky } from "@/components/cta/plan-cta-sticky";
import { SafeBoundary } from "@/components/ui/safe-boundary";
import { websiteJsonLd, organizationJsonLd, founderPersonJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { TOOL_COUNT_DISPLAY } from "@/lib/copy/tool-count";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  // Phase 7 Step 60 (BUG-001): 800 added so the navbar/footer logo's
  // `font-extrabold` AI letters render at true Inter Black weight rather
  // than synthesized faux-bold. Two-stop delta vs base font-semibold (600)
  // is what makes the AI letters scan as load-bearing wordmark, not
  // decorative color accent.
  weight: ["400", "500", "600", "700", "800"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://rightaichoice.com"),
  title: {
    // Phase 9 (2026-06-03) homepage SEO rebalance: lead with the demand
    // vocabulary ("best AI tools" / "find") — GSC shows ~zero demand for the
    // "ai stack" head term, which stays as the differentiating mechanism in the
    // description. See docs/marketing/Phase-9-Smart-SEO-Plan/16-homepage-seo-strategy.md.
    default: "Best AI Tools, Matched to Your Goal — RightAIChoice",
    template: "%s | RightAIChoice",
  },
  description:
    `Find and compare the best AI tools for your goal — the one that ranks #1 isn't always right for you. Describe what you're building and get a personalized AI stack with real features, current pricing, costs, and alternatives across ${TOOL_COUNT_DISPLAY} tools.`,
  keywords: [
    "best AI tools",
    "AI tools",
    "AI tool finder",
    "compare AI tools",
    "AI stack",
    "AI tool recommendations",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://rightaichoice.com",
    siteName: "RightAIChoice",
  },
  twitter: {
    card: "summary_large_image",
    site: "@rightaichoice",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
};

// Matches the zinc-950 dark theme so mobile browser chrome (address bar /
// status bar) blends with the app rather than flashing white.
export const viewport: Viewport = {
  themeColor: "#09090b",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Caching refactor (fable-5, 2026-06-16): the root layout no longer reads
  // cookies / resolves the user server-side. Reading cookies here forced EVERY
  // route to render dynamically (no edge cache) — the cause of the 1-2s
  // TTFB-everywhere + cold-render spikes. Auth is now resolved CLIENT-SIDE in
  // AuthProvider, so anonymous content pages (compare, categories, best, home,
  // blog…) statically cache/ISR at the edge. Auth-gated route groups (/admin
  // has its own getUser+redirect; /dashboard, /account, /plan resolve the user
  // in their own server code) keep their own protection and stay dynamic.
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${bricolage.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50 pb-[60px] lg:pb-0">
        {/* Phase 7F (2026-05-15) + Phase 9 (2026-05-27): emit Organization +
            WebSite + founder Person as one JSON-LD payload at the root so
            every page inherits the brand-entity signal. Two-entity binding
            (Org + Person via worksFor / founder) is the strongest available
            verification for an early-stage brand that doesn't yet have a
            Wikipedia entry. */}
        <script {...jsonLdScriptProps([organizationJsonLd(), websiteJsonLd(), founderPersonJsonLd()])} />
        {/* Phase 9 Day-4 (2026-05-29): rel=me cross-verification edges to
            owned brand profiles. Each link declares "this profile belongs
            to the same entity as this site"; combined with reciprocal
            links from the profiles back to rightaichoice.com, this closes
            the verification loop that AI assistants and search engines
            use to bind a brand to its social presence. Next.js hoists
            these into <head> automatically. */}
        <link rel="me" href="https://x.com/rightaichoice" />
        <link rel="me" href="https://twitter.com/rightaichoice" />
        <link rel="me" href="https://www.linkedin.com/company/rightaichoice" />
        <link rel="me" href="https://github.com/aidirectory2026-prog/rightaichoice" />
        <link rel="me" href="https://www.linkedin.com/in/tanmayverma99" />
        {/* Every NON-ESSENTIAL global widget below is wrapped in <SafeBoundary>:
            these are siblings of the page content in the React tree, so an
            uncaught throw in any one of them would unmount everything → a blank
            page (exactly what a misplaced PlanCTASticky did to tool/compare
            pages). The boundary contains each failure to that one widget; the
            page content itself is still covered by app/error.tsx. Providers are
            intentionally NOT wrapped — they supply context the page depends on. */}
        <SafeBoundary name="clarity"><ClarityProvider /></SafeBoundary>
        <MixpanelProvider>
          <SafeBoundary name="interaction-tracker"><GlobalInteractionTracker /></SafeBoundary>
          <SafeBoundary name="form-tracker"><FormAnalyticsTracker /></SafeBoundary>
          <SafeBoundary name="web-vitals"><WebVitalsTracker /></SafeBoundary>
          <AuthProvider>
            <WizardProvider>
              <CompareProvider>
                {children}
                <SafeBoundary name="compare-tray"><CompareTray /></SafeBoundary>
              </CompareProvider>
              {/* Phase 9 — global Plan Your Stack CTA. Hidden on excluded paths
                  (footer URLs, auth, admin, planner itself) via isEligibleForCTA.
                  MUST stay INSIDE <WizardProvider>: it renders <PlanCTAButton>,
                  which calls useWizard(). Mounted outside the provider it threw
                  "useWizard must be used within WizardProvider" on the client
                  (after mount) and crashed the page tree on every eligible page,
                  incl. tool pages. */}
              <SafeBoundary name="plan-cta-sticky"><PlanCTASticky /></SafeBoundary>
            </WizardProvider>
          </AuthProvider>
        </MixpanelProvider>
        <SafeBoundary name="mobile-nav"><MobileNav /></SafeBoundary>
        <SafeBoundary name="mobile-newsletter"><MobileNewsletterSticky /></SafeBoundary>
        {/* 9.A.3 — independent THIRD tracking source. Vercel Web Analytics is
            edge-collected and far harder to ad-block than Mixpanel (which our
            data shows loses ~most client events), so it's the cross-check
            counter in /admin/insights/reconciliation. Speed Insights gives
            real-user Core Web Vitals (SEO/ranking guardrail). */}
        <SafeBoundary name="vercel-analytics"><Analytics /></SafeBoundary>
        <SafeBoundary name="speed-insights"><SpeedInsights /></SafeBoundary>
      </body>
    </html>
  );
}
