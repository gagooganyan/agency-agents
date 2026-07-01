import crypto from 'crypto'

const API_BASE = 'https://api.cryptomus.com/v1'

function sign(data: object): string {
  const json = Buffer.from(JSON.stringify(data)).toString('base64')
  return crypto
    .createHash('md5')
    .update(json + process.env.CRYPTOMUS_API_KEY!)
    .digest('hex')
}

export async function createPayment(params: {
  amount: string
  currency: string
  orderId: string
  urlReturn: string
  urlCallback: string
}) {
  const body = {
    amount: params.amount,
    currency: params.currency,
    order_id: params.orderId,
    url_return: params.urlReturn,
    url_callback: params.urlCallback,
    is_payment_multiple: false,
    lifetime: 3600,
  }

  const res = await fetch(`${API_BASE}/payment`, {
    method: 'POST',
    headers: {
      'merchant': process.env.CRYPTOMUS_MERCHANT_ID!,
      'sign': sign(body),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = await res.json()
  if (!res.ok || json.state !== 0) throw new Error(json.message ?? 'Cryptomus error')
  return json.result as { uuid: string; url: string; order_id: string }
}

export function verifyWebhookSign(data: Record<string, unknown>): boolean {
  const receivedSign = data.sign as string
  const payload = { ...data }
  delete payload.sign
  const expected = sign(payload)
  return expected === receivedSign
}
