// Fable-5 review (2026-06-15) — sanitize LLM-generated editorial prose before
// it hits MDXRemote. This content is markdown-ish prose, NOT authored MDX, so
// characters MDX treats as JSX (`<` opening a tag, `{` opening an expression)
// crash the whole page at server-render time (HTTP 500). Real case that took
// /compare/gong-vs-outreach down: the phrase "those with <20 reps" — MDX read
// `<20` as a JSX tag open and threw. Escaping at render time fixes every
// existing row at once (no data migration) and protects future rows.
//
// Only the escaped *parser* input changes — `&lt;` / `&#123;` render back to
// the literal `<` / `{` the reader expects.

/**
 * Escape the MDX/JSX-significant characters that appear in LLM prose but are
 * never intended as markup. Safe for markdown: real autolinks (`<https://…>`)
 * and HTML-ish tags start with a letter and are preserved; only `<` before a
 * non-letter (`<20`, `< 20`, `<=`, `<3ms`) and stray braces are escaped.
 */
export function sanitizeEditorialMdx(src: string | null | undefined): string {
  if (!src) return ''
  return src
    // `<` NOT followed by a letter, `/` (closing tag) or `!` (comment) → literal.
    .replace(/<(?![A-Za-z/!])/g, '&lt;')
    // Curly braces are JSX expression delimiters in MDX; in prose they're literal.
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;')
}
