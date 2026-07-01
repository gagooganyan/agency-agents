'use client'

import { BundlePlan } from '@/lib/bundles'

interface Props {
  plan: BundlePlan
  onSelect: () => void
}

export function BundleCard({ plan, onSelect }: Props) {
  return (
    <div className="glass rounded-2xl p-6 flex flex-col gap-4">
      <div>
        <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
        <p className="text-sm text-white/60 mt-1">{plan.description}</p>
      </div>
      <ul className="text-sm text-white/70 space-y-1">
        <li>✓ 1 virtual card ({plan.includes.card_currency})</li>
        <li>✓ 1 virtual number (your country)</li>
        <li>✓ 1 eSIM data package ({plan.includes.esim_data_min_gb}GB+)</li>
      </ul>
      <div className="flex items-center justify-between mt-auto">
        <span className="text-2xl font-bold text-white">
          ${(plan.price_cents / 100).toFixed(2)}
        </span>
        <button
          onClick={onSelect}
          className="bg-white text-black font-semibold px-4 py-2 rounded-xl hover:bg-white/90 transition"
        >
          Get Pack
        </button>
      </div>
    </div>
  )
}
