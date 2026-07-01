import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ApiResponse, KycDocument } from '@/types'

async function isAdmin(service: Awaited<ReturnType<typeof createServiceClient>>, userId: string) {
  const { data } = await service.from('users').select('is_admin').eq('id', userId).single()
  return data?.is_admin === true
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ data: null, error: 'Unauthorized' } satisfies ApiResponse<never>, { status: 401 })

  const service = await createServiceClient()
  if (!(await isAdmin(service, user.id))) {
    return NextResponse.json({ data: null, error: 'Forbidden' } satisfies ApiResponse<never>, { status: 403 })
  }

  const { data, error } = await service
    .from('kyc_documents')
    .select('*')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true })
    .limit(100)

  if (error) return NextResponse.json({ data: null, error: error.message } satisfies ApiResponse<never>, { status: 500 })
  return NextResponse.json({ data, error: null } satisfies ApiResponse<KycDocument[]>)
}
