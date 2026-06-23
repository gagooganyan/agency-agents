import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { releaseNumber } from '@/lib/providers/twilio'
import { ApiResponse } from '@/types'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const service = await createServiceClient()
  const { data: vn } = await service
    .from('virtual_numbers')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!vn) return NextResponse.json({ data: null, error: 'Not found' } satisfies ApiResponse<never>, { status: 404 })

  const sid = vn.twilio_sid
  if (typeof sid !== 'string' || !sid) {
    return NextResponse.json({ data: null, error: 'Invalid record' }, { status: 500 })
  }

  try {
    await releaseNumber(sid)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ data: null, error: message } satisfies ApiResponse<never>, { status: 500 })
  }

  await service.from('virtual_numbers').update({ status: 'cancelled' }).eq('id', id).eq('user_id', user.id)

  return NextResponse.json({ data: { ok: true }, error: null } satisfies ApiResponse<{ ok: boolean }>)
}
