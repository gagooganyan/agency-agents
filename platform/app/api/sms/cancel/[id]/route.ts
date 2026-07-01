import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { cancelOrder } from '@/lib/providers/fivesim'
import { creditBalance } from '@/lib/utils/balance'
import type { ApiResponse } from '@/types'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const serviceSupabase = await createServiceClient()
  const { data: sim } = await serviceSupabase
    .from('sims')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'waiting')
    .single()

  if (!sim) return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Cannot cancel' }, { status: 400 })

  await cancelOrder(sim.fivesim_order_id)
  await creditBalance(user.id, sim.price_cents)
  await serviceSupabase.from('sims').update({ status: 'cancelled' }).eq('id', sim.id)

  return NextResponse.json<ApiResponse<{ cancelled: true }>>({ data: { cancelled: true }, error: null })
}
