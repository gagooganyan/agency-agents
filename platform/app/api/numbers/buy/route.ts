import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { purchaseNumber } from '@/lib/providers/twilio'
import { debitBalance, creditBalance } from '@/lib/utils/balance'
import { ApiResponse, VirtualNumber } from '@/types'

const MONTHLY_PRICE_CENTS = 700

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const body = await req.json() as { phone_number?: string; country?: string }
  const { phone_number, country } = body
  if (!phone_number || !country) {
    return NextResponse.json({ data: null, error: 'phone_number and country required' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    await debitBalance(user.id, MONTHLY_PRICE_CENTS)
  } catch {
    return NextResponse.json({ data: null, error: 'Insufficient balance' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    const { sid, number } = await purchaseNumber(phone_number)
    const nextRenewal = new Date()
    nextRenewal.setDate(nextRenewal.getDate() + 30)

    const service = await createServiceClient()
    const { data: vn, error } = await service
      .from('virtual_numbers')
      .insert({
        user_id: user.id,
        twilio_sid: sid,
        number,
        country,
        monthly_price_cents: MONTHLY_PRICE_CENTS,
        next_renewal_at: nextRenewal.toISOString(),
        status: 'active',
      })
      .select()
      .single()

    if (error || !vn) throw new Error('Failed to save number')

    await service.from('transactions').insert({
      user_id: user.id,
      type: 'purchase',
      amount_cents: MONTHLY_PRICE_CENTS,
      currency: 'USD',
      status: 'completed',
      provider: 'twilio',
      product_type: 'number',
      product_id: vn.id,
      payment_method: 'card',
    })

    return NextResponse.json({ data: vn as VirtualNumber, error: null } satisfies ApiResponse<VirtualNumber>)
  } catch (err: unknown) {
    await creditBalance(user.id, MONTHLY_PRICE_CENTS)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ data: null, error: message } satisfies ApiResponse<never>, { status: 500 })
  }
}
