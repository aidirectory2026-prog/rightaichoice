import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { AuthProvider } from "@/components/providers/auth-provider";
import { CompareProvider } from "@/components/providers/compare-provider";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { CompareTray } from "@/components/compare/compare-tray";
import { MobileNav } from "@/components/layout/mobile-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://rightaichoice.com"),
  title: {
    default: "RightAIChoice — Build Anything with AI",
    template: "%s | RightAIChoice",
  },
  description:
    "Tell us your goal. Get the exact AI tool stack with costs, tradeoffs, and alternatives. The decision engine for AI tools.",
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, is_admin")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50 pb-[60px] md:pb-0">
        <PostHogProvider>
          <AuthProvider
            user={user ? { id: user.id, email: user.email ?? "" } : null}
            profile={profile}
          >
            <CompareProvider>
              {children}
              <CompareTray />
            </CompareProvider>
          </AuthProvider>
        </PostHogProvider>
        <MobileNav />
      </body>
    </html>
  );
}
