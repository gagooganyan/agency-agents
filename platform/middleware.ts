import createMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/cards', '/esim', '/numbers', '/sms', '/kyc', '/balance', '/bundles']
const AUTH_PAGES = ['/login', '/register']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Strip locale prefix before checking auth routes
  const strippedPath = path.replace(/^\/(en|ru)/, '') || '/'

  const isProtected = PROTECTED_PREFIXES.some(p => strippedPath.startsWith(p))
  const isAuthPage = AUTH_PAGES.some(p => strippedPath.startsWith(p))

  if (isProtected || isAuthPage) {
    let supabaseResponse = NextResponse.next({ request })
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
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
    const { data: { user } } = await supabase.auth.getUser()

    if (isProtected && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (isAuthPage && user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
