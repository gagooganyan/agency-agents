'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const t = useTranslations('auth')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/verify-email')
  }

  return (
    <div className="glass rounded-2xl p-8">
      <h1 className="text-2xl font-bold text-white mb-2">{t('register')}</h1>
      <p className="text-muted-foreground text-sm mb-6">{t('subtitle')}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-muted-foreground">{t('name')}</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 bg-white/5 border-white/10"
            placeholder="John Smith"
            required
          />
        </div>
        <div>
          <Label htmlFor="email" className="text-muted-foreground">{t('email')}</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 bg-white/5 border-white/10"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <Label htmlFor="password" className="text-muted-foreground">{t('password')}</Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="mt-1 bg-white/5 border-white/10"
            placeholder="Min 8 characters"
            minLength={8}
            required
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 h-11" disabled={loading}>
          {loading ? '...' : t('register')}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        {t('have_account')}{' '}
        <Link href="/login" className="text-violet-400 hover:text-violet-300">{t('login')}</Link>
      </p>
    </div>
  )
}
