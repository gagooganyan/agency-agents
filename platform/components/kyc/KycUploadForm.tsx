'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'id_card', label: 'National ID' },
  { value: 'driving_license', label: "Driver's License" },
]

export function KycUploadForm() {
  const [docType, setDocType] = useState('passport')
  const [front, setFront] = useState<File | null>(null)
  const [back, setBack] = useState<File | null>(null)
  const [selfie, setSelfie] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!front) { setError('Front image required'); return }
    setLoading(true)
    setError(null)

    const fd = new FormData()
    fd.append('document_type', docType)
    fd.append('front', front)
    if (back) fd.append('back', back)
    if (selfie) fd.append('selfie', selfie)

    try {
      const res = await fetch('/api/kyc/submit', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.error) { setError(json.error); return }
      router.push('/dashboard?kyc=submitted')
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div>
        <label className="block text-sm text-white/60 mb-2">Document Type</label>
        <select
          value={docType}
          onChange={e => setDocType(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
        >
          {DOCUMENT_TYPES.map(d => (
            <option key={d.value} value={d.value} className="bg-gray-900">{d.label}</option>
          ))}
        </select>
      </div>

      {[
        { label: 'Front Side *', setter: setFront, file: front },
        { label: 'Back Side', setter: setBack, file: back },
        { label: 'Selfie with Document', setter: setSelfie, file: selfie },
      ].map(({ label, setter, file }) => (
        <div key={label}>
          <label className="block text-sm text-white/60 mb-2">{label}</label>
          <input
            type="file"
            accept="image/*"
            onChange={e => setter(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-white/60 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-violet-600 file:text-white file:text-sm"
          />
          {file && <p className="text-xs text-green-400 mt-1">✓ {file.name}</p>}
        </div>
      ))}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <Button type="submit" disabled={loading || !front} className="bg-violet-600 hover:bg-violet-700">
        {loading ? 'Uploading...' : 'Submit for Review'}
      </Button>
    </form>
  )
}
