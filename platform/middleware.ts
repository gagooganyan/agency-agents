import createMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/cards', '/esim', '/numbers', '/sms', '/kyc', '/balance', '/bundles']
const AUTH_PAGES = ['/login', '/register']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Detect current locale from path prefix
  const localeMatch = path.match(/^\/(en|ru)/)
  const locale = localeMatch ? localeMatch[1] : 'en'

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
      const loginPath = locale === 'en' ? '/login' : `/${locale}/login`
      const redirect = NextResponse.redirect(new URL(loginPath, request.url))
      supabaseResponse.cookies.getAll().forEach(c => redirect.cookies.set(c.name, c.value))
      return redirect
    }
    if (isAuthPage && user) {
      const dashPath = locale === 'en' ? '/dashboard' : `/${locale}/dashboard`
      const redirect = NextResponse.redirect(new URL(dashPath, request.url))
      supabaseResponse.cookies.getAll().forEach(c => redirect.cookies.set(c.name, c.value))
      return redirect
    }

    // Merge supabase session cookies into the intl response so cookie rotation is preserved
    const intlResponse = intlMiddleware(request)
    supabaseResponse.cookies.getAll().forEach(c => intlResponse.cookies.set(c.name, c.value))
    return intlResponse
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
