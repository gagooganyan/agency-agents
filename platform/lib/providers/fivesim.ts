const BASE = 'https://5sim.net/v1'

async function call<T>(path: string, method = 'GET', body?: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${process.env.FIVESIM_API_KEY}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`5sim API error ${res.status}: ${path}`)
  return res.json()
}

export async function getCountries(): Promise<Record<string, { name: string; prefix: string; iso: string }>> {
  return call('/guest/countries')
}

export async function getServices(country: string): Promise<Record<string, { Count: number; Price: number }>> {
  return call(`/guest/products/${country}/any`)
}

export interface FiveSimOrder {
  id: number
  phone: string
  operator: string
  product: string
  price: number
  status: string
  sms: Array<{ text: string; code: string; created_at: string }>
  created_at: string
  expires: string
}

export async function buyNumber(country: string, service: string): Promise<FiveSimOrder> {
  return call(`/user/buy/activation/${country}/any/${service}`, 'GET')
}

export async function checkOrder(orderId: number): Promise<FiveSimOrder> {
  return call(`/user/check/${orderId}`)
}

export async function cancelOrder(orderId: number): Promise<FiveSimOrder> {
  return call(`/user/cancel/${orderId}`)
}
