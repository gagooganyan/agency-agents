'use client'
import { Suspense } from 'react'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import BalanceWidget from '@/components/dashboard/BalanceWidget'
import TopUpModal from '@/components/dashboard/TopUpModal'
import TransactionTable from '@/components/dashboard/TransactionTable'
import { CheckCircle2 } from 'lucide-react'

function BalancePageInner() {
  const [modalOpen, setModalOpen] = useState(false)
  const params = useSearchParams()
  const success = params.get('success') === '1'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Balance</h1>
        <p className="text-muted-foreground text-sm">Top up and track your spending</p>
      </div>

      {success && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <CheckCircle2 size={20} />
          <span className="text-sm">Payment received. Balance updated.</span>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <BalanceWidget />
        <div className="glass rounded-2xl p-6 flex flex-col justify-between">
          <p className="text-sm text-muted-foreground mb-4">Add funds to your account</p>
          <Button onClick={() => setModalOpen(true)} className="bg-violet-600 hover:bg-violet-700 w-full">
            Top up balance
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Transaction history</h2>
        <TransactionTable />
      </div>

      <TopUpModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}

export default function BalancePage() {
  return (
    <Suspense>
      <BalancePageInner />
    </Suspense>
  )
}
