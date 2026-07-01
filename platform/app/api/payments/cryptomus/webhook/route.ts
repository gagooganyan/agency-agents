import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSign } from '@/lib/providers/cryptomus'
import { creditBalance } from '@/lib/utils/balance'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (!verifyWebhookSign(body)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Only process paid status
  if (body.status !== 'paid' && body.status !== 'paid_over') {
    return NextResponse.json({ ok: true })
  }

  const orderId = body.order_id as string
  const supabase = await createServiceClient()

  // Find pending transaction
  const { data: txn } = await supabase
    .from('transactions')
    .select('*')
    .eq('external_id', orderId)
    .eq('status', 'pending')
    .single()

  if (!txn) return NextResponse.json({ ok: true }) // Already processed

  // Mark transaction completed first (idempotency guard)
  const { error: updateError } = await supabase
    .from('transactions')
    .update({ status: 'completed' })
    .eq('id', txn.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }

  // Credit balance after status is locked
  await creditBalance(txn.user_id, txn.amount_cents)

  return NextResponse.json({ ok: true })
}
