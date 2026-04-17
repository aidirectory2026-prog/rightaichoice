import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Every Sentry event gets the Mixpanel distinct_id attached, so any error
  // row in Sentry links back to the exact Mixpanel user profile and session.
  // Read lazily because Mixpanel may not have initialized yet when the very
  // first error fires.
  beforeSend(event) {
    try {
      const mp = (window as unknown as {
        mixpanel?: { get_distinct_id?: () => string }
      }).mixpanel
      const distinctId = mp?.get_distinct_id?.()
      if (distinctId) {
        event.tags = { ...(event.tags || {}), mixpanel_distinct_id: distinctId }
        event.user = { ...(event.user || {}), id: event.user?.id || distinctId }
      }
    } catch {
      // Silent — Sentry must not fail if Mixpanel isn't loaded.
    }
    return event
  },
})
