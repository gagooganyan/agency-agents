import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ApiResponse, KycDocument } from '@/types'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const service = await createServiceClient()
  const { data: profile } = await service.from('users').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ data: null, error: 'Forbidden' } satisfies ApiResponse<never>, { status: 403 })

  const { status, admin_note } = await req.json()
  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ data: null, error: 'Invalid status' } satisfies ApiResponse<never>, { status: 400 })
  }

  const { data: doc, error } = await service
    .from('kyc_documents')
    .update({ status, admin_note: admin_note ?? null, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error || !doc) return NextResponse.json({ data: null, error: 'Not found' } satisfies ApiResponse<never>, { status: 404 })

  // Sync user kyc_status
  await service
    .from('users')
    .update({ kyc_status: status === 'approved' ? 'verified' : 'rejected' })
    .eq('id', doc.user_id)

  return NextResponse.json({ data: doc, error: null } satisfies ApiResponse<KycDocument>)
}
