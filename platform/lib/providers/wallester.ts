const BASE = process.env.WALLESTER_API_URL ?? 'https://api.wallester.com'
const KEY = process.env.WALLESTER_API_KEY!

async function wallesterFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Wallester ${path} failed (${res.status}): ${body}`)
  }
  return res.json()
}

export interface WallesterCard {
  id: string
  status: string
  masked_pan: string
  expiry_month: number
  expiry_year: number
  currency: string
}

export async function createCardholder(userId: string, email: string): Promise<{ id: string }> {
  return wallesterFetch('/v1/cardholders', {
    method: 'POST',
    body: JSON.stringify({ external_id: userId, email }),
  })
}

export async function issueCard(cardholderId: string, currency: 'EUR' | 'USD'): Promise<WallesterCard> {
  return wallesterFetch('/v1/cards', {
    method: 'POST',
    body: JSON.stringify({
      cardholder_id: cardholderId,
      currency,
      card_type: 'virtual',
    }),
  })
}

export async function getCard(wallesterCardId: string): Promise<WallesterCard> {
  return wallesterFetch(`/v1/cards/${wallesterCardId}`)
}

export async function setCardStatus(wallesterCardId: string, status: 'frozen' | 'active'): Promise<void> {
  await wallesterFetch(`/v1/cards/${wallesterCardId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}
