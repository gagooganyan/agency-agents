import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { setCardStatus } from '@/lib/providers/wallester'
import { ApiResponse, Card } from '@/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const { action } = await req.json() // 'freeze' | 'unfreeze'
  if (!['freeze', 'unfreeze'].includes(action)) {
    return NextResponse.json({ data: null, error: 'Invalid action' } satisfies ApiResponse<never>, { status: 400 })
  }

  const service = await createServiceClient()
  const { data: card } = await service.from('cards').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!card) return NextResponse.json({ data: null, error: 'Not found' } satisfies ApiResponse<never>, { status: 404 })

  const newStatus = action === 'freeze' ? 'frozen' : 'active'
  await setCardStatus(card.wallester_card_id, newStatus)

  const { data: updated } = await service
    .from('cards')
    .update({ status: newStatus })
    .eq('id', id)
    .select()
    .single()

  return NextResponse.json({ data: updated, error: null } satisfies ApiResponse<Card>)
}
