import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { issueCard, createCardholder } from '@/lib/providers/wallester'
import { debitBalance, creditBalance } from '@/lib/utils/balance'
import { ApiResponse, Card } from '@/types'

const TARIFFS: Record<string, { price_cents: number; currency: 'EUR' | 'USD'; label: string }> = {
  standard: { price_cents: 3500, currency: 'EUR', label: 'Standard' },
  premium:  { price_cents: 7500, currency: 'USD', label: 'Premium' },
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const { tariff } = await req.json()
  const tariffConfig = TARIFFS[tariff]
  if (!tariffConfig) return NextResponse.json({ data: null, error: 'Invalid tariff' } satisfies ApiResponse<never>, { status: 400 })

  const service = await createServiceClient()

  // Require KYC
  const { data: profile } = await service.from('users').select('kyc_status, email').eq('id', user.id).single()
  if (profile?.kyc_status !== 'verified') {
    return NextResponse.json({ data: null, error: 'KYC verification required' } satisfies ApiResponse<never>, { status: 403 })
  }

  // Debit balance (throws if insufficient)
  try {
    await debitBalance(user.id, tariffConfig.price_cents)
  } catch {
    return NextResponse.json({ data: null, error: 'Insufficient balance' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    // Create or reuse cardholder
    const cardholder = await createCardholder(user.id, profile.email)
    const wallesterCard = await issueCard(cardholder.id, tariffConfig.currency)

    const { data: card, error } = await service
      .from('cards')
      .insert({
        user_id: user.id,
        wallester_card_id: wallesterCard.id,
        currency: tariffConfig.currency,
        status: 'active',
        balance_cents: 0,
        tariff,
        last_four: wallesterCard.masked_pan?.slice(-4) ?? null,
        expiry_month: wallesterCard.expiry_month,
        expiry_year: wallesterCard.expiry_year,
      })
      .select()
      .single()

    if (error || !card) throw new Error('Failed to save card')

    // Record transaction
    await service.from('transactions').insert({
      user_id: user.id,
      type: 'purchase',
      amount_cents: tariffConfig.price_cents,
      currency: tariffConfig.currency,
      status: 'completed',
      provider: 'wallester',
      product_type: 'card',
      product_id: card.id,
      payment_method: 'card',
    })

    return NextResponse.json({ data: card, error: null } satisfies ApiResponse<Card>)
  } catch (err: unknown) {
    // Refund balance on failure
    await creditBalance(user.id, tariffConfig.price_cents)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ data: null, error: message } satisfies ApiResponse<never>, { status: 500 })
  }
}
