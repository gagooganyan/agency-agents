'use client'

import { useState } from 'react'
import { Esim } from '@/types'
import { useRouter } from 'next/navigation'

interface Package {
  id: string
  title: string
  data: string
  validity: string
  price: number
  country: string
}

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'TR', label: 'Turkey' },
  { value: 'TH', label: 'Thailand' },
  { value: 'JP', label: 'Japan' },
  { value: 'SG', label: 'Singapore' },
  { value: 'AE', label: 'UAE' },
  { value: 'IN', label: 'India' },
]

export function EsimPackageList({ existingEsims }: { existingEsims: Esim[] }) {
  const [country, setCountry] = useState('US')
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(false)
  const [buying, setBuying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function fetchPackages() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/esim/packages?country=${country}`)
      const json = await res.json() as { data: Package[] | null; error: string | null }
      if (json.error) { setError(json.error); return }
      setPackages(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function buyPackage(pkg: Package) {
    setBuying(pkg.id)
    setError(null)
    const res = await fetch('/api/esim/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: pkg.id, country }),
    })
    const json = await res.json() as { data: Esim | null; error: string | null }
    setBuying(null)
    if (json.error) { setError(json.error); return }
    if (json.data) router.push(`/esim/${json.data.id}`)
  }

  return (
    <div className="space-y-6">
      {existingEsims.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Your eSIMs</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {existingEsims.map(e => (
              <a key={e.id} href={`/esim/${e.id}`} className="glass rounded-xl p-4 hover:bg-white/10 transition-colors">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">{e.country} · {e.data_gb} GB</p>
                    <p className="text-white/40 text-sm">{new Date(e.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${e.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {e.status}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Browse Packages</h2>
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
          <button onClick={fetchPackages} disabled={loading} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm disabled:opacity-50">
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="grid gap-3 md:grid-cols-3">
          {packages.map(pkg => (
            <div key={pkg.id} className="glass rounded-xl p-4">
              <h3 className="text-white font-medium mb-1">{pkg.title}</h3>
              <p className="text-white/60 text-sm">{pkg.data} · {pkg.validity}</p>
              <p className="text-violet-400 font-bold mt-2">${(pkg.price / 100).toFixed(2)}</p>
              <button
                onClick={() => buyPackage(pkg)}
                disabled={buying === pkg.id}
                className="w-full mt-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg disabled:opacity-50"
              >
                {buying === pkg.id ? 'Ordering...' : 'Buy'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
