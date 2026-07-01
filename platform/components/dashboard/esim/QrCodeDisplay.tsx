'use client'

import { useState } from 'react'

interface Props {
  qrCode: string
  iccid: string | null
}

export function QrCodeDisplay({ qrCode, iccid }: Props) {
  const [copied, setCopied] = useState(false)

  const src = qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`

  async function copyIccid() {
    if (!iccid) return
    await navigator.clipboard.writeText(iccid)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="text-center">
      <div className="inline-block p-4 bg-white rounded-xl mb-4">
        <img src={src} alt="eSIM QR Code" width={200} height={200} className="block" />
      </div>
      {iccid && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-white/60 text-sm font-mono">{iccid}</span>
          <button onClick={copyIccid} className="text-violet-400 text-sm hover:text-violet-300">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  )
}
