'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import type { Sim } from '@/types'

const STATUS_COLOR: Record<string, string> = {
  waiting: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  received: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  cancelled: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  expired: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default function SmsPage() {
  const router = useRouter()
  const [countries, setCountries] = useState<Array<{ key: string; name: string }>>([])
  const [services, setServices] = useState<Array<{ key: string; price_cents: number; count: number }>>([])
  const [country, setCountry] = useState('')
  const [service, setService] = useState('')
  const [sims, setSims] = useState<Sim[]>([])
  const [buying, setBuying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/sms/countries').then(r => r.json()).then(j => setCountries(j.data ?? []))
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('sims').select('*').order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => setSims(data ?? []))
  }, [])

  useEffect(() => {
    if (!country) return
    setServices([])
    setService('')
    fetch(`/api/sms/services?country=${country}`).then(r => r.json()).then(j => setServices(j.data ?? []))
  }, [country])

  async function handleBuy() {
    setBuying(true)
    setError(null)
    const res = await fetch('/api/sms/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country, service }),
    })
    const json = await res.json()
    if (json.error) { setError(json.error); setBuying(false); return }
    router.push(`/sms/${json.data.id}`)
  }

  const selectedService = services.find(s => s.key === service)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">SMS Activations</h1>
        <p className="text-muted-foreground text-sm">Get a one-time number to verify any service</p>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Buy a number</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Country</label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                {countries.map(c => (
                  <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Service</label>
            <Select value={service} onValueChange={setService} disabled={!country || services.length === 0}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                {services.map(s => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.key} — ${(s.price_cents / 100).toFixed(2)} ({s.count} available)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button
          onClick={handleBuy}
          disabled={!country || !service || buying}
          className="bg-violet-600 hover:bg-violet-700"
        >
          {buying ? 'Buying...' : selectedService ? `Buy for $${(selectedService.price_cents / 100).toFixed(2)}` : 'Buy number'}
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Recent activations</h2>
        {sims.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center text-muted-foreground text-sm">No activations yet</div>
        ) : (
          <div className="space-y-3">
            {sims.map(sim => (
              <div key={sim.id} className="glass rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-mono">{sim.phone_number}</p>
                  <p className="text-sm text-muted-foreground">{sim.service} · {sim.country}</p>
                </div>
                <div className="flex items-center gap-3">
                  {sim.sms_code && <span className="font-mono text-emerald-400 font-bold">{sim.sms_code}</span>}
                  <Badge className={`border ${STATUS_COLOR[sim.status]}`}>{sim.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
