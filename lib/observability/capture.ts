// BUG-22: Sentry is configured (sentry.*.config.ts) but app code never called
// captureException, so every CAUGHT error in the money + analytics paths only
// hit console.* and never reached the error monitor we pay for. This thin
// wrapper reports a caught exception with a route tag + extra context, and can
// NEVER throw — a Sentry hiccup must not break the request it's reporting on.

import * as Sentry from '@sentry/nextjs'

export function captureException(
  error: unknown,
  ctx?: { route?: string; extra?: Record<string, unknown> },
): void {
  try {
    Sentry.captureException(error, {
      tags: ctx?.route ? { route: ctx.route } : undefined,
      extra: ctx?.extra,
    })
  } catch {
    /* reporting must never break the route */
  }
}
