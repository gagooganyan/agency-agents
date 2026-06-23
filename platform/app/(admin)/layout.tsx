import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

// To grant admin access, run in Supabase SQL editor:
// update public.users set is_admin = true where email = 'your@email.com';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceSupabase = await createServiceClient()
  const { data } = await serviceSupabase.from('users').select('is_admin').eq('id', user.id).single()
  if (!data?.is_admin) redirect('/dashboard')

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-white/5 p-4 space-y-1">
        <p className="text-xs text-muted-foreground px-3 py-2 uppercase tracking-wider">Admin</p>
        {[
          { href: '/admin', label: 'Overview' },
          { href: '/admin/users', label: 'Users' },
          { href: '/admin/transactions', label: 'Transactions' },
        ].map(({ href, label }) => (
          <Link key={href} href={href} className="block px-3 py-2 text-sm text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            {label}
          </Link>
        ))}
        <Link href="/dashboard" className="block px-3 py-2 text-sm text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg transition-colors mt-4">
          ← Back to dashboard
        </Link>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
