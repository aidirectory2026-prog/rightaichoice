/**
 * Phase 7A — Google Search Console API client (OAuth 2.0 path).
 *
 * Uses OAuth 2.0 Desktop user credentials (NOT service-account keys —
 * they're blocked by the iam.disableServiceAccountKeyCreation org policy
 * Google enforces by default on new GCP organizations).
 *
 * Auth flow:
 *   1. One-time bootstrap (`npm run gsc:oauth:bootstrap`) does the
 *      browser-based "click Allow" flow and saves a refresh_token
 *      to GSC_OAUTH_TOKEN_PATH.
 *   2. On every API call, this client exchanges the refresh_token
 *      for a fresh 1-hour access_token (transparent — google-auth-library
 *      handles the refresh).
 *   3. POST to searchconsole.googleapis.com REST endpoint.
 *
 * The GSC site can be either a domain property (`sc-domain:example.com`)
 * or a URL-prefix property (`https://example.com/`). Default is domain.
 */

import { OAuth2Client } from 'google-auth-library'
import { readFileSync } from 'fs'

const GSC_BASE = 'https://searchconsole.googleapis.com/webmasters/v3'

let oauthClient: OAuth2Client | null = null

function getOAuthClient(): OAuth2Client {
  if (oauthClient) return oauthClient
  const clientPath = process.env.GSC_OAUTH_CLIENT_PATH
  const tokenPath = process.env.GSC_OAUTH_TOKEN_PATH
  if (!clientPath || !tokenPath) {
    throw new Error(
      'GSC OAuth not set up. Set GSC_OAUTH_CLIENT_PATH and GSC_OAUTH_TOKEN_PATH in .env.local, then run `npm run gsc:oauth:bootstrap`. See docs/marketing/10-gsc-keyword-mining.md.'
    )
  }
  const clientJson = JSON.parse(readFileSync(clientPath, 'utf-8'))
  // Desktop OAuth client JSON wraps creds under either "installed" or "web"
  const creds = clientJson.installed || clientJson.web
  if (!creds || !creds.client_id || !creds.client_secret) {
    throw new Error(`OAuth client JSON at ${clientPath} is missing client_id/client_secret.`)
  }
  const tokenJson = JSON.parse(readFileSync(tokenPath, 'utf-8'))
  if (!tokenJson.refresh_token) {
    throw new Error(
      `Token file at ${tokenPath} has no refresh_token. Re-run \`npm run gsc:oauth:bootstrap\`.`
    )
  }
  oauthClient = new OAuth2Client(creds.client_id, creds.client_secret)
  oauthClient.setCredentials({ refresh_token: tokenJson.refresh_token })
  return oauthClient
}

export type GscRow = {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export type SearchAnalyticsQuery = {
  startDate: string
  endDate: string
  dimensions: Array<'page' | 'query' | 'date' | 'country' | 'device'>
  rowLimit?: number
  startRow?: number
  dimensionFilterGroups?: Array<{
    filters: Array<{
      dimension: 'page' | 'query' | 'country' | 'device'
      operator: 'equals' | 'contains' | 'notContains' | 'notEquals'
      expression: string
    }>
  }>
}

export async function querySearchAnalytics(
  siteUrl: string,
  body: SearchAnalyticsQuery
): Promise<GscRow[]> {
  const client = getOAuthClient()
  const { token } = await client.getAccessToken()
  if (!token) throw new Error('Failed to refresh OAuth access token — try re-running bootstrap.')

  const encoded = encodeURIComponent(siteUrl)
  const url = `${GSC_BASE}/sites/${encoded}/searchAnalytics/query`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GSC API ${res.status}: ${text.slice(0, 500)}`)
  }

  const data = (await res.json()) as { rows?: GscRow[] }
  return data.rows ?? []
}

/**
 * Convenience helper — queries one page path, returns query-level rows.
 * Filters server-side via dimensionFilterGroups for efficiency.
 */
export async function queriesForPage(
  siteUrl: string,
  pagePath: string,
  startDate: string,
  endDate: string
): Promise<GscRow[]> {
  return querySearchAnalytics(siteUrl, {
    startDate,
    endDate,
    dimensions: ['query'],
    rowLimit: 1000,
    dimensionFilterGroups: [
      {
        filters: [
          { dimension: 'page', operator: 'contains', expression: pagePath },
        ],
      },
    ],
  })
}
