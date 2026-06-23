'use client'

import { useState } from 'react'
import { Card } from '@/types'
import { useRouter } from 'next/navigation'

const TARIFFS = [
  { id: 'standard', name: 'Standard', price: '$35/year', currency: 'EUR', perks: ['EUR Visa', 'Global payments', 'Online & POS'] },
  { id: 'premium',  name: 'Premium',  price: '$75/year', currency: 'USD', perks: ['USD Mastercard', 'Priority support', 'Higher limits'] },
]

export function CardList({ cards, kycVerified }: { cards: Card[]; kycVerified: boolean }) {
  const [ordering, setOrdering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function orderCard(tariff: string) {
    setOrdering(true)
    setError(null)
    const res = await fetch('/api/cards/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tariff }),
    })
    const json = await res.json()
    setOrdering(false)
    if (json.error) { setError(json.error); return }
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {cards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map(card => (
            <a key={card.id} href={`/cards/${card.id}`} className="glass rounded-xl p-6 hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <span className="text-white font-medium">{card.currency} Card</span>
                <span className={`text-xs px-2 py-1 rounded-full ${card.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {card.status}
                </span>
              </div>
              <p className="text-white/40 text-sm font-mono">•••• •••• •••• {card.last_four ?? '????'}</p>
              <p className="text-white/40 text-xs mt-1">{card.expiry_month}/{card.expiry_year}</p>
            </a>
          ))}
        </div>
      )}

      {kycVerified && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Order New Card</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {TARIFFS.map(t => (
              <div key={t.id} className="glass rounded-xl p-6">
                <h3 className="text-white font-semibold mb-1">{t.name}</h3>
                <p className="text-violet-400 text-xl font-bold mb-3">{t.price}</p>
                <ul className="space-y-1 mb-4">
                  {t.perks.map(p => <li key={p} className="text-white/60 text-sm">✓ {p}</li>)}
                </ul>
                <button
                  onClick={() => orderCard(t.id)}
                  disabled={ordering}
                  className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg disabled:opacity-50"
                >
                  {ordering ? 'Ordering...' : 'Order Card'}
                </button>
              </div>
            ))}
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>
      )}

      {!kycVerified && cards.length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-white/60">Complete identity verification to order virtual cards.</p>
          <a href="/kyc" className="inline-block mt-4 px-6 py-2 bg-violet-600 text-white rounded-lg text-sm">Verify Identity</a>
        </div>
      )}
    </div>
  )
}
