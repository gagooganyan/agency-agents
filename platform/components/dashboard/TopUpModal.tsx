'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PRESETS = [1000, 2000, 5000, 10000] // cents

interface Props {
  open: boolean
  onClose: () => void
}

export function TopUpModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<'crypto' | 'card'>('crypto')
  const [amount, setAmount] = useState(2000)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    const endpoint = tab === 'crypto'
      ? '/api/payments/cryptomus/create'
      : '/api/payments/paddle/create'
    // cryptomus expects { amount } in dollars; paddle expects { amount_cents }
    const body = tab === 'crypto'
      ? { amount: String(amount / 100) }
      : { amount_cents: amount }
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.error) { setError(json.error); return }
      const url = tab === 'crypto' ? json.data.payment_url : json.data.checkout_url
      window.location.href = url
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle>Top Up Balance</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          {(['crypto', 'card'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {t === 'crypto' ? 'Crypto (USDT/BTC)' : 'Card (Visa/MC)'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {PRESETS.map(p => (
            <button
              key={p}
              onClick={() => setAmount(p)}
              className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                amount === p ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              ${p / 100}
            </button>
          ))}
        </div>

        <Input
          type="number"
          min={5}
          max={1000}
          value={amount / 100}
          onChange={e => setAmount(Math.round(parseFloat(e.target.value) * 100))}
          className="bg-white/5 border-white/10 text-white mb-4"
          placeholder="Custom amount ($)"
        />

        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

        <Button
          onClick={handleSubmit}
          disabled={loading || amount < 500}
          className="w-full bg-violet-600 hover:bg-violet-700"
        >
          {loading ? 'Redirecting...' : `Pay $${(amount / 100).toFixed(2)}`}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export default TopUpModal
