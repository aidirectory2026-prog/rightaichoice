import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { AuthProvider } from "@/components/providers/auth-provider";
import { CompareProvider } from "@/components/providers/compare-provider";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { CompareTray } from "@/components/compare/compare-tray";
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
    default: "RightAIChoice — Find the Best AI Tools",
    template: "%s | RightAIChoice",
  },
  description:
    "The decision-making engine for discovering AI tools. Search, compare, and choose the right AI tool with real community insights.",
  keywords: [
    "AI tools",
    "AI directory",
    "artificial intelligence",
    "find AI tools",
    "compare AI tools",
    "best AI tools",
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
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50">
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
      </body>
    </html>
  );
}
