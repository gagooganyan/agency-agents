'use client'

import { useState } from 'react'
import { VirtualNumber } from '@/types'
import { useRouter } from 'next/navigation'

interface AvailableNumber {
  phoneNumber: string
  friendlyName: string
  isoCountry: string
  monthlyFee: number
}

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'SE', label: 'Sweden' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
]

export function NumberList({ numbers }: { numbers: VirtualNumber[] }) {
  const [country, setCountry] = useState('US')
  const [available, setAvailable] = useState<AvailableNumber[]>([])
  const [loading, setLoading] = useState(false)
  const [buying, setBuying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function search() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/numbers/available?country=${encodeURIComponent(country)}`)
      const json = await res.json() as { data: AvailableNumber[] | null; error: string | null }
      if (json.error) { setError(json.error); return }
      setAvailable(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function buy(phoneNumber: string) {
    setBuying(phoneNumber)
    setError(null)
    const res = await fetch('/api/numbers/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phoneNumber, country }),
    })
    const json = await res.json() as { data: VirtualNumber | null; error: string | null }
    setBuying(null)
    if (json.error) { setError(json.error); return }
    router.refresh()
  }

  async function cancel(id: string) {
    if (!confirm('Cancel this number? This cannot be undone.')) return
    const res = await fetch(`/api/numbers/${id}`, { method: 'DELETE' })
    const json = await res.json() as { data: { ok: boolean } | null; error: string | null }
    if (json.error) { setError(json.error); return }
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {numbers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Your Numbers</h2>
          <div className="space-y-3">
            {numbers.map(n => (
              <div key={n.id} className="glass rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-mono font-medium">{n.number}</p>
                  <p className="text-white/40 text-sm">{n.country} · renews {new Date(n.next_renewal_at).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => cancel(n.id)}
                  className="text-red-400 text-sm hover:text-red-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Rent a Number</h2>
        <p className="text-white/60 text-sm mb-4">$1.00/month · SMS-enabled local number</p>
        <div className="flex gap-3 mb-4">
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
          >
            {COUNTRIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button
            onClick={search}
            disabled={loading}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="space-y-2">
          {available.map(n => (
            <div key={n.phoneNumber} className="glass rounded-lg p-3 flex items-center justify-between">
              <div>
                <span className="text-white font-mono">{n.phoneNumber}</span>
                <p className="text-white/40 text-xs">{n.friendlyName}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-white/60 text-sm">${(n.monthlyFee / 100).toFixed(2)}/mo</span>
                <button
                  onClick={() => buy(n.phoneNumber)}
                  disabled={buying === n.phoneNumber}
                  className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded disabled:opacity-50"
                >
                  {buying === n.phoneNumber ? '...' : 'Rent'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
