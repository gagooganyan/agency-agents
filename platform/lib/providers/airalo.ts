const BASE = process.env.AIRALO_API_URL ?? 'https://sandbox-partners-api.airalo.com'

let tokenCache: { token: string; expiresAt: number } | null = null

export async function getAiraloToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token

  const res = await fetch(`${BASE}/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: new URLSearchParams({
      client_id: process.env.AIRALO_CLIENT_ID!,
      client_secret: process.env.AIRALO_CLIENT_SECRET!,
      grant_type: 'client_credentials',
    }),
  })
  if (!res.ok) throw new Error(`Airalo auth failed: ${await res.text()}`)
  const json = await res.json() as { data: { access_token: string; expires_in: number } }
  tokenCache = { token: json.data.access_token, expiresAt: Date.now() + (json.data.expires_in - 60) * 1000 }
  return tokenCache.token
}

export interface AiraloPackage {
  id: string
  type: string
  title: string
  data: string
  validity: string
  price: number
  country: string
  image: { url: string } | null
}

export async function getPackages(country?: string): Promise<AiraloPackage[]> {
  const token = await getAiraloToken()
  const url = new URL(`${BASE}/v2/packages`)
  if (country) url.searchParams.set('filter[country]', country)
  url.searchParams.set('limit', '20')

  const res = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
  })
  if (!res.ok) throw new Error(`Airalo packages failed: ${await res.text()}`)
  const json = await res.json() as { data?: AiraloPackage[] }
  return json.data ?? []
}

export interface AiraloOrder {
  id: string
  code: string
  sims: { iccid: string; qrcode: string }[]
}

export async function createAiraloOrder(packageId: string): Promise<AiraloOrder> {
  const token = await getAiraloToken()
  const res = await fetch(`${BASE}/v2/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ package_id: packageId, quantity: 1 }),
  })
  if (!res.ok) throw new Error(`Airalo order failed: ${await res.text()}`)
  const json = await res.json() as { data: AiraloOrder }
  return json.data
}

export function parseDataGb(data: string): number {
  const normalized = data.trim().toUpperCase()
  const match = /^([\d.]+)\s*(GB|MB)$/.exec(normalized)
  if (!match) return 0
  const value = parseFloat(match[1])
  return match[2] === 'MB' ? value / 1024 : value
}
