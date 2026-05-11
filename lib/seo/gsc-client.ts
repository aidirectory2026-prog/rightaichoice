/**
 * Phase 7A — Google Search Console API client.
 *
 * Thin wrapper around the GSC `searchAnalytics.query` REST endpoint
 * using service-account JWT auth. We deliberately avoid the heavy
 * `googleapis` package — only `google-auth-library` is needed.
 *
 * Auth flow:
 *   1. Reads service-account JSON key from GSC_SERVICE_ACCOUNT_KEY_PATH
 *   2. JWT-signed Bearer token, scoped to webmasters.readonly
 *   3. POST to searchconsole.googleapis.com REST endpoint
 *
 * The GSC site can be either a domain property (`sc-domain:example.com`)
 * or a URL-prefix property (`https://example.com/`). Default is domain
 * since that's what we recommend in docs/marketing/10-gsc-keyword-mining.md.
 */

import { JWT } from 'google-auth-library'

const GSC_BASE = 'https://searchconsole.googleapis.com/webmasters/v3'
const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']

let jwtClient: JWT | null = null

function getJwt(): JWT {
  if (jwtClient) return jwtClient
  const keyPath = process.env.GSC_SERVICE_ACCOUNT_KEY_PATH
  if (!keyPath) {
    throw new Error(
      'GSC_SERVICE_ACCOUNT_KEY_PATH not set. See docs/marketing/10-gsc-keyword-mining.md for setup.'
    )
  }
  // google-auth-library reads the JSON keyfile lazily on first authorize().
  jwtClient = new JWT({ keyFile: keyPath, scopes: SCOPES })
  return jwtClient
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
  const jwt = getJwt()
  const token = await jwt.authorize()
  const accessToken = token.access_token
  if (!accessToken) throw new Error('GSC auth returned no access_token')

  const encoded = encodeURIComponent(siteUrl)
  const url = `${GSC_BASE}/sites/${encoded}/searchAnalytics/query`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
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
