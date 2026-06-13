import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter, Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { AuthProvider } from "@/components/providers/auth-provider";
import { CompareProvider } from "@/components/providers/compare-provider";
import { MixpanelProvider } from "@/components/providers/mixpanel-provider";
import { ClarityProvider } from "@/components/providers/clarity-provider";
import { GlobalInteractionTracker } from "@/components/analytics/global-interaction-tracker";
import { FormAnalyticsTracker } from "@/components/analytics/form-analytics-tracker";
import { WebVitalsTracker } from "@/components/analytics/web-vitals-tracker";
import { CompareTray } from "@/components/compare/compare-tray";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MobileNewsletterSticky } from "@/components/newsletter/mobile-newsletter-sticky";
import { PlanCTASticky } from "@/components/cta/plan-cta-sticky";
import { OAuthContinueBanner } from "@/components/cta/oauth-continue-banner";
import { websiteJsonLd, organizationJsonLd, founderPersonJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
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
    "Find and compare the best AI tools for your workflow. Describe your goal — get a personalized AI stack with costs, alternatives, and real user-sentiment scores across 2,000+ tools.",
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
  // Phase 9 perf (2026-05-29): skip the Supabase auth + profile round-trips
  // for anonymous traffic. 99% of visitors are signed-out — paying ~150ms per
  // page render for a getUser() that returns null is wasted Tokyo round-trip.
  // Only resolve the user when an sb-*-auth-token cookie is actually present.
  const cookieStore = await cookies();
  // The Supabase session cookie is `sb-<ref>-auth-token`, but @supabase/ssr
  // CHUNKS large sessions into `…-auth-token.0`, `…-auth-token.1`, etc. OAuth
  // sessions carry provider tokens (+ offline refresh token) and routinely
  // exceed the 3180-byte chunk threshold, so a plain `endsWith("-auth-token")`
  // misses them → the user looks logged-out right after signing in. Match the
  // base name and any numeric chunk suffix (but not `-auth-token-code-verifier`).
  const hasSessionCookie = cookieStore
    .getAll()
    .some((c) => c.name.startsWith("sb-") && /-auth-token(\.\d+)?$/.test(c.name));

  let user: { id: string; email: string | null } | null = null;
  let profile: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    is_admin: boolean;
  } | null = null;

  if (hasSessionCookie) {
    const supabase = await createClient();
    const {
      data: { user: resolved },
    } = await supabase.auth.getUser();
    user = resolved
      ? { id: resolved.id, email: resolved.email ?? null }
      : null;
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, is_admin")
        .eq("id", user.id)
        .single();
      profile = data as typeof profile;
    }
  }

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
        <ClarityProvider />
        <MixpanelProvider>
          <GlobalInteractionTracker />
          <FormAnalyticsTracker />
          <WebVitalsTracker />
          <AuthProvider
            user={user ? { id: user.id, email: user.email ?? "" } : null}
            profile={profile}
          >
            <CompareProvider>
              <OAuthContinueBanner />
              {children}
              <CompareTray />
            </CompareProvider>
          </AuthProvider>
        </MixpanelProvider>
        <MobileNav />
        <MobileNewsletterSticky />
        {/* Phase 9 — global Plan Your Stack CTA. Hidden on excluded paths
            (footer URLs, auth, admin, planner itself) via isEligibleForCTA. */}
        <PlanCTASticky />
        {/* 9.A.3 — independent THIRD tracking source. Vercel Web Analytics is
            edge-collected and far harder to ad-block than Mixpanel (which our
            data shows loses ~most client events), so it's the cross-check
            counter in /admin/insights/reconciliation. Speed Insights gives
            real-user Core Web Vitals (SEO/ranking guardrail). */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
