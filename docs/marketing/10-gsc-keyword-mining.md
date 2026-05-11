# Phase 7A — GSC Keyword Mining: GCP Setup Guide

**Goal:** give the `mine-gsc-keywords` script read-only access to your Google Search Console data so it can pull, per tool slug, every query where we rank positions 5-20 (page 1 but not clicking — high-intent, rankable). The output JSON drives generation order for Phase 7B-7M (compare pages, alternatives, worth-it, how-to, hubs).

**Why:** GSC has the only reliable signal of what real Google users are searching that surfaces our pages. Free, lossless, no scraping. Quota is 1,200 queries/min — way more than we'll ever use.

**Time:** 10-15 minutes. One-time setup.

---

## Step 1 — Create a Google Cloud project

1. Open https://console.cloud.google.com
2. Sign in with the Google account that owns Search Console for rightaichoice.com.
3. Click the project dropdown (top-left, next to "Google Cloud") → **New Project**.
4. Name: `rightaichoice-gsc` (anything works). Leave "Organization" blank.
5. Click **Create**, wait ~10 seconds, then make sure the new project is selected in the dropdown.

## Step 2 — Enable the Search Console API

1. Search bar at the top → type `Search Console API` → click the result.
2. Click the blue **Enable** button.
3. Wait for "API enabled" confirmation.

## Step 3 — Create a service account

1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts
2. Make sure your `rightaichoice-gsc` project is selected at the top.
3. Click **+ Create Service Account**.
4. Name: `gsc-mining`. Description: `Phase 7A keyword mining`.
5. Click **Create and Continue**.
6. **Skip** the "Grant access" step (no project roles needed). Click **Continue**.
7. **Skip** "Grant users access". Click **Done**.

## Step 4 — Generate the JSON key

1. You should now see your `gsc-mining` service account in the list. Click it.
2. Tab: **Keys** → **Add Key** → **Create new key**.
3. Key type: **JSON**. Click **Create**.
4. A JSON file downloads (e.g. `rightaichoice-gsc-1234abcd.json`). **This is your credential file** — never commit it to git.
5. Note the service account's email (looks like `gsc-mining@rightaichoice-gsc.iam.gserviceaccount.com`). You'll need it for Step 6.

## Step 5 — Move the JSON key somewhere safe

```bash
mkdir -p ~/.gsc
mv ~/Downloads/rightaichoice-gsc-*.json ~/.gsc/key.json
chmod 600 ~/.gsc/key.json
```

(Adjust the source path if your browser saves elsewhere.)

## Step 6 — Share Search Console with the service account

This is the bit everyone forgets — **GCP and GSC are separate products**. Granting the service account a GCP role is NOT enough; you also need to add it as a *Search Console user*.

1. Open https://search.google.com/search-console
2. Top-left property dropdown → select `rightaichoice.com` (or `https://rightaichoice.com/` if it's a URL-prefix property).
3. Settings (gear icon, bottom-left) → **Users and permissions**.
4. Click **Add user**.
5. Email: paste the service account email from Step 4 (e.g. `gsc-mining@rightaichoice-gsc.iam.gserviceaccount.com`).
6. Permission: **Restricted** (read-only is enough — we never write to GSC from this script).
7. Click **Add**.

## Step 7 — Add the env vars to `.env.local`

In `rightaichoice/.env.local`, add two lines:

```bash
# Phase 7A — GSC keyword mining
GSC_SERVICE_ACCOUNT_KEY_PATH=/Users/<your-username>/.gsc/key.json
GSC_SITE_URL=sc-domain:rightaichoice.com
```

**`GSC_SITE_URL` value depends on how your property is verified:**
- Domain property (recommended, covers all subdomains + http/https): `sc-domain:rightaichoice.com`
- URL-prefix property (single host+protocol): `https://rightaichoice.com/` (trailing slash required)

Check which one you have in Search Console → Settings → Ownership verification. If you see "Domain property", use the `sc-domain:` form. If you see a URL like `https://rightaichoice.com/`, use that.

## Step 8 — Smoke-test against one tool

```bash
cd rightaichoice
npm run mine:gsc:apply -- --slug=kit
```

Expected output (within 5 seconds):

```
Site URL:     sc-domain:rightaichoice.com
Lookback:     90 days
Position:     5–20
Tools:        1 (of 1178 published)
Mode:         APPLY (real GSC calls)

Date range:   2026-02-09 → 2026-05-09

Resuming: 0 done, 1 remaining

✓ Wrote N opportunities to scripts/.gsc-opportunities.json
  Bucket totals: { compare: ..., alternative: ..., 'worth-it': ..., 'how-to': ..., 'use-case': ..., unbucketed: ... }
```

If you see `403 User does not have sufficient permission for site` — go back to Step 6, the service account isn't a verified user on the property yet (can take a minute to propagate after Add).

If you see `400 Site not found` — the `GSC_SITE_URL` form doesn't match the verified property. Try the other form (sc-domain vs https://).

## Step 9 — Full run

```bash
rm scripts/.gsc-mining-progress.json   # optional: clear single-tool checkpoint
npm run mine:gsc:apply
```

Takes ~6 minutes for 1,178 tools at 5-way concurrency. Output lands at `scripts/.gsc-opportunities.json` and is consumed by Phase 7B-7M generation scripts.

---

## What to do if GSC is too sparse

If your Search Console property has < 30 days of data, the output will be thin. Two paths:

1. **Wait a few weeks**, then re-run — GSC builds history fast once a sitemap is verified.
2. **Use the 7A.fallback path** (not yet built; spec'd in `Phase8(site-overhaul-v2)/plan.md`) — Reddit/Quora scraping + Google Suggest harvesting. Lower-quality signal, no auth needed.

## Cost

Free. GSC API quota is 1,200 queries/min/project; full run uses ~1,178 queries spread over ~6 minutes. We never come close to the limit.

## Security

- The JSON key file (`~/.gsc/key.json`) is a long-lived credential. Treat it like a password.
- It's in `~/.gsc/` (outside the repo) so it can't be accidentally committed.
- If you ever need to revoke it: GCP Console → Service Accounts → `gsc-mining` → Keys → delete the active key, generate a new one, swap into `.env.local`.

## What this script outputs

`scripts/.gsc-opportunities.json` — opportunity rows like:

```json
{
  "tool_slug": "kit",
  "page_path": "/tools/kit",
  "page_type": "compare",
  "target_keyword": "kit vs mailchimp",
  "current_position": 11.4,
  "impressions": 320,
  "clicks": 8,
  "ctr": 0.025,
  "est_volume_score": 28.1
}
```

Sorted descending by `est_volume_score` (impressions / position). Phase 7B reads the `compare` bucket; 7C reads `alternative`; 7D reads `worth-it`; 7E reads `use-case`; 7M reads `how-to`. The top of each bucket gets generated first.
