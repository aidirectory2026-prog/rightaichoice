// Phase 9.0.4 (2026-05-29) — shared input sanitizer for Supabase ilike/.or()
// filters. Raw user input interpolated into `.or('name.ilike.%${q}%,...')`
// lets a `,` `)` `.` etc. break out of the filter expression and inject
// arbitrary PostgREST filter clauses. Every search path must run untrusted
// terms through this before interpolation. (Extracted from ai-search.ts so it
// can be shared without an import cycle through lib/data/tools.ts.)

/** Escape characters that have special meaning in Supabase ilike patterns. */
export function sanitizeLike(input: string): string {
  return input
    .replace(/\\/g, '\\\\') // backslash first
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/[(),"'`;]/g, '') // strip chars that could break .or() filter syntax
    .slice(0, 200) // cap length to prevent oversized queries
}
