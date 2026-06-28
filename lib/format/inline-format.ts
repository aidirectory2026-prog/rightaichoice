// Bug-01 (XSS, P0): inline markdown formatter for AI chat output. The chat body
// is LLM output steered by free-text user prompts, so a crafted prompt can make
// the model emit raw HTML (e.g. `<img src=x onerror=...>`) which then renders in
// the victim's authenticated session. We ESCAPE all HTML-special chars FIRST so
// any raw markup becomes inert text, THEN apply the markdown->tag regexes —
// markdown markers (** * `) aren't HTML-special, so they survive the escape and
// only the intended <strong>/<em>/<code> tags are ever produced.
//
// Extracted to a pure (no-React) module so it can be unit-tested directly
// (scripts/audit/xss-inline-format.test.ts) — the repo's first security
// regression test.

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function inlineFormat(text: string): string {
  let result = escapeHtml(text)
  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
  // Italic
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // Inline code
  result = result.replace(/`(.+?)`/g, '<code class="rounded bg-zinc-700 px-1 py-0.5 text-xs text-emerald-300">$1</code>')
  return result
}
