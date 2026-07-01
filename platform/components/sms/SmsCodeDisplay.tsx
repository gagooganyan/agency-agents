'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSmsPolling } from '@/hooks/useSmsPolling'
import { Copy, RefreshCw, X } from 'lucide-react'
import type { Sim } from '@/types'

export default function SmsCodeDisplay({ initialSim }: { initialSim: Sim }) {
  const router = useRouter()
  const { sim } = useSmsPolling(initialSim.id, initialSim)
  const [copied, setCopied] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const timeLeft = Math.max(0, Math.floor((new Date(sim.expires_at).getTime() - Date.now()) / 1000))
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  async function copyCode() {
    if (!sim.sms_code) return
    await navigator.clipboard.writeText(sim.sms_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function cancel() {
    setCancelling(true)
    await fetch(`/api/sms/cancel/${sim.id}`, { method: 'POST' })
    router.push('/dashboard/sms')
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Waiting for SMS</h1>
        <p className="text-muted-foreground text-sm">Register on the service using the number below</p>
      </div>

      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Phone number</span>
          <Badge className={sim.status === 'received' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border'}>
            {sim.status}
          </Badge>
        </div>
        <p className="text-3xl font-mono font-bold text-white tracking-wider">{sim.phone_number}</p>
        <p className="text-sm text-muted-foreground">Service: <span className="text-white">{sim.service}</span> · Country: <span className="text-white">{sim.country}</span></p>
      </div>

      {sim.status === 'waiting' && (
        <div className="glass rounded-2xl p-6 text-center space-y-3">
          <RefreshCw size={32} className="text-violet-400 mx-auto animate-spin" style={{ animationDuration: '3s' }} />
          <p className="text-white font-medium">Waiting for SMS...</p>
          <p className="text-sm text-muted-foreground">Expires in {mins}:{secs.toString().padStart(2, '0')}</p>
        </div>
      )}

      {sim.status === 'received' && sim.sms_code && (
        <div className="glass rounded-2xl p-6 space-y-3 border border-emerald-500/20 bg-emerald-500/5">
          <p className="text-sm text-muted-foreground">Verification code</p>
          <p className="text-5xl font-mono font-bold text-emerald-400 tracking-widest">{sim.sms_code}</p>
          <Button onClick={copyCode} variant="outline" className="border-white/10">
            <Copy size={14} className="mr-2" />
            {copied ? 'Copied!' : 'Copy code'}
          </Button>
        </div>
      )}

      {sim.status === 'waiting' && (
        <Button variant="ghost" onClick={cancel} disabled={cancelling} className="text-muted-foreground hover:text-white">
          <X size={16} className="mr-2" />
          {cancelling ? 'Cancelling...' : 'Cancel and refund'}
        </Button>
      )}
    </div>
  )
}
