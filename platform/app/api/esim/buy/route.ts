import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPackages, createAiraloOrder, parseDataGb, AiraloPackage } from '@/lib/providers/airalo'
import { debitBalance, creditBalance } from '@/lib/utils/balance'
import { ApiResponse, Esim } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const body = await req.json() as { package_id?: string; country?: string }
  const { package_id, country } = body
  if (!package_id || !country) {
    return NextResponse.json({ data: null, error: 'package_id and country required' } satisfies ApiResponse<never>, { status: 400 })
  }

  let packages: AiraloPackage[]
  try {
    packages = await getPackages(country)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch packages'
    return NextResponse.json({ data: null, error: message } satisfies ApiResponse<never>, { status: 502 })
  }
  const pkg = packages.find(p => p.id === package_id)
  if (!pkg) return NextResponse.json({ data: null, error: 'Package not found' } satisfies ApiResponse<never>, { status: 404 })

  const price_cents = Math.ceil(pkg.price * 1.35 * 100)

  try {
    await debitBalance(user.id, price_cents)
  } catch {
    return NextResponse.json({ data: null, error: 'Insufficient balance' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    const order = await createAiraloOrder(package_id)
    const sim = order.sims[0]
    const data_gb = parseDataGb(pkg.data)

    const service = await createServiceClient()
    const { data: esim, error } = await service
      .from('esims')
      .insert({
        user_id: user.id,
        airalo_order_id: order.id,
        iccid: sim?.iccid ?? null,
        country,
        package_id,
        data_gb,
        qr_code: sim?.qrcode ?? null,
        status: 'active',
        price_cents,
        expires_at: null,
      })
      .select()
      .single()

    if (error || !esim) throw new Error('Failed to save eSIM')

    await service.from('transactions').insert({
      user_id: user.id,
      type: 'purchase',
      amount_cents: price_cents,
      currency: 'USD',
      status: 'completed',
      provider: 'airalo',
      product_type: 'esim',
      product_id: esim.id,
      payment_method: 'card',
    })

    return NextResponse.json({ data: esim as Esim, error: null } satisfies ApiResponse<Esim>)
  } catch (err: unknown) {
    await creditBalance(user.id, price_cents)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ data: null, error: message } satisfies ApiResponse<never>, { status: 500 })
  }
}
