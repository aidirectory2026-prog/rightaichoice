/**
 * Resolves the best-available logo URL for a tool.
 *
 * Order of preference:
 * 1. `logo_url` if present AND not from a known-bad host.
 * 2. Google favicon service derived from `website_url`.
 * 3. null — caller renders a letter-avatar fallback.
 *
 * Known-bad hosts are image CDNs that historically stored wide marketing
 * screenshots under `logo_url`. Rendering those at 44×44 / 80×80 with
 * `object-cover` produced warped crops (the "absurd images" bug).
 */

const BAD_LOGO_HOSTS = new Set<string>([
  'cdn.futurepedia.io',
])

export function resolveToolLogoUrl(input: {
  logo_url?: string | null
  website_url?: string | null
}): string | null {
  if (input.logo_url) {
    try {
      const host = new URL(input.logo_url).hostname.toLowerCase()
      if (!BAD_LOGO_HOSTS.has(host)) return input.logo_url
    } catch {
      // malformed URL — skip
    }
  }

  if (input.website_url) {
    try {
      const domain = new URL(input.website_url).hostname
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    } catch {
      // malformed website URL — give up
    }
  }

  return null
}
