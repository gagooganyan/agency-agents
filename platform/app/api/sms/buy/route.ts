import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buyNumber, getServices } from '@/lib/providers/fivesim'
import { debitBalance } from '@/lib/utils/balance'
import type { ApiResponse } from '@/types'

const MARKUP = 2

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { country, service } = await req.json()
  if (!country || !service) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'country and service required' }, { status: 400 })
  }

  const serviceSupabase = await createServiceClient()

  // Get user balance
  const { data: userData } = await serviceSupabase
    .from('users')
    .select('balance_cents')
    .eq('id', user.id)
    .single()

  // Get service price
  const services = await getServices(country)
  const svc = services[service]
  if (!svc) return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Service not available' }, { status: 400 })

  const priceCents = Math.ceil(svc.Price * MARKUP * 100)

  if (!userData || userData.balance_cents < priceCents) {
    return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Insufficient balance' }, { status: 402 })
  }

  // Buy number from 5sim
  const order = await buyNumber(country, service)

  // Debit balance
  await debitBalance(user.id, priceCents)

  // Save to DB
  const { data: sim } = await serviceSupabase
    .from('sims')
    .insert({
      user_id: user.id,
      phone_number: order.phone,
      service,
      country,
      status: 'waiting',
      fivesim_order_id: order.id,
      price_cents: priceCents,
      expires_at: new Date(order.expires).toISOString(),
    })
    .select()
    .single()

  // Record transaction
  await serviceSupabase.from('transactions').insert({
    user_id: user.id,
    type: 'purchase',
    amount_cents: priceCents,
    currency: 'USD',
    status: 'completed',
    provider: '5sim',
    product_type: 'sms',
    product_id: sim.id,
    payment_method: 'card',
  })

  return NextResponse.json<ApiResponse<typeof sim>>({ data: sim, error: null })
}
