import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Razorpay (checkout.razorpay.com) and PayPal (paypal.com SDK) load their
      // checkout scripts cross-origin and open their flows in iframes; without
      // these the script tag is CSP-blocked → "Could not load the payment
      // widget." script/connect/frame/img all need the provider origins.
      // Microsoft Clarity (session replay) loads its tag from www.clarity.ms and
      // streams recordings/pixels back over *.clarity.ms. It was silently
      // CSP-blocked on every page (script-src had no clarity.ms) — Clarity never
      // ran for anyone, which is why it produced ~all of the historical
      // "Failed to load script" error noise. Whitelisting it here is what
      // actually revives replay (the earlier fix only stopped LOGGING the block).
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.razorpay.com https://www.paypal.com https://www.paypalobjects.com https://www.clarity.ms https://*.clarity.ms",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com https://www.google.com https://*.gstatic.com https://cdn.rightaichoice.com https://cdn.futurepedia.io https://img.youtube.com https://i.ytimg.com https://*.razorpay.com https://*.paypal.com https://*.paypalobjects.com https://*.clarity.ms",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.mixpanel.com https://api-js.mixpanel.com https://api-eu.mixpanel.com https://*.sentry.io https://*.ingest.sentry.io https://*.razorpay.com https://*.paypal.com https://*.clarity.ms",
      "frame-src 'self' https://*.razorpay.com https://*.paypal.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  // Phase 9 Day-4 (2026-05-29): build kept timing out at 60s on
  // /compare/sitemap.xml after the non-AI purge. Bump to 180s so a slow
  // Supabase round-trip from the Vercel build runner can't kill the deploy.
  staticPageGenerationTimeout: 180,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // Phase 7O.4 (2026-05-16): /embed/* widgets must be iframable from
      // any origin (vendor blogs, newsletters). CSP frame-ancestors: *
      // makes that explicit; X-Frame-Options is set to an invalid value
      // so browsers (which prefer the more-recent CSP directive when both
      // are present) fall through to the permissive default.
      {
        source: '/embed/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'none'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://*.supabase.co https://cdn.rightaichoice.com https://www.google.com https://*.gstatic.com",
              "font-src 'self'",
              'frame-ancestors *',
            ].join('; '),
          },
        ],
      },
    ]
  },
  // Phase 1 (2026-05-05): the empty community surfaces (/reviews,
  // /questions, /discussions, /workflows) were removed. Permanent (308)
  // redirects to relevant live destinations transfer link equity from any
  // existing Google index entries / external backlinks instead of letting
  // them 404. The submission affordance is preserved on the tool page via
  // the QuickFeedback strip — that's why /reviews + /questions land on a
  // generic /tools listing (the user can pick a tool, then leave feedback).
  // We deliberately did NOT add robots.txt Disallow lines: blocking
  // crawlers prevents them from seeing the redirect, which would slow
  // deindexing of the old URLs.
  async redirects() {
    return [
      { source: '/reviews', destination: '/tools', permanent: true },
      { source: '/reviews/:path*', destination: '/tools', permanent: true },
      { source: '/questions', destination: '/tools', permanent: true },
      { source: '/questions/:path*', destination: '/tools', permanent: true },
      { source: '/discussions', destination: '/tools', permanent: true },
      { source: '/discussions/:path*', destination: '/tools', permanent: true },
      { source: '/workflows', destination: '/plan', permanent: true },
      { source: '/workflows/:path*', destination: '/plan', permanent: true },
      // H2 (Cowork QA): /tools/[slug]/report was a free, anonymous clone of the
      // paid Market Sentiment Checker (/tools/[slug]/sentiment) — same scrape +
      // Claude synthesis, 0 real visitors in 30 days. Retired: redirect to the
      // paid checker (preserves any SEO equity) so there is one sentiment surface.
      { source: '/tools/:slug/report', destination: '/tools/:slug/sentiment', permanent: true },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'adtznghodbgkvknilfln.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.rightaichoice.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.futurepedia.io',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname: '/s2/favicons/**',
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  // Fable-5 audit: `disableLogger` is deprecated in @sentry/nextjs 10 →
  // moved to webpack.treeshake.removeDebugLogging (silences the build warning).
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
