'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface KycReviewButtonsProps {
  docId: string
}

export function KycReviewButtons({ docId }: KycReviewButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  async function handleAction(status: 'approved' | 'rejected') {
    setLoading(status)
    const res = await fetch(`/api/admin/kyc/${docId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const json = await res.json()
    if (!res.ok || json.error) {
      alert(`Action failed: ${json.error ?? 'Unknown error'}`)
      setLoading(null)
      return
    }
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleAction('approved')}
        disabled={loading !== null}
        className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded"
      >
        Approve
      </button>
      <button
        onClick={() => handleAction('rejected')}
        disabled={loading !== null}
        className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm rounded"
      >
        Reject
      </button>
    </div>
  )
}
