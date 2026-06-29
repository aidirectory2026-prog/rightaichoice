# Operator Setup — turning the social tool ON (Phase 13)

> The whole engine is built, tested, and **safe-by-default**: every platform is OFF until you complete its
> section below. Nothing can post until (a) a `social_accounts` row exists with a valid token **and** (b)
> that platform's `*_ENABLED` env var is `1`. Until then the publish cron simply skips approved posts.

This is the **only** work left to go live. Do platforms in any order — each is independent. **Reddit and X
are the fastest** (minutes); **LinkedIn and Instagram need Meta/LinkedIn app review (~2–4 weeks)**, so start
those reviews early and they'll light up when approved.

> **Report env values to nobody.** Paste secrets into Vercel's env UI only. This doc names keys, never values.

---

## 0) Shared env (set once, in Vercel → Project → Settings → Environment Variables)

| Key | Value | Notes |
|---|---|---|
| `CRON_SECRET` | (already set) | guards every cron |
| `SOCIAL_PUBLIC_ORIGIN` | `https://rightaichoice.com` | where the public graphic route lives (Instagram needs it reachable) |
| `X_MONTHLY_CAP_USD` | e.g. `5` | hard monthly cap for X; the brain + publish cron stop X at this |
| `RESEND_API_KEY` | (already set) | the daily approval digest email |
| `ALERT_EMAIL` | your inbox | where the approval digest goes (falls back to the owner email) |
| `SLACK_WEBHOOK_URL` | (optional) | parallel Slack ping of the approval digest |
| `SOCIAL_DRAFTS_PER_PLATFORM` | (optional, default `1`) | how many drafts/platform the daily cron makes |

**How to connect any account** = insert/update one row in the `social_accounts` table (Supabase → SQL editor):

```sql
insert into public.social_accounts (platform, display_name, access_token, refresh_token, token_expires_at, external_account_id, status)
values ('<platform>', '<name>', '<access_token>', '<refresh_token>', '<iso-expiry-or-null>', '<org-urn / ig-user-id / reddit-username>', 'connected')
on conflict (platform) do update set
  access_token = excluded.access_token,
  refresh_token = excluded.refresh_token,
  token_expires_at = excluded.token_expires_at,
  external_account_id = excluded.external_account_id,
  status = 'connected',
  updated_at = now();
```

Then the daily `social-token-refresh` cron keeps the token alive (for X/LinkedIn/Reddit it needs the
client id/secret env below; Instagram refreshes itself).

---

## 1) Reddit (free · fastest · HIGH ban-risk → always manual-approve)

We already have `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` (read use). For **posting** you need a
user-context token on a real, aged account.

1. Use (or create) a Reddit account with **>30 days age and >50 comment karma** (our SOP minimums). Posting
   promo from a fresh account gets banned fast.
2. https://www.reddit.com/prefs/apps → **create app** → type **script** (or web app) → note the client id/secret.
3. Get a **user-context OAuth token** (scopes: `submit identity read`) via the standard Reddit OAuth flow
   (password grant for a script app, or the auth-code flow). Store the access + refresh token in
   `social_accounts` (platform `reddit`, `external_account_id` = your username).
4. Env: `REDDIT_ENABLED=1`, `REDDIT_USER_AGENT` = `web:rightaichoice:v1 (by /u/<yourusername>)`.
   (`REDDIT_CLIENT_ID/SECRET` already exist; needed for token refresh.)
5. **SOP reminder:** only the allowlisted subreddits (`lib/social/sops.ts` → `REDDIT_ALLOWLIST`), one post
   per sub per week, never the same link across subs, **always** review each post before approving. Respect
   each subreddit's self-promo rules.

## 2) X / Twitter (PAID · fast · budget-capped)

1. https://developer.x.com → create a **developer account** + a **Project & App**.
2. **Enable pay-per-use billing** and confirm your spend cap on X's side as a backstop. Set our cap with
   `X_MONTHLY_CAP_USD`.
