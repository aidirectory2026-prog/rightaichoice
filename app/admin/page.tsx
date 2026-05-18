import { redirect } from 'next/navigation'

// Phase 8.e — Knowledge Room is the operator's first stop: real-time
// pipeline + activity status. /admin/tools is one click away in the nav.
export default function AdminPage() {
  redirect('/admin/updates')
}
