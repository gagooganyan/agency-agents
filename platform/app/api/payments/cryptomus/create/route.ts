import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createPayment } from '@/lib/providers/cryptomus'
import type { ApiResponse } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const amountUsd = parseFloat(body.amount)

  if (isNaN(amountUsd) || amountUsd < 5 || amountUsd > 1000) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Amount must be between $5 and $1000' }, { status: 400 })
  }

  const orderId = `${user.id}-${Date.now()}`

  // Create pending transaction
  const serviceSupabase = await createServiceClient()
  await serviceSupabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'topup',
      amount_cents: Math.round(amountUsd * 100),
      currency: 'USD',
      status: 'pending',
      provider: 'cryptomus',
      payment_method: 'crypto',
      external_id: orderId,
    })
    .select()
    .single()

  const payment = await createPayment({
    amount: amountUsd.toFixed(2),
    currency: 'USD',
    orderId,
    urlReturn: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/balance?success=1`,
    urlCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/cryptomus/webhook`,
  })

  return NextResponse.json<ApiResponse<{ payment_url: string; order_id: string }>>({
    data: { payment_url: payment.url, order_id: orderId },
    error: null,
  })
}
