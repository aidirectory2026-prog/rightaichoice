# RightAIChoice — All Routes (localhost:3000)

Quick reference for manually testing every page.

---

## Public Pages

| Route | Description |
|-------|-------------|
| [http://localhost:3000](http://localhost:3000) | Homepage — hero, search, featured tools, categories, trending |
| [http://localhost:3000/tools](http://localhost:3000/tools) | Tool listing — filters, search, pagination |
| [http://localhost:3000/tools?search=writing](http://localhost:3000/tools?search=writing) | Search results for "writing" |
| [http://localhost:3000/tools?category=text-generation](http://localhost:3000/tools?category=text-generation) | Filter by category |
| [http://localhost:3000/tools?pricing=free](http://localhost:3000/tools?pricing=free) | Filter by pricing |
| [http://localhost:3000/tools?pricing=free&skill_level=beginner&sort=newest](http://localhost:3000/tools?pricing=free&skill_level=beginner&sort=newest) | Combined filters |
| [http://localhost:3000/tools/chatgpt](http://localhost:3000/tools/chatgpt) | Tool detail page (replace slug with any real tool) |
| [http://localhost:3000/tools/nonexistent-tool](http://localhost:3000/tools/nonexistent-tool) | 404 — tool not found |
| [http://localhost:3000/u/tanmay](http://localhost:3000/u/tanmay) | Public profile (replace with real username) |
| [http://localhost:3000/u/nobody999](http://localhost:3000/u/nobody999) | 404 — user not found |
| [http://localhost:3000/questions](http://localhost:3000/questions) | Global Q&A feed — all questions across tools |
| [http://localhost:3000/questions/{id}](http://localhost:3000/questions/{id}) | Question detail — full question + answers (SEO page) |

## Auth Pages

| Route | Description |
|-------|-------------|
| [http://localhost:3000/login](http://localhost:3000/login) | Sign in |
| [http://localhost:3000/signup](http://localhost:3000/signup) | Sign up |
| [http://localhost:3000/forgot-password](http://localhost:3000/forgot-password) | Password reset request |
| [http://localhost:3000/update-password](http://localhost:3000/update-password) | Set new password (after email link) |

## Authenticated Pages

| Route | Description |
|-------|-------------|
| [http://localhost:3000/dashboard](http://localhost:3000/dashboard) | User dashboard — saved tools, reviews, reputation, edit profile |

## Admin Pages

| Route | Description |
|-------|-------------|
| [http://localhost:3000/admin](http://localhost:3000/admin) | Admin dashboard |
| [http://localhost:3000/admin/tools](http://localhost:3000/admin/tools) | Manage tools |
| [http://localhost:3000/admin/tools/new](http://localhost:3000/admin/tools/new) | Add new tool |

## Auth Callbacks (system routes, don't visit directly)

| Route | Description |
|-------|-------------|
| /auth/callback | OAuth callback handler |
| /auth/confirm | Email confirmation (PKCE + token_hash) |
