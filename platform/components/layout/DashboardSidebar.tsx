'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { LayoutDashboard, MessageSquare, Wallet, LogOut, CreditCard, Wifi, Phone, ShieldCheck, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, key: 'home' as const },
  { href: '/balance', icon: Wallet, key: 'balance' as const },
  { href: '/sms', icon: MessageSquare, key: 'sms' as const },
  { href: '/cards', icon: CreditCard, key: 'cards' as const },
  { href: '/esim', icon: Wifi, key: 'esim' as const },
  { href: '/numbers', icon: Phone, key: 'numbers' as const },
  { href: '/kyc', icon: ShieldCheck, key: 'kyc' as const },
  { href: '/bundles', icon: Package, key: 'bundles' as const },
]

export default function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('nav')

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function switchLocale(newLocale: string) {
    // Strip existing locale prefix then add new one if needed
    const stripped = pathname.replace(/^\/(en|ru)/, '') || '/'
    const newPath = newLocale === 'en' ? stripped : `/${newLocale}${stripped}`
    router.push(newPath)
  }

  return (
    <aside className="w-60 min-h-screen border-r border-white/5 flex flex-col p-4">
      <Link href="/" className="flex items-center gap-2 mb-8 px-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">P</div>
        <span className="font-semibold text-white">PayGlobal</span>
      </Link>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ href, icon: Icon, key }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              pathname === href
                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20'
                : 'text-muted-foreground hover:text-white hover:bg-white/5'
            )}
          >
            <Icon size={18} />
            {t(key)}
          </Link>
        ))}
      </nav>

      <button
        onClick={signOut}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors w-full"
      >
        <LogOut size={18} />
        Sign out
      </button>

      <div className="flex gap-2 px-3 pb-4 pt-2">
        <button
          onClick={() => switchLocale('en')}
          className={`text-xs px-2 py-1 rounded ${locale === 'en' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'}`}
        >
          EN
        </button>
        <button
          onClick={() => switchLocale('ru')}
          className={`text-xs px-2 py-1 rounded ${locale === 'ru' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/60'}`}
        >
          RU
        </button>
      </div>
    </aside>
  )
}
