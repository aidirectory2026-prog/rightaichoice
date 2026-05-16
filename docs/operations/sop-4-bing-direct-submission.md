# SOP-4 — Bing Webmaster Direct URL Submission

**Why this exists.** IndexNow already pings Bing, but the Bing Webmaster API SubmitUrlbatch endpoint is a separate, stronger crawl signal — it goes through Bing's authenticated intake rather than the generic IndexNow firehose. Bing also powers Microsoft Copilot + ChatGPT search results, so getting indexed there has compounding upside beyond traditional web search.

## One-time setup

1. Go to https://www.bing.com/webmasters and sign in with the same Microsoft account that owns the verified `rightaichoice.com` property (the sitemap was submitted there on 2026-04-10).
2. Top-right gear icon → **Settings** → **API Access**.
3. Click **Generate** to mint an API key (32-character string).
4. Add to `.env.local`:
   ```
   BING_WEBMASTER_API_KEY=<the generated key>
   ```
5. Verify:
   ```
   npm run bing:submit:dry
   ```
   You should see a list of 20 URLs that would be submitted.

## When to submit

| Event | Run |
|---|---|
| New batch of compare/tool pages goes live | `npm run bing:submit -- --all` |
| Major editorial refresh (Phase 4 SOP completes) | `npm run bing:submit -- --all` |
| Single tool republished | submit the URL via the Bing Webmaster dashboard manually (faster than running the script for one URL) |

## Quotas

- 500 URLs / site / day (Bing's hard cap).
- The script splits into 500-URL batches and stops at the daily quota — if our catalog grows beyond 500 URLs in a category, we'll need to rotate batches across multiple days.
- IndexNow has no documented daily cap; use it for bulk re-submissions, use Bing direct submission for surgical/strategic pushes.

## Verification

After submission:
1. https://www.bing.com/webmasters → URL Inspection
2. Paste any URL from the batch.
3. "Submitted" status should appear within 60 seconds.
4. Indexation typically follows within 48-72 hours for high-quality URLs.

## Failure modes

- **403 Forbidden** — API key is wrong, missing, or the Microsoft account doesn't own the property. Re-generate key in Settings → API Access.
- **400 Bad Request** with "Daily quota exceeded" — wait until next UTC midnight.
- **400 Bad Request** with "URL not under siteUrl" — script bug; verify `SITE_URL` in `scripts/submit-urls-bing.ts` matches the property's exact format (with or without trailing slash, http vs https — Bing is strict).

## Cost

$0. No paid tier needed. The API key is free with any verified Bing Webmaster account.
