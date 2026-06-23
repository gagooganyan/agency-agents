import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { setCardStatus } from '@/lib/providers/wallester'
import { ApiResponse } from '@/types'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const service = await createServiceClient()
  const now = new Date().toISOString()

  const { data: expired } = await service
    .from('cards')
    .select('id, wallester_card_id')
    .eq('user_id', user.id)
    .eq('is_disposable', true)
    .eq('status', 'active')
    .lt('valid_until', now)

  if (!expired?.length) return NextResponse.json({ data: { frozen: 0 }, error: null } satisfies ApiResponse<{ frozen: number }>)

  let frozen = 0
  for (const card of expired) {
    try {
      await setCardStatus(card.wallester_card_id, 'frozen')
      await service.from('cards').update({ status: 'frozen' }).eq('id', card.id)
      frozen++
    } catch {
      // best-effort: log and continue
    }
  }

  return NextResponse.json({ data: { frozen }, error: null } satisfies ApiResponse<{ frozen: number }>)
}
