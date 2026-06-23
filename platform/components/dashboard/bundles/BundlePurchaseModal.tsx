'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BundlePlan } from '@/lib/bundles'

const NUMBER_COUNTRIES = [
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

const ESIM_COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'TR', label: 'Turkey' },
  { value: 'TH', label: 'Thailand' },
  { value: 'JP', label: 'Japan' },
  { value: 'SG', label: 'Singapore' },
  { value: 'AE', label: 'UAE' },
  { value: 'IN', label: 'India' },
  { value: 'FR', label: 'France' },
]

interface EsimPackage {
  id: string
  title: string
  data: string
  price: number
}

interface Props {
  plan: BundlePlan
  onClose: () => void
}

export function BundlePurchaseModal({ plan, onClose }: Props) {
  const router = useRouter()
  const [numberCountry, setNumberCountry] = useState('US')
  const [esimCountry, setEsimCountry] = useState('US')
  const [packages, setPackages] = useState<EsimPackage[]>([])
  const [packageId, setPackageId] = useState('')
  const [loadingPkgs, setLoadingPkgs] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadPackages(esimCountry) }, [])

  async function loadPackages(country: string) {
    setLoadingPkgs(true)
    setPackageId('')
    try {
      const res = await fetch(`/api/esim/packages?country=${country}`)
      const json = await res.json() as { data?: EsimPackage[]; error?: string }
      if (json.error) { setPackages([]); return }
      setPackages(json.data ?? [])
      if (json.data?.length) setPackageId(json.data[0].id)
    } finally {
      setLoadingPkgs(false)
    }
  }

  async function purchase() {
    if (!packageId) { setError('Select an eSIM package'); return }
    setPurchasing(true)
    setError('')
    try {
      const res = await fetch('/api/bundles/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: plan.id,
          number_country: numberCountry,
          esim_country: esimCountry,
          esim_package_id: packageId,
        }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok || json.error) { setError(json.error ?? 'Purchase failed'); return }
      router.refresh()
      onClose()
    } finally {
      setPurchasing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold text-white">Configure {plan.name}</h2>

        <div>
          <label className="text-sm text-white/60">Virtual Number Country</label>
          <select
            value={numberCountry}
            onChange={e => setNumberCountry(e.target.value)}
            className="w-full mt-1 bg-white/10 text-white rounded-xl px-3 py-2 border border-white/20"
          >
            {NUMBER_COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm text-white/60">eSIM Country</label>
          <select
            value={esimCountry}
            onChange={e => { setEsimCountry(e.target.value); loadPackages(e.target.value) }}
            className="w-full mt-1 bg-white/10 text-white rounded-xl px-3 py-2 border border-white/20"
          >
            {ESIM_COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {packages.length > 0 && (
          <div>
            <label className="text-sm text-white/60">eSIM Package</label>
            <select
              value={packageId}
              onChange={e => setPackageId(e.target.value)}
              className="w-full mt-1 bg-white/10 text-white rounded-xl px-3 py-2 border border-white/20"
            >
              {packages.map(p => (
                <option key={p.id} value={p.id}>{p.title} — {p.data} — ${(p.price / 100).toFixed(2)}</option>
              ))}
            </select>
          </div>
        )}
        {loadingPkgs && <p className="text-sm text-white/50">Loading packages…</p>}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 border border-white/20 text-white rounded-xl py-2 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={purchase}
            disabled={purchasing || !packageId}
            className="flex-1 bg-white text-black font-semibold rounded-xl py-2 hover:bg-white/90 disabled:opacity-50"
          >
            {purchasing ? 'Purchasing…' : `Pay $${(plan.price_cents / 100).toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
