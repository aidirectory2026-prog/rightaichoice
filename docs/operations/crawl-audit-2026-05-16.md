# Crawl Audit — 2026-05-16

**Question:** Are we blocking any crawl through robots.txt, meta robots, X-Robots-Tag, or middleware?

**Answer: No. Crawling is wide-open as intended.**

## Live evidence

```
$ curl https://rightaichoice.com/robots.txt
User-Agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /auth/
Disallow: /api/

Sitemap: https://rightaichoice.com/sitemap-index.xml

$ curl -I https://rightaichoice.com/tools/cursor | grep -i robots
(no X-Robots-Tag header — wide open)
```

## What we allow vs. what we block, by surface

| Surface | Allowed? | Notes |
|---|---|---|
| `/` (home) | ✅ Crawl + index | |
| `/tools/[slug]` | ✅ Crawl + index | 1,176 pages — the indexation prize |
| `/tools/[slug]/alternatives` | ✅ Crawl + index | |
| `/tools/[slug]/report` | ✅ Crawl + index | |
| `/compare/[slug]` | ✅ Crawl + index | 587 editorial pairs |
| `/categories/[slug]` | ✅ Crawl + index | |
| `/best/[slug]` | ✅ Crawl + index | |
| `/stacks/[slug]` | ✅ Crawl + index | |
| `/for/[slug]` | ✅ Crawl + index | |
| `/blog/[slug]` | ✅ Crawl + index | |
| `/embed/*` | ✅ Crawl + index | Widgets — discoverable for vendor adoption |
| `/sitemap-index.xml` | ✅ | Linked from robots.txt |
| Per-type sitemaps | ✅ | All 8 reachable from the index |
| `/search` | ✅ Crawl, ❌ index | `robots: { index: false, follow: true }` — correct (faceted search results shouldn't index, but links should pass) |
| `/saved` | ❌ index ❌ follow | User-only data |
| `/unsubscribe` | ❌ index ❌ follow | Transactional |
| `/login`, `/signup` | ❌ index ❌ follow | Correct |
| `/admin/*` | ❌ Crawl | robots.txt disallow + auth gate |
| `/dashboard` | ❌ Crawl | robots.txt disallow + auth gate |
| `/api/*` | ❌ Crawl | robots.txt disallow |
| `/auth/*` | ❌ Crawl | robots.txt disallow |

## Files audited

1. **`app/robots.ts`** — points at `/sitemap-index.xml`, disallows only the 4 expected sensitive paths
2. **`app/layout.tsx`** — root `robots: { index: true, follow: true, googleBot: { ..., 'max-snippet': -1, 'max-image-preview': 'large' } }` — explicitly permissive
3. **Per-page `metadata.robots`** — only 5 noindex'd routes (saved, unsubscribe, search, login, signup), all correct
4. **`proxy.ts`** — only handles 308 redirects for deduped tool slugs; no bot filtering, no UA blocking
5. **`next.config.ts`** — CSP `frame-ancestors 'none'` globally, `*` on `/embed/*` only. CSP doesn't affect crawlers.
6. **Production headers** — no `X-Robots-Tag` anywhere. Only `X-Content-Type-Options: nosniff` (security, not crawl-related)
7. **Sitemap entries** — `/sitemap.xml` (static), `/{tools,compare,categories,best,stacks,for,blog}/sitemap.xml` all serve 200 with valid XML

## Bot-specific allow-listing

We don't have any bot-specific user-agent rules. Implicit: all bots (Googlebot, Bingbot, ChatGPTBot, GPTBot, anthropic-ai, PerplexityBot, etc.) get the same `Allow: /` treatment as `*`. This is the correct posture for a content site that *wants* to be discovered by AI training crawls.

## Net assessment

✅ **Nothing is blocking indexation.** The 4% indexed/submitted ratio in GSC isn't a robots issue — it's an authority issue (Strategy 2 in `strategy-5-approaches.md`).

## If we want to be MORE permissive (paranoid check)

Could add to `app/robots.ts`:

```ts
// Explicit per-AI-bot welcome — defensive against future tightening
{ userAgent: 'GPTBot', allow: '/' },
{ userAgent: 'ChatGPT-User', allow: '/' },
{ userAgent: 'PerplexityBot', allow: '/' },
{ userAgent: 'anthropic-ai', allow: '/' },
{ userAgent: 'CCBot', allow: '/' }, // Common Crawl — feeds many LLM training sets
```

Not strictly necessary (the `User-Agent: *` line already covers them), but redundant explicit allow is a defensible posture if we later see AI training crawlers being blocked by intermediaries (Cloudflare, etc.).

**Recommendation:** add the explicit list. Cost: 5 lines. Upside: 0 if `*` already covered them, +1 if Cloudflare ever silently changes default behavior.
