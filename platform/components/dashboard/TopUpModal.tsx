'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Bitcoin } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export default function TopUpModal({ open, onClose }: Props) {
  const [amount, setAmount] = useState('20')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCrypto() {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/payments/cryptomus/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    })
    const json = await res.json()
    if (json.error) { setError(json.error); setLoading(false); return }
    window.location.href = json.data.payment_url
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-white/10 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle>Top up balance</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-muted-foreground">Amount (USD)</Label>
            <div className="flex gap-2 mt-1">
              {['10', '20', '50', '100'].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors ${
                    amount === v ? 'border-violet-500 bg-violet-500/20 text-white' : 'border-white/10 text-muted-foreground hover:border-white/30'
                  }`}
                >
                  ${v}
                </button>
              ))}
            </div>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-2 bg-white/5 border-white/10"
              placeholder="Custom amount"
              min="5"
              max="1000"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button
            onClick={handleCrypto}
            className="w-full bg-violet-600 hover:bg-violet-700"
            disabled={loading}
          >
            <Bitcoin size={16} className="mr-2" />
            {loading ? 'Opening payment...' : 'Pay with Crypto (USDT/BTC/ETH)'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Minimum $5 · Balance credited after confirmation
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
