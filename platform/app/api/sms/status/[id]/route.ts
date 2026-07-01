import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkOrder } from '@/lib/providers/fivesim'
import type { ApiResponse, Sim } from '@/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    .single()

  if (!sim) return NextResponse.json<ApiResponse<null>>({ data: null, error: 'Not found' }, { status: 404 })
  if (sim.status !== 'waiting') return NextResponse.json<ApiResponse<Sim>>({ data: sim, error: null })

  // Poll 5sim
  const order = await checkOrder(sim.fivesim_order_id)

  if (order.sms && order.sms.length > 0) {
    const code = order.sms[0].code
    const { data: updated } = await serviceSupabase
      .from('sims')
      .update({ status: 'received', sms_code: code })
      .eq('id', sim.id)
      .select()
      .single()
    return NextResponse.json<ApiResponse<Sim>>({ data: updated, error: null })
  }

  // Check if expired
  if (new Date() > new Date(sim.expires_at)) {
    await serviceSupabase.from('sims').update({ status: 'expired' }).eq('id', sim.id)
  }

  return NextResponse.json<ApiResponse<Sim>>({ data: sim, error: null })
}
