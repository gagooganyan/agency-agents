'use client'
import { useEffect, useState, useCallback } from 'react'
import type { Sim } from '@/types'

export function useSmsPolling(simId: string, initialSim: Sim) {
  const [sim, setSim] = useState<Sim>(initialSim)
  const [polling, setPolling] = useState(initialSim.status === 'waiting')

  const poll = useCallback(async () => {
    const res = await fetch(`/api/sms/status/${simId}`)
    const json = await res.json()
    if (json.data) {
      setSim(json.data)
      if (json.data.status !== 'waiting') setPolling(false)
    }
  }, [simId])

  useEffect(() => {
    if (!polling) return
    const interval = setInterval(poll, 5000) // poll every 5 seconds
    return () => clearInterval(interval)
  }, [polling, poll])

  return { sim }
}
