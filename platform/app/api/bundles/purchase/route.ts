import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { debitBalance, creditBalance } from '@/lib/utils/balance'
import { createCardholder, issueCard } from '@/lib/providers/wallester'
import { searchNumbers, purchaseNumber } from '@/lib/providers/twilio'
import { getPackages, createAiraloOrder, parseDataGb } from '@/lib/providers/airalo'
import { BUNDLE_PLANS } from '@/lib/bundles'
import { ApiResponse, BundlePurchase } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const body = await req.json() as { plan_id?: string; number_country?: string; esim_country?: string; esim_package_id?: string }
  const { plan_id, number_country, esim_country, esim_package_id } = body

  const plan = plan_id ? BUNDLE_PLANS[plan_id] : undefined
  if (!plan) return NextResponse.json({ data: null, error: 'Invalid plan' } satisfies ApiResponse<never>, { status: 400 })
  if (!number_country || !esim_country || !esim_package_id) {
    return NextResponse.json({ data: null, error: 'number_country, esim_country, and esim_package_id required' } satisfies ApiResponse<never>, { status: 400 })
  }

  // Debit full bundle price upfront
  try {
    await debitBalance(user.id, plan.price_cents)
  } catch {
    return NextResponse.json({ data: null, error: 'Insufficient balance' } satisfies ApiResponse<never>, { status: 400 })
  }

  const service = await createServiceClient()
  const { data: userRow } = await service.from('users').select('email').eq('id', user.id).single()

  try {
    // 1. Issue card
    const cardholder = await createCardholder(user.id, userRow?.email ?? '')
    const walCard = await issueCard(cardholder.id, plan.includes.card_currency)

    const { data: card, error: cardErr } = await service.from('cards').insert({
      user_id: user.id,
      wallester_card_id: walCard.id,
      currency: plan.includes.card_currency,
      status: 'active',
      balance_cents: 0,
      tariff: plan.includes.card_tariff,
      last_four: walCard.masked_pan?.slice(-4) ?? null,
      expiry_month: walCard.expiry_month,
      expiry_year: walCard.expiry_year,
    }).select().single()
    if (cardErr || !card) throw new Error('Failed to save card')

    // 2. Purchase number
    const available = await searchNumbers(number_country)
    if (!available.length) throw new Error(`No available numbers in ${number_country}`)
    const { sid, number } = await purchaseNumber(available[0].phoneNumber)
    const nextNumberRenewal = new Date()
    nextNumberRenewal.setDate(nextNumberRenewal.getDate() + 30)

    const { data: num, error: numErr } = await service.from('virtual_numbers').insert({
      user_id: user.id,
      twilio_sid: sid,
      number,
      country: number_country,
      monthly_price_cents: plan.includes.number_price_cents,
      next_renewal_at: nextNumberRenewal.toISOString(),
      status: 'active',
    }).select().single()
    if (numErr || !num) throw new Error('Failed to save number')

    // 3. Purchase eSIM
    const packages = await getPackages(esim_country)
    const pkg = packages.find(p => p.id === esim_package_id)
    if (!pkg) throw new Error('eSIM package not found')

    const order = await createAiraloOrder(esim_package_id)
    const sim = order.sims[0]
    const data_gb = parseDataGb(pkg.data)

    const { data: esim, error: esimErr } = await service.from('esims').insert({
      user_id: user.id,
      airalo_order_id: order.id,
      iccid: sim?.iccid ?? null,
      country: esim_country,
      package_id: esim_package_id,
      data_gb,
      qr_code: sim?.qrcode ?? null,
      status: 'active',
      expires_at: null,
      price_cents: pkg.price,
    }).select().single()
    if (esimErr || !esim) throw new Error('Failed to save eSIM')

    // 4. Record bundle
    const { data: bundle, error: bundleErr } = await service.from('bundle_purchases').insert({
      user_id: user.id,
      plan_id: plan.id,
      price_cents: plan.price_cents,
      card_id: card.id,
      number_id: num.id,
      esim_id: esim.id,
      status: 'active',
    }).select().single()
    if (bundleErr || !bundle) throw new Error('Failed to save bundle')

    return NextResponse.json({ data: bundle as BundlePurchase, error: null } satisfies ApiResponse<BundlePurchase>)
  } catch (err: unknown) {
    await creditBalance(user.id, plan.price_cents)
    const message = err instanceof Error ? err.message : 'Bundle purchase failed'
    return NextResponse.json({ data: null, error: message } satisfies ApiResponse<never>, { status: 500 })
  }
}
