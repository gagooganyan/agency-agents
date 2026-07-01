'use client'
import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminPage() {
  const [stats, setStats] = useState<{ totalUsers: number; totalSims: number; totalRevenueCents: number } | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(j => setStats(j.data))
  }, [])

  const cards = stats ? [
    { label: 'Total users', value: stats.totalUsers.toString() },
    { label: 'SMS activations', value: stats.totalSims.toString() },
    { label: 'Total revenue', value: `$${(stats.totalRevenueCents / 100).toFixed(2)}` },
  ] : []

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Overview</h1>
      <div className="grid grid-cols-3 gap-4">
        {stats ? cards.map(({ label, value }) => (
          <div key={label} className="glass rounded-xl p-6">
            <p className="text-sm text-muted-foreground mb-2">{label}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
          </div>
        )) : Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 bg-white/5 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
