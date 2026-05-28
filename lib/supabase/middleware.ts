import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Paths where we MUST resolve the auth state (protect, or bounce signed-in
// users off /login + /signup). Every other path — tool pages, compares,
// homepage, categories, blog, public APIs — skips the Supabase auth round-trip.
function pathNeedsAuth(path: string): boolean {
  if (path === '/login' || path === '/signup') return true
  return (
    path.startsWith('/dashboard') ||
    path.startsWith('/admin') ||
    path.startsWith('/profile') ||
    path.startsWith('/submit-tool') ||
    path.startsWith('/saved') ||
    path.startsWith('/api/admin') ||
    path.startsWith('/api/account')
  )
}

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Fast path: anonymous browse traffic skips the auth round-trip entirely.
  // Also skip if there's no sb-* session cookie present — nothing to refresh.
  if (!pathNeedsAuth(path)) {
    return NextResponse.next({ request })
  }
  const hasSessionCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))
  // /login + /signup still need a getUser() to bounce already-authed users —
  // but only if a session cookie exists. No cookie → definitely anonymous.
  if (!hasSessionCookie && (path === '/login' || path === '/signup')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — do not remove
  const { data: { user } } = await supabase.auth.getUser()

  // Protect write routes
  const protectedPaths = ['/dashboard', '/profile', '/submit-tool']
  const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    // Phase 7 redirect-back: preserve the original path so the user lands
    // back where they were trying to go after signing in. Includes the
    // search string so query-state is round-tripped (e.g. /plan?q=...).
    const original = request.nextUrl.pathname + request.nextUrl.search
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', original)
    return NextResponse.redirect(url)
  }

  // Phase 7 Step 53 (BUG-008): authed users hitting /login or /signup
  // bounce to /dashboard. Scoped to those two exact paths — putting this
  // in the (auth) layout would break /update-password and /forgot-password,
  // which legitimately require an authed session (magic-link callback flow).
  const authOnlyPaths = ['/login', '/signup']
  if (authOnlyPaths.includes(request.nextUrl.pathname) && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
