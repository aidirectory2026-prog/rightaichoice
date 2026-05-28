import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { AuthProvider } from "@/components/providers/auth-provider";
import { CompareProvider } from "@/components/providers/compare-provider";
import { MixpanelProvider } from "@/components/providers/mixpanel-provider";
import { ClarityProvider } from "@/components/providers/clarity-provider";
import { GlobalInteractionTracker } from "@/components/analytics/global-interaction-tracker";
import { CompareTray } from "@/components/compare/compare-tray";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MobileNewsletterSticky } from "@/components/newsletter/mobile-newsletter-sticky";
import { PlanCTASticky } from "@/components/cta/plan-cta-sticky";
import { websiteJsonLd, organizationJsonLd, founderPersonJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
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
    default: "RightAIChoice — Find the Right AI Stack for Your Workflow",
    template: "%s | RightAIChoice",
  },
  description:
    "Stop guessing which AI tools to use. Get a personalized AI stack in 60 seconds — compare 2,000+ tools by feature, price, and real user sentiment.",
  keywords: [
    "AI tools",
    "AI stack",
    "best AI tools for",
    "AI tool recommendations",
    "build with AI",
    "AI project planner",
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
  const hasSessionCookie = cookieStore
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

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
          <AuthProvider
            user={user ? { id: user.id, email: user.email ?? "" } : null}
            profile={profile}
          >
            <CompareProvider>
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
      </body>
    </html>
  );
}
