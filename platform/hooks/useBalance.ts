'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useBalance() {
  const [balanceCents, setBalanceCents] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function fetchBalance() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('users')
        .select('balance_cents')
        .eq('id', user.id)
        .single()
      if (data) setBalanceCents(data.balance_cents)
    }

    fetchBalance()

    const interval = setInterval(fetchBalance, 10000)

    return () => { clearInterval(interval) }
  }, [])

  const formatted = balanceCents !== null
    ? `$${(balanceCents / 100).toFixed(2)}`
    : null

  return { balanceCents, formatted }
}
