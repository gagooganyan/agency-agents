'use client'

import { useState } from 'react'
import { BundlePlan } from '@/lib/bundles'
import { BundlePurchase } from '@/types'
import { BundleCard } from './BundleCard'
import { BundlePurchaseModal } from './BundlePurchaseModal'

interface Props {
  plans: BundlePlan[]
  initialBundles: BundlePurchase[]
}

export function BundleStorefront({ plans, initialBundles }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<BundlePlan | null>(null)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Privacy Packs</h1>
        <p className="text-white/60 mt-1">Everything you need for private international access in one purchase.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map(plan => (
          <BundleCard key={plan.id} plan={plan} onSelect={() => setSelectedPlan(plan)} />
        ))}
      </div>

      {initialBundles.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Your Packs</h2>
          <div className="space-y-2">
            {initialBundles.map(b => (
              <div key={b.id} className="glass rounded-xl p-4 flex justify-between items-center">
                <span className="text-white font-medium">Privacy Pack</span>
                <span className="text-white/50 text-sm">{new Date(b.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedPlan && (
        <BundlePurchaseModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />
      )}
    </div>
  )
}
