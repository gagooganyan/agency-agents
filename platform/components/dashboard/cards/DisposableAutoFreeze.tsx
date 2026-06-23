'use client'

import { useEffect } from 'react'

export function DisposableAutoFreeze() {
  useEffect(() => {
    fetch('/api/cards/expire', { method: 'POST' }).catch(() => {})
  }, [])
  return null
}
