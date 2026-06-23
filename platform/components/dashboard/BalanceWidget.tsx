'use client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, TrendingUp } from 'lucide-react'
import { useBalance } from '@/hooks/useBalance'

export default function BalanceWidget() {
  const { formatted } = useBalance()

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">Available balance</span>
        <TrendingUp size={16} className="text-muted-foreground" />
      </div>
      {formatted ? (
        <p className="text-4xl font-bold text-white mb-6">{formatted}</p>
      ) : (
        <Skeleton className="h-10 w-32 mb-6 bg-white/5" />
      )}
      <Button className="bg-violet-600 hover:bg-violet-700" asChild>
        <Link href="/dashboard/balance">
          <Plus size={16} className="mr-2" />
          Top up
        </Link>
      </Button>
    </div>
  )
}
