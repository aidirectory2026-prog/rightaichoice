/**
 * Phase 7O.4 — shared utilities for embed widgets.
 *
 * Embed widgets are self-contained HTML pages designed to be iframed
 * cross-origin. Inline styles only (no external CSS — the iframe lives
 * on a third-party site that doesn't load our app/globals.css). All
 * widgets contain at least one outbound link to rightaichoice.com
 * with a utm_source=embed query param so we can attribute traffic
 * back to embed channels in analytics.
 */

export function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Wrap widget body in a minimal HTML doc with our color tokens inlined. */
export function widgetShell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${htmlEscape(title)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: transparent; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.45;
    color: #e4e4e7;
  }
  a { color: inherit; text-decoration: none; }
  .rac-widget {
    border: 1px solid #27272a;
    border-radius: 12px;
    background: linear-gradient(180deg, #0b0b0d 0%, #09090b 100%);
    padding: 16px;
    max-width: 360px;
  }
  .rac-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border-radius: 999px;
    background: #064e3b;
    color: #6ee7b7;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .rac-title { color: #fafafa; font-weight: 700; font-size: 16px; margin: 8px 0 4px; }
  .rac-sub { color: #a1a1aa; font-size: 13px; margin-bottom: 12px; }
  .rac-cta {
    display: inline-block;
    margin-top: 8px;
    padding: 6px 12px;
    border-radius: 8px;
    background: #10b981;
    color: #052e1e;
    font-weight: 600;
    font-size: 12px;
  }
  .rac-foot {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid #27272a;
    font-size: 11px;
    color: #71717a;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .rac-foot a { color: #a1a1aa; }
  .rac-foot a:hover { color: #10b981; }
  .rac-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    border-radius: 999px;
    background: #0b0b0d;
    border: 1px solid #064e3b;
    color: #6ee7b7;
    font-size: 13px;
    font-weight: 600;
  }
  .rac-badge svg { display: block; }
</style>
</head>
<body>${body}</body>
</html>`
}
