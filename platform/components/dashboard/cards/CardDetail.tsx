'use client'

import { useState } from 'react'
import { Card } from '@/types'
import { useRouter } from 'next/navigation'

export function CardDetail({ card }: { card: Card }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function toggleFreeze() {
    setLoading(true)
    await fetch(`/api/cards/${card.id}/freeze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: card.status === 'frozen' ? 'unfreeze' : 'freeze' }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="glass rounded-xl p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-white">{card.currency} Virtual Card</h1>
          <span className={`text-sm px-3 py-1 rounded-full ${
            card.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
          }`}>{card.status}</span>
        </div>
        <p className="text-white/60 text-sm">Issued {new Date(card.created_at).toLocaleDateString()}</p>
      </div>

      <div className="space-y-3 mb-8">
        <div className="flex justify-between">
          <span className="text-white/40">Card Number</span>
          <span className="text-white font-mono">•••• •••• •••• {card.last_four ?? '????'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Expiry</span>
          <span className="text-white">{card.expiry_month}/{card.expiry_year}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Balance</span>
          <span className="text-white">{card.currency} {(card.balance_cents / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Tariff</span>
          <span className="text-white capitalize">{card.tariff}</span>
        </div>
      </div>

      {card.status !== 'closed' && (
        <button
          onClick={toggleFreeze}
          disabled={loading}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            card.status === 'frozen'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-yellow-600 hover:bg-yellow-700 text-white'
          }`}
        >
          {loading ? '...' : card.status === 'frozen' ? 'Unfreeze Card' : 'Freeze Card'}
        </button>
      )}
    </div>
  )
}
