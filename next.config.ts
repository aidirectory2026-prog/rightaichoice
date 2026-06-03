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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.razorpay.com https://www.paypal.com https://www.paypalobjects.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com https://www.google.com https://*.gstatic.com https://cdn.rightaichoice.com https://cdn.futurepedia.io https://img.youtube.com https://i.ytimg.com https://*.razorpay.com https://*.paypal.com https://*.paypalobjects.com",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.mixpanel.com https://api-js.mixpanel.com https://api-eu.mixpanel.com https://*.sentry.io https://*.ingest.sentry.io https://*.razorpay.com https://*.paypal.com",
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
  disableLogger: true,
});
