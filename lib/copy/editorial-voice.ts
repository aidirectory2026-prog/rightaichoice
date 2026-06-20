/**
 * Shared "human voice" layer for AI-generated editorial copy.
 *
 * Phase 11 (2026-06-21): the generated copy is good and specific, but reads as
 * machine-made because every entry repeats the same handful of habits — recycled
 * superlatives ("gold standard", "powerhouse", "stands out"), the identical
 * praise→"However"→"Compared to"→"Best for" skeleton, rule-of-three lists, and
 * em-dash overuse. This block is appended to the generation prompts (the tool-page
 * editorial in lib/cron/refresh.ts and the Sentiment Checker report in
 * lib/ai/synthesize-report.ts) to mix in a light, genuine human touch WITHOUT
 * weakening SEO. Owner ask: "a little bit of user-like content … both [AI + human]
 * shall be there," and "the SEO of any page [stays] at the same level or more
 * advanced." So: same factual backbone and keyword coverage, less robotic surface.
 *
 * Keep it a LIGHT touch — professional analyst voice, not casual or chatty.
 */
export const EDITORIAL_VOICE = `VOICE — write like a sharp human analyst, not an AI content generator. A light human touch, kept professional:
- BANNED phrases (these are the #1 AI tells — never use them): "gold standard", "powerhouse", "stands out", "unique value proposition", "game-changer", "seamless", "robust", "cutting-edge", "bulletproof", "unmatched", "best-in-class", "no-brainer", "second to none", "in today's landscape", "in the world of", "whether you're a … or a …", "look no further", "when it comes to", "the bottom line is", "elevate your", "unlock", "harness the power", "ever-evolving", "a testament to", "boasts", "navigating the".
- Do NOT reuse the same superlative across tools. If you called one tool the best at something, find a different, more specific way to praise the next one.
- VARY the opening. Don't start every piece with "<Tool> is a …". About as often, open with the use-case, a blunt observation, a comparison, or the main caveat.
- VARY sentence rhythm — mix short, punchy sentences with longer ones. Avoid the rule-of-three cadence ("fast, reliable, and scalable"); it reads as generated. Don't start consecutive sentences the same way.
- Don't force one fixed skeleton (praise → "However" → "Compared to" → "Best for") onto every tool. Reach the same substance by a different route each time.
- A light first-person editorial touch is welcome, used sparingly (once or twice, not every line): "We'd reach for this when…", "In practice…", "Where it bites…".
- Use em-dashes sparingly — at most one per paragraph.
- Be concrete and a little opinionated (real numbers, named competitors, honest limitations), but never snarky, hypey, or unprofessional.
SEO IS NON-NEGOTIABLE: every keyword, scannable structure, and long-tail term required above STAYS. A more human voice must keep keyword coverage and rankability equal or better — human tone AND full SEO, both at once, never one at the expense of the other.`
