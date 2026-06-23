import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyPaddleWebhook } from '@/lib/providers/paddle'
import { creditBalance } from '@/lib/utils/balance'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('paddle-signature') ?? ''

  if (!verifyPaddleWebhook(rawBody, sig)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)
  if (event.event_type !== 'transaction.completed') {
    return NextResponse.json({ received: true })
  }

  const customData = event.data?.custom_data
  if (!customData?.transaction_id || !customData?.user_id) {
    return NextResponse.json({ error: 'Missing custom data' }, { status: 400 })
  }

  const service = await createServiceClient()

  // Idempotency: only process pending transactions
  const { data: tx } = await service
    .from('transactions')
    .select('id, status, amount_cents')
    .eq('id', customData.transaction_id)
    .eq('status', 'pending')
    .single()

  if (!tx) return NextResponse.json({ received: true }) // already processed or not found

  // Mark completed first, then credit
  await service
    .from('transactions')
    .update({ status: 'completed', external_id: event.data.id })
    .eq('id', tx.id)

  await creditBalance(customData.user_id, tx.amount_cents)

  return NextResponse.json({ received: true })
}
