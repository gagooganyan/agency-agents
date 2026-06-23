import crypto from 'crypto'

// Paddle Billing API v1
const PADDLE_API_BASE = 'https://api.paddle.com'

export async function createPaddleCheckout(
  amountCents: number,
  userId: string,
  transactionId: string,
): Promise<{ url: string }> {
  const res = await fetch(`${PADDLE_API_BASE}/transactions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PADDLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{
        price: {
          description: 'Balance top-up',
          unit_price: { amount: String(amountCents), currency_code: 'USD' },
          product: { name: 'Balance Top-up', tax_category: 'digital-goods' },
        },
        quantity: 1,
      }],
      custom_data: { user_id: userId, transaction_id: transactionId },
      checkout: { url: `${process.env.NEXT_PUBLIC_APP_URL}/balance?success=1` },
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Paddle API error: ${body}`)
  }
  const json = await res.json()
  return { url: json.data.checkout.url }
}

export function verifyPaddleWebhook(
  rawBody: string,
  signatureHeader: string,
): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET!
  // Paddle uses ts=<timestamp>;h1=<hmac-sha256>
  const parts = Object.fromEntries(
    signatureHeader.split(';').map(p => p.split('=') as [string, string])
  )
  const ts = parts['ts']
  const h1 = parts['h1']
  const payload = `${ts}:${rawBody}`
  const expectedHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  const computedHmac = h1
  const expectedBuf = Buffer.from(expectedHmac, 'hex')
  const actualBuf = Buffer.from(computedHmac, 'hex')
  if (expectedBuf.length !== actualBuf.length) return false
  if (!crypto.timingSafeEqual(expectedBuf, actualBuf)) return false
  const tsNum = parseInt(parts['ts'] ?? '0', 10)
  if (Date.now() / 1000 - tsNum > 300) return false
  return true
}
