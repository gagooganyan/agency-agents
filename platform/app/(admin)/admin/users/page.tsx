'use client'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type { User } from '@/types'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    fetch('/api/admin/users').then(r => r.json()).then(j => setUsers(j.data ?? []))
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Users</h1>
      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              {['Email', 'Name', 'Balance', 'KYC', 'Joined'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-muted-foreground font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                <td className="px-4 py-3 text-white">{u.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.name ?? '—'}</td>
                <td className="px-4 py-3 text-white">${(u.balance_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Badge className={u.kyc_status === 'verified' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}>
                    {u.kyc_status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
