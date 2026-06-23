import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createPaddleCheckout } from '@/lib/providers/paddle'
import type { ApiResponse } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { amount_cents } = await req.json()
  if (!Number.isInteger(amount_cents) || amount_cents <= 0) {
    return NextResponse.json({ data: null, error: 'amount_cents must be a positive integer' } satisfies ApiResponse<never>, { status: 400 })
  }
  if (!amount_cents || amount_cents < 500 || amount_cents > 100000) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Amount must be between $5 and $1000' }, { status: 400 })
  }

  const service = await createServiceClient()
  const { data: tx, error: txErr } = await service
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'topup',
      amount_cents,
      currency: 'USD',
      status: 'pending',
      provider: 'paddle',
      payment_method: 'card',
    })
    .select('id')
    .single()

  if (txErr || !tx) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Failed to create transaction' }, { status: 500 })
  }

  try {
    const { url } = await createPaddleCheckout(amount_cents, user.id, tx.id)
    return NextResponse.json<ApiResponse<{ checkout_url: string }>>({ data: { checkout_url: url }, error: null })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json<ApiResponse<null>>({ data: null, error: message }, { status: 500 })
  }
}
