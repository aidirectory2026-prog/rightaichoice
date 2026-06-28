/**
 * Bug-01 (XSS, P0) regression test — the repo's first security test.
 * Run: npm run test:xss   (tsx, no framework needed)
 *
 * Asserts that inlineFormat() (lib/format/inline-format.ts), which feeds the AI
 * chat's raw-HTML render path, escapes hostile markup to inert text while still
 * formatting markdown. A failure here = a re-opened XSS hole; exits non-zero.
 */
export {}

import { inlineFormat } from '../../lib/format/inline-format'

let failures = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}`)
  } else {
    failures++
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

// 1) Hostile HTML must NOT survive as live tags.
const xss = inlineFormat('hi <img src=x onerror=alert(1)> there')
check('escapes <img onerror> to inert text', !/<img/i.test(xss) && xss.includes('&lt;img'), xss)

const script = inlineFormat('<script>alert(document.cookie)</script>')
check('escapes <script> to inert text', !/<script/i.test(script) && script.includes('&lt;script&gt;'), script)

const onattr = inlineFormat('<a href="javascript:alert(1)" onmouseover="x">click</a>')
// Security property: no LIVE <a> tag survives (the on* text is inert once escaped).
check('escapes anchor tag (no live <a>)', !/<a\b/i.test(onattr) && onattr.includes('&lt;a'), onattr)

const quoteBreakout = inlineFormat('"><img src=x onerror=alert(1)>')
check('escapes attribute-breakout quotes', !/<img/i.test(quoteBreakout) && quoteBreakout.includes('&quot;'), quoteBreakout)

// 2) Intended markdown STILL formats (only safe tags injected).
const bold = inlineFormat('this is **bold** text')
check('**bold** → <strong>', /<strong[^>]*>bold<\/strong>/.test(bold), bold)

const italic = inlineFormat('this is *italic* text')
check('*italic* → <em>', /<em>italic<\/em>/.test(italic), italic)

const code = inlineFormat('run `npm test` now')
check('`code` → <code>', /<code[^>]*>npm test<\/code>/.test(code), code)

// 3) Hostile content INSIDE markdown is still escaped.
const mixed = inlineFormat('**<img src=x onerror=alert(1)>**')
check('hostile inside bold is escaped', /<strong[^>]*>&lt;img/.test(mixed) && !/<img/i.test(mixed), mixed)

// 4) Ampersand handling (escape order).
const amp = inlineFormat('Tom & Jerry')
check('bare & → &amp;', amp.includes('&amp;'), amp)

console.log('')
if (failures > 0) {
  console.error(`xss-inline-format: ${failures} FAILED`)
  process.exit(1)
}
console.log('xss-inline-format: all passed ✓')
