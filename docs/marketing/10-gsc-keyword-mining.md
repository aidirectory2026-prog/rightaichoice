# Phase 7A — GSC Keyword Mining: GCP OAuth Setup Guide

**Goal:** give the `mine-gsc-keywords` script read-only access to your Google Search Console data so it can pull, per tool slug, every query where we rank positions 5-20 (page 1 but not clicking — high-intent, rankable). The output JSON drives generation order for Phase 7B-7M (compare pages, alternatives, worth-it, how-to, hubs).

**Why OAuth (not service accounts):** Google's "Secure by Default" org policy (`iam.disableServiceAccountKeyCreation`) blocks JSON service-account keys on most new GCP organizations. OAuth 2.0 user credentials sidestep that entirely — you authorize once via browser, the script stores a long-lived refresh token, and that's it.

**Time:** 10-15 minutes. One-time setup.

---

## Step 1 — Configure the OAuth consent screen

Even if you've already created the GCP project (`rightaichoice-gsc`) and enabled the Search Console API, you still need to set up the consent screen before you can create an OAuth client.

1. Open https://console.cloud.google.com/apis/credentials/consent
2. Make sure your `rightaichoice-gsc` project is selected at the top.
3. **User type:**
   - If you have a Google Workspace org: pick **Internal** (refresh tokens never expire — the cleanest option).
   - Otherwise: pick **External** (works fine; refresh token may expire after 7 days while the app stays in "Testing" status — see Step 5).
4. Click **Create**.
5. Fill in the minimal fields:
   - **App name:** `rightaichoice-gsc`
   - **User support email:** your email
   - **Developer contact email:** your email
   - Leave everything else blank.
6. Click **Save and Continue**.
7. **Scopes:** click **Add or Remove Scopes** → search for `webmasters.readonly` → check the box next to `https://www.googleapis.com/auth/webmasters.readonly` → **Update** → **Save and Continue**.
8. **Test users** (only shown if you picked External): click **+ Add Users**, paste your own Google email, **Add** → **Save and Continue**.
9. **Summary:** click **Back to Dashboard**.

## Step 2 — Create the OAuth Client ID

1. Open https://console.cloud.google.com/apis/credentials
2. Click **+ Create Credentials** → **OAuth client ID**.
3. **Application type:** **Desktop app**.
4. **Name:** `gsc-mining`.
5. Click **Create**.
6. A modal appears with your Client ID + Client Secret. Click **Download JSON** at the bottom — this saves a file like `client_secret_xxxxxxxx.apps.googleusercontent.com.json`.

## Step 3 — Move the JSON file somewhere safe

```bash
mkdir -p ~/.gsc
mv ~/Downloads/client_secret_*.json ~/.gsc/oauth-client.json
chmod 600 ~/.gsc/oauth-client.json
```

(Adjust the source path if your browser saves elsewhere.)

The OAuth client JSON contains your `client_id` + `client_secret`. Treat it like a password — it's outside the repo so it can't be accidentally committed.

## Step 4 — Add the env vars to `.env.local`

In `rightaichoice/.env.local`, add three lines:

```bash
# Phase 7A — GSC OAuth keyword mining
GSC_OAUTH_CLIENT_PATH=/Users/<your-username>/.gsc/oauth-client.json
GSC_OAUTH_TOKEN_PATH=/Users/<your-username>/.gsc/oauth-token.json
GSC_SITE_URL=sc-domain:rightaichoice.com
```

Replace `<your-username>` with your actual macOS username (run `whoami` in a terminal if you're not sure — likely `tanmay`).

**`GSC_SITE_URL` value depends on how your property is verified in Search Console:**
- Domain property (recommended, covers all subdomains + http/https): `sc-domain:rightaichoice.com`
- URL-prefix property (single host+protocol): `https://rightaichoice.com/` (trailing slash required)

Check which one you have at https://search.google.com/search-console → Settings → Ownership verification.

## Step 5 — Run the one-time browser auth flow

```bash
cd rightaichoice
npm run gsc:oauth:bootstrap
```

What happens:

1. The script prints a URL to your terminal, then opens your browser to that URL automatically.
2. Google shows a consent screen titled "rightaichoice-gsc wants access to your Google Account".
3. **If you see a "This app isn't verified" warning screen** — that's expected for any personal OAuth app. Click **Advanced** → **Go to rightaichoice-gsc (unsafe)**. It's not actually unsafe; Google just shows this warning until you submit the app for formal verification (a multi-week review process we don't need to do for a personal mining script).
4. Google asks you to confirm the `webmasters.readonly` scope. Click **Continue** or **Allow**.
5. Browser redirects to a localhost URL and shows a green "✓ Authorized" page. You can close the tab.
6. Terminal prints `✓ Saved refresh_token to ~/.gsc/oauth-token.json` and exits.

If the browser doesn't auto-open, copy the URL from your terminal and paste it manually.

## Step 6 — Smoke-test against one tool

```bash
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

If you see `403 User does not have sufficient permission` — your Google account isn't a verified user on the GSC property. Open Search Console → Settings → Users and permissions → confirm your email is listed with at least Restricted access.

If you see `400 Site not found` — the `GSC_SITE_URL` form doesn't match your verified property. Try the other form (sc-domain vs https://).

If you see `invalid_grant` — your refresh token expired (External-app + Testing-status apps expire refresh tokens after 7 days). Re-run `npm run gsc:oauth:bootstrap`. Long-term fix: switch the consent screen to "In production" status (Step 1, External users only) — once published you no longer hit the 7-day expiry.

## Step 7 — Full run

```bash
rm scripts/.gsc-mining-progress.json   # optional: clear single-tool checkpoint
npm run mine:gsc:apply
```

Takes ~6 minutes for 1,178 tools at 5-way concurrency. Output lands at `scripts/.gsc-opportunities.json` and is consumed by Phase 7B-7M generation scripts.

---

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

## What to do if GSC is too sparse

If your Search Console property has < 30 days of data, the output will be thin. Two paths:

1. **Wait a few weeks**, then re-run — GSC builds history fast once a sitemap is verified.
2. **Use the 7A.fallback path** (not yet built; spec'd in `Phase8(site-overhaul-v2)/plan.md`) — Reddit/Quora scraping + Google Suggest harvesting. Lower-quality signal, no auth needed.

## Cost

Free. GSC API quota is 1,200 queries/min/project; full run uses ~1,178 queries spread over ~6 minutes. We never come close to the limit.

## Security

- Both files in `~/.gsc/` are long-lived credentials. Treat them like passwords.
- They're outside the repo so they can't be accidentally committed.
- To revoke at any time: visit https://myaccount.google.com/permissions, find `rightaichoice-gsc`, click **Remove access**. Then re-run `npm run gsc:oauth:bootstrap` to re-authorize.

## Why the 7-day refresh-token expiry exists (External + Testing only)

Google added this in 2022 to limit blast radius for unverified OAuth apps. If you don't want to deal with it:

- **Best:** if your Google account is part of a Workspace org, change User Type to **Internal** in the consent screen. Refresh tokens never expire.
- **OK:** push your app to "In production" publishing status (consent screen → **Publish App** button). Google will accept this without verification for non-sensitive scopes — but `webmasters.readonly` is treated as sensitive, so they'll ask you to either submit for verification (slow) or keep using it personally (fine, just stays in test mode).
- **Just live with it:** re-run the bootstrap once a week if needed. Takes 30 seconds.
