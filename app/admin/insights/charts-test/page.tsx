import { redirect } from 'next/navigation'

// Phase 10.4.2 — charts-test was a one-off diagnostic page; the chart kit
// now lives in components/admin/charts. Old URL redirects.
export default function ChartsTestRedirect() {
  redirect('/admin/insights')
}
