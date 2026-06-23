'use client'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import type { Transaction } from '@/types'

const STATUS_COLOR: Record<string, string> = {
  completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default function TransactionTable() {
  const [txns, setTxns] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setTxns(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <Skeleton className="h-48 w-full bg-white/5 rounded-xl" />

  if (txns.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center text-muted-foreground text-sm">
        No transactions yet
      </div>
    )
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5">
            {['Date', 'Type', 'Amount', 'Status'].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {txns.map((t) => (
            <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(t.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-white capitalize">{t.type}</td>
              <td className="px-4 py-3 text-white font-medium">
                {t.type === 'topup' ? '+' : '-'}${(t.amount_cents / 100).toFixed(2)}
              </td>
              <td className="px-4 py-3">
                <Badge className={`border ${STATUS_COLOR[t.status]}`}>{t.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
