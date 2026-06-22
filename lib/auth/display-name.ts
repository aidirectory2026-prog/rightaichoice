// Phase 11 (2026-06-22): one place that decides what name to show for an account.
// Anonymous (guest) users have a machine handle like `guest_73734df542e8` — never
// show that to a human. They read as "Guest" everywhere until they upgrade.

export function accountDisplayName(opts: {
  isAnonymous?: boolean | null
  fullName?: string | null
  username?: string | null
}): string {
  if (opts.isAnonymous) return 'Guest'
  const full = opts.fullName?.trim()
  if (full) return full
  return opts.username || 'Account'
}
