import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceSupabase = await createServiceClient()
  const { data: userData } = await serviceSupabase
    .from('users').select('is_admin').eq('id', user.id).single()
  if (!userData?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [
    { count: totalUsers },
    { count: totalSims },
    { data: revenueData },
  ] = await Promise.all([
    serviceSupabase.from('users').select('*', { count: 'exact', head: true }),
    serviceSupabase.from('sims').select('*', { count: 'exact', head: true }),
    serviceSupabase.from('transactions')
      .select('amount_cents')
      .eq('type', 'topup')
      .eq('status', 'completed'),
  ])

  const totalRevenueCents = (revenueData ?? []).reduce((sum, t) => sum + t.amount_cents, 0)

  return NextResponse.json({
    data: { totalUsers, totalSims, totalRevenueCents },
    error: null,
  })
}
