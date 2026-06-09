export function slugify(text: string): string {
  return text
    // Phase 10 #69 — transliterate accents so "Café AI" → "cafe-ai" (not the
    // lossy "caf-ai"). Previously diacritics were dropped entirely, producing
    // lossy, sometimes-colliding slugs for non-ASCII tool names.
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