3. App settings → **User authentication** → OAuth 2.0, scopes: `tweet.read tweet.write users.read offline.access`
   (`offline.access` gives a refresh token).
4. Run the OAuth2 auth-code+PKCE flow once to get the **user access token + refresh token**; store them in
   `social_accounts` (platform `x`).
5. Env: `X_ENABLED=1`, `X_CLIENT_ID`, `X_CLIENT_SECRET` (the last two for auto-refresh).
6. Cost shows live in `/admin/social`'s budget meter; the brain skips X drafts that would breach the cap,
   preferring no-link posts (10× cheaper) as it nears the cap.

## 3) LinkedIn (free · company page · ~2–4 wk review — start early)

1. https://www.linkedin.com/developers → **create an app**, link it to the **RightAIChoice company page**.
2. Add products: **Sign In with LinkedIn (OpenID)** + **Share on LinkedIn**, then **request the Community
   Management API** (scope `w_organization_social`). This request is **reviewed (~2–4 weeks)** + needs app
   verification by a page admin.
3. Once approved, run the OAuth flow to get a **60-day access token + ~1-yr refresh token**; store in
   `social_accounts` (platform `linkedin`). Put the company-page URN in `external_account_id`
   (format `urn:li:organization:<id>`) **or** set env `LINKEDIN_ORG_URN`.
4. Env: `LINKEDIN_ENABLED=1`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, (optional `LINKEDIN_API_VERSION`,
   default `202506`).

## 4) Instagram (free · Business/Creator · ~2–4 wk Meta App Review — start early)

1. Convert the IG account to **Business or Creator** and **link it to a Facebook Page**.
2. https://developers.facebook.com → create an app (type **Business**) → add **Instagram Graph API**.
3. Request permissions **`instagram_basic`, `instagram_content_publish`, `pages_read_engagement`** → submit
   for **App Review (~2–4 weeks)**.
4. Generate a **long-lived access token** for the IG user; store in `social_accounts` (platform `instagram`).
   Put the **IG user id** in `external_account_id` **or** set env `INSTAGRAM_USER_ID`.
5. Env: `INSTAGRAM_ENABLED=1`. (IG refreshes its own long-lived token via the token-refresh cron.)
6. Instagram **requires the graphic** (image-mandatory) — that's why our graphic route is public; no extra
   setup, it just works once the account is connected.

---

## 5) Verify a platform is live (do this per platform after connecting)

1. `/admin/social` → the **connection strip** shows that platform **connected**.
2. Approve one drafted post for that platform (pick a low-stakes one; for Reddit, double-check the sub).
3. Within 15 min the **`social-publish`** cron posts it → the row flips to **posted** with a live URL; for X
   the **budget meter** ticks up.
4. A few hours later **`social-metrics`** starts filling engagement; after a few posts, `social:insights`
   (and the brain's ranking) begin reflecting what performs.

## 6) Daily rhythm once live

- **Morning:** the approval-digest email lists what's waiting → open `/admin/social`, approve/edit/reschedule.
- The cloud crons handle the rest (drafting, posting on schedule, metrics, token refresh) — **laptop can be off**.
- Watch the **X budget meter**; adjust `X_MONTHLY_CAP_USD` anytime.

## Env quick-reference (names only)

```
# shared
CRON_SECRET, SOCIAL_PUBLIC_ORIGIN, X_MONTHLY_CAP_USD, RESEND_API_KEY, ALERT_EMAIL,
SLACK_WEBHOOK_URL (opt), SOCIAL_DRAFTS_PER_PLATFORM (opt)
# per-platform on-switches
X_ENABLED, X_CLIENT_ID, X_CLIENT_SECRET
REDDIT_ENABLED, REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT
LINKEDIN_ENABLED, LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_ORG_URN, LINKEDIN_API_VERSION (opt)
INSTAGRAM_ENABLED, INSTAGRAM_USER_ID
```
