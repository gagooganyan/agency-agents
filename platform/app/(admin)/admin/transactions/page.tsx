'use client'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type { Transaction } from '@/types'

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    fetch('/api/admin/transactions').then(r => r.json()).then(j => setTransactions(j.data ?? []))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Transactions</h1>
      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              {['ID', 'Type', 'Amount', 'Status', 'Provider', 'Date'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{t.id.slice(0, 8)}…</td>
                <td className="px-4 py-3">
                  <Badge className="bg-white/10 text-white border border-white/10">{t.type}</Badge>
                </td>
                <td className="px-4 py-3 text-white">${(t.amount_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Badge className={
                    t.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    t.status === 'failed' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }>
                    {t.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{t.provider ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
